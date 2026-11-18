#!/bin/bash
# Join the BillionShort preview chunks and put the soundtrack on them.
cd "$(dirname "$0")/.."
ls out/bpreview/chunk_*.mp4 | sort | sed "s/^/file '/; s/$/'/; s#out/bpreview/##" > out/bpreview/list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i out/bpreview/list.txt -c copy out/bpreview/video.mp4
ffmpeg -loglevel error -y -i out/bpreview/video.mp4 -i audio_billion/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out/bpreview/billionaires_preview.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,nb_frames -of compact out/bpreview/billionaires_preview.mp4
