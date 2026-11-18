// Where every vehicle is in each shot of the traffic short (pure functions of the frame). Street: eastbound lane at
// z = LANE_E (nose +x), westbound at LANE_W. Ring and roundabout: cars run anticlockwise seen from above. Wheels spin
// with one shared angle (every moving car moves at the same speed: that's the premise).
import { FPS, SHOTS, EV, V0, LANE_E, LANE_W, LIGHT_X, RING, RING_R, PARIS, RB_R, TEXAS, trackX, clamp01, smooth } from "./story";
import type { CarPose, TrafficState } from "./fleet";

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const wrap = (x: number, c: number, half: number) => c + ((((x - c + half) % (2 * half)) + 2 * half) % (2 * half)) - half;
const E = 0, Wb = Math.PI;
/** distance covered by a car cruising at v from f0, braking to a halt over td seconds from fs (or never) */
const run = (f: number, f0: number, v: number, fs = Infinity, td = 0.8) => {
  const t = (Math.min(f, fs) - f0) / FPS;
  if (f <= fs) return v * t;
  const u = clamp01((f - fs) / FPS / td);
  return v * t + v * td * (u - u * u / 2);
};
const stopFx = (f: number, fs: number, td = 0.8) => {
  const u = (f - fs) / FPS / td;
  return { brake: f >= fs ? 1 : 0, pitch: u > 0 && u < 1.4 ? 0.035 * Math.sin(Math.PI * Math.min(1, u)) - (u > 1 ? 0.012 * Math.sin(Math.PI * (u - 1) / 0.4) : 0) : 0 };
};
/** a stopped street: both lanes nose to tail (brake lights on) */
const jam = (opts: { gapAt?: number; gap?: number; lucky?: boolean } = {}): CarPose[] => {
  const cars: CarPose[] = [];
  for (let i = 0; i < 16; i++) {
    let x = -46 + i * 6.4 + 0.5 * hh(i, 1);
    if (opts.gapAt !== undefined && x > opts.gapAt) x += opts.gap ?? 0;
    cars.push({ x, z: LANE_E, yaw: E, brake: 1 });
  }
  if (opts.lucky) { cars[7].x = -1.6; cars[8].x = -1.6 + 5.27 + 0.15; cars[6].x = -1.6 - 6.4; cars[9].x = cars[8].x + 6.4; }
  if (!opts.lucky) for (let i = 0; i < 14; i++) cars.push({ x: 44 - i * 6.6 - 0.6 * hh(i, 2), z: LANE_W, yaw: Wb, brake: 1 });
  return cars;
};
/** flowing street; `lock`: before it the cars run at different speeds, after it all at V0; `stop`: everyone halts */
const flow = (f: number, f0: number, o: { lock?: number; stop?: number; lead?: number; west?: boolean; c?: number } = {}): { cars: CarPose[]; wheel: number } => {
  const cars: CarPose[] = [], c = o.c ?? 0, nE = 11, nW = o.west === false ? 0 : 10;
  for (let i = 0; i < nE + nW; i++) {
    const east = i < nE, k = east ? i : i - nE;
    const v = (fr: number) => (o.lock !== undefined && fr < o.lock ? V0 * (0.85 + 0.3 * hh(i, 5)) : V0);
    let d = 0;
    if (o.lock !== undefined) d = o.lock > f0 ? v(f0) * (Math.min(f, o.lock) - f0) / FPS + (f > o.lock ? V0 * (f - o.lock) / FPS : 0) : run(f, f0, V0);
    else d = run(f, f0, V0, o.stop);
    let x0 = east ? -70 + k * 14 + 2 * hh(i, 3) : 70 - k * 15 - 2 * hh(i, 4);
    if (east && o.lead !== undefined) x0 = o.lead - k * 22;   // shot 6: car 0 is the one that stops at the light
    let x = east ? x0 + d : x0 - d;
    let st = o.stop !== undefined ? stopFx(f, o.stop) : { brake: 0, pitch: 0 };
    if (east && k === 0 && o.lead !== undefined) { // the lead car brakes for the red light, halting on the line at EV.stops
      const fs = EV.stops - 15; x = x0 + run(f, f0, V0, fs, 0.5); st = stopFx(f, fs, 0.5);
    }
    if (o.lead === undefined) x = wrap(x, c, 80);
    cars.push({ x, z: east ? LANE_E : LANE_W, yaw: east ? E : Wb, ...st });
  }
  const dist = o.stop !== undefined ? run(f, f0, V0, o.stop) : (f - f0) * V0 / FPS;
  return { cars, wheel: dist / 0.33 };
};
/** a platoon of six seen from behind: each driver brakes a bit harder than the one in front (shot 13), or keeps an even gap */
const platoon = (f: number, f0: number, even: boolean): CarPose[] => {
  const n = 6, cars: CarPose[] = [];
  const starts = [EV.brake1, EV.brake2, EV.squeeze, EV.squeeze + 7, EV.squeeze + 14, EV.squeeze + 21];
  for (let k = 0; k < n; k++) {
    let x = trackX(f, f0) + 16 - k * (even ? 13 : 12.5), brake = 0;
    if (!even) {
      const depth = 0.25 + 0.15 * k, s0 = starts[k];
      let lag = 0;
      for (let fr = f0; fr < f; fr++) { const u = (fr - s0) / 18; const dip = u < 0 ? 0 : u < 1 ? smooth(u) : u < 2 ? 1 : u < 4 ? 1 - smooth((u - 2) / 2) : 0; lag += (V0 * depth * dip) / FPS; }
      x -= lag;
      const u = (f - s0) / 18; brake = u > 0 && u < 2.2 ? 1 : 0;
    }
    cars.push({ x, z: LANE_E, yaw: E, brake, pitch: brake ? 0.015 : 0 });
  }
  return cars;
};
/** cars on a circle, anticlockwise from above; a density wave of amplitude a (<= .45) bunches them around angle tw */
const circle = (f: number, n: number, R: number, v: number, a: number, tw: number, cx: number, cz: number, u0 = 0, freezeAt?: number): CarPose[] => {
  const om = v / R, cars: CarPose[] = [];
  const t = freezeAt !== undefined ? run(f, 0, 1, freezeAt, 0.6) : f / FPS;
  for (let i = 0; i < n; i++) {
    const u = u0 + (2 * Math.PI * i) / n + om * t, ph = u - a * Math.sin(u - tw);
    const x = cx + R * Math.cos(ph), z = cz + R * Math.sin(ph);
    const dx = -Math.sin(ph), dz = Math.cos(ph);
    const squeeze = clamp01((Math.cos(u - tw) - 0.55) / 0.45) * (a / 0.45);
    const fr = freezeAt !== undefined && f >= freezeAt ? 1 : 0;
    cars.push({ x, z, y: 0.02, yaw: Math.atan2(-dz, dx), brake: Math.max(fr, squeeze > 0.3 ? 1 : 0), pitch: 0 });
  }
  return cars;
};

export const trafficAt = (id: number, f: number): TrafficState & { wheel: number } => {
  const s = SHOTS[id - 1];
  switch (id) {
    case 1: case 2: case 10: return { cars: jam(), wheel: 0, light: "red" };
    case 3: { const r = flow(f, s.a, { lock: EV.locks, c: 2 }); return { ...r, light: "green" }; }
    case 4: { const r = flow(f, s.a, { c: trackX(f, s.a) + 20 }); return { ...r, light: "green" }; }
    case 5: return { ...flow(f, s.a, { c: 4 }), light: f < EV.red - 14 ? "green" : f < EV.red ? "amber" : "red" };
    case 6: return { ...flow(f, s.a, { stop: EV.every, lead: LIGHT_X - 2.65 - V0 * ((EV.stops - 15 - s.a) / FPS) - V0 * 0.25 }), light: "red" };
    case 7: {
      const fs = EV.slams, td = 1.4, xs = TEXAS[0] + 5 - 22 * td / 2, x0 = xs - 22 * (fs - s.a) / FPS;
      const x = x0 + run(f, s.a, 22, fs, td), st = stopFx(f, fs, td);
      return { cars: [], truck: { x, z: TEXAS[2] + 1.9, y: 0.015, yaw: 0, ...st, pitch: st.pitch * 0.8 }, wheel: run(f, s.a, 22, fs, td) / 0.52 };
    }
    case 8: return { cars: circle(f, 9, RB_R, 6, 0, 0, PARIS[0], PARIS[2], 0.4, EV.freezes), wheel: 0 };
    case 9: return { cars: jam({ lucky: true }), wheel: 0, light: "red" };
    case 11: return { cars: circle(f, 22, RING_R, 8.33, 0, Math.PI / 2, RING[0], RING[2]), wheel: f * 8.33 / FPS / 0.33 };
    case 12: {
      const a = 0.45 * smooth((f - (EV.jam - 24)) / 44);
      return { cars: circle(f, 22, RING_R, 8.33, a, Math.PI / 2 + 0.15, RING[0], RING[2]), wheel: f * 8.33 / FPS / 0.33 };
    }
    case 13: return { cars: platoon(f, s.a, false), wheel: (f - s.a) * V0 / FPS / 0.33, light: "green" };
    case 14: return { cars: [], wheel: 0 };
    case 15: return { cars: platoon(f, s.a, true), wheel: (f - s.a) * V0 / FPS / 0.33, light: "green" };
    case 16: {
      const a = 0.4 * (1 - smooth((f - EV.kept) / (EV.faded + 12 - EV.kept)));
      // the self-driving car (index 0 of the 21) passes the near side (angle pi/2) as the camera arrives there
      const om = 8.33 / RING_R, uAV = Math.PI / 2 - 0.25 - om * ((EV.kept + 30) / FPS);
      const all = circle(f, 21, RING_R, 8.33, a, Math.PI / 2 + 0.4, RING[0], RING[2], uAV);
      return { cars: all.slice(1), av: all[0], wheel: f * 8.33 / FPS / 0.33 };
    }
    case 17: return { cars: jam({ gapAt: 1.5, gap: 3.6 }), wheel: 0, light: "red" };
  }
  return { cars: [], wheel: 0 };
};
