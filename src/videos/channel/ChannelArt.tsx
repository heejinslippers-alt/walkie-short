// Channel branding drawn with the same character code as the shorts (billion/toon.ts): a round profile picture and a
// 2560 x 1440 banner (everything important inside YouTube's 1546 x 423 safe area in the middle).
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { Pen, bodyFront, OUTFITS, fxPop, Outfit, FrontOpts } from "../billion/toon";

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

const draw = (g: CanvasRenderingContext2D, kind: "avatar" | "banner") => {
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

export const ChannelArt: React.FC<{ kind: "avatar" | "banner" }> = ({ kind }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("channel art"));
  useEffect(() => { loadFont().then(() => { const g = ref.current!.getContext("2d")!; draw(g, kind); continueRender(h); }); }, [h, kind]);
  const [w, hh] = kind === "avatar" ? [800, 800] : [2560, 1440];
  return <AbsoluteFill><canvas ref={ref} width={w} height={hh} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
