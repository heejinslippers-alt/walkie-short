// The gold of the billionaire short, all real 3D in the same two-tone look as the city: the mound of coins on the tower
// plaza, loose coins around it, coin stacks (posed per frame: the lawyers' piles, the four kids' shares), a pool float
// for the empty party, and the bakery's awning and bread table on the south pavement.
import * as THREE from "three";
import { lam } from "./build";
import { ctex } from "./paint";
import { twoTone } from "./shade";
import { MOUND, MR, moundY, BAKERY, VEGAS } from "./story";

export type Stack = { x: number; z: number; h: number; y?: number };
export type GoldState = { mound: boolean; stacks: Stack[] };

const moundTex = () => ctex("goldMound", 512, 256, (g, r) => {
  g.fillStyle = "#e9b33c"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 520; i++) {
    const x = r() * 512, y = r() * 256, rad = 7 + r() * 6, k = r();
    g.fillStyle = k < 0.33 ? "#f6cf5c" : k < 0.66 ? "#e2a838" : "#f0c04a"; g.strokeStyle = "#a8741c"; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(x, y, rad, rad * 0.8, r() * 3, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = "rgba(255,240,180,0.7)"; g.beginPath(); g.ellipse(x - 1, y - 1, rad * 0.55, rad * 0.4, 0, 3.4, 5.6); g.stroke();
  }
});
const edgeTex = () => ctex("coinEdge", 64, 256, (g) => {
  g.fillStyle = "#e9b33c"; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) { g.fillStyle = "#b9822a"; g.fillRect(0, y + 13, 64, 3); g.fillStyle = "#f7d36a"; g.fillRect(0, y, 64, 3); }
});
const stripeTex = (a: string, b: string, n: number) => ctex("stripe" + a + b + n, 256, 64, (g) => {
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * 256) / n, 0, 256 / n + 1, 64); }
});

const N_STACK = 12;
export class GoldProps {
  private mound = new THREE.Group();
  private stacks: THREE.Mesh[] = [];
  constructor(root: THREE.Object3D) {
    const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#ffffff", map: moundTex(), specular: "#fff0b0", shininess: 50 }), 0.15);
    const coinM = twoTone(new THREE.MeshPhongMaterial({ color: "#f0c04a", specular: "#fff4c8", shininess: 70 }), 0.15);
    const mk = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D) => {
      const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me;
    };
    // the mound: a lumpy half ellipsoid
    const mg = new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const pa = mg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), n = 1 + 0.035 * Math.sin(x * 11 + z * 7) * Math.sin(z * 9 - x * 5) * Math.min(1, y * 4 + 0.2);
      pa.setXYZ(i, x * n, y * n, z * n);
    }
    mg.computeVertexNormals(); mg.scale(MR[0], MR[1], MR[2]);
    const m = mk(mg, gold, this.mound); m.position.set(MOUND[0], MOUND[1] - 0.02, MOUND[2]);
    // loose coins on the slopes and spilled on the paving
    const cg = new THREE.CylinderGeometry(0.13, 0.13, 0.035, 20);
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2, d = i < 40 ? 0.35 + 0.6 * rnd() : 1.02 + 0.25 * rnd();
      const x = MOUND[0] + Math.cos(a) * d * MR[0], z = MOUND[2] + Math.sin(a) * d * MR[2];
      const c = mk(cg, coinM, this.mound);
      c.position.set(x, moundY(x, z) + 0.02, z);
      c.rotation.set((rnd() - 0.5) * 0.9, rnd() * 3, (rnd() - 0.5) * 0.9);
    }
    root.add(this.mound);
    // coin stacks (unit height, scaled per frame)
    const sg = new THREE.CylinderGeometry(0.17, 0.17, 1, 24); sg.translate(0, 0.5, 0);
    const side = twoTone(new THREE.MeshPhongMaterial({ map: edgeTex(), specular: "#fff0b0", shininess: 50 }), 0.15);
    for (let i = 0; i < N_STACK; i++) {
      const st = mk(sg, [side, coinM, coinM] as unknown as THREE.Material, root);
      st.visible = false; this.stacks.push(st);
    }
    // the pool float at the hotel
    const ring = new THREE.TorusGeometry(0.55, 0.19, 16, 40); ring.rotateX(-Math.PI / 2);
    const rm = mk(ring, lam("poolRing", () => ({ map: stripeTex("#f4f1ea", "#ef6f8f", 8) })), root);
    rm.position.set(VEGAS[0] + 1.7, 0.1, 4.9);
    // the bakery: striped awning, a table of loaves by the window
    const aw = new THREE.BoxGeometry(4.4, 0.08, 1.2); aw.rotateX(0.32);
    const awm = mk(aw, lam("awning", () => ({ map: stripeTex("#f4efe2", "#c8453b", 10) })), root);
    awm.position.set(BAKERY[0], 3.05, BAKERY[2] - 0.55);
    const wood = lam("tableWood", () => ({ color: "#8a5a3c" }));
    const tbl = mk(new THREE.BoxGeometry(1.6, 0.08, 0.55), wood, root); tbl.position.set(BAKERY[0] - 1.6, 0.95, BAKERY[2] - 0.4);
    for (const dx of [-0.7, 0.7]) { const lg = mk(new THREE.BoxGeometry(0.06, 0.8, 0.06), wood, root); lg.position.set(BAKERY[0] - 1.6 + dx, 0.55, BAKERY[2] - 0.4); }
    const crust = lam("crust", () => ({ color: "#d9964a" }));
    for (let i = 0; i < 4; i++) {
      const lg = new THREE.CapsuleGeometry(0.09, 0.22, 6, 12); lg.rotateZ(Math.PI / 2); lg.scale(1, 0.8, 1);
      const l = mk(lg, crust, root); l.position.set(BAKERY[0] - 2.15 + i * 0.36, 1.06, BAKERY[2] - 0.4 + (i % 2 ? 0.08 : -0.08)); l.rotation.y = (i % 2 ? 0.25 : -0.2);
    }
  }
  set(st: GoldState) {
    this.mound.visible = st.mound;
    this.stacks.forEach((m, i) => {
      const s = st.stacks[i];
      m.visible = !!s && s.h > 0.01;
      if (!s || !m.visible) return;
      m.position.set(s.x, s.y ?? 0.14, s.z); m.scale.set(1, s.h, 1);
    });
  }
}
