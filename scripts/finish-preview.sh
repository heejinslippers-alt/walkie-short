#!/bin/bash
# Join the preview chunks and put the soundtrack on them.
cd "$(dirname "$0")/.."
ls out/preview/chunk_*.mp4 | sort | sed "s/^/file '/; s/$/'/; s#out/preview/##" > out/preview/list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i out/preview/list.txt -c copy out/preview/video.mp4
ffmpeg -loglevel error -y -i out/preview/video.mp4 -i audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/preview/walkie_preview.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,nb_frames -of compact out/preview/walkie_preview.mp4
