// Static + posable scenery for "The Building That Cooked a Car": Eastcheap (road, kerbs, pavements, Victorian shop
// blocks with painted fronts and a barber's pole), the curved glass tower (concave south face, top-heavy, a crane
// while unfinished, sun-shade fins after 2014), the City skyline, the parked car (melting wing mirror + badge), the
// magnifying-glass lawn and the Las Vegas pool hotel. Everything is two-tone Lambert (shade.ts) like the bridge world.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, quad, V, lam, addVeg, blocked, setSight, Ray } from "./build";
import { ctex, rep, grassHD, stoneHD, brick, rng } from "./paint";
import { twoTone } from "./shade";
import { TOWER_Z, TOWER_H, CAR, MIRROR, BADGE, PARK, VEGAS, V3 } from "./story";

// ---------------- painted textures ----------------
const asphalt = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c6d78"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { const v = 90 + Math.floor(r() * 40); g.fillStyle = `rgba(${v},${v},${v + 8},0.35)`; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
  for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(40,40,50,0.08)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 60 + r() * 120, 30 + r() * 60, r() * 3, 0, 7); g.fill(); }
});
const paving = () => ctex("paving", 1024, 1024, (g, r) => {
  g.fillStyle = "#c9c2b6"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 128) for (let x = 0; x < 1024; x += 128) {
    const v = r() * 18 - 9; g.fillStyle = `rgb(${205 + v},${198 + v},${186 + v})`; g.fillRect(x + 3, y + 3, 122, 122);
  }
  g.fillStyle = "rgba(90,80,70,0.45)"; for (let k = 0; k <= 1024; k += 128) { g.fillRect(k - 2, 0, 4, 1024); g.fillRect(0, k - 2, 1024, 4); }
});
/** glass curtain wall: one tile = 3 panes across x 2 floors (4.5 m x 8 m), sky-blue with a vertical reflection gradient */
const glassTex = (key: string, top: string, bot: string, mull: string) => ctex(key, 384, 512, (g, r) => {
  for (let fl = 0; fl < 2; fl++) for (let i = 0; i < 3; i++) {
    const x = i * 128, y = fl * 256, gr = g.createLinearGradient(x, y, x + 128, y + 256);
    const k = 0.9 + 0.2 * r();
    gr.addColorStop(0, top); gr.addColorStop(0.55 * k, bot); gr.addColorStop(1, top);
    g.fillStyle = gr; g.fillRect(x, y, 128, 256);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(x + 20, y); g.lineTo(x + 60, y); g.lineTo(x + 10, y + 256); g.lineTo(x - 30, y + 256); g.fill();
  }
  g.fillStyle = mull;
  for (let i = 0; i <= 3; i++) g.fillRect(i * 128 - 4, 0, 8, 512);
  for (let fl = 0; fl <= 2; fl++) g.fillRect(0, fl * 256 - 10, 384, 20);
});
/** office glass for the background skyline (darker, bigger grid) */
const officeTex = (i: number) => ctex("office" + i, 256, 256, (g, r) => {
  const pal = [["#9db8d8", "#6f8db3", "#e8eef5"], ["#c7c9cf", "#9aa0ad", "#f0efe9"], ["#a9c3cc", "#7d9aa6", "#e6ece8"], ["#d6c7ae", "#b5a385", "#f2ebdc"]][i % 4];
  g.fillStyle = pal[2]; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const gr = g.createLinearGradient(0, y * 64, 0, y * 64 + 64); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    g.fillStyle = gr; g.fillRect(x * 64 + 6, y * 64 + 10, 52, 46);
    if (r() < 0.2) { g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x * 64 + 6, y * 64 + 10, 52, 46); }
  }
});
/** Victorian upper floors: brick or stucco with tall sash windows (one tile = 3.6 m x 3.4 m floor bay) */
const bayTex = (key: string, wall: string, isBrick: boolean, frame: string) => ctex(key, 256, 240, (g, r) => {
  if (isBrick) {
    g.fillStyle = "#e3cdb0"; g.fillRect(0, 0, 256, 240);
    for (let y = 0, row = 0; y < 240; y += 8, row++) for (let x = -(row % 2) * 9; x < 256; x += 18) {
      const v = r() * 30 - 15; g.fillStyle = `rgb(${Math.min(255, 186 + v)},${92 + v * 0.6},${66 + v * 0.4})`; g.fillRect(x + 1, y + 1, 16, 6);
    }
  } else { g.fillStyle = wall; g.fillRect(0, 0, 256, 240); for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(120,100,80,${0.04 + 0.04 * r()})`; g.beginPath(); g.ellipse(r() * 256, r() * 240, 30, 20, 0, 0, 7); g.fill(); } }
  g.fillStyle = frame; g.fillRect(84, 40, 88, 150);
  const gr = g.createLinearGradient(0, 48, 0, 182); gr.addColorStop(0, "#5e7896"); gr.addColorStop(1, "#33445e");
  g.fillStyle = gr; g.fillRect(92, 48, 72, 134);
  g.fillStyle = frame; g.fillRect(92, 112, 72, 8); g.fillRect(124, 48, 8, 134);
  g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(96, 52, 22, 56);
  g.fillStyle = "#efe6d4"; g.fillRect(78, 188, 100, 12); g.fillRect(78, 30, 100, 12);
});
/** shopfront: big windows, a door, a fascia board in a colour (no lettering) */
const shopTex = (key: string, fascia: string, frame: string, awning: string | null) => ctex(key, 512, 256, (g) => {
  g.fillStyle = frame; g.fillRect(0, 0, 512, 256);
  g.fillStyle = fascia; g.fillRect(0, 0, 512, 56);
  g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, 6, 512, 6);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 50, 512, 6);
  const gr = g.createLinearGradient(0, 70, 0, 250); gr.addColorStop(0, "#9ab4cf"); gr.addColorStop(1, "#4d6380");
  g.fillStyle = gr; g.fillRect(24, 72, 190, 150); g.fillRect(298, 72, 190, 150);
  g.fillStyle = "#3b2f2a"; g.fillRect(230, 72, 52, 184);
  g.fillStyle = "#7d5a46"; g.fillRect(236, 78, 40, 178);
  g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(40, 80, 50, 130); g.fillRect(314, 80, 50, 130);
  g.fillStyle = frame; g.fillRect(24, 200, 190, 8); g.fillRect(298, 200, 190, 8);
  if (awning) { for (let x = 0; x < 512; x += 64) { g.fillStyle = (x / 64) % 2 ? awning : "#f4efe4"; g.fillRect(x, 56, 64, 14); } }
});
const poleTex = () => ctex("barberPole", 128, 256, (g) => {
  g.fillStyle = "#f6f2ea"; g.fillRect(0, 0, 128, 256);
  for (let k = -4; k < 8; k++) {
    g.fillStyle = k % 2 ? "#d63b3b" : "#3b5fc4";
    g.beginPath(); g.moveTo(0, k * 64); g.lineTo(128, k * 64 + 64); g.lineTo(128, k * 64 + 96); g.lineTo(0, k * 64 + 32); g.fill();
  }
});
const waterTex = () => ctex("poolWater", 512, 512, (g, r) => {
  g.fillStyle = "#3cc6e6"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(220,250,255,0.55)"; g.lineWidth = 5;
  for (let i = 0; i < 40; i++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 18, x + 50, y + 18, x + 80, y); g.stroke(); }
});
const deckTex = () => ctex("poolDeck", 512, 512, (g, r) => {
  g.fillStyle = "#e8d6b6"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { const v = r() * 14 - 7; g.fillStyle = `rgb(${232 + v},${214 + v},${182 + v})`; g.fillRect(x + 2, y + 2, 60, 60); }
});
const stripeTex = () => ctex("lounger", 256, 64, (g) => { for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? "#f2f0ea" : "#3fa6c9"; g.fillRect(x, 0, 32, 64); } });

/** horizontal quad facing up at height y */
export const quadUp = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);

// ---------------- the tower ----------------
/** tower plan at height y: half width, half depth, front concavity (all grow toward the top: top-heavy) */
export const towerPlan = (y: number, H = TOWER_H) => {
  const s = Math.pow(Math.min(1, Math.max(0, y / H)), 1.5);
  return { hw: 15 + 7.5 * s, hd: 10 + 6 * s, c: 2.2 + 3.6 * s };
};
/** point on the concave south face: u -1..1 across, y up */
export const facePoint = (u: number, y: number, z0 = TOWER_Z, H = TOWER_H): V3 => {
  const { hw, hd, c } = towerPlan(y, H);
  return [u * hw, y, z0 + hd - c * (1 - u * u)];
};
const towerFaces = (z0: number, H: number, glass: THREE.Material, side: THREE.Material, b: Batch, cx = 0) => {
  const NY = 28, NU = 18;
  const loft = (pt: (u: number, y: number) => V3, mat: THREE.Material, uLen: number) => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NU; i++) {
      const y = (H * j) / NY, u = i / NU, p = pt(u, y);
      pos.push(p[0] + cx, p[1], p[2]); uv.push((u * uLen) / 4.5, y / 8);
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, c = a + NU + 1;
      idx.push(a, a + 1, c + 1, a, c + 1, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    b.add(g, mat);
  };
  const P = (y: number) => towerPlan(y, H);
  loft((u, y) => facePoint(u * 2 - 1, y, z0, H), glass, 34);                                                       // south, concave
  loft((u, y) => { const { hw, hd } = P(y), x = hw - 2 * hw * u; return [x, y, z0 - hd - 2.5 * (1 - (x / hw) ** 2)]; }, glass, 34); // north, convex
  loft((u, y) => { const { hw, hd } = P(y); return [hw, y, z0 + hd - 2 * hd * u]; }, side, 24);                     // east
  loft((u, y) => { const { hw, hd } = P(y); return [-hw, y, z0 - hd + 2 * hd * u]; }, side, 24);                    // west
  // roof cap: the top ring, fanned
  const ring: V3[] = [];
  for (let i = 0; i <= 16; i++) ring.push(facePoint(i / 8 - 1, H, z0, H));
  const { hw, hd } = P(H);
  for (let i = 0; i <= 16; i++) { const x = hw - (2 * hw * i) / 16; ring.push([x, H, z0 - hd - 2.5 * (1 - (x / hw) ** 2)]); }
  const cap: number[] = [];
  for (let i = 0; i < ring.length; i++) { const a = ring[i], c = ring[(i + 1) % ring.length]; cap.push(cx, H, z0, c[0] + cx, H, c[2], a[0] + cx, H, a[2]); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(cap, 3)); cg.computeVertexNormals();
  b.add(cg, lam("roofGrey", () => ({ color: "#8e95a3" })));
  // dark lobby band at the foot
  b.add(boxGeo(V(cx - 14.4, 0, z0 - 9.4), V(cx + 14.4, 4, z0 + 7.6)), lam("lobby", () => ({ color: "#7d8aa0" })));
};

export type Posables = {
  crane: THREE.Group; fins: THREE.Mesh[]; mirror: THREE.Mesh; mirrorBase: Float32Array; badge: THREE.Mesh; carRoot: THREE.Group;
  faceGlass: THREE.Material;
};

/** builds every static piece into root; returns the few things world.ts poses per frame */
export const buildCity = (root: THREE.Object3D, rays: Ray[]): Posables => {
  setSight(rays);
  const b = new Batch(), r = rng(7);
  // ---- ground: road, kerbs, pavements, plaza ----
  const road = lam("asphalt", () => ({ map: rep(asphalt(), 1, 1) }));
  const pave = lam("paving", () => ({ map: paving() }));
  const kerb = lam("kerb", () => ({ map: stoneHD("kerbHD", ["#cfc9be", "#c5bfb3", "#d8d2c6", "#bdb6aa"], "#9a9488") }));
  const yellow = lam("yellowLine", () => ({ color: "#f2c230" })), white = lam("whiteLine", () => ({ color: "#f4f1ea" }));
  b.add(quadUp(-400, 400, -400, 400, 80, 80, -0.03), lam("cityGround", () => ({ map: rep(paving(), 1, 1) })));
  b.add(quadUp(-200, 200, -4, 4, 50, 1), road);
  b.add(quadUp(-200, 200, 4, 7.6, 50, 0.45, 0.14), pave);
  b.add(quadUp(-200, 200, -26, -4, 50, 2.75, 0.14), pave);
  for (const z of [4, -4]) b.add(boxGeo(V(-200, -0.02, z - 0.15), V(200, 0.15, z + 0.15), 1), kerb);
  for (const z of [3.55, 3.7, -3.55, -3.7]) b.add(quadUp(-200, 200, z - 0.05, z + 0.05, 1, 1, 0.006), yellow); // double yellow lines
  for (let x = -200; x < 200; x += 9) b.add(quadUp(x, x + 4.5, -0.07, 0.07, 1, 1, 0.006), white);              // centre dashes

  // ---- south side: Victorian shop blocks facing the street (front at z = 7.6) ----
  const fasc = ["#2f5f6a", "#8c3b4a", "#2f6a43", "#3f4f8a", "#6e4b33", "#b5653f"];
  const walls = ["#e8dcc4", "#d9c39b", "#c9b8a0", "#efe6d3"];
  let x = -120;
  while (x < 120) {
    const w = [8, 10, 12][Math.floor(r() * 3)], h = [13.6, 17, 20.4][Math.floor(r() * 3)], cx = x + w / 2, isB = r() < 0.5;
    const barber = x <= 9 && x + w > 9;
    shopBlock(b, cx, 7.6, w, 12, h, isB, walls[Math.floor(r() * 4)], barber ? "#24334f" : fasc[Math.floor(r() * 6)], barber, r);
    x += w;
  }
  // barber's pole by the door
  b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 16).translate(10.5, 2.4, 7.38), lam("pole", () => ({ map: poleTex() })));
  for (const y of [1.92, 2.88]) b.add(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16).translate(10.5, y, 7.38), lam("chrome", () => ({ color: "#d9dde3" })));
  // ---- north side: blocks left and right of the tower plaza ----
  for (const sx of [-1, 1]) {
    let xx = 26;
    while (xx < 120) {
      const w = [10, 12][Math.floor(r() * 2)], h = [14, 18, 24][Math.floor(r() * 3)];
      shopBlock(b, sx * (xx + w / 2), -7.6, w, 12, h, r() < 0.5, walls[Math.floor(r() * 4)], fasc[Math.floor(r() * 6)], false, r, true);
      xx += w;
    }
  }
  // plaza: planters + trees in front of the tower
  for (const px of [-17, 17]) {
    b.add(boxGeo(V(px - 1.4, 0, -14.4), V(px + 1.4, 0.7, -11.6), 1), kerb);
    addVeg(b, "round", px, 0.7, -13, 6.5, px * 13 + 5);
  }
  // ---- the tower ----
  const faceGlass = lam("towerGlass", () => ({ map: glassTex("towerGlass", "#bcd6ee", "#6f95c2", "#dfe6ee") }));
  const sideGlass = lam("towerGlassSide", () => ({ map: glassTex("towerGlassS", "#a9c4e0", "#5f84b2", "#d6dde6") }));
  towerFaces(TOWER_Z, TOWER_H, faceGlass, sideGlass, b);

  // ---- the City skyline (background towers, kept out of every sight line) ----
  const offs = [0, 1, 2, 3].map((i) => lam("office" + i, () => ({ map: officeTex(i) })));
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 70 + r() * 240, cx = Math.cos(a) * d, cz = Math.sin(a) * d - 20;
    if (Math.abs(cz) < 30 && Math.abs(cx) < 140) continue;
    const w = 16 + r() * 22, dd = 16 + r() * 20, h = 25 + r() * r() * 110;
    if (blocked(cx - w / 2, cx + w / 2, 0, h, cz - dd / 2, cz + dd / 2, true)) continue;
    b.add(boxGeo(V(cx - w / 2, 0, cz - dd / 2), V(cx + w / 2, h, cz + dd / 2), 12), offs[i % 4]);
    b.add(boxGeo(V(cx - w / 2 - 0.3, h, cz - dd / 2 - 0.3), V(cx + w / 2 + 0.3, h + 1.2, cz + dd / 2 + 0.3)), lam("roofGrey", () => ({ color: "#8e95a3" })));
  }
  // ---- park (magnifying glass) ----
  b.add(quadUp(PARK[0] - 300, PARK[0] + 300, -300, 300, 60, 60, 0), lam("grassPark", () => ({ map: grassHD(), color: "#c9d6b4" })));
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * 0.2, d = 14 + r() * 30;
    addVeg(b, (["round", "fat", "tall", "bush"] as const)[i % 4], PARK[0] + Math.cos(a) * d, 0, Math.sin(a) * d - 6, 4 + r() * 5, i * 31 + 3, 1);
  }
  b.add(boxGeo(V(PARK[0] - 3.4, 0.42, -2.9), V(PARK[0] - 1.6, 0.5, -2.4)), lam("bench", () => ({ color: "#8a5a3c" })));
  for (const bx of [-3.3, -1.7]) b.add(boxGeo(V(PARK[0] + bx - 0.05, 0, -2.9), V(PARK[0] + bx + 0.05, 0.42, -2.4)), lam("benchLeg", () => ({ color: "#3d414c" })));

  // ---- Las Vegas: deck, pool, loungers, umbrellas, palms, the curved hotel ----
  const deck = lam("poolDeck", () => ({ map: deckTex() }));
  b.add(quadUp(VEGAS[0] - 300, VEGAS[0] + 300, -300, 300, 120, 120, 0), lam("desert", () => ({ color: "#e2c48e" })));
  b.add(quadUp(VEGAS[0] - 40, VEGAS[0] + 40, -6, 40, 40, 23, 0.01), deck);
  b.add(quadUp(VEGAS[0] - 12, VEGAS[0] + 12, 2, 9, 3, 1, 0.02), lam("poolWater", () => ({ map: waterTex() })));
  b.add(boxGeo(V(VEGAS[0] - 12.3, 0, 1.7), V(VEGAS[0] + 12.3, 0.12, 2)), lam("poolEdge", () => ({ color: "#f4efe4" })));
  b.add(boxGeo(V(VEGAS[0] - 12.3, 0, 9), V(VEGAS[0] + 12.3, 0.12, 9.3)), lam("poolEdge", () => ({ color: "#f4efe4" })));
  const lounger = lam("lounger", () => ({ map: stripeTex() }));
  for (let i = 0; i < 9; i++) {
    const lx = VEGAS[0] - 11 + i * 2.6, lz = 11.4;
    if (Math.abs(lx - VEGAS[0] - 3) < 1.4) continue;
    b.add(boxGeo(V(lx - 0.35, 0.3, lz - 1), V(lx + 0.35, 0.4, lz + 1)), lounger);
    b.add(quad(V(lx - 0.35, 0.4, lz - 1), V(lx + 0.35, 0.4, lz - 1), V(lx + 0.35, 0.95, lz - 1.5), V(lx - 0.35, 0.95, lz - 1.5)), lounger);
    if (i % 3 === 0) {
      b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6).translate(lx + 1.3, 1.2, lz), lam("chrome", () => ({ color: "#d9dde3" })));
      b.add(new THREE.ConeGeometry(1.4, 0.5, 10).translate(lx + 1.3, 2.45, lz), lam("umbrella", () => ({ color: "#f2f0ea" })));
    }
  }
  for (let i = 0; i < 10; i++) palm(b, VEGAS[0] - 22 + i * 4.9, 0, i % 2 ? 15.5 : -3.5, 7 + (i % 3), i);
  const gold = lam("hotelGlass", () => ({ map: glassTex("hotelGlass", "#e8d9c4", "#9f9fb5", "#efe9df") }));
  towerFaces(-26, 62, gold, gold, b, VEGAS[0]);

  b.build(root);

  // ---------------- posables ----------------
  // crane on the roof while the tower is unfinished
  const crane = new THREE.Group(), yel = lam("craneYellow", () => ({ color: "#f2b632" }));
  const cb = new Batch();
  const top = TOWER_H, mx = 5, mz = TOWER_Z - 3;
  cb.add(boxGeo(V(mx - 0.9, top, mz - 0.9), V(mx + 0.9, top + 26, mz + 0.9)), yel);
  cb.add(boxGeo(V(mx - 34, top + 26, mz - 0.6), V(mx + 12, top + 27.6, mz + 0.6)), yel);
  cb.add(boxGeo(V(mx + 6, top + 22, mz - 1.6), V(mx + 12, top + 26, mz + 1.6)), lam("craneWeight", () => ({ color: "#6c7280" })));
  cb.add(boxGeo(V(mx - 1.4, top + 23.4, mz - 1.4), V(mx + 1.4, top + 26, mz + 1.4)), lam("craneCab", () => ({ color: "#3d414c" })));
  cb.add(boxGeo(V(mx - 0.3, top + 29, mz - 0.3), V(mx + 0.3, top + 31, mz + 0.3)), yel);
  cb.add(new THREE.CylinderGeometry(0.05, 0.05, 14, 4).translate(mx - 24, top + 19.5, mz), lam("rope", () => ({ color: "#2b2730" })));
  cb.build(crane);
  root.add(crane);
  // sun-shade fins: one horizontal louvre every 3 m up the south face, standing 0.5 m off the glass
  const fins: THREE.Mesh[] = [], finM = lam("fin", () => ({ color: "#e4e6ea" }));
  for (let y = 6; y < TOWER_H - 6; y += 3) {
    const segs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const u0 = i / 8 - 1, u1 = (i + 1) / 8 - 1, a = facePoint(u0, y), c = facePoint(u1, y);
      for (const p of [a, c]) p[2] += 0.5;
      const a2: V3 = [a[0], a[1], a[2] + 1.1], c2: V3 = [c[0], c[1], c[2] + 1.1];
      segs.push(quad(V(...a), V(...c), V(...c2), V(...a2)), quad(V(...a2), V(...c2), V(c2[0], y - 0.22, c2[2]), V(a2[0], y - 0.22, a2[2])));
    }
    const m = new THREE.Mesh(mergeGeometries(segs, false), finM);
    m.castShadow = true; m.receiveShadow = true; m.visible = false;
    fins.push(m); root.add(m);
  }
  const car = buildCar(root);
  return { crane, fins, faceGlass, ...car };
};

// ---------------- Victorian block with a shopfront ----------------
const shopBlock = (b: Batch, cx: number, zf: number, w: number, d: number, h: number, isBrick: boolean, wall: string, fascia: string, barber: boolean,
  r: () => number, north = false) => {
  const s = north ? -1 : 1, z0 = zf, z1 = zf + s * d;
  if (blocked(cx - w / 2, cx + w / 2, 0, h + 1, Math.min(z0, z1), Math.max(z0, z1))) return;
  const bay = lam(`bay${isBrick}${wall}`, () => ({ map: bayTex(`bay${isBrick}${wall}`, wall, isBrick, "#f2ede2") }));
  const shop = lam(`shop${fascia}${barber}`, () => ({ map: shopTex(`shop${fascia}${barber}`, fascia, "#2b2f3a", barber ? "#d63b3b" : r() < 0.4 ? "#2f6a43" : null) }));
  const x0 = cx - w / 2, x1 = cx + w / 2, nb = Math.max(1, Math.round(w / 3.6)), nf = Math.round((h - 4) / 3.4);
  const F = (a: THREE.Vector3, c: THREE.Vector3, e: THREE.Vector3, g: THREE.Vector3, u: number, v: number) => north ? quad(c, a, g, e, u, v) : quad(a, c, e, g, u, v);
  // street front (faces -z on the south side, +z on the north side)
  b.add(F(V(x1, 4, zf), V(x0, 4, zf), V(x0, h, zf), V(x1, h, zf), nb, nf * (3.4 / 3.4)), bay);
  b.add(F(V(x1, 0, zf), V(x0, 0, zf), V(x0, 4, zf), V(x1, 4, zf), Math.max(1, Math.round(w / 8)), 1), shop);
  const side = lam(`side${wall}`, () => ({ color: isBrick ? "#b9694c" : wall }));
  b.add(boxGeo(V(x0 + 0.02, 0, Math.min(z0, z1)), V(x1 - 0.02, h - 0.01, Math.max(z0, z1))), side);
  const trim = lam("trimStone", () => ({ color: "#efe3c8" }));
  b.add(boxGeo(V(x0 - 0.1, h - 0.6, zf - s * 0.35), V(x1 + 0.1, h, zf + s * 0.05)), trim);         // cornice
  b.add(boxGeo(V(x0 - 0.05, 3.85, zf - s * 0.25), V(x1 + 0.05, 4.15, zf + s * 0.02)), trim);       // fascia ledge
  for (let i = 0; i <= 1; i++) b.add(boxGeo(V((i ? x1 : x0) - 0.25, 0, zf - s * 0.18), V((i ? x1 : x0) + 0.25, h - 0.6, zf + s * 0.02)), trim); // pilasters
};

// ---------------- palm ----------------
const palm = (b: Batch, x: number, y: number, z: number, h: number, seed: number) => {
  const trunk = lam("palmTrunk", () => ({ color: "#a07850" })), leaf = lam("palmLeaf", () => ({ color: "#4f9a46" }));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, bend = (t: number) => 0.6 * t * t;
    b.add(new THREE.CylinderGeometry(0.16 - 0.04 * t1, 0.18 - 0.04 * t0, (h / n) * 1.02, 8).translate(x + bend((t0 + t1) / 2), y + h * (t0 + t1) / 2, z), trunk);
  }
  const tx = x + 0.6, ty = y + h;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + seed, g = new THREE.SphereGeometry(1, 10, 6);
    g.scale(1.9, 0.18, 0.5); g.translate(1.7, -0.35, 0); g.rotateZ(-0.35); g.rotateY(a);
    b.add(g.translate(tx, ty, z), leaf);
  }
};

// ---------------- the car ----------------
const buildCar = (root: THREE.Object3D) => {
  const g = new THREE.Group(); g.position.set(...CAR); root.add(g);
  const paint = twoTone(new THREE.MeshPhongMaterial({ color: "#4a6b9a", specular: "#9fb3cf", shininess: 40 }), 0.15);
  const dark = lam("carGlass", () => ({ color: "#26324a" })), tyre = lam("tyre", () => ({ color: "#26232a" })), chrome = lam("chrome", () => ({ color: "#d9dde3" }));
  const prof = new THREE.Shape();
  const P: [number, number][] = [[-2.45, 0.32], [2.45, 0.32], [2.5, 0.55], [2.4, 0.78], [1.2, 0.92], [0.55, 1.38], [-0.9, 1.42], [-1.75, 1.0], [-2.45, 0.95], [-2.52, 0.6]];
  prof.moveTo(...P[0]); for (const p of P.slice(1)) prof.lineTo(...p); prof.closePath();
  const body = new THREE.ExtrudeGeometry(prof, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 3, curveSegments: 4 });
  body.translate(0, 0, -0.85); body.computeVertexNormals();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  add(body, paint);
  const win = new THREE.Shape(); const Wn: [number, number][] = [[1.05, 0.98], [0.5, 1.33], [-0.85, 1.36], [-1.6, 1.0]];
  win.moveTo(...Wn[0]); for (const p of Wn.slice(1)) win.lineTo(...p); win.closePath();
  const wg = new THREE.ExtrudeGeometry(win, { depth: 1.92, bevelEnabled: false }); wg.translate(0, 0, -0.96);
  add(wg, dark);
  for (const [wx, wz] of [[1.55, 0.92], [-1.6, 0.92], [1.55, -0.92], [-1.6, -0.92]]) {
    const t = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18); t.rotateX(Math.PI / 2); t.translate(wx, 0.36, wz); add(t, tyre);
    const h = new THREE.CylinderGeometry(0.19, 0.19, 0.28, 14); h.rotateX(Math.PI / 2); h.translate(wx, 0.36, wz); add(h, lam("hubcap", () => ({ color: "#8e95a1" })));
  }
  for (const s of [-1, 1]) {
    add(boxGeo(V(2.48, 0.6, s * 0.62 - 0.18), V(2.58, 0.72, s * 0.62 + 0.18)), lam("headlight", () => ({ color: "#fff6d8" })));
    add(boxGeo(V(-2.62, 0.68, s * 0.62 - 0.16), V(-2.52, 0.8, s * 0.62 + 0.16)), lam("taillight", () => ({ color: "#d63b3b" })));
  }
  add(boxGeo(V(2.5, 0.48, -0.36), V(2.6, 0.66, 0.36)), dark); // grille
  // the badge (a disc on the grille) and the wing mirror (stalk + housing) - both melt
  const bg = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 20); bg.rotateZ(Math.PI / 2);
  const badge = add(bg, twoTone(new THREE.MeshPhongMaterial({ color: "#e9c45a", specular: "#fff2c0", shininess: 60 }), 0.15));
  badge.position.set(BADGE[0] - CAR[0] + 0.03, BADGE[1] - CAR[1], BADGE[2] - CAR[2]);
  const mg = new THREE.BoxGeometry(0.22, 0.15, 0.27, 6, 4, 8); mg.translate(0, 0, 0.135);
  const mirror = add(mg, paint);
  mirror.position.set(MIRROR[0] - CAR[0], MIRROR[1] - CAR[1], MIRROR[2] - CAR[2] - 0.13);
  const mirrorBase = (mg.attributes.position.array as Float32Array).slice();
  return { mirror, mirrorBase, badge, carRoot: g };
};
