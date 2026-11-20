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
export type Place = "london" | "crowd" | "space" | "sea" | "stadium";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; after?: boolean };
/** the crowd field (the park lawn), the space stage, the sea with the cruise ship, the stadium */
export const FIELD: V3 = [-2000, 0, -250];
export const SPACE: V3 = [0, 0, -2600];
export const SEA: V3 = [2600, 0, -2600];
export const STADIUM: V3 = [-2600, 0, -2600];
// kept for fleet.ts (the traffic short's places are still built, out of sight)
export const RING: V3 = [-5000, 0, 5000];
export const RING_R = 36.6;
export const PARIS: V3 = [0, 0, 5000];
export const RB_R = 11;
export const TEXAS: V3 = [5000, 0, 5000];
export const LANE_E = 1.9, LANE_W = -1.9;
export const LIGHT_X = 6.0;
const L = LINE;
const B = [0, L(1) - 1, L(2) - 1, L(3) - 1, L(7) - 1, L(8) - 1, L(9) - 1, L(10) - 1, L(11) - 1, L(12) - 1, L(13) - 1, L(14) - 1, L(16) - 1, TOTAL];
export const SHOTS: ShotDef[] = [
  { id: 1, a: B[0], b: B[1], light: "day", place: "crowd", sunAz: 140, sunEl: 50 },     // hook: everyone jumps
  { id: 2, a: B[1], b: B[2], light: "day", place: "crowd", sunAz: 120, sunEl: 50 },     // 8.2 billion of us, 400 million tonnes
  { id: 3, a: B[2], b: B[3], light: "day", place: "crowd", sunAz: 130, sunEl: 50 },     // squeezed into one place
  { id: 4, a: B[3], b: B[4], light: "day", place: "crowd", sunAz: 140, sunEl: 50 },     // 3, 2, 1, jump! (Mom with a megaphone)
  { id: 5, a: B[4], b: B[5], light: "day", place: "crowd", sunAz: 150, sunEl: 40 },     // everyone in the air
  { id: 6, a: B[5], b: B[6], light: "day", place: "space", sunAz: 120, sunEl: 40 },     // the Earth moves less than an atom
  { id: 7, a: B[6], b: B[7], light: "day", place: "space", sunAz: 120, sunEl: 40 },     // fifteen trillion times heavier
  { id: 8, a: B[7], b: B[8], light: "day", place: "sea", sunAz: 140, sunEl: 45 },       // a flea jumping off a cruise ship
  { id: 9, a: B[8], b: B[9], light: "day", place: "crowd", sunAz: 150, sunEl: 40 },     // we land
  { id: 10, a: B[9], b: B[10], light: "day", place: "stadium", sunAz: 130, sunEl: 45 }, // Seattle 2011: the Beast Quake
  { id: 11, a: B[10], b: B[11], light: "day", place: "crowd", sunAz: 120, sunEl: 50 },  // 120,000 crowds landing
  { id: 12, a: B[11], b: B[12], light: "day", place: "london", sunAz: 140, sunEl: 45 }, // everyone trying to get home
  { id: 13, a: B[12], b: B[13], light: "day", place: "london", sunAz: 140, sunEl: 45 }, // and we know how that ends
];
/** crossfades (frames) at place changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 6: 8, 8: 8, 9: 8, 10: 8, 11: 8, 12: 10 };
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
  jumped: E(0, 6), course: E(0, 14),
  billion: E(1, 5), tonnes: E(1, 13),
  squeeze: E(2, 3), packed: E(2, 7), london: E(2, 20),
  three: E(3, 0), two: E(4, 0), one: E(5, 0), jump: E(6, 0),
  leave: E(7, 3), earth: E(7, 9), moves: E(7, 10),
  less: E(8, 1), thousandth: E(8, 4), atom: E(8, 10),
  fifteen: E(9, 4), heavier: E(9, 7), us: E(9, 11),
  flea: E(10, 3), jumping: E(10, 4), ship: E(10, 8), notice: E(10, 13),
  land: E(11, 3), back: E(11, 8),
  loud: E(12, 4), seattle: E(12, 8), celebrated: E(12, 11), recorded: E(12, 18), earthquake: E(12, 23),
  picture: E(13, 1), landing: E(13, 10), once: E(13, 12),
  disaster: E(14, 3), home: E(15, 10), ends: E(16, 6),
};
/** nothing melts and no beam in this film (world.ts still reads these) */
export const meltAt = (_id: number, _f: number) => 0;
export const beamAt = (_id: number, _f: number) => 0;
/** height (m) of a jumper at frame f for a jump launched at f0: ~0.45 m up, 0.6 s in the air */
export const hopAt = (f: number, f0: number, k = 1) => {
  const t = (f - f0) / FPS, T = 0.6;
  return t <= 0 || t >= T ? 0 : 4.9 * t * (T - t) * k;
};

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
export const V0 = 11;
export const AT = { mom: [0, 1.6] as [number, number], momEnd: [1.2, 4.9] as [number, number] };
export const trackX = (f: number, f0: number) => -30 + (V0 * (f - f0)) / FPS;
const at = (p: V3, d: V3): V3 => add(p, d);
export const CAMS: Record<number, Key[]> = {
  // 1 just above the heads of a packed crowd
  1: [{ f: 0, s: (f) => dolly(at(FIELD, [0.4, 2.9, 6.5]), at(FIELD, [0, 1.3, -8]), pushK(f, 0, 0.0016, 0.005, 30), { fov: 50 }) }],
  // 2 aerial over the sea of heads
  2: [{ f: S[1].a, s: (f) => { const a = 0.4 + 0.0012 * (f - S[1].a); return dolly(at(FIELD, [26 * Math.sin(a), 20, 26 * Math.cos(a)]), at(FIELD, [0, 0, -12]), pushK(f, S[1].a, 0.0012), { fov: 48 }); } }],
  // 3 very high (the whole crowd, out to its edge) -> down into the packed crowd on "packed"
  3: [
    { f: S[2].a, s: (f) => dolly(at(FIELD, [0, 42, 34]), at(FIELD, [0, 0, -30]), pushK(f, S[2].a, 0.0012), { fov: 50 }) },
    { f: EV.packed - 10, dur: 40, s: (f) => dolly(at(FIELD, [3.2, 2.4, 5.0]), at(FIELD, [0, 1.4, -4]), pushK(f, EV.packed, 0.0016), { fov: 46 }) },
  ],
  // 4 Mom on a crate with a megaphone, the crowd behind her
  4: [{ f: S[3].a, s: (f) => dolly(at(FIELD, [0.25, 2.0, 6.2]), at(FIELD, [0, 1.85, AT.mom[1]]), pushK(f, S[3].a, 0.002, 0.008, 20), { fov: 42 }) }],
  // 5 low and wide: everybody in the air -> tilt up to the sky on "Earth moves"
  5: [
    { f: S[4].a, s: (f) => dolly(at(FIELD, [0, 1.1, 7.5]), at(FIELD, [0, 2.7, -6]), pushK(f, S[4].a, 0.0014), { fov: 54 }) },
    { f: EV.earth - 8, dur: 30, s: () => ({ pos: at(FIELD, [0, 1.1, 7.5]), look: at(FIELD, [0, 30, -20]), fov: 54 }) },
  ],
  // 6 space: the Earth, and a magnifier on an atom
  6: [{ f: S[5].a - 6, s: (f) => dolly(at(SPACE, [0, 0, 16]), SPACE, pushK(f, S[5].a, 0.0016, 0.006, 25), { fov: 40 }) }],
  // 7 space: the balance
  7: [{ f: S[6].a, s: (f) => dolly(at(SPACE, [40, 0, 27]), at(SPACE, [40, 0, 0]), pushK(f, S[6].a, 0.0016, 0.006, 25), { fov: 40 }) }],
  // 8 the cruise ship's bow rail, a flea -> back to the whole ship on "the ship doesn't even notice"
  8: [
    { f: S[7].a - 6, s: (f) => dolly(at(SEA, [22.6, 7.75, 3.4]), at(SEA, [20.9, 7.55, 1.0]), pushK(f, S[7].a, 0.002), { fov: 40 }) },
    { f: EV.ship + 18, dur: 36, s: (f) => dolly(at(SEA, [62, 20, 60]), at(SEA, [0, 6, 0]), pushK(f, EV.ship + 18, 0.0012), { fov: 46 }) },
  ],
  // 9 we land
  9: [{ f: S[8].a - 6, s: (f) => dolly(at(FIELD, [1.5, 1.4, 7.2]), at(FIELD, [0, 1.3, -6]), pushK(f, S[8].a, 0.0016, 0.006, 25), { fov: 50 }) }],
  // 10 the stadium from the touchline, the stands rising; a seismograph on a table
  10: [
    { f: S[9].a - 6, s: (f) => dolly(at(STADIUM, [0.6, 1.6, -33.0]), at(STADIUM, [0, 5.5, -60]), pushK(f, S[9].a, 0.0013, 0.005, 30), { fov: 54 }) },
    { f: EV.recorded - 12, dur: 22, s: (f) => dolly(at(STADIUM, [-0.95, 1.55, -35.8]), at(STADIUM, [-1.0, 1.05, -37.6]), pushK(f, EV.recorded, 0.002), { fov: 40 }) },
  ],
  // 11 aerial: the crowd lands, shock rings everywhere
  11: [{ f: S[10].a - 6, s: (f) => dolly(at(FIELD, [0, 34, 30]), at(FIELD, [0, 0, -18]), pushK(f, S[10].a, 0.0014), { fov: 50 }) }],
  // 12 everyone heads home: a jammed street, pavements full
  12: [{ f: S[11].a - 6, s: (f) => dolly([-9, 3.6, -9.5], [5, 1, 2], pushK(f, S[11].a, 0.0014), { fov: 48 }) }],
  // 13 Mom by her car, deadpan
  13: [{ f: S[12].a, s: (f) => dolly([-3.6, 1.6, 5.7], [1.2, 1.15, 4.6], pushK(f, S[12].a, 0.0022, 0.007, 25), { fov: 42 }) }],
};

// impact kicks: flip sign every frame, decay over 7 f
const KICKS: [number, number][] = [[EV.jump, 0.5], [EV.land + 6, 0.9], [EV.celebrated + 14, 0.7], [EV.landing + 4, 1.0]].map(([f, g]) => [f / FPS, g] as [number, number]);
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
  { f: 0, cInf: 4 },
  { f: S[1].a, cInf: 0 },
  { f: EV.packed - 10, dur: 40, cInf: 6 },
  { f: S[3].a, cInf: 11, focus: () => add(FIELD, [0, 1.85, AT.mom[1]]) },
  { f: S[4].a, cInf: 4 },
  { f: S[5].a, cInf: 0 },
  { f: S[7].a, cInf: 9, focus: () => add(SEA, [20.5, 7.6, 1.0]) },
  { f: EV.ship + 18, dur: 36, cInf: 0 },
  { f: S[8].a, cInf: 2 },
  { f: S[9].a, cInf: 4, focus: () => add(STADIUM, [0, 2.5, -41]) },
  { f: EV.recorded - 12, dur: 22, cInf: 9, focus: () => add(STADIUM, [-1.0, 1.05, -37.6]) },
  { f: S[10].a, cInf: 0 },
  { f: S[11].a, cInf: 4 },
  { f: S[12].a, cInf: 10 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
