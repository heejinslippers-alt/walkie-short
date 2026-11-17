// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxStars, fxShadow, fxContact, fxBurst,
  SUIT, REPORTER, BARBER, ARCHITECT, BOY, TOURIST, office, fxPan, fxEgg, fxSmoke, fxHeat, fxMagnifier, fxLeaf, fxShades, fxBag,
  fxBlueprint, fxSweat, fxGlare, fxSpot, fxMat, fxPad,
} from "./toon";
import { FPS, D0, SHOTS, V3, smooth, clamp01, EV, gy, PV, CAR, MIRROR, SPOT, PAN, MAT, PARK, VEGAS, TOWER_Z, TOWER_H, beamAt, meltAt } from "./story";
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
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

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
export type Stage = { places: Place[]; fx: FxPlace[] };
const WHO = {
  driver: { i: 1, o: SUIT, okey: "suit" }, reporter: { i: 2, o: REPORTER, okey: "rep" }, barber: { i: 3, o: BARBER, okey: "barb" },
  architect: { i: 4, o: ARCHITECT, okey: "arch" }, boy: { i: 5, o: BOY, okey: "boy" }, tourist: { i: 6, o: TOURIST, okey: "tour" },
};
const OFFICE = [0, 1, 2, 3, 4, 5, 6].map((v) => ({ i: 10 + v, o: office(v), okey: `off${v}` }));
const F = (t: number) => Math.round(t * FPS);
/** standing person facing the lens */
const stand = (out: Stage, cam: CamInfo, who: Who, x: number, z: number, t: number, expr: Expr, extra: Partial<FrontOpts> = {}, y = gy(x, z), sc = 1) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { mode: "stand", expr, blink: lidAt(t, who.i), look: 0, ...extra }, {}, sc));
  blob(out, x, y, z, sc);
};
/** walking along +-x at 1.6 m/s from x0 (start time t0); side view when the lens is beside the path */
const walker = (out: Stage, cam: CamInfo, who: Who, t: number, t0: number, x0: number, z: number, dir: 1 | -1, expr: Expr) => {
  const x = x0 + dir * 1.6 * Math.max(0, t - t0), ph = (((t - t0) % 1) + 1) % 1;
  const view = viewOf(cam, x, z, dir, 0), blink = lidAt(t, who.i);
  out.places.push(person(cam, who, x, gy(x, z), z, view, { phase: ph, expr, mode: "stroll", blink }, { phase: ph, expr, mode: "march", blink, stomp: 0.55, stride: view.fs }));
  blob(out, x, gy(x, z), z);
  return x;
};
const card = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, h: number, o: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h, ...o });
const smokeAt = (out: Stage, t: number, at: V3, size: number, dark = 0.5, k = 1) => {
  const u = q((t * 0.7) % 1, 24);
  card(out, `smoke${u}|${dark}`, 400, 600, (p) => fxSmoke(p, u, dark), [at[0], at[1] + size * 0.75 * k, at[2]], size * 0.67 * k, size * k, { soft: true });
};
const heatAt = (out: Stage, t: number, at: V3, size: number) => {
  const u = q((t * 0.8) % 1, 20);
  card(out, `heat${u}`, 400, 400, (p) => fxHeat(p, u), [at[0], at[1] + size / 2, at[2]], size, size, { soft: true });
};
const spotAt = (out: Stage, at: V3, r: number, k: number) => { if (k > 0.01) card(out, "spot", 400, 400, fxSpot, [at[0], at[1] + 0.03, at[2]], 2 * r, 2 * r, { flat: true, glow: 1.6 * k }); };

const CROWD: [number, number][] = [[3.4, 5.9], [4.3, 5.2], [5.2, 6.4], [6.1, 5.4], [7.0, 6.1], [2.7, 6.9], [7.8, 7.0]];
const crowd = (out: Stage, cam: CamInfo, t: number, expr: (i: number) => Expr, tilt = 0) =>
  CROWD.forEach(([x, z], i) => stand(out, cam, OFFICE[i], x, z, t, expr(i), { headTilt: tilt * (i % 2 ? 1 : 0.7) }));

const panAt = (out: Stage, egg: number, face: "none" | "happy" | "dazed" | "x", sizzle: number) => {
  const sz = q(sizzle, 12);
  card(out, `pan${egg}${face}${sz}`, 600, 400, (p) => fxPan(p, egg, face, sz), [PAN[0], PAN[1] + 0.01, PAN[2]], 0.75, 0.5, { flat: true, rot: 0.25 });
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = F(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const beam = beamAt(id, f), melt = meltAt(id, f);
  if (s.place === "london" && id <= 12 && id !== 2) spotAt(out, [SPOT[0], gy(SPOT[0], SPOT[2]), SPOT[2]], 2.4, 0.45 * beam);
  switch (id) {
    case 1: {
      smokeAt(out, t, [MIRROR[0] - 0.4, 1.0, MIRROR[2] - 0.3], 1.6, 0.6);
      smokeAt(out, t + 0.4, [CAR[0] + 1.6, 0.9, CAR[2]], 1.3, 0.5);
      heatAt(out, t, [CAR[0], 1.2, CAR[2] + 1.1], 2.2);
      break;
    }
    case 3: {
      const walkT = EV.popOut / FPS;
      if (t < walkT) stand(out, cam, WHO.driver, -0.2, 4.55, t, f > EV.park ? "smile_closed" : "neutral");
      else walker(out, cam, WHO.driver, t, walkT, -0.2, 4.55, 1, "smile_closed");
      break;
    }
    case 4: {
      if (f < EV.wing - 3) {
        const backT = EV.back / FPS, x = Math.max(0.3, 4.2 - 1.6 * (t - s.a / FPS));
        if (x > 0.3 && t < backT) walker(out, cam, WHO.driver, t, s.a / FPS, 4.2, 4.6, -1, "neutral");
        else stand(out, cam, WHO.driver, 0.3, 4.6, t, f > EV.back + 8 ? "shock" : "neutral");
      } else {
        smokeAt(out, t, [MIRROR[0] + 0.05, MIRROR[1] + 0.05, MIRROR[2] + 0.15], 0.6, 0.55);
        if (f > EV.badge - 20) smokeAt(out, t + 0.3, [CAR[0] + 2.5, 0.75, CAR[2] - 0.1], 0.6, 0.55);
        heatAt(out, t, [MIRROR[0], MIRROR[1] - 0.2, MIRROR[2] + 0.3], 0.7);
      }
      void melt;
      break;
    }
    case 5: {
      const egg = f < EV.crack + 8 ? 0 : f < EV.fries ? 1 : 2, siz = f > EV.crack + 8 ? (t * 2) % 1 : 0;
      stand(out, cam, WHO.reporter, PAN[0] - 0.75, PAN[2] + 0.25, t, f > EV.fries + 4 ? "grin" : f > EV.crack ? "smile" : "neutral",
        { wave: f > EV.fries + 4 ? 1 : undefined });
      card(out, "pad", 200, 160, fxPad, [PAN[0] - 0.35, PV + 1.05, PAN[2] + 0.3], 0.2, 0.16);
      panAt(out, egg, "none", siz);
      if (f >= EV.crack - 4 && f < EV.crack + 8) { const u = clamp01((f - EV.crack + 4) / 12); card(out, "egg", 300, 300, fxEgg, [PAN[0], PAN[1] + 0.9 - 0.85 * u * u, PAN[2]], 0.12, 0.12); }
      if (f >= EV.crack + 6 && f < EV.crack + 16) { const u = q((f - EV.crack - 6) / 10, 10); card(out, `burst${u}`, 500, 500, (p) => fxBurst(p, u), [PAN[0], PAN[1] + 0.1, PAN[2]], 0.5, 0.5); }
      if (egg === 2) smokeAt(out, t, [PAN[0], PAN[1], PAN[2]], 0.7, 0.05);
      heatAt(out, t, [PAN[0] - 0.9, PV, PAN[2] - 0.3], 1.2);
      break;
    }
    case 6: {
      const sm = smooth((f - EV.smoke) / 20);
      card(out, `mat${q(sm, 10)}`, 400, 260, (p) => fxMat(p, q(sm, 10)), [MAT[0], MAT[1], MAT[2] - 0.05], 1.2, 0.78, { flat: true });
      if (sm > 0.02) smokeAt(out, t, [MAT[0] + 0.1, MAT[1], MAT[2] - 0.1], 1.6, 0.7, sm);
      stand(out, cam, WHO.barber, MAT[0] + 1.05, MAT[2] + 0.15, t, f > EV.smoke + 14 ? "shock" : "neutral");
      spotAt(out, [MAT[0], PV, MAT[2] - 0.2], 1.1, 0.5);
      break;
    }
    case 7: {
      const up = f > EV.looks;
      crowd(out, cam, t, (i) => (up ? (i % 3 ? "shock" : "nervous") : i % 2 ? "neutral" : "smile"), up ? -smooth((f - EV.looks) / 8) * 8 : 0);
      break;
    }
    case 8: {
      // the glare on the concave face, then the beam (world.ts draws the rays)
      const fp: V3 = [0, 44, TOWER_Z + 13.2];
      const g = smooth((f - EV.glass) / 30), u = q((t * 0.5) % 1, 20);
      if (f < EV.blazing - 2) card(out, `glare${u}`, 500, 500, (p) => fxGlare(p, u), fp, 34 * (0.5 + 0.5 * g), 34 * (0.5 + 0.5 * g), { glow: 1.1 * g });
      else {
        crowd(out, cam, t, () => "shock");
        card(out, `glare${u}`, 500, 500, (p) => fxGlare(p, u), fp, 26, 26, { glow: 1.0 });
        spotAt(out, [SPOT[0], gy(SPOT[0], SPOT[2]), SPOT[2]], 3.2, 1);
      }
      break;
    }
    case 9: crowd(out, cam, t, (i) => (f > EV.hurt ? (i % 2 ? "relief" : "smile_closed") : "relief_open")); break;
    case 10: panAt(out, 2, f > EV.did ? "x" : "dazed", (t * 2) % 1); smokeAt(out, t, [PAN[0], PAN[1], PAN[2] - 0.05], 0.5, 0.05); break;
    case 11: {
      const kx = PARK[0] - 0.2;
      stand(out, cam, WHO.boy, kx, 0.05, t, f > EV.burning + 6 ? "grin" : "smile", { tilt: 6 });
      card(out, "magnifier", 500, 500, fxMagnifier, [PARK[0] + 0.48, 0.62, 0.22], 0.36, 0.36, { rot: -0.3 });
      const burn = smooth((f - EV.sun) / 50);
      card(out, `leaf${q(burn, 12)}`, 400, 260, (p) => fxLeaf(p, q(burn, 12)), [PARK[0] + 0.6, 0.012, 0.3], 0.45, 0.29, { flat: true, rot: 0.4 });
      const u = q((t * 0.5) % 1, 20);
      card(out, `glare${u}`, 500, 500, (p) => fxGlare(p, u), [PARK[0] + 0.6, 0.03, 0.3], 0.22, 0.22, { glow: 1.5 * (0.4 + 0.6 * burn) });
      if (f > EV.burning - 6) smokeAt(out, t, [PARK[0] + 0.62, 0.0, 0.3], 0.5, 0.5, smooth((f - EV.burning + 6) / 12));
      break;
    }
    case 12: spotAt(out, [SPOT[0], gy(SPOT[0], SPOT[2]), SPOT[2]], 3.2, beam); break;
    case 13: {
      if (f > EV.shades - 8) {
        const u = clamp01((f - EV.shades + 8) / 18), drop = (1 - u) * (1 - u) * 40, bounce = u >= 1 ? 0 : 0;
        card(out, "shades", 900, 340, fxShades, [0, TOWER_H - 20 + drop + bounce, TOWER_Z + 16.5], 46, 17.4);
      }
      break;
    }
    case 14: {
      stand(out, cam, WHO.architect, 0, -9.4, t, f > EV.seen ? "nervous" : "neutral", { look: f > EV.seen ? -1 : 0 });
      card(out, "blueprint", 420, 140, fxBlueprint, [0.42, PV + 1.05, -9.25], 0.55, 0.18, { rot: -0.6 });
      if (f > EV.seen + 6) { const u = clamp01((f - EV.seen - 6) / 30); card(out, "sweat", 120, 180, fxSweat, [-0.28, PV + 2.0 - 0.15 * u, -9.2], 0.09, 0.135); }
      break;
    }
    case 15: {
      const tx = VEGAS[0] + 3.0, tz = 11.6, m = smooth((f - EV.melting) / 50);
      stand(out, cam, WHO.tourist, tx, tz, t, f > EV.bags ? "shock" : f > EV.melting ? "nervous" : "smile_closed");
      card(out, `bag${q(m, 16)}`, 360, 460, (p) => fxBag(p, q(m, 16)), [tx + 0.48, 0.55, tz + 0.1], 0.36, 0.46);
      if (m > 0.1) heatAt(out, t, [tx + 0.5, 0.2, tz + 0.2], 0.8);
      spotAt(out, [tx + 0.4, 0, tz + 0.2], 1.6, 0.6);
      // loungers' sunbathers (sitting)
      [[VEGAS[0] - 5.8, 11.4], [VEGAS[0] - 0.6, 11.4], [VEGAS[0] + 7.2, 11.4]].forEach(([x, z], i) =>
        out.places.push(person(cam, OFFICE[(i + 2) % 7], x, 0.4, z, { side: false, mirror: false }, { mode: "sit", expr: f > EV.bags ? "shock" : "smile_closed", blink: lidAt(t, 20 + i) }, {})));
      break;
    }
  }
  return out;
};
export { FPS };
