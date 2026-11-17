# Sound for "The Building That Cooked a Car": synthesized SFX on the picture's event frames (mirrors story.ts EV),
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
W = json.load(open(os.path.join(ROOT, "src/videos/walkie/words.json")))
FPS = 30
TOTAL = int(np.ceil(W["duration"] * FPS))
DUR = TOTAL / FPS
N = ns(DUR)


def word(l, w):
    ws = [x for x in W["words"] if x["line"] == l]
    return round(ws[min(w, len(ws) - 1)]["start"] * FPS)


LINE = lambda l: round(W["lines"][l]["start"] * FPS)
B = [0] + [LINE(i) - 1 for i in range(1, 8)] + [LINE(8) - 2] + [LINE(i) - 1 for i in range(9, 15)] + [TOTAL]
SHOT = lambda i: (B[i - 1] / FPS, B[i] / FPS)
L2 = 2
EV = {k: (word(*v) - L2) / FPS for k, v in dict(
    melt0=(0, 3), park=(2, 4), popOut=(2, 11), back=(3, 3), wing=(3, 5), badge=(3, 9), crack=(4, 12), fries=(4, 19), pan=(4, 8),
    looks=(6, 3), glass=(7, 2), blazing=(7, 10), lucky=(8, 0), hurt=(8, 3), did=(9, 3), sun=(10, 8), burning=(10, 12),
    bounces=(11, 12), bolted=(12, 3), shades=(12, 20), seen=(13, 4), melting=(14, 8), bags=(14, 11)).items()}
EV["smoke"] = (word(5, 8) - 12) / FPS
EV["blazing"] -= 0 / FPS
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


def build_sfx():
    r = rng(5)
    S = np.zeros((2, N))
    def P(x, t, g=1.0, p=0.0, name=None):
        x = np.asarray(x)
        place(S, pan(x, p) if x.ndim == 1 else x, t, dbg(g))
        if name:
            cue(t, name, g)
    # ambience: city traffic under London, birds in the park, pool + cicadas in Vegas
    for i in (2, 3, 4, 6, 7, 8, 9, 12, 13, 14):
        a, b = SHOT(i)
        P(traffic(b - a + 0.4, rng(100 + i)), a - 0.1, -14)
    for i in (5,):
        a, b = SHOT(i)
        P(traffic(b - a, rng(140)), a, -18)
    a, b = SHOT(11)
    P(st(bird_chirps(b - a, rng(11), 0.5)), a, -16)
    P(breeze(b - a, rng(12), 0.6), a, -20)
    a, b = SHOT(15)
    P(st(water_bed(b - a, rng(15), 0.6)), a, -17)
    P(st(crickets(b - a, rng(16), 3)), a, -24)
    # 1 hook: the car cooking
    a, b = SHOT(1)
    P(widen(sizzle(b - a + 0.2, r, 1.0, 40), r), 0, -6, name="car sizzle")
    P(hiss(b - a, r), 0, -12)
    P(whoosh(0.6, r, 0.45, 300, 3000), b - 0.45, -9, name="flash whoosh")
    # 3 parks + walks off
    P(door_clunk(r), EV["park"] + 0.2, -8, 0.0, "car door")
    a3, b3 = SHOT(3)
    t = EV["popOut"]
    while t < b3:
        P(stroll_step(r, 0.5), t, -12, 0.3 + 0.1 * (t - EV["popOut"])); t += 0.5
    # 4 comes back, sees it
    a4, _ = SHOT(4)
    t = a4
    while t < EV["back"]:
        P(stroll_step(r, 0.5), t, -12, 0.5); t += 0.5
    P(gasp(r, 120), EV["back"] + 0.3, -8, 0.1, "driver gasp")
    P(widen(sizzle(2.0, r, 1.0, 25), r), EV["wing"] - 0.1, -8, name="mirror sizzle")
    for k in range(4):
        P(clink(r, r.uniform(900, 1300), 0.08, 0.5), EV["wing"] + 0.4 + k * 0.38, -16, 0.2)  # drips
    P(widen(sizzle(1.6, r, 1.0, 30), r), EV["badge"] - 0.1, -9, name="badge sizzle")
    # 5 reporter: pan down, egg cracks, it fries
    P(clink(r, 1400, 0.15, 0.6), EV["pan"] + 0.2, -10, -0.2, "pan clank")
    P(crack_egg(r), EV["crack"], -5, 0, "egg crack")
    a5, b5 = SHOT(5)
    P(widen(sizzle(b5 - EV["fries"] + 0.3, r, 1.3, 55), r), EV["fries"] - 0.25, -5, name="egg sizzle")
    # 6 doormat smoke
    a6, b6 = SHOT(6)
    P(hiss(b6 - EV["smoke"], r, 1.0), EV["smoke"], -9, 0.1, "doormat smoke")
    P(widen(sizzle(b6 - EV["smoke"], r, 0.6, 20), r), EV["smoke"] + 0.2, -12)
    P(whoa(r, base=95), EV["smoke"] + 0.6, -9, 0.15, "barber whoa")
    # 7 looks up: crowd gasp
    for k in range(5):
        P(gasp(r, r.uniform(100, 230)), EV["looks"] + r.uniform(0, 0.25), -11, r.uniform(-0.7, 0.7))
    cue(EV["looks"], "crowd gasp", -11)
    # 8 the face blazes
    P(shimmer(2.0, r, 1760), EV["glass"] + 0.3, -10, 0, "glare shimmer")
    P(whoosh(0.9, r, 0.6, 400, 4000), EV["blazing"] - 0.55, -8, name="blaze whoosh")
    P(widen(hiss(SHOT(8)[1] - EV["blazing"], r, 1.2), r), EV["blazing"], -12)
    # 9 relief
    for k in range(3):
        P(oof(r, "oh", base=r.uniform(110, 220)), EV["lucky"] + 0.6 + k * 0.12, -14, r.uniform(-0.6, 0.6))
    # 10 the egg
    a10, b10 = SHOT(10)
    P(widen(sizzle(b10 - a10, r, 1.0, 45), r), a10, -7, name="egg CU sizzle")
    P(timpani(m2f(41), 0.6, r, 1.2), EV["did"], -12, 0, "egg did thud")
    # 11 magnifier
    P(shimmer(1.5, r, 2093), EV["sun"] - 0.1, -13, 0, "lens glint")
    P(widen(sizzle(SHOT(11)[1] - EV["burning"], r, 0.8, 30), r), EV["burning"], -10, name="leaf burn")
    # 12 every window
    P(shimmer(2.0, r, 1568), EV["bounces"] - 0.1, -11, 0, "windows shimmer")
    # 13 fins bolted, sunglasses land
    for k in range(6):
        P(hammer_hit(r, 0.5), EV["bolted"] + 0.35 * k, -15, -0.4 + 0.15 * k)
    cue(EV["bolted"], "fins bolted", -15)
    P(whoosh(0.8, r, 0.55, 300, 2500), EV["shades"] - 0.35, -9, name="shades drop")
    P(metal_clank(r, 1.0), EV["shades"] + 10 / FPS, -6, 0, "shades clank")
    # 14 the architect: a gulp
    P(clink(r, 520, 0.12, 0.3), EV["seen"] + 0.35, -14, 0, "gulp")
    # 15 bag melts
    P(widen(sizzle(SHOT(15)[1] - EV["melting"], r, 0.8, 30), r), EV["melting"], -11, name="bag melt")
    P(whoa(r, base=200), EV["bags"] + 0.15, -10, 0.2, "tourist whoa")
    # cut whooshes on the big camera glides
    for t0 in (EV["melt0"] - 12 / FPS + 0.5, EV["crack"] - 16 / FPS + 0.47, EV["burning"] - 20 / FPS + 0.5, EV["bounces"] - 10 / FPS + 0.67,
               EV["shades"] - 20 / FPS + 0.4, EV["melting"] - 18 / FPS + 0.5):
        P(whoosh(0.7, r, 0.35, 250, 1800, tail=0.2), t0 - 0.35, -16)
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
        (0.0, SHOT(1)[1], "hook"), (SHOT(2)[0], SHOT(8)[0], "bounce"), (SHOT(8)[0], SHOT(9)[0], "swell"),
        (SHOT(9)[0], SHOT(11)[0], "deadpan"), (SHOT(11)[0], SHOT(13)[0], "curious"), (SHOT(13)[0], SHOT(14)[0], "brass"),
        (SHOT(14)[0], SHOT(15)[0], "tension"), (SHOT(15)[0], DUR, "lounge")]
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
    P(triangle(0.6, r), EV["blazing"], 0.3)
    P(timpani(m2f(41), 0.8, r, 2.0), EV["shades"] + 10 / FPS, 0.5)
    P(cymbal(0.5, r, 2.2), EV["shades"] + 10 / FPS, 0.25)
    P(brass(m2f(77), 0.3, 0.9, r, "stab"), EV["shades"] + 10 / FPS, 0.3)
    end = DUR - 1.4
    for m in (53, 65, 69, 72):
        P(brass(m2f(m), 1.2, 0.8, r, "horn" if m > 60 else "tuba"), end, 0.3)
    P(cymbal(0.4, r, 1.6), end, 0.2)
    return M


# ================================================================ mix
CACHE = os.path.join(HERE, "_cache")


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
    voice, _sr = read_wav(os.path.join(ROOT, "voice/voice.wav"))
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
    out = os.path.join(ROOT, "audio")
    write_wav(os.path.join(out, "mix.wav"), mix)
    write_wav(os.path.join(out, "stem_voice.wav"), v); write_wav(os.path.join(out, "stem_music.wav"), mus); write_wav(os.path.join(out, "stem_sfx.wav"), sfx)
    rep = [f"# The Building That Cooked a Car - cue sheet", "", "All sound original: synthesized (template dsp/instruments/sfx_gen + make_sound.py).", "",
           f"- length {N} samples = {N / SR:.3f} s ({TOTAL} frames)", f"- integrated {lufs(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP",
           f"- stems: voice {lufs(v):.1f}, music {lufs(mus):.1f}, sfx {lufs(sfx):.1f} LUFS", "", "| t (s) | frame | event | gain dB |", "|---|---|---|---|"]
    for t0, name, gdb in sorted(cues):
        rep.append(f"| {t0:.2f} | {round(t0 * FPS)} | {name} | {gdb} |")
    open(os.path.join(out, "cues.md"), "w").write("\n".join(rep) + "\n")
    print("\n".join(rep[4:7]))


if __name__ == "__main__":
    main()
