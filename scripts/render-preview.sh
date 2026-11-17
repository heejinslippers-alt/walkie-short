#!/bin/bash
# Low-res preview in 200-frame chunks (540x960 buffer, light MSAA); skips chunks already rendered.
cd "$(dirname "$0")/.."
TOTAL=$(node -e 'const w=require("./src/videos/walkie/words.json");console.log(Math.ceil(w.duration*30))')
for ((a=0; a<TOTAL; a+=200)); do
  b=$((a+199)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  out=out/preview/chunk_$(printf %04d $a).mp4
  [ -s "$out" ] && continue
  for try in 1 2 3; do
    POST='{"dpr":0.5,"msaa":2}' node scripts/render-clip.mjs WalkieShort "$out.tmp.mp4" $a $b 0.5 2 2>&1 | grep --line-buffered -E "^frames|^done|rror" | sed -u "s/^/[$a-$b] /"
    [ -s "$out.tmp.mp4" ] && mv "$out.tmp.mp4" "$out" && break
  done
done
echo ALL_DONE
