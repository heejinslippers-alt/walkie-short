#!/bin/bash
# Low-res preview of BillionShort in 40-frame chunks (540x960 buffer, light MSAA); skips chunks already rendered.
# usage: render-preview-billion.sh [worker k] [of n]   (n workers share the chunks: chunk i goes to worker i % n)
cd "$(dirname "$0")/.."
K=${1:-0}; NW=${2:-1}
TOTAL=$(node -e 'const w=require("./src/videos/billion/words.json");console.log(Math.ceil(w.duration*30))')
CH=40
mkdir -p out/bpreview
for ((a=0; a<TOTAL; a+=CH)); do
  [ $(( (a/CH) % NW )) -eq $K ] || continue
  out=out/bpreview/chunk_$(printf %04d $a).mp4
  [ -s "$out" ] && continue
  b=$((a+CH-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  for try in 1 2 3; do
    POST='{"dpr":0.5,"msaa":2}' node scripts/render-clip.mjs BillionShort "$out.tmp.mp4" $a $b 0.5 2 2>&1 | grep --line-buffered -E "^frames|^done|rror" | sed -u "s/^/[$a-$b] /"
    [ -s "$out.tmp.mp4" ] && mv "$out.tmp.mp4" "$out" && break
  done
  [ -s "$out" ] || echo "FAILED $a-$b"
done
echo "WORKER_DONE $K"
