// Static props of the jump short, in the city's two-tone look: the sea of heads (an aerial disc and, for low shots,
// a ring that starts beyond the billboard crowd), Mom's crate, the space stage backdrop, the cruise ship on the sea,
// the football stadium, and the seismograph's table on the touchline.
import * as THREE from "three";
import { boxGeo, V, lam } from "./build";
import { ctex, rep } from "./paint";
import { twoTone } from "./shade";
import { waterTex } from "./city";
import { FIELD, SPACE, SEA, STADIUM, AT } from "./story";

const SKINS = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067", "#a8754e"];
const HAIR = ["#24201e", "#5a3b2a", "#e3c46a", "#7a4a2a", "#3b2a22", "#c96a2a"];
const SHIRT = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#e2453c", "#f2b33d", "#2f9ad0", "#f07a9a"];
/** packed heads seen from above at a slant: shoulders, a face, hair on top (1024 px tile = 10 m) */
const headsTex = (key: string) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = "#3a3346"; g.fillRect(0, 0, 1024, 1024);
  const step = 42;
  for (let row = 0; row < 1024 / step + 1; row++) for (let col = 0; col < 1024 / step + 1; col++) {
    const x = col * step + (row % 2) * step / 2 + (r() - 0.5) * 10, y = row * step + (r() - 0.5) * 10;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      const X = x + ox, Y = y + oy;
      if (X < -40 || X > 1064 || Y < -40 || Y > 1064) continue;
      g.fillStyle = SHIRT[Math.floor(Math.abs(Math.sin(row * 12.9 + col * 78.2)) * 10)];
      g.beginPath(); g.ellipse(X, Y + 12, 20, 14, 0, 0, 7); g.fill();
      g.fillStyle = SKINS[(row * 3 + col * 7) % 5]; g.beginPath(); g.arc(X, Y, 13, 0, 7); g.fill();
      g.fillStyle = HAIR[(row * 5 + col * 3) % 6]; g.beginPath(); g.arc(X, Y - 3, 13, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      g.strokeStyle = "rgba(36,23,38,0.8)"; g.lineWidth = 2.5; g.beginPath(); g.arc(X, Y, 13, 0, 7); g.stroke();
    }
  }
});
const starsTex = () => ctex("stars", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#0d1030"); gr.addColorStop(1, "#1d1650");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,240,${0.4 + 0.6 * r()})`; g.beginPath(); g.arc(r() * 1024, r() * 1024, 0.8 + 2.2 * r() * r(), 0, 7); g.fill(); }
});
const windowsTex = () => ctex("shipWindows", 512, 64, (g) => {
  g.fillStyle = "#f6f5f0"; g.fillRect(0, 0, 512, 64);
  g.fillStyle = "#2b3a5a"; for (let x = 6; x < 512; x += 22) g.fillRect(x, 22, 14, 22);
});
const pitchTex = () => ctex("pitch", 512, 512, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#4f9a46" : "#5aa850"; g.fillRect(0, i * 64, 512, 64); }
  g.strokeStyle = "#f4f1ea"; g.lineWidth = 4; g.strokeRect(60, 40, 392, 432); g.beginPath(); g.moveTo(60, 256); g.lineTo(452, 256); g.stroke();
});

export class CrowdProps {
  disc: THREE.Mesh; ring: THREE.Mesh;
  constructor(root: THREE.Object3D) {
    const mk = (geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = root) => {
      const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; parent.add(me); return me;
    };
    // the sea of heads at head height: a disc for the aerials, a ring (hole of 46 m) behind the billboard crowd
    const heads = lam("heads", () => ({ map: rep(headsTex("headsA"), 60, 60) }));
    const disc = new THREE.CircleGeometry(600, 96); disc.rotateX(-Math.PI / 2);
    this.disc = mk(disc, heads); this.disc.position.set(FIELD[0], 1.55, FIELD[2]); this.disc.castShadow = false;
    const ring = new THREE.RingGeometry(46, 600, 96, 1); ring.rotateX(-Math.PI / 2);
    // ring UVs: planar, matching the disc
    const pa = ring.attributes.position, uv = ring.attributes.uv;
    for (let i = 0; i < pa.count; i++) uv.setXY(i, (pa.getX(i) + 600) / 1200, (-pa.getZ(i) + 600) / 1200);
    this.ring = mk(ring, heads); this.ring.position.set(FIELD[0], 1.55, FIELD[2]); this.ring.castShadow = false;
    // Mom's crate
    const wood = lam("crate", () => ({ color: "#b07a4a" }));
    mk(boxGeo(V(FIELD[0] - 0.6, 0, FIELD[2] + AT.mom[1] - 0.45), V(FIELD[0] + 0.6, 0.62, FIELD[2] + AT.mom[1] + 0.45)), wood);
    // the space stage: a starfield backdrop behind the cards
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshBasicMaterial({ map: rep(starsTex(), 3, 2), fog: false }));
    sky.position.set(SPACE[0] + 20, SPACE[1], SPACE[2] - 12); root.add(sky);
    // ---- the sea and the cruise ship (bow toward +x) ----
    const sea = new THREE.PlaneGeometry(3000, 3000); sea.rotateX(-Math.PI / 2);
    mk(sea, lam("sea", () => ({ map: rep(waterTex(), 160, 160) }))).position.set(SEA[0], 0, SEA[2]);
    const ship = new THREE.Group(); ship.position.set(SEA[0], -1.2, SEA[2]); root.add(ship);
    const white = twoTone(new THREE.MeshPhongMaterial({ color: "#f6f5f0", specular: "#ffffff", shininess: 40 }), 0.15);
    const prof = new THREE.Shape();
    prof.moveTo(-21, 0); prof.lineTo(17, 0); prof.quadraticCurveTo(22, 0.6, 24.5, 7.4); prof.lineTo(-22, 7.4); prof.lineTo(-22.5, 2.5); prof.closePath();
    const hull = new THREE.ExtrudeGeometry(prof, { depth: 8, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.3, bevelSegments: 3, curveSegments: 16 });
    hull.translate(0, 0, -4); hull.computeVertexNormals();
    // taper the bow: squeeze z toward the front
    const hp = hull.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), k = x > 12 ? 1 - 0.8 * Math.min(1, (x - 12) / 12.5) ** 1.6 : 1; hp.setZ(i, hp.getZ(i) * k); }
    hull.computeVertexNormals();
    mk(hull, white, ship);
    mk(boxGeo(V(-21.5, 0.9, -4.25), V(18, 2.0, 4.25)), lam("shipBoot", () => ({ color: "#1f2a50" })), ship);
    const win = lam("shipWin", () => ({ map: rep(windowsTex(), 6, 1) }));
    const deck = (x0: number, x1: number, y0: number, y1: number, w: number) => mk(boxGeo(V(x0, y0, -w), V(x1, y1, w)), win, ship);
    deck(-18, 12, 7.4, 9.6, 3.6); deck(-15, 9, 9.6, 11.8, 3.3); deck(-11, 5, 11.8, 13.8, 3.0);
    const red = lam("funnel", () => ({ color: "#c8453b" })), black = lam("funnelTop", () => ({ color: "#22242c" }));
    mk(new THREE.CylinderGeometry(1.3, 1.5, 3.4, 20).translate(-7, 15.5, 0), red, ship);
    mk(new THREE.CylinderGeometry(1.32, 1.32, 0.8, 20).translate(-7, 17.4, 0), black, ship);
    const boat = lam("lifeboat", () => ({ color: "#f07a2c" }));
    for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const b = new THREE.CapsuleGeometry(0.55, 2.2, 6, 12); b.rotateZ(Math.PI / 2); mk(b.translate(-14 + i * 5, 8.6, sd * 3.95), boat, ship); }
    const rail = lam("rail", () => ({ color: "#f6f5f0" }));
    for (const sd of [-1, 1]) mk(boxGeo(V(10, 8.3, sd * 3.0 - 0.04), V(22.5, 8.4, sd * 3.0 + 0.04)), rail, ship);
    mk(boxGeo(V(21.8, 7.4, -2.6), V(21.9, 8.4, 2.6)), rail, ship);
    // ---- the stadium: a stepped bowl full of people, a striped pitch ----
    const pts: THREE.Vector2[] = [new THREE.Vector2(40, 0), new THREE.Vector2(40, 1.5)];
    for (let i = 0; i < 14; i++) { const r0 = 40.4 + i * 2.6, y = 1.5 + i * 1.7; pts.push(new THREE.Vector2(r0 + 2.2, y), new THREE.Vector2(r0 + 2.6, y + 1.7)); }
    pts.push(new THREE.Vector2(78, 25.3), new THREE.Vector2(78, 0));
    const bowl = new THREE.LatheGeometry(pts, 120);
    const bm = lam("stands", () => ({ map: rep(headsTex("headsS"), 70, 6), side: THREE.DoubleSide }));
    mk(bowl, bm).position.set(STADIUM[0], 0, STADIUM[2]);
    const pitch = new THREE.CircleGeometry(40, 80); pitch.rotateX(-Math.PI / 2);
    mk(pitch, lam("pitchM", () => ({ map: pitchTex() }))).position.set(STADIUM[0], 0.01, STADIUM[2]);
    const ground = new THREE.PlaneGeometry(400, 400); ground.rotateX(-Math.PI / 2);
    mk(ground, lam("stadiumGround", () => ({ color: "#8f8a80" }))).position.set(STADIUM[0], -0.02, STADIUM[2]);
    // the seismograph's table by the touchline
    mk(boxGeo(V(STADIUM[0] - 1.6, 0.75, STADIUM[2] - 37.9), V(STADIUM[0] - 0.4, 0.82, STADIUM[2] - 37.3)), wood);
    for (const dx of [-1.5, -0.5]) mk(boxGeo(V(STADIUM[0] + dx - 0.03, 0, STADIUM[2] - 37.65), V(STADIUM[0] + dx + 0.03, 0.75, STADIUM[2] - 37.55)), wood);
  }
  set(aerial: boolean) { this.disc.visible = aerial; this.ring.visible = !aerial; }
}
