// Real 3D props for the egg gag (shots 5 and 10): a cast-iron frying pan on the pavement, a whole egg that drops
// into it, the raw then fried egg (wavy white + domed yolk). The yolk carries a painted face (none / dazed / x) that
// is turned toward the lens every frame. Everything uses the same two-tone materials as the rest of the world, so the
// ink pass outlines it like the street around it.
import * as THREE from "three";
import { lam } from "./build";
import { ctex } from "./paint";
import { twoTone } from "./shade";
import { PAN, PV } from "./story";

export type YolkFace = "none" | "happy" | "dazed" | "x";
export type PanState = { egg: 0 | 1 | 2; face: YolkFace; drop?: number }; // drop: height (m) of the falling whole egg, undefined = none

const R_PAN = 0.23;

const yolkTex = (face: YolkFace) => ctex("yolk_" + face, 256, 256, (g) => {
  const gr = g.createRadialGradient(100, 96, 10, 128, 128, 140);
  gr.addColorStop(0, "#ffe08a"); gr.addColorStop(0.35, "#ffbf2e"); gr.addColorStop(1, "#f29e12");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  if (face === "none") return;
  g.strokeStyle = "#2a1a22"; g.lineCap = "round"; g.lineWidth = 11;
  const ex = [92, 164], ey = 112;
  if (face === "x") for (const x of ex) { g.beginPath(); g.moveTo(x - 15, ey - 15); g.lineTo(x + 15, ey + 15); g.moveTo(x + 15, ey - 15); g.lineTo(x - 15, ey + 15); g.stroke(); }
  else if (face === "dazed") for (const x of ex) { g.beginPath(); g.arc(x, ey, 17, 0, 5.4); g.stroke(); g.lineWidth = 7; g.beginPath(); g.arc(x, ey, 6, 0, 5.4); g.stroke(); g.lineWidth = 11; }
  else for (const x of ex) { g.beginPath(); g.arc(x, ey + 8, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  g.beginPath();
  if (face === "happy") g.arc(128, 160, 24, 0.2, Math.PI - 0.2); else g.arc(128, 186, 24, Math.PI + 0.35, -0.35);
  g.stroke();
});

/** wavy outline of an egg white, radius ~r, flat shape in x/y (laid flat later) */
const whiteShape = (r: number, wav: number, seed: number) => {
  const s = new THREE.Shape(), N = 64;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 1 + wav * (0.55 * Math.sin(a * 3 + seed) + 0.3 * Math.sin(a * 5 + seed * 2) + 0.15 * Math.sin(a * 9));
    const x = r * k * Math.cos(a) * 1.08, y = r * k * Math.sin(a) * 0.92;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
};
const flatWhite = (r: number, wav: number, seed: number, th: number) => {
  const g = new THREE.ExtrudeGeometry(whiteShape(r, wav, seed), { depth: th, bevelEnabled: true, bevelThickness: th * 0.6, bevelSize: th * 0.8, bevelSegments: 3, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.computeVertexNormals();
  return g;
};

export class PanProp {
  group = new THREE.Group();
  private rawWhite: THREE.Mesh; private friedWhite: THREE.Mesh; private yolk: THREE.Mesh; private whole: THREE.Mesh;
  private yolkMats = new Map<YolkFace, THREE.Material>();

  constructor(root: THREE.Object3D) {
    const G = this.group;
    G.position.set(PAN[0], PV, PAN[2]);
    G.rotation.y = 0.5;
    const mk = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = G) => {
      const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me;
    };
    // pan: one lathed shell (outside wall, rim, inside wall, cooking floor)
    const prof: THREE.Vector2[] = [
      [0, 0.004], [R_PAN - 0.03, 0.004], [R_PAN - 0.012, 0.01], [R_PAN, 0.045], [R_PAN + 0.006, 0.058], [R_PAN - 0.006, 0.06],
      [R_PAN - 0.016, 0.03], [R_PAN - 0.035, 0.013], [0, 0.012],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#5d5b69", specular: "#a0a0b4", shininess: 45 }), 0.15);
    mk(new THREE.LatheGeometry(prof, 64), iron);
    const floor = new THREE.CircleGeometry(R_PAN - 0.036, 48); floor.rotateX(-Math.PI / 2); floor.translate(0, 0.0125, 0);
    mk(floor, twoTone(new THREE.MeshPhongMaterial({ color: "#6c6977", specular: "#b8b8cc", shininess: 60 }), 0.15));
    // handle: a tapered bar rising gently from the rim, with a wooden grip
    const neck = new THREE.CylinderGeometry(0.014, 0.018, 0.14, 12); neck.rotateZ(-(Math.PI / 2 - 0.22)); neck.translate(R_PAN + 0.06, 0.06, 0);
    mk(neck, iron);
    const grip = new THREE.CapsuleGeometry(0.02, 0.17, 6, 14); grip.rotateZ(-(Math.PI / 2 - 0.22)); grip.translate(R_PAN + 0.215, 0.094, 0);
    mk(grip, lam("panGrip", () => ({ color: "#6b4630" })));
    // egg: raw (glossy, smooth, slightly see-through) and fried (wavy, crisp golden edge)
    const rawM = twoTone(new THREE.MeshPhongMaterial({ color: "#f4f1ea", specular: "#ffffff", shininess: 90, transparent: true, opacity: 0.88 }), 0.15);
    this.rawWhite = mk(flatWhite(0.095, 0.05, 1.3, 0.008), rawM); this.rawWhite.position.set(-0.01, 0.013, 0);
    const friedM = lam("eggWhite", () => ({ color: "#fbf8f0" }));
    this.friedWhite = mk(flatWhite(0.11, 0.13, 1.3, 0.006), friedM); this.friedWhite.position.set(-0.01, 0.013, 0);
    const edge = mk(flatWhite(0.114, 0.13, 1.3, 0.003), lam("eggEdge", () => ({ color: "#e8b866" })), this.friedWhite);
    edge.position.y = -0.002; edge.scale.set(1.02, 1, 1.02);
    // yolk: a squashed dome with planar UVs so the face texture sits on top like a decal
    const yg = new THREE.SphereGeometry(0.04, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = yg.attributes.position, uv = yg.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 0.08, 0.5 - p.getZ(i) / 0.08);
    yg.scale(1, 0.62, 1);
    this.yolk = mk(yg, this.yolkMat("none"));
    this.yolk.position.set(-0.015, 0.02, -0.005);
    // the whole egg falling in
    const eg = new THREE.SphereGeometry(0.026, 24, 16); eg.scale(1, 1.3, 1);
    this.whole = mk(eg, lam("eggShell", () => ({ color: "#f2e4cc" })), root);
    root.add(G);
    G.visible = false; this.whole.visible = false;
  }

  private yolkMat(face: YolkFace) {
    let m = this.yolkMats.get(face);
    if (!m) {
      m = twoTone(new THREE.MeshPhongMaterial({ map: yolkTex(face), specular: "#fff4c8", shininess: 70 }), 0.15);
      this.yolkMats.set(face, m);
    }
    return m;
  }

  /** pose for this frame; null hides everything */
  set(st: PanState | null | undefined, camPos: THREE.Vector3, t: number) {
    const G = this.group;
    G.visible = !!st;
    this.whole.visible = !!st && st.drop !== undefined;
    if (!st) return;
    this.rawWhite.visible = st.egg === 1;
    this.friedWhite.visible = st.egg === 2;
    this.yolk.visible = st.egg >= 1;
    if (st.egg >= 1) {
      this.yolk.material = this.yolkMat(st.face);
      // the face looks at the lens: turn the yolk about y (in pan space) toward the camera
      const w = new THREE.Vector3(); this.yolk.getWorldPosition(w);
      this.yolk.rotation.y = Math.atan2(camPos.x - w.x, camPos.z - w.z) - G.rotation.y;
      // a tiny wobble while it sizzles
      const s = 1 + 0.025 * Math.sin(t * 19);
      this.yolk.scale.set(s, 1 / s, s);
    }
    if (st.drop !== undefined) {
      this.whole.position.set(PAN[0] - 0.01, PV + 0.045 + st.drop, PAN[2]);
      this.whole.rotation.set(0.3, 0, 0.5 + st.drop * 2);
    }
  }
}
