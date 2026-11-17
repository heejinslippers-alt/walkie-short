# The Building That Cooked a Car

A 66-second vertical cartoon short (2D characters in a 3D world, three.js inside Remotion). It tells the true story of the
London skyscraper whose curved glass melted a parked car in 2013. The script and its sources are in `SCRIPT.md`.

## What's here
| Path | What it is |
|---|---|
| `src/videos/walkie/story.ts` | Shot plan: shots, cameras, depth of field and impact kicks, all timed to the voice (`words.json`) |
| `src/videos/walkie/city.ts` | The street, shops, curved tower (crane, fins), City skyline, car, park and Las Vegas pool |
| `src/videos/walkie/world.ts` | Per-frame posing: light rig, sky, beam of reflected sunlight, melting mirror and badge |
| `src/videos/walkie/cast.ts`, `toon.ts` | The characters and 2D effects (pan and egg, smoke, magnifier, sunglasses, melting bag) |
| `src/videos/walkie/Walkie.tsx` + `ink.ts`, `lensblur.ts`, `grade.ts` | Post chain: ink, then lens blur, then bloom, then tone map, then grade |
| `voice/voice.wav`, `src/videos/walkie/words.json` | Narration (Kokoro TTS, voice `am_puck`, speed 1.15) and its word timings (`tools/make_voice.py`) |
| `audio/mix.wav` | Final soundtrack: voice, original score and SFX, -15 LUFS, exactly the picture length (`audio/make_sound.py`, `audio/cues.md`) |

## Render the full-quality 2K video (needs a GPU; about 10-30 min)
You need Node 18+ and ffmpeg.

```bash
npm install
```

```bash
npx remotion render src/index.ts WalkieShort out/video.mp4 --codec h264 --crf 16 --scale 1.3333 --gl=angle --timeout=120000
```

```bash
ffmpeg -i out/video.mp4 -i audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out/final.mp4
```

The second line writes a 1440x2560 video. Remotion adds a silent audio track, so the ffmpeg line swaps in `audio/mix.wav`.
On Linux without `--gl=angle` support, try `--gl=egl` or `--gl=vulkan`.

## Preview and stills
- `npx remotion studio src/index.ts` opens the editor.
- `COMP=WalkieShort node scripts/bridge-stills.mjs out/x_ 100,400 0.5` renders test stills (set `CHROME` to your Chrome path).
