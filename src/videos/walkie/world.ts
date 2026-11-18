// The whole film as one three.js scene: sky, light rig, the City (city.ts), the beam of reflected sunlight, the
// melting car parts, crane/fins by year, and the cast. update(id, f, camera) poses everything for shot `id` at
// frame f (a pure function of id + f), exactly like the bridge world it is built from.
import * as THREE from "three";
import { V, Kit, Ray } from "./build";
import { ctex, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, ShotDef, EV, SPOT, TOWER_Z, TOWER_H, meltAt, beamAt, clamp01 } from "./story";
import { buildCity, facePoint, Posables } from "./city";
import { PanProp } from "./props";

// no external kit for this film: everything is built in code
export const loadKit = () => Promise.resolve({} as Kit);

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
/** soft ray texture: bright core across v, fading at both edges (u along the ray) */
const rayTex = () => ctex("beamRay", 64, 64, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});

/** every lens position of the film looking at its subject (buildings in the way are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

// beam rays: origins spread over the concave face, all landing within ~1.5 m of the spot
const NR = 26;
const RAYS: { o: V3; t: V3 }[] = Array.from({ length: NR }, (_, i) => {
  const u = ((i * 0.618) % 1) * 1.7 - 0.85, y = 22 + ((i * 0.381) % 1) * 62, o = facePoint(u, y);
  o[2] += 0.3;
  const a = i * 2.4, r = 0.4 + 1.1 * ((i * 0.27) % 1);
  return { o, t: [SPOT[0] + r * Math.cos(a), 0.05, SPOT[2] + r * 0.6 * Math.sin(a)] as V3 };
});

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: { m: THREE.Mesh; off: THREE.Vector3 }[] = [];
  private P: Posables;
  private pan!: PanProp;
  private beam: THREE.Mesh; private beamMat: THREE.MeshBasicMaterial;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.scale.set(w, w / 2, 1); m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push({ m, off: new THREE.Vector3(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d) }); R.add(m);
    }
    this.P = buildCity(R, sightLines());
    this.pan = new PanProp(R);
    // the beam of reflected sunlight: one camera-facing ribbon per ray, rebuilt per frame
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NR * 4 * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(Array.from({ length: NR }, () => [0, 0, 0, 1, 1, 1, 1, 0]).flat()), 2));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(NR * 4 * 3), 3));
    const idx: number[] = []; for (let i = 0; i < NR; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    g.setIndex(idx);
    this.beamMat = new THREE.MeshBasicMaterial({ map: rayTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(g, this.beamMat);
    this.beam.frustumCulled = false; this.beam.layers.set(NOINK); this.beam.renderOrder = 7;
    R.add(this.beam);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.25; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 140);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 320); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 700; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    // the tall shots see far: push the fog back so the skyline and the tower crown stay readable
    const far = id === 2 || id === 12 || id === 13 || (id === 8 && f < EV.blazing - 2);
    this.fog.near = far ? 120 : L.fogNear; this.fog.far = far ? 700 : L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const { m, off } = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.position.set(cam.position.x + off.x, off.y, cam.position.z + off.z);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- the year: crane until 2014, fins after ----
    const P = this.P;
    P.crane.visible = !s.after;
    P.fins.forEach((m, k) => { m.visible = !!s.after && (id > 13 || f > EV.bolted + k * 2); });
    // ---- the car: melting wing mirror and badge ----
    const melt = meltAt(id, f), mp = P.mirror.geometry.attributes.position as THREE.BufferAttribute, b0 = P.mirrorBase;
    for (let i = 0; i < mp.count; i++) {
      const x = b0[i * 3], y = b0[i * 3 + 1], z = b0[i * 3 + 2], o = clamp01(z / 0.27);
      const wob = 0.02 * Math.sin(x * 40 + z * 30);
      mp.setXYZ(i, x * (1 + 0.15 * melt * o), y - melt * (0.04 + 0.32 * o * o) - melt * (y < 0 ? 0.05 + wob : 0) * o, z * (1 - 0.18 * melt));
    }
    mp.needsUpdate = true; P.mirror.geometry.computeVertexNormals();
    // the badge softens and sags a little; the gold runs down the grille as two drips
    P.badge.scale.set(1 - 0.15 * melt, 1 + 0.25 * melt, 1 + 0.12 * melt);
    P.badge.position.y = P.badgeY - 0.02 * melt;
    P.drips.forEach((d, k) => {
      const m = clamp01(melt * (k ? 1.4 : 1.9) - (k ? 0.25 : 0.1));
      d.visible = m > 0.02;
      const sy = 0.3 + 2.2 * m;
      d.scale.set(1, sy, 1);
      d.position.y = P.badgeY - 0.035 - 0.044 * sy;
    });
    // ---- the beam ----
    const bk = beamAt(id, f) * (id === 8 ? 0.55 : id === 12 ? 0.5 : 0);
    this.beam.visible = bk > 0.005 && s.place === "london";
    if (this.beam.visible) {
      const pa = this.beam.geometry.attributes.position as THREE.BufferAttribute, ca = this.beam.geometry.attributes.color as THREE.BufferAttribute;
      const O = new THREE.Vector3(), Tt = new THREE.Vector3(), d = new THREE.Vector3(), sd = new THREE.Vector3(), mid = new THREE.Vector3();
      RAYS.forEach((r, i) => {
        O.set(...r.o); Tt.set(...r.t);
        d.subVectors(Tt, O); mid.addVectors(O, Tt).multiplyScalar(0.5);
        sd.crossVectors(d, mid.sub(cam.position)).normalize();
        // thin rays, faded where they pass close to the lens (near the lens a ray fills the frame as a pale sheet)
        const near = clamp01((mid.length() - 12) / 40);
        const w0 = 0.7, w1 = 0.2;
        pa.setXYZ(i * 4, O.x - sd.x * w0, O.y - sd.y * w0, O.z - sd.z * w0);
        pa.setXYZ(i * 4 + 1, O.x + sd.x * w0, O.y + sd.y * w0, O.z + sd.z * w0);
        pa.setXYZ(i * 4 + 2, Tt.x + sd.x * w1, Tt.y + sd.y * w1, Tt.z + sd.z * w1);
        pa.setXYZ(i * 4 + 3, Tt.x - sd.x * w1, Tt.y - sd.y * w1, Tt.z - sd.z * w1);
        const k0 = 0.08 * bk * near, k1 = 0.75 * bk * near;
        ca.setXYZ(i * 4, k0, k0 * 0.85, k0 * 0.55); ca.setXYZ(i * 4 + 1, k0, k0 * 0.85, k0 * 0.55);
        ca.setXYZ(i * 4 + 2, k1, k1 * 0.9, k1 * 0.6); ca.setXYZ(i * 4 + 3, k1, k1 * 0.9, k1 * 0.6);
      });
      pa.needsUpdate = true; ca.needsUpdate = true;
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.pan.set(st.pan, cam.position, t);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft, p.glow ?? 0);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    void TOWER_Z; void TOWER_H;
    return focus;
  }
}
