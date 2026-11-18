// Channel branding drawn with the same character code as the shorts (billion/toon.ts): a round profile picture and a
// 2560 x 1440 banner (everything important inside YouTube's 1546 x 423 safe area in the middle).
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { Pen, bodyFront, OUTFITS, fxPop, fxCash, Outfit, FrontOpts, SKINS } from "../billion/toon";

const INK = "#15121c";
const FONT = "ChannelFont";
const loadFont = async () => {
  const f = new FontFace(FONT, `url('${staticFile("fonts/InterDisplay-Black.otf")}')`, { weight: "900" });
  await f.load(); (document.fonts as unknown as { add: (x: FontFace) => void }).add(f);
};
/** draw one character (600 x 1000 design) onto g at (x, y) with scale s, optionally cropped to a source rect */
const person = (g: CanvasRenderingContext2D, o: Outfit, opts: FrontOpts, x: number, y: number, s: number, crop?: [number, number, number, number]) => {
  const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 2000;
  const c = cv.getContext("2d")!; c.scale(2, 2);
  bodyFront(new Pen(c), o, { mode: "stand", light: -2.2, seed: 3, ...opts });
  const [sx, sy, sw, sh] = crop ?? [0, 0, 600, 1000];
  g.drawImage(cv, sx * 2, sy * 2, sw * 2, sh * 2, x, y, sw * s, sh * s);
};
const rays = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number, a: string, b: string) => {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    g.fillStyle = i % 2 ? a : b; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + r * Math.cos(a0), cy + r * Math.sin(a0)); g.lineTo(cx + r * Math.cos(a1), cy + r * Math.sin(a1)); g.fill();
  }
};
const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: string) => {
  g.font = `900 ${size}px '${FONT}', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = size / 4.5; g.strokeStyle = INK; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y);
};
const fx = (g: CanvasRenderingContext2D, draw: (p: Pen) => void, x: number, y: number, s: number, w = 600, h = 600) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(new Pen(cv.getContext("2d")!));
  g.drawImage(cv, x - (w * s) / 2, y - (h * s) / 2, w * s, h * s);
};

export type ArtKind = "avatar" | "banner" | "mom1" | "mom2" | "mom3" | "mom4" | "mom5";
/** the mom of "What If Your Mom": bean head, dark hair, pink dress */
const MOM: Outfit = { jacket: "#f07a9a", pants: "#3b3f52", boots: "#7a3b4a", hat: "hair", hair: "#4a2e22", dress: "#d9487a", skin: SKINS[1] };
const MOM2: Outfit = { ...MOM, hair: "#e3c46a", skin: SKINS[0], jacket: "#7b5ac9", dress: "#5a8fc2" };
const bg = (g: CanvasRenderingContext2D, a: string, b: string) => {
  rays(g, 400, 430, 900, 24, a, b);
  const gr = g.createRadialGradient(400, 430, 60, 400, 430, 560); gr.addColorStop(0, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 800, 800);
};
/** shoulder-length hair drawn behind the head (person() draws the face and fringe over it) */
const bob = (g: CanvasRenderingContext2D, o: Outfit, x: number, y: number, sc: number, cropY: number) => {
  const cx = x + 300 * sc, cy = y + (278 - cropY) * sc, R = 122 * sc;
  g.beginPath();
  g.moveTo(cx - 1.02 * R, cy - 0.35 * R);
  g.bezierCurveTo(cx - 1.25 * R, cy + 0.4 * R, cx - 1.35 * R, cy + 1.05 * R, cx - 1.05 * R, cy + 1.3 * R);
  g.quadraticCurveTo(cx, cy + 1.45 * R, cx + 1.05 * R, cy + 1.3 * R);
  g.bezierCurveTo(cx + 1.35 * R, cy + 1.05 * R, cx + 1.25 * R, cy + 0.4 * R, cx + 1.02 * R, cy - 0.35 * R);
  g.quadraticCurveTo(cx, cy - 1.35 * R, cx - 1.02 * R, cy - 0.35 * R);
  g.fillStyle = o.hair!; g.fill(); g.lineWidth = 11 * sc; g.strokeStyle = "#241726"; g.stroke();
};
const momArt = (g: CanvasRenderingContext2D, k: number) => {
  const crop: [number, number, number, number] = [0, 120, 600, 560];
  if (k === 1) { // the classic: mom with a big question mark
    bg(g, "#ffd83a", "#ffc21f");
    bob(g, MOM, 60, 70, 1.2, 120); person(g, MOM, { expr: "smile", wave: 0.6 }, 60, 70, 1.2, crop);
    text(g, "?", 640, 200, 240, "#ffffff");
  } else if (k === 2) { // shocked mom, blue rays
    bg(g, "#5fa8ff", "#3e7fd2");
    bob(g, MOM, 60, 70, 1.2, 120); person(g, MOM, { expr: "shock" }, 60, 70, 1.2, crop);
    text(g, "!?", 630, 190, 200, "#ffd83a");
  } else if (k === 3) { // mom going POP: burst and cash behind her
    bg(g, "#ff8fb1", "#ff6f9a");
    fx(g, (p) => fxPop(p, 0.32), 400, 380, 1.45);
    fx(g, (p) => fxCash(p, 0.35, 2), 400, 400, 1.3);
    bob(g, MOM, 60, 110, 1.2, 120); person(g, MOM, { expr: "laugh" }, 60, 110, 1.2, crop);
  } else if (k === 4) { // mom in a billionaire's top hat, holding a money bag
    bg(g, "#7ddc6a", "#4fb84a");
    bob(g, MOM, 60, 40, 1.15, 40); person(g, { ...MOM, hat: "tophat" }, { expr: "grin", prop: ["held", "bag"] }, 60, 40, 1.15, [0, 40, 600, 640]);
  } else { // blonde mom, purple, the name's initials
    bg(g, "#b38cff", "#8f63e8");
    bob(g, MOM2, 60, 30, 1.2, 120); person(g, MOM2, { expr: "grin" }, 60, 30, 1.2, crop);
    text(g, "WIYM", 400, 700, 150, "#ffd83a");
  }
};
const draw = (g: CanvasRenderingContext2D, kind: ArtKind) => {
  if (kind.startsWith("mom")) { momArt(g, Number(kind.slice(3))); return; }
  if (kind === "avatar") {
    rays(g, 400, 430, 900, 24, "#ffd83a", "#ffc21f");
    const gr = g.createRadialGradient(400, 430, 60, 400, 430, 560); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 800, 800);
    // the mascot: our top-hat billionaire, grinning, cropped hat to chest so he reads at 98 px
    person(g, OUTFITS.rich(0), { expr: "grin" }, 55, 40, 1.15, [0, 0, 600, 640]);
    text(g, "?", 640, 190, 230, "#ffffff");
    return;
  }
  // banner: sky, gold hills, the cast in a row, a pop, the name in the safe area
  const sky = g.createLinearGradient(0, 0, 0, 1440); sky.addColorStop(0, "#3e7fd2"); sky.addColorStop(1, "#b8d0ec");
  g.fillStyle = sky; g.fillRect(0, 0, 2560, 1440);
  rays(g, 1280, 720, 1800, 40, "rgba(255,255,255,0.10)", "rgba(255,255,255,0)");
  g.fillStyle = "#e9b33c"; g.strokeStyle = INK; g.lineWidth = 8;
  g.beginPath(); g.moveTo(0, 1440); g.lineTo(0, 1060); g.quadraticCurveTo(640, 900, 1280, 1010); g.quadraticCurveTo(1920, 900, 2560, 1060); g.lineTo(2560, 1440); g.fill(); g.stroke();
  for (let i = 0; i < 90; i++) { const x = (i * 293) % 2560, y = 1060 + ((i * 131) % 360); g.fillStyle = i % 2 ? "#f6cf5c" : "#e2a838"; g.beginPath(); g.ellipse(x, y, 26, 20, 0, 0, 7); g.fill(); g.lineWidth = 4; g.stroke(); }
  const cast: [Outfit, FrontOpts, number][] = [
    [OUTFITS.kid(0), { expr: "grin", prop: ["held", "potato"] }, 420], [OUTFITS.rich(1), { expr: "nervous" }, 610],
    [OUTFITS.winner, { expr: "laugh", prop: ["held", "cheque"] }, 1950], [OUTFITS.baker, { expr: "smile", prop: ["held", "bread"] }, 2150],
  ];
  for (const [o, opts, x] of cast) person(g, o, opts, x - 300 * 0.58, 1010 - 975 * 0.58, 0.58);
  fx(g, (p) => fxPop(p, 0.35), 770, 700, 0.75);
  text(g, "WHAT IF TOONS", 1280, 640, 150, "#ffd83a");
  text(g, "ABSURD WHAT-IFS. REAL FACTS.", 1280, 790, 60, "#ffffff");
};

export const ChannelArt: React.FC<{ kind: ArtKind }> = ({ kind }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("channel art"));
  useEffect(() => { loadFont().then(() => { const g = ref.current!.getContext("2d")!; draw(g, kind); continueRender(h); }); }, [h, kind]);
  const [w, hh] = kind === "banner" ? [2560, 1440] : [800, 800];
  return <AbsoluteFill><canvas ref={ref} width={w} height={hh} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
