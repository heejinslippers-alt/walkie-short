// Everything that moves on the roads of the traffic short, all real 3D in the city's two-tone look: a pool of cars in
// different colours (brake lights glow when they brake, the nose dips), the white self-driving car with its roof
// sensor, a lorry, the traffic light, the speed-dial post. Plus the places this film adds to the city world: the 230 m
// test ring on the lawn (Nagoya 2008 / Tucson 2017), a Paris roundabout and a Texas desert road.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, addVeg } from "./build";
import { twoTone } from "./shade";
import { buildCar, shopBlock } from "./city";
import { rng } from "./paint";
import { RING, RING_R, PARIS, RB_R, TEXAS, LIGHT_X, PV } from "./story";

export type CarPose = { x: number; z: number; yaw: number; y?: number; brake?: number; pitch?: number };
export type TrafficState = { cars: CarPose[]; av?: CarPose; truck?: CarPose; light?: "red" | "amber" | "green" | null };

const PALETTE = ["#c8453b", "#2f6ab5", "#f2b33d", "#3fa14a", "#e9e6df", "#23232c", "#7b5ac9", "#2f9ad0", "#f07a2c", "#8c3b4a", "#5d6a7a", "#d9487a", "#4a8a8c"];
const N_CARS = 30;
type Car = { g: THREE.Group; tail: THREE.MeshLambertMaterial[] };

export class TrafficProps {
  private cars: Car[] = [];
  private av: Car; private truck: Car;
  private lamps: Record<"red" | "amber" | "green", THREE.MeshLambertMaterial>;
  constructor(root: THREE.Object3D) {
    const mk = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D) => {
      const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me;
    };
    for (let i = 0; i < N_CARS; i++) {
      const c = buildCar(root, PALETTE[i % PALETTE.length], [0, 0, 0]);
      c.carRoot.rotation.order = "YXZ"; c.carRoot.visible = false;
      this.cars.push({ g: c.carRoot, tail: [c.tail] });
    }
    // the self-driving car: white, with a black sensor puck on the roof
    const a = buildCar(root, "#f4f2ec", [0, 0, 0]);
    a.carRoot.rotation.order = "YXZ"; a.carRoot.visible = false;
    const puck = mk(new THREE.CylinderGeometry(0.3, 0.34, 0.22, 24), lam("sensor", () => ({ color: "#202228" })), a.carRoot); puck.position.set(-0.35, 1.62, 0);
    const ring = mk(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 24), lam("sensorBlue", () => ({ color: "#3fb4e8" })), a.carRoot); ring.position.set(-0.35, 1.56, 0);
    this.av = { g: a.carRoot, tail: [a.tail] };
    // the lorry: cab + box trailer on six wheels, nose toward +x
    const tg = new THREE.Group(); tg.rotation.order = "YXZ"; tg.visible = false; root.add(tg);
    const cabM = twoTone(new THREE.MeshPhongMaterial({ color: "#c8453b", specular: "#f0d0c8", shininess: 50 }), 0.15);
    const boxM = lam("trailer", () => ({ color: "#ecebe6" })), dark = lam("truckDark", () => ({ color: "#22242c" }));
    const glassM = twoTone(new THREE.MeshPhongMaterial({ color: "#1a2232", specular: "#c8d6ee", shininess: 80 }), 0.15);
    mk(boxGeo(V(1.9, 0.6, -1.15), V(4.0, 3.0, 1.15)), cabM, tg);
    mk(boxGeo(V(3.98, 1.9, -1.0), V(4.03, 2.8, 1.0)), glassM, tg);
    mk(boxGeo(V(-6.5, 0.9, -1.25), V(1.7, 3.9, 1.25)), boxM, tg);
    mk(boxGeo(V(4.0, 0.5, -1.2), V(4.2, 0.85, 1.2)), dark, tg);
    const tTail = new THREE.MeshLambertMaterial({ color: "#c8333b", emissive: new THREE.Color("#ff2a2a"), emissiveIntensity: 0 });
    for (const sd of [-1, 1]) { const t = mk(boxGeo(V(-6.56, 1.0, sd * 1.05 - 0.15), V(-6.5, 1.3, sd * 1.05 + 0.15)), tTail, tg); void t; }
    const tyre = lam("tyre", () => ({ color: "#26232a" }));
    for (const wx of [3.0, -3.6, -5.0]) for (const sd of [-1, 1]) {
      const w = new THREE.CylinderGeometry(0.52, 0.52, 0.4, 24); w.rotateX(Math.PI / 2); w.translate(wx, 0.52, sd * 1.05); mk(w, tyre, tg);
    }
    this.truck = { g: tg, tail: [tTail] };
    // the traffic light on the south kerb, lamps facing oncoming eastbound traffic (-x)
    const pole = lam("signalPole", () => ({ color: "#2a2d36" }));
    mk(new THREE.CylinderGeometry(0.07, 0.08, 3.0, 12).translate(LIGHT_X, PV + 1.5, 4.45), pole, root);
    mk(boxGeo(V(LIGHT_X - 0.16, PV + 2.15, 4.3), V(LIGHT_X + 0.16, PV + 3.15, 4.6)), pole, root);
    const lamp = (c: string) => new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c), emissiveIntensity: 0 });
    this.lamps = { red: lamp("#ff3b30"), amber: lamp("#ffb020"), green: lamp("#36d46a") };
    (["red", "amber", "green"] as const).forEach((k, i) => {
      const s = new THREE.SphereGeometry(0.11, 16, 10); s.scale(0.6, 1, 1);
      mk(s.translate(LIGHT_X - 0.17, PV + 2.95 - i * 0.31, 4.45), this.lamps[k], root);
    });
    // the speed-dial post on the north pavement (the dial itself is a card from cast.ts)
    mk(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 10).translate(2.0, PV + 1.0, -4.75), pole, root);

    const b = new Batch(), r = rng(31);
    const asphalt = lam("ringAsphalt", () => ({ color: "#5b5d66" })), lineW = lam("ringLine", () => ({ color: "#f4f1ea" }));
    const flat = (g: THREE.BufferGeometry, at: number[]) => { g.rotateX(-Math.PI / 2); g.translate(at[0], at[1], at[2]); return g; };
    // ---- the test ring on the lawn ----
    b.add(flat(new THREE.RingGeometry(RING_R - 3.2, RING_R + 3.2, 160), [RING[0], 0.02, RING[2]]), asphalt);
    for (const rr of [RING_R - 3.0, RING_R + 3.0]) b.add(flat(new THREE.RingGeometry(rr - 0.1, rr + 0.1, 160), [RING[0], 0.03, RING[2]]), lineW);
    // traffic cones dotted along the inside, a few people watching from the middle
    const cone = lam("cone", () => ({ color: "#f07a2c" }));
    for (let i = 0; i < 24; i++) { const a2 = (i / 24) * Math.PI * 2; b.add(new THREE.ConeGeometry(0.22, 0.6, 12).translate(RING[0] + Math.cos(a2) * (RING_R - 4), 0.3, RING[2] + Math.sin(a2) * (RING_R - 4)), cone); }
    // ---- Paris: paving, the roundabout, an island with a tree, cream blocks on two sides ----
    b.add(flat(new THREE.PlaneGeometry(240, 240), [PARIS[0], -0.02, PARIS[2]]), lam("parisPave", () => ({ color: "#cfc7b8" })));
    b.add(flat(new THREE.RingGeometry(RB_R - 3.6, RB_R + 3.6, 96), [PARIS[0], 0.0, PARIS[2]]), asphalt);
    b.add(flat(new THREE.CircleGeometry(RB_R - 3.62, 64), [PARIS[0], 0.2, PARIS[2]]), lam("islandGrass", () => ({ color: "#6f9a4e" })));
    b.add(new THREE.CylinderGeometry(RB_R - 3.5, RB_R - 3.4, 0.16, 64, 1, true).translate(PARIS[0], 0.08, PARIS[2]), lam("kerbP", () => ({ color: "#d8d2c6" })));
    addVeg(b, "round", PARIS[0], 0.2, PARIS[2], 7, 77, 1);
    for (const sd of [-1, 1]) for (let x = -60; x < 60; x += 12) shopBlock(b, PARIS[0] + x + 6, PARIS[2] + sd * 26, 12, 12, 17, false, "#efe6d3", ["#2f5f6a", "#3f4f8a", "#8c3b4a"][Math.floor(r() * 3)], false, r, sd < 0);
    // ---- Texas: a two-lane desert road, cacti and rocks ----
    b.add(flat(new THREE.PlaneGeometry(400, 8), [TEXAS[0], 0.015, TEXAS[2]]), asphalt);
    for (let x = -200; x < 200; x += 9) b.add(flat(new THREE.PlaneGeometry(4, 0.16), [TEXAS[0] + x, 0.025, TEXAS[2]]), lam("yellowLine", () => ({ color: "#f2c230" })));
    const cactus = lam("cactus", () => ({ color: "#4f8f3a" })), rock = lam("rock", () => ({ color: "#b98a5e" }));
    for (let i = 0; i < 26; i++) {
      const x = TEXAS[0] - 120 + r() * 240, z = TEXAS[2] + (r() < 0.5 ? -1 : 1) * (9 + r() * 40);
      if (r() < 0.55) {
        const h = 1.6 + r() * 2.2; b.add(new THREE.CapsuleGeometry(0.28, h, 6, 12).translate(x, h / 2 + 0.28, z), cactus);
        b.add(new THREE.CapsuleGeometry(0.17, 0.6, 6, 10).translate(x + 0.45, h * 0.55 + 0.3, z), cactus);
      } else b.add(new THREE.SphereGeometry(0.5 + r() * 0.9, 10, 8).scale(1.3, 0.6, 1).translate(x, 0.15, z), rock);
    }
    b.build(root);
  }
  private pose(c: Car, p: CarPose | undefined) {
    c.g.visible = !!p;
    if (!p) return;
    c.g.position.set(p.x, p.y ?? 0, p.z);
    c.g.rotation.set(0, p.yaw, -(p.pitch ?? 0));
    for (const m of c.tail) m.emissiveIntensity = 2.6 * (p.brake ?? 0);
  }
  set(st: TrafficState) {
    this.cars.forEach((c, i) => this.pose(c, st.cars[i]));
    this.pose(this.av, st.av); this.pose(this.truck, st.truck);
    for (const k of ["red", "amber", "green"] as const) this.lamps[k].emissiveIntensity = st.light === k ? 2.4 : 0;
  }
}
