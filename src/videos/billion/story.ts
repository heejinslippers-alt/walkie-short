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
/** the gold mound on the tower plaza (half ellipsoid) and where people sit on it */
export const MOUND: V3 = [0, 0.14, -15.5];
export const MR: V3 = [3.6, 1.5, 2.8];
export const moundY = (x: number, z: number) => {
  const u = (x - MOUND[0]) / MR[0], v = (z - MOUND[2]) / MR[2], k = 1 - u * u - v * v;
  return MOUND[1] + (k > 0 ? MR[1] * Math.sqrt(k) : 0);
};
export const BAKERY: V3 = [22.5, 0.14, 7.6];  // shop door on the south side
const L = LINE;
const B = [0, L(1) - 1, L(2) - 1, L(3) - 1, W(3, 4) - 6, L(4) - 1, L(5) - 1, L(6) - 1, L(7) - 1, L(8) - 1, L(9) - 1, L(10) - 1,
  L(11) - 1, L(12) - 1, L(13) - 1, L(14) - 1, L(15) - 3, L(16) - 1, TOTAL];
export const SHOTS: ShotDef[] = [
  { id: 1, a: B[0], b: B[1], light: "day", place: "london", sunAz: 140, sunEl: 48 },    // hook: two pops on the plaza
  { id: 2, a: B[1], b: B[2], light: "day", place: "london", sunAz: 120, sunEl: 45 },    // 3,428 of them on a mountain of gold
  { id: 3, a: B[2], b: B[3], light: "day", place: "london", sunAz: 140, sunEl: 50 },    // noon: pop pop pop
  { id: 4, a: B[3], b: B[4], light: "day", place: "vegas", sunAz: 150, sunEl: 40 },     // the pool party is over
  { id: 5, a: B[4], b: B[5], light: "day", place: "london", sunAz: 130, sunEl: 45 },    // the limousine waits
  { id: 6, a: B[5], b: B[6], light: "day", place: "london", sunAz: 120, sunEl: 45 },    // the kids come for the gold
  { id: 7, a: B[6], b: B[7], light: "day", place: "london", sunAz: 140, sunEl: 45 },    // one kid inherits: pop
  { id: 8, a: B[7], b: B[8], light: "day", place: "london", sunAz: 140, sunEl: 45 },    // grandkids: pop pop
  { id: 9, a: B[8], b: B[9], light: "day", place: "london", sunAz: 130, sunEl: 45 },    // lawyers chop fortunes
  { id: 10, a: B[9], b: B[10], light: "day", place: "london", sunAz: 140, sunEl: 48 },  // the lottery winner
  { id: 11, a: B[10], b: B[11], light: "day", place: "london", sunAz: 140, sunEl: 48 }, // the stock tip
  { id: 12, a: B[11], b: B[12], light: "day", place: "park", sunAz: 120, sunEl: 50 },   // hot potato
  { id: 13, a: B[12], b: B[13], light: "day", place: "park", sunAz: 120, sunEl: 50 },   // split it four ways
  { id: 14, a: B[13], b: B[14], light: "day", place: "london", sunAz: 130, sunEl: 45 }, // giving it away
  { id: 15, a: B[14], b: B[15], light: "day", place: "london", sunAz: 140, sunEl: 48 }, // which currency?
  { id: 16, a: B[15], b: B[16], light: "day", place: "london", sunAz: 150, sunEl: 30 }, // the bakery queue
  { id: 17, a: B[16], b: B[17], light: "day", place: "london", sunAz: 150, sunEl: 30 }, // a brick of Zimbabwe dollars
  { id: 18, a: B[17], b: B[18], light: "day", place: "london", sunAz: 150, sunEl: 30 }, // the whole queue goes pop
];
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 4: 8, 5: 8, 12: 10, 14: 10, 16: 10 };
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
/** pops land one frame before the spoken "pop" (or "exploded") */
const P = (l: number, w: number) => W(l, w) - 1;
export const EV = {
  pop1: P(0, 6), became: W(0, 11) - LEADF, pop2: P(0, 13),
  sitting: W(1, 11) - LEADF, trillion: W(1, 15) - LEADF,
  noon: W(2, 1) - LEADF, popA: P(2, 3), popB: P(2, 4), popC: P(2, 5),
  forever: W(3, 7) - LEADF,
  vanish: W(4, 4) - LEADF, kids: W(4, 6) - 10,
  inherits: W(5, 5) - LEADF, billion: W(5, 7) - LEADF, popKid: P(5, 8),
  popG1: P(6, 3), popG2: P(6, 4),
  chop: W(7, 2) - LEADF, pieces: W(7, 5) - LEADF,
  lucky: W(8, 0) - LEADF, cash: W(8, 7) - LEADF, nine: W(8, 9) - LEADF, million: W(8, 15) - LEADF,
  unlucky: W(9, 0) - LEADF, he: W(9, 1) - LEADF, tip: W(9, 4) - LEADF, going: W(9, 8) - LEADF,
  potato: W(10, 2) - LEADF, blow: W(10, 7) - LEADF, much: W(10, 13) - LEADF, pass: W(10, 16) - LEADF,
  split: W(11, 0) - LEADF, four: W(11, 4) - LEADF, nobody: W(11, 7) - LEADF,
  give: W(12, 6) - LEADF, more: W(12, 9) - LEADF, promised: W(12, 19) - LEADF,
  rule: W(13, 2) - LEADF, currency: W(13, 6) - LEADF,
  zim: W(14, 5) - LEADF, worthless: W(14, 9) - LEADF, bread: W(14, 14) - LEADF, billions: W(14, 16) - LEADF,
  zimD: W(15, 0) - LEADF,
  queue: W(16, 3) - LEADF, popQ: P(16, 7),
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
// ---------------- where people stand (shared by cameras and cast) ----------------
export const AT = {
  rich1: [0, -8.6] as [number, number], worker: [1.9, -8.9] as [number, number],
  trio: [[-1.2, -9.3], [0, -8.9], [1.2, -9.3]] as [number, number][],
  chauffeur: [1.55, 4.75] as [number, number],
  heir: [2.3, -9.9] as [number, number], grand: [[1.85, -9.9], [2.65, -9.9]] as [number, number][],
  lawyers: [[0.45, -9.3], [2.35, -9.5]] as [number, number][],
  winner: [14.5, -9.6] as [number, number], friend: [13.35, -9.45] as [number, number],
  puzzled: [-14, -9.6] as [number, number],
  queue: [[17.6, 5.35], [18.45, 5.45], [19.3, 5.3], [20.15, 5.45], [21.0, 5.35], [21.85, 5.45]] as [number, number][],
  baker: [22.7, 6.55] as [number, number],
};
const g3 = (p: [number, number], y: number): V3 => [p[0], y, p[1]];
export const CAMS: Record<number, Key[]> = {
  // 1 hook: MS on the rich man in front of the tower; after his pop, glide right to the man checking his phone
  1: [
    { f: 0, s: (f) => dolly([0.3, 1.55, -4.7], g3(AT.rich1, 1.35), pushK(f, 0, 0.0016, 0.006, 30), { fov: 38 }) },
    { f: EV.pop1 + 16, dur: 28, s: (f) => dolly([2.1, 1.55, -5.0], g3(AT.worker, 1.35), pushK(f, EV.pop1 + 16, 0.0018, 0.006, 30), { fov: 38 }) },
  ],
  // 2 the high wide over the plaza: a mountain of gold with billionaires sitting on it -> down onto the pile on "sitting"
  2: [
    { f: S[1].a, s: (f) => { const a = 0.5 + 0.0012 * (f - S[1].a); return dolly([MOUND[0] + 17 * Math.sin(a), 11, MOUND[2] + 17 * Math.cos(a)], [0, 1.0, -15], pushK(f, S[1].a, 0.0012), { fov: 42 }); } },
    { f: EV.sitting - 12, dur: 34, s: (f) => dolly([5.2, 3.0, -7.4], [0, 1.5, -15.2], pushK(f, EV.sitting, 0.0018, 0.005), { fov: 42 }) },
  ],
  // 3 noon on the plaza: three of them in a row, pop pop pop
  3: [
    { f: S[2].a, s: (f) => dolly([0, 1.6, -2.2], [0, 1.25, -9.4], pushK(f, S[2].a, 0.0016, 0.005, 25), { fov: 48 }) },
  ],
  // 4 the pool: an empty party, a top hat floating
  4: [
    { f: S[3].a - 6, s: (f) => dolly(add(VEGAS, [3.0, 2.2, 14.5]), add(VEGAS, [0.6, 1.2, 5.5]), pushK(f, S[3].a, 0.0022), { fov: 46 }) },
  ],
  // 5 the limousine at the kerb, the chauffeur waiting
  5: [
    { f: S[4].a - 6, s: (f) => dolly([3.4, 1.45, -1.9], [0.8, 1.0, 4.0], pushK(f, S[4].a, 0.0018, 0.006, 25), { fov: 44 }) },
  ],
  // 6 the gold pile with hats on it; the kids walk in
  6: [
    { f: S[5].a, s: (f) => dolly([3.0, 2.2, -3.6], [-2.0, 0.9, -12.5], pushK(f, S[5].a, 0.0018), { fov: 46 }) },
  ],
  // 7 the heir: MS, push on "billion"
  7: [
    { f: S[6].a, s: (f) => dolly([2.55, 1.1, -6.9], g3(AT.heir, 0.95), pushK(f, S[6].a, 0.0018, 0.007, 30), { fov: 40 }) },
  ],
  // 8 the grandkids
  8: [
    { f: S[7].a, s: (f) => dolly([2.3, 1.1, -5.7], [2.25, 0.85, -9.9], pushK(f, S[7].a, 0.0018, 0.006, 25), { fov: 42 }) },
  ],
  // 9 lawyers snipping, piles multiplying
  9: [
    { f: S[8].a, s: (f) => dolly([1.4, 1.5, -4.0], [1.4, 0.95, -10.0], pushK(f, S[8].a, 0.0015), { fov: 50 }) },
  ],
  // 10 the lottery winner with his giant cheque -> push in on the cheque on the number
  10: [
    { f: S[9].a, s: (f) => dolly([14.75, 1.55, -5.6], g3(AT.winner, 1.35), pushK(f, S[9].a, 0.0016), { fov: 40 }) },
    { f: EV.nine - 8, dur: 30, s: (f) => dolly([14.55, 1.35, -7.0], [14.5, 1.22, -9.6], pushK(f, EV.nine, 0.0015), { fov: 38 }) },
  ],
  // 11 the friend whispers a stock tip
  11: [
    { f: S[10].a, s: (f) => dolly([13.95, 1.5, -4.2], [13.95, 1.3, -9.5], pushK(f, S[10].a, 0.0018, 0.006, 25), { fov: 46 }) },
  ],
  // 12 hot potato in the park
  12: [
    { f: S[11].a - 6, s: (f) => dolly(add(PARK, [0, 1.45, 5.4]), add(PARK, [0, 0.85, -0.7]), pushK(f, S[11].a, 0.0016), { fov: 46 }) },
  ],
  // 13 one stack splits into four
  13: [
    { f: S[12].a, s: (f) => dolly(add(PARK, [0, 1.7, 6.4]), add(PARK, [0, 0.75, -0.4]), pushK(f, S[12].a, 0.0016, 0.005, 25), { fov: 44 }) },
  ],
  // 14 a billionaire on the gold pile throws money to the crowd -> up and back to see many of them doing it
  14: [
    { f: S[13].a - 6, s: (f) => dolly([0.4, 1.5, -3.0], [0, 2.1, -13.5], pushK(f, S[13].a, 0.0015), { fov: 46 }) },
    { f: EV.more - 10, dur: 36, s: (f) => dolly([11, 8.5, 0.5], [0, 1.6, -13.5], pushK(f, EV.more, 0.0012), { fov: 44 }) },
  ],
  // 15 which currency? a puzzled man and his banknote
  15: [
    { f: S[14].a, s: (f) => dolly([-13.8, 1.55, -6.3], g3(AT.puzzled, 1.4), pushK(f, S[14].a, 0.0022, 0.007, 30), { fov: 38 }) },
  ],
  // 16 the bakery queue (low sun), creeping along it
  16: [
    { f: S[15].a - 6, s: (f) => { const k = clamp01((f - S[15].a) / (S[15].b - S[15].a)); return dolly([19.4 + 0.8 * k, 1.7, -2.4], [19.8 + 0.6 * k, 1.15, 5.6], pushK(f, S[15].a, 0.0012), { fov: 50 }); } },
  ],
  // 17 close on a brick of Zimbabwe dollars
  17: [
    { f: S[16].a, s: (f) => dolly([20.2, 1.3, 2.4], [20.15, 1.15, 5.45], pushK(f, S[16].a, 0.003, 0.008, 25), { fov: 40 }) },
  ],
  // 18 the whole queue goes pop
  18: [
    { f: S[17].a, s: (f) => dolly([20.0, 2.3, -2.6], [20.1, 1.2, 5.6], pushK(f, S[17].a, 0.0016), { fov: 50 }) },
  ],
};

// impact kicks: flip sign every frame, decay over 7 f
const KICKS: [number, number][] = [EV.pop1, EV.pop2, EV.popA, EV.popB, EV.popC, EV.popKid, EV.popG1, EV.popG2, EV.popQ, EV.popQ + 6]
  .map((f, i) => [f / FPS, i >= 8 ? 1.0 : 0.6] as [number, number]);
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
  { f: 0, cInf: 11 },                                              // hook MS
  { f: S[1].a, cInf: 0 },                                          // aerial
  { f: EV.sitting - 12, dur: 34, cInf: 7 },
  { f: S[2].a, cInf: 8 },                                          // trio
  { f: S[3].a, cInf: 0 },                                          // pool
  { f: S[4].a, cInf: 9 },                                          // limo
  { f: S[5].a, cInf: 6 },                                          // kids + pile
  { f: S[6].a, cInf: 12 },                                         // heir
  { f: S[8].a, cInf: 8 },                                          // lawyers
  { f: S[9].a, cInf: 11 },                                         // winner
  { f: S[11].a, cInf: 9 },                                         // park
  { f: S[13].a, cInf: 6 },                                         // giving away
  { f: EV.more - 10, dur: 36, cInf: 0 },
  { f: S[14].a, cInf: 12 },                                        // puzzled
  { f: S[15].a, cInf: 7 },                                         // queue
  { f: S[16].a, cInf: 13 },                                        // brick CU
  { f: S[17].a, cInf: 5 },                                         // queue wide
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
