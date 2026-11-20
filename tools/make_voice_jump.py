# Generates voice/voice.wav (48 kHz) + voice/words.json from the script lines using Kokoro with exposed durations.
import json, sys, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
VOICE = sys.argv[1] if len(sys.argv) > 1 else "am_puck"
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1.15
OUT = "/home/user/walkie-short/voice_jump"
# (line, pause after in seconds)
LINES = [
 ("What if every person on Earth jumped at exactly the same time? Could we shove the planet off course?", 0.44),
 ("There are eight point two billion of us, weighing about four hundred million tonnes all together.", 0.32),
 ("So we all squeeze into one place. Packed shoulder to shoulder, everybody fits in a space not much bigger than London.", 0.36),
 ("Three.", 0.22),
 ("Two.", 0.22),
 ("One.", 0.26),
 ("Jump!", 0.34),
 ("Eight billion people leave the ground, and the whole Earth moves...", 0.24),
 ("by less than a thousandth of the width of an atom.", 0.36),
 ("Because the planet is fifteen trillion times heavier than all of us put together.", 0.3),
 ("It's like a flea jumping off a cruise ship. The ship doesn't even notice.", 0.4),
 ("Luckily, when we land, the Earth moves right back.", 0.28),
 ("Unluckily, the landing is loud. In twenty eleven, Seattle football fans celebrated a touchdown so hard, a seismometer recorded it as a small earthquake.", 0.32),
 ("Now picture a hundred and twenty thousand of those crowds landing at once.", 0.44),
 ("But the real disaster comes afterwards.", 0.28),
 ("Eight billion people, in one place, all trying to get home at the same time.", 0.36),
 ("And we already know how that ends.", 0.6),
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
