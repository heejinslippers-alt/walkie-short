#!/bin/bash
# Low-res preview in 40-frame chunks (540x960 buffer, light MSAA); skips frames already rendered.
cd "$(dirname "$0")/.."
TOTAL=$(node -e 'const w=require("./src/videos/walkie/words.json");console.log(Math.ceil(w.duration*30))')
CH=40
a=0
while [ $a -lt $TOTAL ]; do
  out=out/preview/chunk_$(printf %04d $a).mp4
  if [ -s "$out" ]; then  # an existing chunk may be longer than CH (older 200-frame chunks)
    n=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of default=nw=1:nk=1 "$out" | tr -dc 0-9)
    a=$((a+n)); continue
  fi
  b=$((a+CH-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  for try in 1 2 3; do
    POST='{"dpr":0.5,"msaa":2}' node scripts/render-clip.mjs WalkieShort "$out.tmp.mp4" $a $b 0.5 2 2>&1 | grep --line-buffered -E "^frames|^done|rror" | sed -u "s/^/[$a-$b] /"
    [ -s "$out.tmp.mp4" ] && mv "$out.tmp.mp4" "$out" && break
  done
  [ -s "$out" ] || { echo "FAILED $a-$b"; exit 1; }
  a=$((b+1))
done
echo ALL_DONE
