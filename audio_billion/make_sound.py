# Sound for "What If Every Billionaire Exploded": synthesized SFX on the picture's event frames (mirrors story.ts EV),
# an original jaunty 2/4 score that changes colour per section, ducked under the voice, and the final mix
# (voice unchanged, music ~10 LU under the voice, SFX ~14 LU under it; -15 LUFS integrated, <= -1.2 dBTP).
# Writes mix.wav (48 kHz, exact picture length), stems and cues.md.
import json, os, sys
import numpy as np
from scipy import signal
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, colored, smooth_noise, fades, pan, st, place, widen, make_ir, convolve_st,
                 read_wav, write_wav, integrated, true_peak, momentary, dbg)
from instruments import brass, glock, vibes, pluck, snare, cymbal, timpani, brush, pad, triangle, m2f
from sfx_gen import whoosh, oof, whoa, babble, bird_chirps, crickets, breeze, hammer_hit, stroll_step, clink, water_bed, bubbles

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "audio"))
W = json.load(open(os.path.join(ROOT, "src/videos/billion/words.json")))
FPS = 30
TOTAL = int(np.ceil(W["duration"] * FPS))
DUR = TOTAL / FPS
N = ns(DUR)


def word(l, w):
    ws = [x for x in W["words"] if x["line"] == l]
    return round(ws[min(w, len(ws) - 1)]["start"] * FPS)


LINE = lambda l: round(W["lines"][l]["start"] * FPS)
# mirrors story.ts SHOTS boundaries
B = [0, LINE(1) - 1, LINE(2) - 1, LINE(3) - 1, word(3, 4) - 6, LINE(4) - 1, LINE(5) - 1, LINE(6) - 1, LINE(7) - 1, LINE(8) - 1, LINE(9) - 1,
     LINE(10) - 1, LINE(11) - 1, LINE(12) - 1, LINE(13) - 1, LINE(14) - 1, LINE(15) - 3, LINE(16) - 1, TOTAL]
SHOT = lambda i: (B[i - 1] / FPS, B[i] / FPS)
L2 = 2
POP = lambda l, w: (word(l, w) - 1) / FPS
EV = {k: (word(*v) - L2) / FPS for k, v in dict(
    became=(0, 11), sitting=(1, 11), noon=(2, 1), forever=(3, 7), kids=(4, 6), inherits=(4, 5), billion=(5, 7), chop=(7, 2), pieces=(7, 5),
    lucky=(8, 0), cash=(8, 7), nine=(8, 9), tip=(9, 4), potato=(10, 2), split=(11, 0), nobody=(11, 7), give=(12, 6), more=(12, 9),
    rule=(13, 2), currency=(13, 6), billions=(14, 16), queue=(16, 3)).items()}
EV["kids"] = (word(4, 6) - 10) / FPS
POPS = [POP(0, 6), POP(0, 13), POP(2, 3), POP(2, 4), POP(2, 5), POP(5, 8), POP(6, 3), POP(6, 4)] + [POP(16, 7) + i * 3 / FPS for i in range(6)]
cues = []


def cue(t, name, g):
    cues.append((t, name, g))


# ================================================================ SFX
def sizzle(dur, r, level=1.0, crackle=30.0):
    n = ns(dur)
    t = np.arange(n) / SR
    bed = hp(colored(n, r, 0.3), 2500) * (0.5 + 0.5 * smooth_noise(n, r, 3.0)) * 0.35
    y = bed.copy()
    k = 0.0
    while k < dur:
        k += r.exponential(1 / crackle)
        i = ns(k)
        L = ns(0.006)
        if i + L >= n:
            break
        y[i:i + L] += hp(r.standard_normal(L), 3000) * np.exp(-np.arange(L) / SR / 0.0012) * r.uniform(0.3, 1.0)
    return fades(y * level, 0.05, 0.1)


def hiss(dur, r, level=1.0):
    n = ns(dur)
    return fades(bp(colored(n, r, 0.5), 1500, 7000, 2) * (0.6 + 0.4 * smooth_noise(n, r, 2.0)) * level, 0.15, 0.3)


def crack_egg(r):
    d = 0.35
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = bp(nz, 1500, 6000, 2) * np.exp(-t / 0.004) * 1.4
    y += bp(nz, 600, 2500, 1) * np.exp(-np.maximum(t - 0.05, 0) / 0.02) * (t > 0.05) * 0.6
    y += reson(nz, 900, 6) * np.exp(-np.maximum(t - 0.18, 0) / 0.03) * (t > 0.18) * 0.5   # the splat into the pan
    return y


def shimmer(dur, r, f0=1760):
    y = np.zeros(ns(dur))
    for k, m in enumerate([0, 4, 7, 12, 16, 19]):
        g = glock(f0 * 2 ** (m / 12), 0.5, r, dur=1.2)
        i = ns(k * 0.045)
        y[i:i + len(g)] += g[: max(0, len(y) - i)]
    return y


def metal_clank(r, big=1.0):
    d = 1.2
    t = tt(d)
    y = sum(a * np.exp(-t / tau) * np.sin(TAU * f * t + r.uniform(0, TAU)) for f, a, tau in
            [(r.uniform(210, 260), 1.0, 0.25), (r.uniform(540, 620), 0.7, 0.18), (r.uniform(1130, 1300), 0.5, 0.12), (r.uniform(2300, 2700), 0.3, 0.06)])
    y += bp(r.standard_normal(len(t)), 500, 6000, 1) * np.exp(-t / 0.006) * 1.2
    return fades(y * big, 0, 0.1)


def door_clunk(r):
    d = 0.5
    t = tt(d)
    y = np.exp(-t / 0.06) * np.sin(TAU * 70 * t) * 1.2 + reson(r.standard_normal(len(t)), 260, 4) * np.exp(-t / 0.04)
    y += bp(r.standard_normal(len(t)), 1500, 5000, 1) * np.exp(-t / 0.003) * 0.6
    return y


def traffic(dur, r):
    n = ns(dur)
    out = breeze(dur, r, 0.5, 0.1, 500)
    for k in range(int(dur / 3.5) + 1):
        t0 = k * 3.5 + r.uniform(0, 2)
        car = whoosh(r.uniform(2.5, 4), r, peak=r.uniform(1.0, 1.8), f_lo=120, f_hi=900, width=1.0, tail=0.7, air=0.05)
        place(out, pan(car, r.uniform(-0.8, 0.8)) * 0.5, t0)
    return out[:, :n]


def gasp(r, base):
    return whoa(r, base=base, dur=r.uniform(0.3, 0.42))


def pop_fx(r, big=1.0):
    """cartoon pop: a falling 'bloop' body, a bright click, then paper rustle and a few coins"""
    d = 0.9
    t = tt(d)
    f = 120 + 380 * np.exp(-t / 0.025)
    ph = TAU * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.07) * 1.3
    y += hp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.002) * 0.9
    rust = bp(r.standard_normal(len(t)), 2000, 7000, 2) * (0.5 + 0.5 * np.abs(np.sin(TAU * 13 * t))) * np.exp(-np.maximum(t - 0.05, 0) / 0.18) * (t > 0.04) * 0.35
    y += rust
    for k in range(4):
        c = clink(r, r.uniform(2400, 4200), 0.12, 0.8)
        i = ns(0.12 + k * r.uniform(0.07, 0.13))
        y[i:i + len(c)] += c[: max(0, len(y) - i)] * 0.35
    return fades(y * big, 0, 0.1)


def thud(r, f0=90, g=1.0):
    t = tt(0.3)
    return (np.sin(TAU * f0 * t) * np.exp(-t / 0.05) + bp(r.standard_normal(len(t)), 200, 1200, 1) * np.exp(-t / 0.01) * 0.5) * g


def whistle_tune(r, notes, t0=0.0):
    y = np.zeros(ns(len(notes) * 0.32 + 0.5))
    for k, m in enumerate(notes):
        if not m: continue
        t = tt(0.28)
        f = m2f(m) * (1 + 0.012 * np.sin(TAU * 5.5 * t))
        x = np.sin(TAU * np.cumsum(f) / SR) * np.minimum(1, t / 0.03) * np.minimum(1, (0.28 - t) / 0.05)
        x += hp(r.standard_normal(len(t)), 3000) * 0.04
        i = ns(k * 0.32)
        y[i:i + len(x)] += x[: len(y) - i]
    return y * 0.6


def traffic(dur, r):
    n = ns(dur)
    out = breeze(dur, r, 0.5, 0.1, 500)
    for k in range(int(dur / 3.5) + 1):
        t0 = k * 3.5 + r.uniform(0, 2)
        car = whoosh(r.uniform(2.5, 4), r, peak=r.uniform(1.0, 1.8), f_lo=120, f_hi=900, width=1.0, tail=0.7, air=0.05)
        place(out, pan(car, r.uniform(-0.8, 0.8)) * 0.5, t0)
    return out[:, :n]


def build_sfx():
    r = rng(5)
    S = np.zeros((2, N))
    def P(x, t, g=1.0, p=0.0, name=None):
        x = np.asarray(x)
        if t < 0: return
        place(S, pan(x, p) if x.ndim == 1 else x, t, dbg(g))
        if name:
            cue(t, name, g)
    # ambience: city everywhere in London, birds in the park, water + cicadas at the pool
    for i in (1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18):
        a, b = SHOT(i)
        P(traffic(b - a + 0.4, rng(100 + i)), a - 0.1, -16)
    for i in (12, 13):
        a, b = SHOT(i)
        P(st(bird_chirps(b - a, rng(10 + i), 0.5)), a, -16)
        P(breeze(b - a, rng(20 + i), 0.6), a, -21)
    a, b = SHOT(4)
    P(st(water_bed(b - a, rng(15), 0.6)), a, -16)
    P(st(crickets(b - a, rng(16), 3)), a, -24)
    # the pops (every one lands on its "pop"), and the hats landing
    for k, t0 in enumerate(POPS):
        P(pop_fx(r, 1.0 if k < 8 else 0.85), t0, -3 if k < 8 else -5, r.uniform(-0.3, 0.3), "pop")
        P(thud(r, 160, 0.4), t0 + 0.75, -16)
    P(whoosh(0.6, r, 0.45, 300, 3000), SHOT(1)[1] - 0.45, -9, name="flash whoosh")
    # 2 the gold: coins pouring
    for k in range(10):
        P(clink(r, r.uniform(2000, 4500), 0.12, 0.7), EV["sitting"] + 0.1 * k + r.uniform(0, 0.05), -14, r.uniform(-0.5, 0.5))
    # 5 the chauffeur whistles
    P(whistle_tune(r, [76, 79, 81, 79, 76, 0, 74]), EV["forever"] + 0.1, -10, 0.2, "chauffeur whistle")
    # 6 kids' footsteps
    t = EV["kids"]
    while t < SHOT(6)[1]:
        P(stroll_step(r, 0.3), t, -16, -0.4); t += 0.4
    # 7 the heir: a happy whoa then the pop
    P(whoa(r, base=300), EV["inherits"] + 0.3, -12, 0.1, "kid whoa")
    # 9 lawyers: scissor snips + coin stacks
    t = EV["chop"] - 0.2
    while t < SHOT(9)[1] - 0.2:
        P(clink(r, r.uniform(5000, 7000), 0.05, 1.0), t, -15, r.uniform(-0.4, 0.4)); t += 0.24
    for k in range(7):
        P(clink(r, r.uniform(2400, 3600), 0.15, 0.7), EV["chop"] + (EV["pieces"] + 24 / FPS - EV["chop"]) * (k + 1) / 7, -12, -0.2 + 0.07 * k)
    # 10 the lottery: party horn + cheer
    P(st(babble(1.4, r, 220, 1.0)), EV["lucky"] + 0.1, -16)
    P(whoa(r, base=180), EV["cash"], -11, 0.1, "winner whoa")
    # 11 the tip: a gulp
    P(clink(r, 520, 0.12, 0.3), EV["tip"] + 0.5, -12, 0, "gulp")
    # 12 hot potato: whooshes on every toss
    a, b = SHOT(12)
    t, el = a, 0.0
    while t < b:
        per = 0.9 if el < 2.6 else 0.6
        P(whoosh(0.35, r, 0.4, 600, 3000, tail=0.1), t + per * 0.62, -15, r.uniform(-0.5, 0.5))
        t += per; el += per
    # 13 split: coin slide + kids laugh
    P(whoosh(0.6, r, 0.4, 400, 2500), EV["split"] + 0.1, -13)
    for k in range(4):
        P(clink(r, r.uniform(2500, 3500), 0.15, 0.7), EV["split"] + 0.9 + 0.05 * k, -13, -0.6 + 0.4 * k)
        P(oof(r, "oh", base=r.uniform(260, 340)), EV["nobody"] + 0.3 + 0.1 * k, -15, -0.6 + 0.4 * k)
    # 14 giving it away: crowd cheer
    a, b = SHOT(14)
    P(st(babble(b - a, r, 200, 1.0)), a, -15, name="crowd cheer")
    for k in range(5):
        P(whoa(r, base=r.uniform(150, 280)), EV["give"] + 0.2 * k, -14, r.uniform(-0.7, 0.7))
    # 15 question: a little 'hm' bloop
    P(glock(m2f(79), 0.5, r, 0.8), EV["currency"], -12, 0.3, "question ping")
    # 18 the queue: a nervous murmur before the pops
    P(st(babble(1.0, r, 190, 0.9)), EV["queue"], -17)
    return S


# ================================================================ music
Q = 60 / 132  # 132 bpm quarter, 2/4 bounce


def build_music():
    r = rng(9)
    M = np.zeros((2, N))
    def P(x, t, g=1.0, p=0.0):
        place(M, pan(x, p) if np.ndim(x) == 1 else x, t, g)
    # chord roots per bar (F major comic): I V I IV | I V I V
    prog = [(53, [65, 69, 72]), (48, [64, 67, 70]), (53, [65, 69, 72]), (46, [65, 70, 74]),
            (53, [65, 69, 72]), (48, [64, 67, 70]), (50, [62, 65, 69]), (48, [64, 67, 72])]
    tune = [72, 74, 76, 77, 79, 77, 76, 72, 74, 76, 74, 72, 70, 72, 74, 0, 72, 74, 76, 77, 79, 81, 79, 77, 76, 74, 72, 74, 72, 0, 67, 0]
    sections = [  # (start, end, style)
        (0.0, SHOT(1)[1], "hook"), (SHOT(2)[0], SHOT(4)[0], "bounce"), (SHOT(4)[0], SHOT(5)[0], "lounge"), (SHOT(5)[0], SHOT(6)[0], "deadpan"),
        (SHOT(6)[0], SHOT(10)[0], "bounce"), (SHOT(10)[0], SHOT(11)[0], "brass"), (SHOT(11)[0], SHOT(12)[0], "tension"),
        (SHOT(12)[0], SHOT(14)[0], "curious"), (SHOT(14)[0], SHOT(15)[0], "brass"), (SHOT(15)[0], SHOT(16)[0], "deadpan"),
        (SHOT(16)[0], SHOT(18)[0], "lounge"), (SHOT(18)[0], DUR, "swell")]
    for (a, b, sty) in sections:
        t, beat = a, 0
        while t < b - 0.05:
            bar = int(beat // 2) % 8
            root, ch = prog[bar]
            on = beat % 2 == 0
            if sty in ("bounce", "brass", "swell", "hook"):
                # oom-pah: tuba on 1, chord stab on 2 (pizz plucks)
                if on: P(brass(m2f(root - 12), Q * 0.8, 0.75, r, "tuba"), t, 0.55)
                else:
                    for k, m in enumerate(ch): P(pluck(m2f(m), 0.5, r, 0.5, 0.5), t + 0.004 * k, 0.22, -0.3 + 0.3 * k)
                mel = tune[(beat) % len(tune)]
                if mel and sty != "hook": P(pluck(m2f(mel), 0.75, r, 0.6, 0.6), t, 0.32, 0.15)
                if sty == "brass" and on and bar % 2 == 0: P(brass(m2f(ch[1]), Q * 1.6, 0.7, r, "horn"), t, 0.25, 0.2)
                if sty in ("bounce", "brass"): P(brush(0.4, r, 0.2), t + Q / 2, 0.18, 0.4)
                if sty == "swell": P(snare(0.25 + 0.5 * (t - a) / (b - a), r, 0.2), t + Q / 2, 0.25)
            elif sty == "deadpan":
                if on and bar % 2 == 0: P(pluck(m2f(root), 0.6, r, 1.0, 0.3), t, 0.4)
            elif sty == "curious":
                if on: P(vibes(m2f(ch[beat // 2 % 3] + 12), 0.45, r, 1.4), t, 0.35, 0.2)
                if bar % 4 == 0 and on: P(pad([m2f(m - 12) for m in ch], Q * 8, 0.4, r, 0.4, 0.8), t, 0.28)
                if not on: P(pluck(m2f(root), 0.5, r, 0.7, 0.4), t, 0.3, -0.2)
            elif sty == "tension":
                if on: P(pluck(m2f(root + [0, 1, 0, -1][bar % 4]), 0.55, r, 0.5, 0.5), t, 0.4)
                P(brush(0.25, r, 0.15), t, 0.15)
            elif sty == "lounge":
                # swingy vibes + brushes, warm pad
                if on: P(brass(m2f(root - 12), Q * 0.9, 0.5, r, "soft"), t, 0.5)
                P(brush(0.35, r, 0.25, swish=not on), t, 0.2, 0.3)
                if on and bar % 2 == 0: P(pad([m2f(m) for m in ch], Q * 4, 0.35, r, 0.3, 0.8), t, 0.25)
                mel = tune[(beat + 4) % len(tune)]
                if mel and beat % 2 == 1: P(vibes(m2f(mel), 0.5, r, 1.0), t, 0.3, 0.2)
            t += Q
            beat += 1
    # stingers
    P(cymbal(0.6, r, 2.0), SHOT(2)[0] - 0.05, 0.25)
    P(brass(m2f(65), 0.5, 0.9, r, "stab"), SHOT(2)[0], 0.3); P(brass(m2f(69), 0.5, 0.9, r, "stab"), SHOT(2)[0], 0.25)
    P(triangle(0.6, r), EV["lucky"], 0.3)
    end = DUR - 1.4
    for m in (53, 65, 69, 72):
        P(brass(m2f(m), 1.2, 0.8, r, "horn" if m > 60 else "tuba"), end, 0.3)
    P(cymbal(0.4, r, 1.6), end, 0.2)
    return M


# ================================================================ mix
CACHE = os.path.join(HERE, "_cache")  # per-film cache (audio_billion/_cache)


def cached(name, fn):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name + ".npy")
    if os.path.exists(p) and "--fresh" not in sys.argv:
        return np.load(p).astype(np.float64)
    x = fn(); np.save(p, x.astype(np.float32)); return x
def lufs(x):
    v = integrated(x)
    return v


def main():
    voice, _sr = read_wav(os.path.join(ROOT, "voice_billion/voice.wav"))
    v = np.zeros((2, N)); vv = st(voice); v[:, : min(N, vv.shape[1])] = vv[:, :N]
    sfx = cached("sfx", build_sfx)
    mus = cached("music", build_music)
    ir = make_ir(1.1, 3)
    mus = 0.85 * mus + 0.25 * convolve_st(mus, ir)[:, :N]
    sfx = 0.9 * sfx + 0.15 * convolve_st(sfx, make_ir(0.6, 4))[:, :N]
    # duck the music under speech (from word timings), 120 ms attack / 300 ms release
    key = np.zeros(N)
    for w in W["words"]:
        key[ns(w["start"]): ns(w["end"] + 0.05)] = 1
    win = signal.windows.hann(ns(0.25)); win /= win.sum()
    duck = 1 - (1 - dbg(-3.0)) * np.clip(signal.fftconvolve(key, win, "same") * 1.5, 0, 1)
    mus *= duck[None, :]
    Lv = lufs(v)
    mus *= dbg((Lv - 10.0) - lufs(mus))      # music bed ~10 LU under the voice (+3 dB standard)
    sfx *= dbg((Lv - 14.0) - lufs(sfx))      # SFX ~14 LU under the voice (-6 dB standard)
    mix = v + mus + sfx
    g = dbg(-15.0 - lufs(mix))
    mix, v, mus, sfx = mix * g, v * g, mus * g, sfx * g
    # simple look-ahead peak limiter to -1.2 dBTP
    ceil = dbg(-1.2)
    pk = np.abs(signal.resample_poly(mix, 4, 1, axis=1)).max(axis=0)[::4][:N]
    gr = np.minimum(1, ceil / np.maximum(pk, 1e-9))
    k = ns(0.004)
    sm = np.array([gr[max(0, i - k):i + k].min() for i in range(0, N, 64)])
    sm = np.repeat(sm, 64)[:N]
    sm = np.convolve(sm, np.ones(64) / 64, "same")
    mix = mix * np.minimum(sm, 1)[None, :]
    out = os.path.join(ROOT, "audio_billion")
    write_wav(os.path.join(out, "mix.wav"), mix)
    write_wav(os.path.join(out, "stem_voice.wav"), v); write_wav(os.path.join(out, "stem_music.wav"), mus); write_wav(os.path.join(out, "stem_sfx.wav"), sfx)
    rep = [f"# What If Every Billionaire Exploded - cue sheet", "", "All sound original: synthesized (template dsp/instruments/sfx_gen + make_sound.py).", "",
           f"- length {N} samples = {N / SR:.3f} s ({TOTAL} frames)", f"- integrated {lufs(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP",
           f"- stems: voice {lufs(v):.1f}, music {lufs(mus):.1f}, sfx {lufs(sfx):.1f} LUFS", "", "| t (s) | frame | event | gain dB |", "|---|---|---|---|"]
    for t0, name, gdb in sorted(cues):
        rep.append(f"| {t0:.2f} | {round(t0 * FPS)} | {name} | {gdb} |")
    open(os.path.join(out, "cues.md"), "w").write("\n".join(rep) + "\n")
    print("\n".join(rep[4:7]))


if __name__ == "__main__":
    main()
