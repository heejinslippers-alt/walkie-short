// Timeline of "The Building That Cooked a Car": shots timed to the voice word timings (words.json, Kokoro durations),
// the camera grammar of the bridge short (smootherstep glides, creeping push-ins on every hold, flip kicks on impacts,
// hard cuts on big reframes) and the world layout constants every other module reads.
import WORDS from "./words.json";

export const FPS = 30;
export const TOTAL = Math.ceil(WORDS.duration * FPS);
export const D0 = 0; // ground level (build.ts helpers default to it)
export type V3 = [number, number, number];

// ---------------- word clock ----------------
/** frame of the onset of word `w` (0-based) of voice line `l` */
export const W = (l: number, w: number) => {
  const ws = WORDS.words.filter((x) => x.line === l);
  return Math.round(ws[Math.min(w, ws.length - 1)].start * FPS);
};
export const LINE = (l: number) => Math.round(WORDS.lines[l].start * FPS);
/** reactions land 0-3 frames before their word */
export const LEADF = 2;

// ---------------- layout (metres, y up) ----------------
export const TOWER_Z = -34;             // tower centre (its concave south face looks at the street)
export const TOWER_H = 112;
export const CAR: V3 = [-1.5, 0, 2.6];  // car centre, nose toward +x, parked by the south kerb
export const MIRROR: V3 = [-0.55, 0.98, 3.62];
export const BADGE: V3 = [1.06, 0.58, 2.6];
export const SPOT: V3 = [-0.6, 0, 3.4]; // where the reflected sunlight focuses
/** pavement top (kerbs at |z| = 4) */
export const PV = 0.14;
/** ground height under (x, z): pavements are raised, the road is not */
export const gy = (x: number, z: number) => (Math.abs(x) < 1000 && Math.abs(z) >= 4 && Math.abs(z) <= 26 ? PV : 0);
export const PAN: V3 = [3.4, 0.14 + 0.02, 5.6];
export const MAT: V3 = [9.0, 0.14 + 0.02, 7.05];
export const PARK: V3 = [-2000, 0, 0];  // the magnifying-glass lawn
export const VEGAS: V3 = [2000, 0, 0];  // the hotel pool

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "london" | "ring" | "paris" | "texas";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; after?: boolean };
/** the 2008 Nagoya track (230 m round) on the lawn; the Paris roundabout; the Texas desert road */
export const RING: V3 = [-2000, 0, 0];
export const RING_R = 36.6;
export const PARIS: V3 = [0, 0, 2000];
export const RB_R = 11;
export const TEXAS: V3 = [2000, 0, 200];
/** the street: lanes and the traffic light */
export const LANE_E = 1.9, LANE_W = -1.9;
export const LIGHT_X = 6.0;
const L = LINE;
const B = [0, L(1) - 1, L(2) - 1, L(3) - 1, L(4) - 1, L(5) - 1, L(6) - 1, W(6, 8) - 4, L(7) - 1, L(8) - 1, L(9) - 1, L(10) - 1, L(11) - 1,
  W(11, 17) - 4, L(12) - 1, L(13) - 1, L(14) - 1, TOTAL];
export const SHOTS: ShotDef[] = [
  { id: 1, a: B[0], b: B[1], light: "day", place: "london", sunAz: 140, sunEl: 45 },   // hook: a jam
  { id: 2, a: B[1], b: B[2], light: "day", place: "london", sunAz: 120, sunEl: 45 },   // 1.5 billion cars, 91 hours
  { id: 3, a: B[2], b: B[3], light: "day", place: "london", sunAz: 140, sunEl: 45 },   // the speed locks
  { id: 4, a: B[3], b: B[4], light: "day", place: "london", sunAz: 130, sunEl: 45 },   // flowing like a river
  { id: 5, a: B[4], b: B[5], light: "day", place: "london", sunAz: 140, sunEl: 45 },   // the light turns red
  { id: 6, a: B[5], b: B[6], light: "day", place: "london", sunAz: 130, sunEl: 45 },   // everyone stops
  { id: 7, a: B[6], b: B[7], light: "day", place: "texas", sunAz: 150, sunEl: 35 },    // Texas: a truck slams on the brakes
  { id: 8, a: B[7], b: B[8], light: "day", place: "paris", sunAz: 130, sunEl: 45 },    // Paris: the roundabout freezes
  { id: 9, a: B[8], b: B[9], light: "day", place: "london", sunAz: 140, sunEl: 45 },   // luckily: no crashes
  { id: 10, a: B[9], b: B[10], light: "day", place: "london", sunAz: 130, sunEl: 45 }, // unluckily: the planet stops
  { id: 11, a: B[10], b: B[11], light: "day", place: "ring", sunAz: 120, sunEl: 50 },  // Japan 2008: 22 cars in a circle
  { id: 12, a: B[11], b: B[12], light: "day", place: "ring", sunAz: 120, sunEl: 50 },  // a jam out of nowhere
  { id: 13, a: B[12], b: B[13], light: "day", place: "london", sunAz: 140, sunEl: 45 },// brake, brake more, the squeeze rolls back
  { id: 14, a: B[13], b: B[14], light: "day", place: "london", sunAz: 140, sunEl: 45 },// like an accordion
  { id: 15, a: B[14], b: B[15], light: "day", place: "london", sunAz: 130, sunEl: 45 },// equal gaps
  { id: 16, a: B[15], b: B[16], light: "day", place: "ring", sunAz: 120, sunEl: 50 },  // 2017: one self-driving car
  { id: 17, a: B[16], b: B[17], light: "day", place: "london", sunAz: 140, sunEl: 45 },// be that car. Leave a gap.
];
/** crossfades (frames) at place changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 7: 8, 8: 8, 9: 8, 11: 10, 13: 10, 16: 10, 17: 10 };
export const FLASH_AT = B[1];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story events (frames) ----------------
const E = (l: number, w: number) => W(l, w) - LEADF;
export const EV = {
  same: E(0, 10), jams: E(0, 14),
  billion: E(1, 6), london: E(1, 14), hours: E(1, 18),
  locks: E(2, 5), speed: E(2, 9),
  river: E(3, 4), tailgate: E(3, 5), overtake: E(3, 7),
  red: E(4, 5),
  stops: E(5, 2), every: E(5, 4), stop: E(5, 10),
  slams: E(6, 4), paris: E(6, 9), freezes: E(6, 13),
  lucky: E(7, 0), crashes: E(7, 3),
  unlucky: E(8, 0), entire: E(8, 10),
  japan: E(9, 15), circle: E(9, 22), steady: E(9, 25),
  jam: E(10, 3), nowhere: E(10, 7),
  brake1: E(11, 2), brake2: E(11, 8), squeeze: E(11, 14), backwards: E(11, 16), accordion: E(11, 19),
  speed2: E(12, 5), gaps: E(12, 8),
  selfdriving: E(13, 6), kept: E(13, 8), waves: E(13, 19), faded: E(13, 20),
  stuck: E(14, 4), bethat: E(14, 7), leave: E(15, 0), gap: E(15, 2),
};
/** nothing melts and no beam in this film (world.ts still reads these) */
export const meltAt = (_id: number, _f: number) => 0;
export const beamAt = (_id: number, _f: number) => 0;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
/** push-in factor since f0 (subject grows ~rate per frame), `punch` for n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const S = SHOTS;
// ---------------- where people and cars are (shared by cameras and cast) ----------------
export const V0 = 11;   // street speed (m/s) once everything is locked
export const AT = {
  fumer: [-3.2, -6.0] as [number, number], sign: [2.0, -4.7] as [number, number],
  lucky: [1.4, 4.85] as [number, number], granny: -2.6, mom: [0, -8.6] as [number, number],
  momEnd: [1.2, 4.9] as [number, number], scientist: [0, 0] as [number, number],
};
const g3 = (p: [number, number], y: number): V3 => [p[0], y, p[1]];
/** where the travelling camera of the platoon shots is (moves with the cars) */
export const trackX = (f: number, f0: number) => -30 + (V0 * (f - f0)) / FPS;
export const CAMS: Record<number, Key[]> = {
  // 1 a jam: low on the north pavement, looking along the stuck street
  1: [{ f: 0, s: (f) => dolly([-6.5, 2.3, -10.0], [4, 0.9, 0], pushK(f, 0, 0.0016, 0.005, 30), { fov: 46 }) }],
  // 2 the high aerial of the jam -> lower on "London"
  2: [
    { f: S[1].a, s: (f) => { const a = 0.7 + 0.0012 * (f - S[1].a); return dolly([40 * Math.sin(a), 30, 40 * Math.cos(a) - 6], [0, 0, 0], pushK(f, S[1].a, 0.0012), { fov: 44 }); } },
    { f: EV.london - 10, dur: 32, s: (f) => dolly([-12, 7, -14], [2, 0.6, 0.5], pushK(f, EV.london, 0.0018), { fov: 46 }) },
  ],
  // 3 the speed dial by the road, cars behind it
  3: [{ f: S[2].a, s: (f) => dolly([2.5, 2.0, -9.2], [2.0, 1.75, -4.7], pushK(f, S[2].a, 0.0018, 0.006, 25), { fov: 44 }) }],
  // 4 travelling with the flow along the north kerb
  4: [{ f: S[3].a, s: (f) => { const x = trackX(f, S[3].a); return { pos: [x - 2.0, 1.5, -5.0], look: [x + 4.5, 0.85, LANE_E], fov: 46 }; } }],
  // 5 the traffic light
  5: [{ f: S[4].a, s: (f) => dolly([1.6, 2.3, -1.6], [LIGHT_X, 2.65, 4.45], pushK(f, S[4].a, 0.002, 0.007, 25), { fov: 40 }) }],
  // 6 the wide street: one car stops, then everything does
  6: [{ f: S[5].a, s: (f) => dolly([-15, 5.0, -10.5], [6, 0.6, 1.0], pushK(f, S[5].a, 0.0014), { fov: 50 }) }],
  // 7 Texas: a truck comes at us down a desert road and stands on its brakes
  7: [{ f: S[6].a - 6, s: (f) => dolly(add(TEXAS, [17, 1.5, -5.5]), add(TEXAS, [4, 1.3, 0]), pushK(f, S[6].a, 0.0015, 0.006, 25), { fov: 44 }) }],
  // 8 Paris: the roundabout from above
  8: [{ f: S[7].a - 6, s: (f) => { const a = 0.6 + 0.0015 * (f - S[7].a); return dolly(add(PARIS, [26 * Math.sin(a), 22, 26 * Math.cos(a)]), PARIS, pushK(f, S[7].a, 0.0015), { fov: 46 }); } }],
  // 9 luckily: two cars stopped nose to tail with an inch to spare
  9: [{ f: S[8].a - 6, s: (f) => dolly([1.0, 1.7, -6.2], [1.05, 0.7, LANE_E], pushK(f, S[8].a, 0.0022, 0.007, 25), { fov: 38 }) }],
  // 10 unluckily: the stopped street, a granny overtakes the lot
  10: [{ f: S[9].a, s: (f) => dolly([-7.5, 1.9, -6.8], [3.5, 1.0, 3.0], pushK(f, S[9].a, 0.0014), { fov: 46 }) }],
  // 11 Japan 2008: the 230 m ring from high above
  11: [{ f: S[10].a - 6, s: (f) => dolly(add(RING, [0, 135, 52]), add(RING, [0, 0, 2]), pushK(f, S[10].a, 0.0012), { fov: 50 }) }],
  // 12 the jam forms in front of us: down to the cluster
  12: [
    { f: S[11].a, s: (f) => dolly(add(RING, [0, 135, 52]), add(RING, [0, 0, 2]), pushK(f, S[11].a, 0.0012), { fov: 50 }) },
    { f: EV.jam - 6, dur: 36, s: (f) => dolly(add(RING, [12, 16, RING_R + 26]), add(RING, [0, 0, RING_R]), pushK(f, EV.jam, 0.0016), { fov: 46 }) },
  ],
  // 13 travelling with a platoon: each car brakes a bit harder than the one in front
  13: [{ f: S[12].a - 6, s: (f) => { const x = trackX(f, S[12].a); return { pos: [x - 66, 8.0, LANE_E - 2.6], look: [x + 4, 0.6, LANE_E], fov: 40 }; } }],
  // 14 like an accordion: Mom plays one
  14: [{ f: S[13].a, s: (f) => dolly([0.2, 1.5, -5.3], g3(AT.mom, 1.25), pushK(f, S[13].a, 0.0022, 0.007, 30), { fov: 40 }) }],
  // 15 equal gaps: travelling higher with an evenly spaced line
  15: [{ f: S[14].a - 6, s: (f) => { const x = trackX(f, S[14].a); return { pos: [x - 76, 9.5, LANE_E - 3.0], look: [x + 4, 0.5, LANE_E], fov: 40 }; } }],
  // 16 2017: the ring again, one self-driving car -> down onto it
  16: [
    { f: S[15].a - 6, s: (f) => dolly(add(RING, [0, 135, 52]), add(RING, [0, 0, 2]), pushK(f, S[15].a, 0.0012), { fov: 50 }) },
    { f: EV.kept - 8, dur: 36, s: (f) => dolly(add(RING, [-14, 18, RING_R + 28]), add(RING, [0, 0, RING_R]), pushK(f, EV.kept, 0.0016), { fov: 46 }) },
  ],
  // 17 be that car: Mom by her car in the jam -> up on "leave a gap" to see the gap she left
  17: [
    { f: S[16].a - 6, s: (f) => dolly([-3.6, 1.6, 5.7], [1.2, 1.15, 4.6], pushK(f, S[16].a, 0.0018, 0.006, 25), { fov: 44 }) },
    { f: EV.leave - 6, dur: 34, s: (f) => dolly([-3.5, 9.5, -9.0], [4.0, 0.5, 2.6], pushK(f, EV.leave, 0.0014), { fov: 46 }) },
  ],
};

// impact kicks: flip sign every frame, decay over 7 f
const KICKS: [number, number][] = [[EV.every, 0.7], [EV.slams + 4, 0.8], [EV.freezes, 0.5], [EV.stops, 0.4]].map(([f, g]) => [f / FPS, g] as [number, number]);
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 8 },
  { f: S[1].a, cInf: 0 },
  { f: S[2].a, cInf: 9, focus: () => [2.0, 1.75, -4.7] },     // the dial
  { f: S[3].a, cInf: 4 },
  { f: S[4].a, cInf: 9, focus: () => [LIGHT_X, 2.65, 4.45] }, // the light
  { f: S[5].a, cInf: 0 },
  { f: S[6].a, cInf: 6 },
  { f: S[7].a, cInf: 0 },
  { f: S[8].a, cInf: 10 },
  { f: S[9].a, cInf: 5 },
  { f: S[10].a, cInf: 0 },
  { f: EV.jam - 6, dur: 36, cInf: 5 },
  { f: S[12].a, cInf: 3 },
  { f: S[13].a, cInf: 12 },                                    // Mom
  { f: S[14].a, cInf: 0 },
  { f: S[15].a, cInf: 0 },
  { f: EV.kept - 8, dur: 36, cInf: 5 },
  { f: S[16].a, cInf: 10 },
  { f: EV.leave - 6, dur: 34, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
