# Generates voice/voice.wav (48 kHz) + voice/words.json from the script lines using Kokoro with exposed durations.
import json, sys, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
VOICE = sys.argv[1] if len(sys.argv) > 1 else "am_puck"
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1.15
OUT = "/home/user/walkie-short/voice_traffic"
# (line, pause after in seconds)
LINES = [
 ("What if every car on Earth drove at exactly the same speed? Would traffic jams disappear?", 0.44),
 ("There are one and a half billion cars on the planet, and last year, London drivers lost ninety-one hours each, stuck in traffic.", 0.32),
 ("So one morning, every car locks to the same speed.", 0.32),
 ("Motorways flow like a river. Nobody tailgates. Nobody overtakes.", 0.36),
 ("Then a traffic light turns red.", 0.24),
 ("One car stops, so every car on Earth has to stop.", 0.36),
 ("In Texas, a truck slams on the brakes. In Paris, a whole roundabout freezes.", 0.4),
 ("Luckily, nobody ever crashes into the car in front.", 0.28),
 ("Unluckily, every red light on the planet now stops the entire planet.", 0.48),
 ("But jams don't even need a red light. In two thousand and eight, scientists in Japan had twenty-two cars drive in a circle at one steady speed.", 0.28),
 ("Within minutes, a jam appeared out of nowhere.", 0.36),
 ("One driver brakes a little. The one behind brakes a bit more. And the squeeze rolls backwards, like an accordion.", 0.36),
 ("So the cure isn't equal speed. It's equal gaps.", 0.32),
 ("In two thousand and seventeen, one self-driving car kept a steady gap in a ring of twenty, and the waves faded away.", 0.44),
 ("So next time you're stuck in traffic, be that car.", 0.3),
 ("Leave a gap.", 0.6),
]
k = Kokoro("/root/tts/kokoro-dur.onnx", "/root/tts/voices-v1.0.bin")
SR = 24000
lead = 0.25
audio = [np.zeros(int(lead * SR), np.float32)]
t0 = lead
words, lines = [], []
for li, (text, pause) in enumerate(LINES):
    a, sr, tim = k.create_timed(text, voice=VOICE, speed=SPEED, lang="en-gb" if VOICE.startswith("b") else "en-us", trim=False)
    assert sr == SR
    PUN = ",.?!;:"
    sp = [t for t in tim if t.phoneme not in PUN + " "]
    # trim silence: keep 40 ms before the first phoneme and 90 ms after the last
    cut0 = max(0.0, sp[0].start - 0.04); cut1 = min(len(a) / SR, sp[-1].end + 0.09)
    a = a[int(cut0 * SR):int(cut1 * SR)]
    toks = text.split()
    groups, cur = [], []
    for t in tim:
        if t.phoneme == " ":
            if cur: groups.append(cur); cur = []
        elif t.phoneme not in PUN:
            cur.append(t)
    if cur: groups.append(cur)
    # espeak sometimes merges words ("on the" -> one group): split a group over n tokens by their own phoneme lengths
    plen = [max(1, len(k.tokenizer.phonemize(re.sub(r"[^\w']", "", w) or w, "en-gb" if VOICE.startswith("b") else "en-us").replace(" ", ""))) for w in toks]
    spans, ti = [], 0
    for gi, g in enumerate(groups):
        left_groups = len(groups) - gi - 1
        best, bn = None, 1
        for n in range(1, len(toks) - ti - left_groups + 1):
            d = abs(sum(plen[ti:ti + n]) - len(g))
            if best is None or d < best: best, bn = d, n
        if gi == len(groups) - 1: bn = len(toks) - ti
        lens = plen[ti:ti + bn]; tot = sum(lens); acc = 0
        for j, L in enumerate(lens):
            a_i = round(acc / tot * len(g)); b_i = max(a_i + 1, round((acc + L) / tot * len(g))); acc += L
            seg = g[min(a_i, len(g) - 1):min(b_i, len(g))]
            spans.append((ti + j, seg[0].start, seg[-1].end))
        ti += bn
    if ti != len(toks): print("WARN line", li, "tokens", len(toks), "assigned", ti)
    for (wi, st, en) in spans:
        w = toks[wi]
        words.append({"word": re.sub(r"[^\w'’-]", "", w), "text": w, "start": round(t0 + st - cut0, 3), "end": round(t0 + en - cut0, 3), "line": li})
    lines.append({"line": li, "text": text, "start": round(t0, 3), "end": round(t0 + len(a) / SR, 3)})
    audio.append(a.astype(np.float32)); t0 += len(a) / SR
    audio.append(np.zeros(int(pause * SR), np.float32)); t0 += pause
x = np.concatenate(audio)
x = x / (np.abs(x).max() + 1e-9) * 0.89
sf.write(f"{OUT}/voice_24k.wav", x, SR)
json.dump({"voice": VOICE, "duration": round(len(x) / SR, 3), "lines": lines, "words": words}, open(f"{OUT}/words.json", "w"), indent=1)
print("duration", len(x) / SR, "words", len(words))
