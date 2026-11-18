// Burned-in subtitles timed to the narration (words.json): short phrases of 1-4 words, the word being spoken in
// yellow, big heavy type with a dark outline so it reads on sky, glass and pavement alike. Sizes are given at
// 1080x1920 (the composition size); Remotion scales the whole frame for the 2K export.
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, interpolate } from "remotion";
import WORDS from "./words.json";

const FPS = 30;
const FONT = "WalkieSub";
const fontCss = `@font-face { font-family: '${FONT}'; src: url('${staticFile("fonts/InterDisplay-Black.otf")}') format('opentype'); font-weight: 900; }`;

type Word = { text: string; start: number; end: number; line: number };
type Chunk = { words: Word[]; a: number; b: number };

/** spoken forms that read better as written forms on screen (word sequences, compared without punctuation) */
const PHRASES: [string, string][] = [
  ["three thousand four hundred and twenty-eight", "3,428"],
  ["twenty trillion dollars", "$20 trillion"],
  ["nine hundred and ninety-seven point six million dollars", "$997.6 million"],
  ["two hundred and fifty", "250"],
  ["two thousand and eight", "2008"],
  ["three billion", "$3 billion"],
];
const bare = (x: string) => x.toLowerCase().replace(/[^a-z0-9'-]/g, "");
const merge = (ws: Word[]): Word[] => {
  const out: Word[] = [];
  for (let i = 0; i < ws.length; i++) {
    let hit = false;
    for (const [from, to] of PHRASES) {
      const seq = from.split(" ");
      if (seq.every((w, j) => ws[i + j] && bare(ws[i + j].text) === w)) {
        const last = ws[i + seq.length - 1], tail = (last.text.match(/[.,?!;:]+$/) ?? [""])[0];
        out.push({ ...ws[i], text: to + tail, end: last.end }); i += seq.length - 1; hit = true; break;
      }
    }
    if (!hit) out.push(ws[i]);
  }
  return out;
};

const chunks: Chunk[] = (() => {
  const ws = merge((WORDS.words as Word[]).map((w) => ({ ...w })));
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) out.push({ words: cur, a: cur[0].start, b: cur[cur.length - 1].end }); cur = []; };
  ws.forEach((w, i) => {
    const n = ws[i + 1];
    cur.push(w);
    const chars = cur.map((x) => x.text).join(" ").length;
    const weak = /^(and|the|a|an|of|to|his|its)$/i.test(w.text) && n && n.line === w.line && cur.length < 5;
    const stop = /[.,?!;:]$/.test(w.text) || (!weak && ( !n || n.line !== w.line || cur.length >= 4 || chars >= 16 || (n && n.start - w.end > 0.35)));
    if (stop) flush();
  });
  // each phrase stays up until the next one starts (short gaps), or a little after its last word
  out.forEach((c, i) => { const n = out[i + 1]; c.b = n && n.a - c.b < 0.6 ? n.a : c.b + 0.35; });
  return out;
})();

export const Subtitles: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const c = chunks.find((k) => t >= k.a - 0.03 && t < k.b);
  if (!c) return <style>{fontCss}</style>;
  const pop = interpolate(t - c.a, [-0.03, 0.08], [0.86, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <style>{fontCss}</style>
      <div style={{
        position: "absolute", top: 1390, left: 70, right: 70, textAlign: "center",
        fontFamily: `'${FONT}', 'Inter', 'Arial Black', sans-serif`, fontWeight: 900, fontSize: 92, lineHeight: 1.08,
        letterSpacing: 1, textTransform: "uppercase", transform: `scale(${pop})`,
      }}>
        {c.words.map((w, i) => {
          const on = t >= w.start - 0.03;
          const txt = w.text.replace(/[.,;:]$/, "");
          return (
            <span key={i} style={{
              color: on && t < w.end + 0.05 ? "#ffd83a" : "#ffffff",
              WebkitTextStroke: "11px #15121c", paintOrder: "stroke fill",
              textShadow: "0 8px 0 rgba(21,18,28,0.85)",
              marginRight: i < c.words.length - 1 ? "0.26em" : 0,
              display: "inline-block",
            }}>{txt}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
