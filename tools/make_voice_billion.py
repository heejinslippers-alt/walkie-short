# Generates voice/voice.wav (48 kHz) + voice/words.json from the script lines using Kokoro with exposed durations.
import json, sys, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
VOICE = sys.argv[1] if len(sys.argv) > 1 else "am_puck"
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 1.15
OUT = "/home/user/walkie-short/voice_billion"
# (line, pause after in seconds)
LINES = [
 ("What if every billionaire on Earth exploded, and anyone who ever became one exploded too?", 0.44),
 ("Right now, there are three thousand four hundred and twenty-eight billionaires, sitting on about twenty trillion dollars.", 0.32),
 ("At noon tomorrow: pop. Pop. Pop.", 0.36),
 ("Pool parties go quiet. Limousines wait outside, forever.", 0.36),
 ("But the money doesn't vanish. It goes to their kids.", 0.24),
 ("And the moment a kid inherits a billion: pop.", 0.3),
 ("Then the grandkids. Pop, pop.", 0.36),
 ("Lawyers start chopping fortunes into pieces as fast as they can.", 0.4),
 ("Luckily, America's biggest lottery winner took the cash option: nine hundred and ninety-seven point six million dollars.", 0.32),
 ("Unluckily, he's one good stock tip away from going pop.", 0.48),
 ("It's hot potato with money. You only blow up if you're holding too much, so you pass it on.", 0.24),
 ("Split three billion between four kids, and nobody pops.", 0.36),
 ("So the rich would race to give it away. More than two hundred and fifty of them have already promised to.", 0.44),
 ("But the rule never said which currency.", 0.32),
 ("In two thousand and eight, Zimbabwe's money got so worthless that a loaf of bread cost billions of dollars.", 0.24),
 ("Zimbabwe dollars.", 0.36),
 ("The whole bakery queue would have gone pop.", 0.56),
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
