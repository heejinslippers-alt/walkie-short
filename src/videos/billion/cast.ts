// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxStars, fxShadow, fxContact, fxBurst,
  fxSweat, OUTFITS, fxCash, fxPop, fxHat, fxBill, fxPotato, fxQ, fxConfetti, HeldK,
} from "./toon";
import type { GoldState, Stack } from "./coins";
import { FPS, SHOTS, V3, smooth, clamp01, EV, gy, PV, PARK, VEGAS, AT, MOUND, MR, moundY } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  glowM = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, toneMapped: true });
  use(soft: boolean, glow = 0) {
    if (glow > 0) { this.glowM.color.setScalar(glow); this.mesh.material = this.glowM; } else this.mesh.material = soft ? this.soft : this.mat;
  }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.glowM.map = t; this.mesh.renderOrder = this.mesh.material === this.glowM ? 6 : 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; glow?: number; yaw?: number };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
let TIER_K = 1;
/** preview renders at a smaller buffer: draw character canvases smaller too (1 = sized for the 1440 x 2560 final) */
export const setTierK = (k: number) => { TIER_K = Math.min(1, Math.max(0.25, k)); };
const tier = (d: number): [number, number, number] => {
  const [w, h, k] = d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
  const m = TIER_K < 1 && d >= 16 ? 1 : TIER_K;
  return [Math.round(w * m), Math.round(h * m), k * m];
};

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- the cast by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[]; gold: GoldState };
let NEXT_I = 100;
const who = (o: Outfit, okey: string, i = NEXT_I++): Who => ({ i, o, okey });
const RICH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((v) => who(OUTFITS.rich(v), `rich${v}`, 30 + v));
const KIDS = [0, 1, 2, 3, 4, 5].map((v) => who(OUTFITS.kid(v), `kid${v}`, 50 + v));
const FOLK = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((v) => who(OUTFITS.folk(v), `folk${v}`, 60 + v));
const WHO = {
  worker: who(OUTFITS.worker, "worker", 1), chauffeur: who(OUTFITS.chauffeur, "chauf", 2), heir: who(OUTFITS.heir, "heir", 3),
  lawyer1: who(OUTFITS.lawyer(0), "law0", 4), lawyer2: who(OUTFITS.lawyer(1), "law1", 5), winner: who(OUTFITS.winner, "winner", 6),
  friend: who(OUTFITS.friend, "friend", 7), baker: who(OUTFITS.baker, "baker", 8),
  musk: who(OUTFITS.musk, "musk", 9), bezos: who(OUTFITS.bezos, "bezos", 10), gates: who(OUTFITS.gates, "gates", 11),
};
const F = (t: number) => Math.round(t * FPS);
/** standing person facing the lens */
const stand = (out: Stage, cam: CamInfo, who: Who, x: number, z: number, t: number, expr: Expr, extra: Partial<FrontOpts> = {}, y = gy(x, z), sc = 1) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { mode: "stand", expr, blink: lidAt(t, who.i), look: 0, ...extra }, {}, sc));
  blob(out, x, y, z, sc);
};
const sitOn = (out: Stage, cam: CamInfo, who: Who, x: number, z: number, t: number, expr: Expr, extra: Partial<FrontOpts> = {}) =>
  out.places.push(person(cam, who, x, moundY(x, z) - 0.05, z, { side: false, mirror: false }, { mode: "sit", expr, blink: lidAt(t, who.i), ...extra }, {}));
/** walking along +-x at 1.6 m/s from x0 (start time t0); side view when the lens is beside the path */
const walker = (out: Stage, cam: CamInfo, who: Who, t: number, t0: number, x0: number, z: number, dir: 1 | -1, expr: Expr, sc = 1) => {
  const x = x0 + dir * 1.25 * Math.max(0, t - t0), ph = (((t - t0) * 1.25 % 1) + 1) % 1;
  const view = viewOf(cam, x, z, dir, 0), blink = lidAt(t, who.i);
  out.places.push(person(cam, who, x, gy(x, z), z, view, { phase: ph, expr, mode: "stroll", blink }, { phase: ph, expr, mode: "march", blink, stomp: 0.2, stride: view.fs }, sc));
  blob(out, x, gy(x, z), z, sc);
  return x;
};
const card = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, o: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, ...o });
const hatAt = (out: Stage, x: number, y: number, z: number, s = 0.42) => card(out, "hat", 300, 300, (p) => fxHat(p), [x, y + s * 0.43, z], s, s);

/** someone who goes POP at frame fp: before it they stand (or sit); then a white star and puff, banknotes and coins
 *  flying out and falling, and the top hat (billionaires) jumping up, spinning and landing where they stood */
type Popper = { who: Who; x: number; z: number; fp: number; expr: Expr; y?: number; sc?: number; extra?: Partial<FrontOpts>; sit?: boolean; seed?: number };
const pop = (out: Stage, cam: CamInfo, t: number, f: number, P: Popper) => {
  const sc = P.sc ?? 1, y = P.y ?? (P.sit ? moundY(P.x, P.z) - 0.05 : gy(P.x, P.z));
  if (f < P.fp) {
    if (P.sit) sitOn(out, cam, P.who, P.x, P.z, t, P.expr, P.extra);
    else stand(out, cam, P.who, P.x, P.z, t, P.expr, P.extra ?? {}, y, sc);
    return;
  }
  const k = f - P.fp, mid = y + (P.sit ? 0.75 : 1.0) * sc;
  if (k < 16) { const u = q(k / 16, 16); card(out, `pop${u}`, 600, 600, (p) => fxPop(p, u), [P.x, mid, P.z], 1.8 * sc, 1.8 * sc, { soft: true }); }
  if (k < 42) { const u = q(k / 42, 42), sd = (P.seed ?? P.who.i) % 5; card(out, `cash${u}|${sd}`, 600, 600, (p) => fxCash(p, u, sd), [P.x, mid, P.z], 1.75 * sc, 1.75 * sc); }
  if (P.who.o.hat === "tophat") {
    const t2 = k / FPS, h = y + 1.95 * sc + 3.0 * t2 - 4.9 * t2 * t2, landed = h <= y;
    const hy = landed ? y : h, rot = landed ? 0 : t2 * 9;
    card(out, "hat", 300, 300, (p) => fxHat(p), [P.x + 0.35 * Math.min(t2, 0.75), hy + 0.42 * sc * 0.43, P.z], 0.42 * sc, 0.42 * sc, { rot });
  }
};
/** banknotes raining over an area (deterministic per index) */
const rain = (out: Stage, t: number, x0: number, x1: number, z0: number, z1: number, top: number, n: number, k = 1) => {
  for (let i = 0; i < n; i++) {
    const h1 = hh(i, 1), h2 = hh(i, 2), h3 = hh(i, 3), fall = (t * (0.35 + 0.2 * h3) + h1) % 1;
    const y = top - fall * (top - 0.2), a = q(((t * 2 + h2 * 6) % 6.283) - 3.14, 6);
    if (fall > k) continue;
    card(out, `bill${a}`, 200, 120, (p) => fxBill(p, a), [x0 + (x1 - x0) * h2 + 0.3 * Math.sin(t * 3 + i), y, z0 + (z1 - z0) * h3], 0.32, 0.19);
  }
};
const held = (k: HeldK, v = 0): Partial<FrontOpts> => ({ prop: ["held", k, v] });
/** spots on the mound where billionaires sit */
const SEATS: [number, number][] = [[0, -15.3], [-1.6, -14.4], [1.6, -14.5], [-2.4, -15.8], [2.3, -16.0], [-0.9, -16.9], [1.0, -16.8], [0.2, -13.6], [-1.0, -13.9]];

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], gold: { mound: true, stacks: [] } };
  const s = SHOTS[id - 1], f = F(t);
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: {
      pop(out, cam, t, f, { who: WHO.musk, x: AT.rich1[0], z: AT.rich1[1], fp: EV.pop1, expr: "smile_closed", extra: held("rocket") });
      pop(out, cam, t, f, { who: WHO.worker, x: AT.worker[0], z: AT.worker[1], fp: EV.pop2, expr: f > EV.became ? "grin" : "neutral", extra: held("phone") });
      break;
    }
    case 2: {
      SEATS.forEach(([x, z], i) => sitOn(out, cam, RICH[(i + 1) % 12], x, z, t, i % 3 ? "smile_closed" : "grin"));
      [[-4.6, -12.4], [-5.4, -15.5], [5.0, -17.2], [-3.4, -18.6], [3.0, -19.0], [-4.0, -11.6]].forEach(([x, z], i) =>
        stand(out, cam, RICH[(i + 4) % 12], x, z, t, i % 2 ? "smile" : "smile_closed"));
      break;
    }
    case 3: {
      const trio = [WHO.bezos, WHO.gates, RICH[1]], props: Partial<FrontOpts>[] = [held("parcel"), {}, {}];
      AT.trio.forEach(([x, z], i) => pop(out, cam, t, f, { who: trio[i], x, z, fp: [EV.popA, EV.popB, EV.popC][i], expr: f > EV.noon ? "nervous" : i === 0 ? "laugh" : "smile_closed", extra: props[i] }));
      SEATS.slice(0, 5).forEach(([x, z], i) => pop(out, cam, t, f, { who: RICH[(i + 5) % 12], x, z, fp: EV.popC + i, expr: "smile_closed", sit: true }));
      break;
    }
    case 4: {
      // the party is over: a top hat bobbing on the water next to the float
      const b = 0.02 * Math.sin(t * 3);
      card(out, "hat", 300, 300, (p) => fxHat(p), [VEGAS[0] + 0.6, 0.18 + b, 5.6], 0.5, 0.5, { rot: 0.15 * Math.sin(t * 2) });
      break;
    }
    case 5: stand(out, cam, WHO.chauffeur, AT.chauffeur[0], AT.chauffeur[1], t, f > EV.forever ? "whistle" : "neutral"); break;
    case 6: {
      SEATS.slice(0, 6).forEach(([x, z]) => hatAt(out, x, moundY(x, z) - 0.04, z));
      [[-4.8, -11.3], [-5.6, -11.9], [-6.4, -11.0]].forEach(([x0, z], i) => {
        if (f >= EV.kids) walker(out, cam, KIDS[i], t, EV.kids / FPS, x0, z, 1, i ? "grin" : "smile");
      });
      break;
    }
    case 7: {
      hatAt(out, 0.3, moundY(0.3, -15.3) - 0.04, -15.3);
      pop(out, cam, t, f, { who: WHO.heir, x: AT.heir[0], z: AT.heir[1], fp: EV.popKid, expr: f > EV.billion ? "shock" : f > EV.inherits ? "grin" : "smile", extra: held("will") });
      break;
    }
    case 8: {
      AT.grand.forEach(([x, z], i) => pop(out, cam, t, f, { who: KIDS[3 + i], x, z, fp: i ? EV.popG2 : EV.popG1, expr: i ? "smile" : "grin", sc: 0.82 }));
      break;
    }
    case 9: {
      const snip = (k: number) => held("scissors", q(0.5 + 0.5 * Math.sin(t * 13 + k), 4));
      stand(out, cam, WHO.lawyer1, AT.lawyers[0][0], AT.lawyers[0][1], t, "stern", f > EV.chop - 6 ? snip(0) : {});
      stand(out, cam, WHO.lawyer2, AT.lawyers[1][0], AT.lawyers[1][1], t, "stern", f > EV.chop ? snip(2) : {});
      const n = 1 + Math.floor(7 * clamp01((f - EV.chop) / (EV.pieces + 24 - EV.chop)));
      const st: Stack[] = [];
      for (let i = 0; i < 8; i++) {
        const born = i === 0 ? -99 : EV.chop + ((EV.pieces + 24 - EV.chop) * i) / 7, g = i < n ? clamp01((f - born) / 5) : 0;
        st.push({ x: 0.75 + i * 0.2, z: -11.0 + (i % 2) * 0.25, h: (i === 0 ? 1.1 - 0.75 * clamp01((f - EV.chop) / 60) : 0.36) * g });
      }
      out.gold.stacks = st;
      break;
    }
    case 10: {
      stand(out, cam, WHO.winner, AT.winner[0], AT.winner[1], t, f > EV.cash ? "laugh" : "grin", held("cheque"));
      const u = q((t * 0.45) % 1, 30);
      card(out, `confetti${u}`, 600, 800, (p) => fxConfetti(p, u), [AT.winner[0], PV + 1.8, AT.winner[1] - 0.8], 3.0, 4.0);
      break;
    }
    case 11: {
      const tipped = f > EV.tip;
      stand(out, cam, WHO.winner, AT.winner[0], AT.winner[1], t, tipped ? "nervous" : "smile", held("cheque"));
      stand(out, cam, WHO.friend, AT.friend[0], AT.friend[1], t, f > EV.he ? "grin" : "smile", { headTilt: f > EV.he ? 9 : 0, tilt: f > EV.he ? 5 : 0 });
      if (f > EV.tip + 6) { const u = clamp01((f - EV.tip - 6) / 30); card(out, "sweat", 120, 180, fxSweat, [AT.winner[0] - 0.24, PV + 1.98 - 0.12 * u, AT.winner[1] + 0.05], 0.08, 0.12); }
      break;
    }
    case 12: {
      // hot potato: four kids in an arc pass it hand to hand, faster and faster
      const KP: [number, number][] = [[-1.12, -0.95], [-0.38, -1.25], [0.38, -1.25], [1.12, -0.95]];
      const t0 = s.a / FPS, el = Math.max(0, t - t0), per = el < 2.6 ? 0.9 : 0.6;
      const n = Math.floor(el / per), ph = (el % per) / per, hold = ph < 0.62;
      const from = n % 4, to = (n + 1) % 4;
      const hand = (i: number): V3 => [PARK[0] + KP[i][0] + 0.16, 0.78, KP[i][1] + 0.05];
      KP.forEach(([x, z], i) => stand(out, cam, KIDS[i], PARK[0] + x, z, t, i === from && hold ? "shock" : i === to && !hold ? "nervous" : "grin",
        i === from && hold ? held("potato") : {}));
      const pt = q(t % 1, 10);
      if (!hold) {
        const u = (ph - 0.62) / 0.38, A = hand(from), Bp = hand(to);
        const P: V3 = [A[0] + (Bp[0] - A[0]) * u, A[1] + (Bp[1] - A[1]) * u + 0.7 * Math.sin(Math.PI * u), A[2] + (Bp[2] - A[2]) * u];
        card(out, `potato${pt}`, 220, 260, (p) => fxPotato(p, pt), [P[0], P[1] + 0.1, P[2]], 0.24, 0.28);
      } else {
        const A = hand(from);
        card(out, `steam${pt}`, 220, 260, (p) => fxPotato(p, pt), [A[0] - 0.02, A[1] + 0.12, A[2] + 0.02], 0.24, 0.28);
      }
      break;
    }
    case 13: {
      const KX = [-1.1, -0.37, 0.37, 1.1];
      const sp = smooth((f - EV.split - 4) / 26);
      KX.forEach((x, i) => stand(out, cam, KIDS[i], PARK[0] + x, -0.7, t, f > EV.nobody ? "laugh" : f > EV.four ? "grin" : "smile"));
      out.gold.stacks = f < EV.split ? [{ x: PARK[0], z: -0.1, h: 1.15, y: 0 }]
        : KX.map((x) => ({ x: PARK[0] + x * sp + 0.22 * sp, z: 0.25 * sp - 0.1, h: 1.15 * (1 - 0.72 * sp) * (sp < 0.02 ? 0.25 : 1), y: 0 }));
      break;
    }
    case 14: {
      // a billionaire on top of the gold throws money to the crowd; wider, more of them do it
      const wav = (k: number) => ({ wave: q(0.5 + 0.5 * Math.sin(t * 9 + k), 4) });
      stand(out, cam, RICH[6], 0, -15.3, t, "laugh", wav(0), moundY(0, -15.3) - 0.04);
      if (f > EV.more - 12) [[-2.0, -15.6], [2.1, -15.9], [-1.0, -13.9], [1.2, -14.0]].forEach(([x, z], i) =>
        stand(out, cam, RICH[(i + 7) % 12], x, z, t, "grin", wav(i + 1), moundY(x, z) - 0.04));
      [[-3.2, -9.6], [-2.0, -9.2], [-0.8, -9.5], [0.6, -9.1], [1.8, -9.5], [3.1, -9.3], [-4.3, -10.2], [4.3, -10.0]].forEach(([x, z], i) =>
        stand(out, cam, FOLK[i % 9], x, z, t, i % 2 ? "laugh" : "grin", { wave: q(0.5 + 0.5 * Math.sin(t * 7 + i * 1.7), 4) }));
      rain(out, t, -4.5, 4.5, -14, -8.5, 4.6, 46);
      break;
    }
    case 15: {
      stand(out, cam, RICH[2], AT.puzzled[0], AT.puzzled[1], t, f > EV.rule ? "nervous" : "smile_closed", { ...held("note"), headTilt: f > EV.rule ? 10 : 0 });
      if (f > EV.currency - 2) { const g = smooth((f - EV.currency + 2) / 6); card(out, "q", 200, 260, fxQ, [AT.puzzled[0] + 0.42, PV + 2.35, AT.puzzled[1]], 0.3 * g, 0.39 * g); }
      break;
    }
    case 16: case 17: case 18: {
      AT.queue.forEach(([x, z], i) => {
        const e: Expr = id === 16 ? (f > EV.billions ? (i % 2 ? "grin" : "laugh") : i % 2 ? "neutral" : "smile_closed") : "smile_closed";
        if (id === 18) pop(out, cam, t, f, { who: FOLK[i], x, z, fp: EV.popQ + i * 3, expr: f > EV.queue ? "nervous" : e, extra: held("brick"), seed: i });
        else stand(out, cam, FOLK[i], x, z, t, e, held("brick"));
      });
      stand(out, cam, WHO.baker, AT.baker[0], AT.baker[1], t, id === 18 && f > EV.popQ + 4 ? "shock" : "smile", held("bread"));
      break;
    }
  }
  return out;
};
export { FPS };
