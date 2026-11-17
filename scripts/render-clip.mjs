// usage: node scripts/render-clip.mjs <comp> <out.mp4> <from> <to> <scale> [concurrency]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [comp, out, from, to, scale = "0.5", conc = "2"] = process.argv.slice(2);
const LINUX_SHELL = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = process.env.CHROME || ((await import("node:fs")).existsSync(LINUX_SHELL) ? LINUX_SHELL : null);
const chromiumOptions = { gl: process.env.GL || (browserExecutable === LINUX_SHELL ? "swangle" : "angle") };
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const inputProps = process.env.POST ? { post: JSON.parse(process.env.POST) } : {};
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions, inputProps, timeoutInMilliseconds: 600000 });
console.log("bundled+selected", ((Date.now() - t0) / 1000).toFixed(0) + "s");
let last = -1; const t1 = Date.now();
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), browserExecutable, chromiumOptions,
  frameRange: [Number(from), Number(to)], concurrency: Number(conc), inputProps, timeoutInMilliseconds: 600000, muted: true,
  onProgress: ({ renderedFrames }) => { if (renderedFrames !== last && renderedFrames % 10 === 0) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t1) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
