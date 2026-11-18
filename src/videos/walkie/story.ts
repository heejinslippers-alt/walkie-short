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
export type Place = "london" | "park" | "vegas";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; after?: boolean };
const B = [0, LINE(1) - 1, LINE(2) - 1, LINE(3) - 1, LINE(4) - 1, LINE(5) - 1, LINE(6) - 1, LINE(7) - 1, LINE(8) - 2, LINE(9) - 1, LINE(10) - 1,
  LINE(11) - 1, LINE(12) - 1, LINE(13) - 1, LINE(14) - 1, TOTAL];
// after = the tower after 2014 (fins, no crane)
export const SHOTS: ShotDef[] = [
  { id: 1, a: B[0], b: B[1], light: "day", place: "london", sunAz: 150, sunEl: 50 },          // hook: the cooking car
  { id: 2, a: B[1], b: B[2], light: "day", place: "london", sunAz: 120, sunEl: 40 },          // the City, the unfinished tower
  { id: 3, a: B[2], b: B[3], light: "day", place: "london", sunAz: 150, sunEl: 50 },          // he parks and pops out
  { id: 4, a: B[3], b: B[4], light: "day", place: "london", sunAz: 150, sunEl: 50 },          // comes back: mirror + badge
  { id: 5, a: B[4], b: B[5], light: "day", place: "london", sunAz: 40, sunEl: 55 },           // the reporter's egg
  { id: 6, a: B[5], b: B[6], light: "day", place: "london", sunAz: 140, sunEl: 50 },          // the barber's doormat
  { id: 7, a: B[6], b: B[7], light: "day", place: "london", sunAz: 30, sunEl: 55 },           // somebody looks up
  { id: 8, a: B[7], b: B[8], light: "day", place: "london", sunAz: 175, sunEl: 40 },          // the blazing face + beam
  { id: 9, a: B[8], b: B[9], light: "day", place: "london", sunAz: 30, sunEl: 55 },           // luckily
  { id: 10, a: B[9], b: B[10], light: "day", place: "london", sunAz: 60, sunEl: 60 },         // unluckily, the egg
  { id: 11, a: B[10], b: B[11], light: "day", place: "park", sunAz: 120, sunEl: 55 },         // magnifying glass
  { id: 12, a: B[11], b: B[12], light: "day", place: "london", sunAz: 120, sunEl: 40 },       // the giant mirror diagram
  { id: 13, a: B[12], b: B[13], light: "day", place: "london", sunAz: 160, sunEl: 40, after: true }, // fins + sunglasses
  { id: 14, a: B[13], b: B[14], light: "day", place: "london", sunAz: 150, sunEl: 50, after: true },  // the architect
  { id: 15, a: B[14], b: B[15], light: "day", place: "vegas", sunAz: 150, sunEl: 32 },                             // Las Vegas pool
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 11: 8, 12: 8, 13: 8, 15: 10 };
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
export const EV = {
  melt0: W(0, 3) - LEADF,          // "melted" (hook)
  park: W(2, 4) - LEADF,           // "parks"
  popOut: W(2, 11) - LEADF,        // "pops out"
  back: W(3, 3) - LEADF,           // "back"
  wing: W(3, 5) - LEADF,           // "wing mirror"
  badge: W(3, 9) - LEADF,          // "badge"
  melted: W(3, 11) - LEADF,        // "melted"
  pan: W(4, 8) - LEADF,            // "pan"
  crack: W(4, 12) - LEADF,         // "cracks"
  fries: W(4, 19) - LEADF,         // "fries"
  doormat: W(5, 5) - LEADF,
  smoke: W(5, 8) - 12,             // smoke rises into "smoke"
  looks: W(6, 3) - LEADF,          // "looks up"
  glass: W(7, 2) - LEADF,
  blazing: W(7, 10) - LEADF,
  street: W(7, 17) - LEADF,
  lucky: W(8, 0) - LEADF,
  hurt: W(8, 3) - LEADF,
  egg: W(9, 2) - LEADF,
  did: W(9, 3) - LEADF,
  magnify: W(10, 3) - LEADF,
  sun: W(10, 8) - LEADF,
  burning: W(10, 12) - LEADF,
  dot: W(10, 13) - LEADF,
  curves: W(11, 3) - LEADF,
  mirror: W(11, 8) - LEADF,
  bounces: W(11, 12) - LEADF,
  patch: W(11, 18) - LEADF,
  bolted: W(12, 3) - LEADF,
  fins: W(12, 9) - LEADF,
  shades: W(12, 20) - LEADF,
  architect: W(13, 2) - LEADF,
  seen: W(13, 4) - LEADF,
  vegas: W(14, 4) - LEADF,
  melting: W(14, 8) - LEADF,
  bags: W(14, 11) - LEADF,
  pool: W(14, 14) - LEADF,
};
/** how far the hook car / mirror has melted (0..1) at frame f in shot id */
export const meltAt = (id: number, f: number) =>
  id === 1 ? 0.55 + 0.45 * smooth((f - EV.melt0) / 60) : id === 3 ? 0 : id === 4 ? smooth((f - EV.wing) / 30) : id >= 5 && id <= 12 ? 1 : 0;
/** brightness of the reflected beam (0..1) */
export const beamAt = (id: number, f: number) =>
  id === 1 ? 1 : id === 8 ? smooth((f - EV.glass) / 40) : id === 12 ? 0.35 + 0.65 * smooth((f - EV.bounces) / 30) : id >= 3 && id <= 10 ? 0.5 : 0;

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
export const CAMS: Record<number, Key[]> = {
  // 1 hook: low on the pavement, the smoking car under the tower -> push into the car on "melted"
  1: [
    { f: 0, s: (f) => zoom([5.0, 0.9, 7.3], [-3.0, 5.6, -3], 62, pushK(f, 0, 0.0022)) },
    { f: EV.melt0 - 12, dur: 30, s: (f) => dolly([2.4, 1.0, 7.4], [-0.9, 0.75, 3.2], pushK(f, EV.melt0, 0.0028, 0.006), { fov: 40, roll: 0.06 }) },
  ],
  // 2 the City: aerial, slow orbit toward the tower crown with its crane
  2: [
    { f: S[1].a, s: (f) => { const a = 0.62 + 0.0011 * (f - S[1].a); return dolly([240 * Math.sin(a), 95, TOWER_Z + 240 * Math.cos(a)], [0, 58, TOWER_Z], pushK(f, S[1].a, 0.0017, 0.005), { fov: 44 }); } },
  ],
  // 3 he parks: MS from the south pavement, car left, man steps out and walks off right
  3: [
    { f: S[2].a, s: (f) => dolly([3.0, 1.5, 7.35], [-0.8, 1.0, 3.3], pushK(f, S[2].a, 0.0018), { fov: 50 }) },
  ],
  // 4 he comes back (same set-up) -> cut to the wing-mirror close-up -> glide to the badge
  4: [
    { f: S[3].a, s: (f) => dolly([3.0, 1.5, 7.35], [-0.4, 1.1, 3.6], pushK(f, S[3].a, 0.0022, 0.007, 20), { fov: 50 }) },
    { f: EV.wing - 3, cut: true, s: (f) => dolly([0.55, 1.12, 5.0], MIRROR, pushK(f, EV.wing, 0.003, 0.006), { fov: 34, roll: -0.05 }) },
    { f: EV.badge - 14, dur: 26, s: (f) => dolly([2.5, 0.95, 4.2], BADGE, pushK(f, EV.badge, 0.003), { fov: 34, roll: 0.04 }) },
  ],
  // 5 the reporter: MS on the pavement -> down onto the pan on "cracks"
  5: [
    { f: S[4].a, s: (f) => dolly([6.4, 1.55, 7.35], add(PAN, [0.3, 0.75, 0.2]), pushK(f, S[4].a, 0.002), { fov: 46 }) },
    { f: EV.crack - 16, dur: 28, s: (f) => dolly([4.2, 1.35, 7.1], add(PAN, [0, 0.05, 0]), pushK(f, EV.crack, 0.0025, 0.006), { fov: 36, roll: 0.05 }) },
  ],
  // 6 the barber's doormat, from the kerb
  6: [
    { f: S[5].a, s: (f) => dolly([7.4, 1.5, 2.6], [9.2, 1.0, 7.2], pushK(f, S[5].a, 0.0022, 0.006, 30), { fov: 42 }) },
  ],
  // 7 the crowd looks up: low lens in the road, faces against the shopfronts
  7: [
    { f: S[6].a, s: (f) => dolly([5.6, 0.8, -2.2], [5.3, 1.75, 6.0], pushK(f, S[6].a, 0.0025, 0.007, 28), { fov: 50 }) },
  ],
  // 8 up at the tower face (their view) -> cut on "blazing" to the high wide with the beam to the street
  8: [
    { f: S[7].a, s: (f) => zoom([5.0, 1.75, 7.0], [0, 58, TOWER_Z + 8], 56, pushK(f, S[7].a, 0.0025), { roll: 0.05 }) },
    { f: EV.blazing - 2, cut: true, s: (f) => dolly([44, 24, 26], [-2, 10, -8], pushK(f, EV.blazing, 0.0022, 0.005), { fov: 44 }) },
  ],
  // 9 luckily: relieved faces
  9: [
    { f: S[8].a, s: (f) => dolly([5.5, 1.5, -1.0], [5.3, 1.65, 6.0], pushK(f, S[8].a, 0.0025), { fov: 48 }) },
  ],
  // 10 unluckily: the egg, near top-down
  10: [
    { f: S[9].a, s: (f) => dolly([PAN[0] + 0.25, PAN[1] + 1.05, PAN[2] + 0.75], add(PAN, [0, 0.0, -0.02]), pushK(f, S[9].a, 0.003, 0.007, 25), { fov: 32, roll: -0.04 }) },
  ],
  // 11 magnifying glass: kid MS -> leaf close-up on "burning"
  11: [
    { f: S[10].a, s: (f) => dolly(add(PARK, [2.0, 1.1, 3.4]), add(PARK, [0.3, 0.75, 0]), pushK(f, S[10].a, 0.002), { fov: 40 }) },
    { f: EV.burning - 20, dur: 30, s: (f) => dolly(add(PARK, [1.2, 0.75, 1.4]), add(PARK, [0.6, 0.05, 0.3]), pushK(f, EV.burning, 0.0028), { fov: 36 }) },
  ],
  // 12 the giant curved mirror: side aerial of face + street, glide down the rays to the patch of road
  12: [
    { f: S[11].a, s: (f) => dolly([105, 48, -2], [0, 40, -16], pushK(f, S[11].a, 0.0015), { fov: 44 }) },
    { f: EV.bounces - 10, dur: 40, s: (f) => dolly([40, 18, 18], [-1, 4, 0], pushK(f, EV.bounces, 0.0022), { fov: 42 }) },
  ],
  // 13 the fins + sunglasses: the tower from above the far rooftops
  13: [
    { f: S[12].a, s: (f) => dolly([10, 26, 80], [0, 62, TOWER_Z], pushK(f, S[12].a, 0.0015), { fov: 44 }) },
    { f: EV.shades - 20, dur: 24, s: (f) => dolly([6, 40, 58], [0, 92, TOWER_Z], pushK(f, EV.shades, 0.002, 0.005), { fov: 40, roll: -0.06 }) },
  ],
  // 14 the architect on the plaza, tower behind
  14: [
    { f: S[13].a, s: (f) => dolly([1.0, 1.35, -5.4], [0, 1.95, -9.4], pushK(f, S[13].a, 0.0025, 0.006, 30), { fov: 46 }) },
  ],
  // 15 Las Vegas: wide on the pool and the curved hotel -> tourist on "melting"
  15: [
    { f: S[14].a, s: (f) => dolly(add(VEGAS, [14, 7, 38]), add(VEGAS, [1, 9, -4]), pushK(f, S[14].a, 0.0016), { fov: 50 }) },
    { f: EV.melting - 18, dur: 30, s: (f) => dolly(add(VEGAS, [5.2, 1.5, 15.6]), add(VEGAS, [3.0, 1.1, 11.6]), pushK(f, EV.melting, 0.0028, 0.006), { fov: 40, roll: 0.05 }) },
  ],
};

// impact kicks: flip sign every frame, decay over 7 f
const KICKS: [number, number][] = [[(EV.back + 6) / FPS, 0.5], [EV.crack / FPS, 0.5], [EV.blazing / FPS, 0.8], [(EV.shades + 10) / FPS, 1.2], [EV.did / FPS, 0.4]];
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
  { f: 0, cInf: 0 },
  { f: EV.melt0 - 12, dur: 30, cInf: 12 },                      // car close-up
  { f: S[1].a, cInf: 0 },                                       // aerial
  { f: S[2].a, cInf: 10 },                                      // MS street
  { f: EV.wing - 3, cInf: 14 },                                 // mirror / badge inserts
  { f: S[4].a, cInf: 10, focus: () => [4.2, 1.5, 6.1] },        // reporter
  { f: EV.crack - 16, dur: 28, cInf: 13 },                      // pan
  { f: S[5].a, cInf: 10 },                                      // barber
  { f: S[6].a, cInf: 12, focus: () => [5.3, 1.75, 5.8] },          // faces looking up
  { f: S[7].a, cInf: 0 },                                       // tower + beam
  { f: S[8].a, cInf: 12, focus: () => [5.3, 1.75, 5.8] },
  { f: S[9].a, cInf: 15 },                                      // egg CU
  { f: S[10].a, cInf: 10 },                                     // park
  { f: EV.burning - 20, dur: 30, cInf: 14 },
  { f: S[11].a, cInf: 0 },                                      // diagram, fins
  { f: S[13].a, cInf: 11, focus: () => [0, 1.6, -9.4] },       // architect
  { f: S[14].a, cInf: 0 },                                      // Vegas wide
  { f: EV.melting - 18, dur: 30, cInf: 10 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
