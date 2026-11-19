/**
 * Procedural sound synthesis. Every sound in the game is generated here at load time and
 * encoded as a WAV blob for Howler. This keeps the project free of licensed audio assets.
 * To replace a sound with a recorded asset, put the file in src/assets/audio and map it in
 * AudioSystem.ts (ASSET_OVERRIDES).
 */
export const SR = 22050;

type Buf = Float32Array;
let seed = 1337;
function rnd(): number {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}
const white = () => rnd() * 2 - 1;

function make(sec: number): Buf { return new Float32Array(Math.max(1, Math.floor(sec * SR))); }

function lowpass(b: Buf, cutoff: number): Buf {
  const rc = 1 / (2 * Math.PI * cutoff), dt = 1 / SR, a = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < b.length; i++) { y += a * (b[i] - y); b[i] = y; }
  return b;
}
function highpass(b: Buf, cutoff: number): Buf {
  const rc = 1 / (2 * Math.PI * cutoff), dt = 1 / SR, a = rc / (rc + dt);
  let py = 0, px = 0;
  for (let i = 0; i < b.length; i++) { const x = b[i]; py = a * (py + x - px); px = x; b[i] = py; }
  return b;
}
function bandpass(b: Buf, f: number, q: number): Buf {
  const w = (2 * Math.PI * f) / SR, alpha = Math.sin(w) / (2 * q), cos = Math.cos(w);
  const b0 = alpha, b2 = -alpha, a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y; b[i] = y;
  }
  return b;
}
function normalize(b: Buf, peak = 0.9): Buf {
  let m = 0;
  for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i]));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] = (b[i] / m) * peak;
  return b;
}
function env(b: Buf, attack: number, release: number, curve = 2): Buf {
  const a = Math.floor(attack * SR), r = Math.floor(release * SR);
  for (let i = 0; i < b.length; i++) {
    let g = 1;
    if (i < a) g = i / a;
    const fromEnd = b.length - i;
    if (fromEnd < r) g *= Math.pow(fromEnd / r, curve);
    b[i] *= g;
  }
  return b;
}
function decay(b: Buf, t60: number): Buf {
  const k = Math.log(1000) / (t60 * SR);
  for (let i = 0; i < b.length; i++) b[i] *= Math.exp(-k * i);
  return b;
}
function mix(dst: Buf, src: Buf, gain = 1, offset = 0): Buf {
  const o = Math.floor(offset * SR);
  for (let i = 0; i < src.length && i + o < dst.length; i++) dst[i + o] += src[i] * gain;
  return dst;
}
/** Crossfade the tail into the head so the buffer loops seamlessly. */
function loopable(b: Buf, fade = 0.5): Buf {
  const n = Math.floor(fade * SR);
  const out = b.slice(0, b.length - n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    out[i] = out[i] * t + b[b.length - n + i] * (1 - t);
  }
  return out;
}
function tone(sec: number, f: (t: number) => number, wave: 'sin' | 'saw' | 'tri' | 'sq' = 'sin', amp = 1): Buf {
  const b = make(sec);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += f(t) / SR;
    const p = ph % 1;
    let v: number;
    switch (wave) {
      case 'saw': v = 2 * p - 1; break;
      case 'tri': v = 1 - 4 * Math.abs(p - 0.5); break;
      case 'sq': v = p < 0.5 ? 1 : -1; break;
      default: v = Math.sin(2 * Math.PI * p);
    }
    b[i] = v * amp;
  }
  return b;
}
function noise(sec: number): Buf { const b = make(sec); for (let i = 0; i < b.length; i++) b[i] = white(); return b; }
function brown(sec: number): Buf {
  const b = make(sec); let y = 0;
  for (let i = 0; i < b.length; i++) { y = (y + 0.02 * white()) / 1.02; b[i] = y * 3.5; }
  return b;
}
function bell(sec: number, f: number, partials = [1, 2.76, 5.4, 8.93], t60 = 2): Buf {
  const out = make(sec);
  partials.forEach((p, k) => mix(out, decay(tone(sec, () => f * p), t60 / (k + 1)), 1 / (k + 1)));
  return out;
}

// ─────────────────────────────── ambience ───────────────────────────────
const gens: Record<string, () => Buf> = {
  rain: () => {
    const b = lowpass(highpass(noise(7), 400), 5000);
    for (let i = 0; i < 260; i++) { // droplets
      const d = decay(bandpass(noise(0.04), 2000 + rnd() * 3000, 4), 0.03);
      mix(b, d, 0.6 + rnd(), rnd() * 6.9);
    }
    return normalize(loopable(b, 0.8), 0.5);
  },
  wind: () => {
    const b = lowpass(brown(9), 600);
    for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= 0.55 + 0.45 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1); }
    const howl = tone(9, (t) => 220 + 40 * Math.sin(t * 0.5), 'sin', 0.04);
    mix(b, bandpass(howl, 240, 2));
    return normalize(loopable(b, 1.2), 0.6);
  },
  roomtone: () => normalize(loopable(lowpass(brown(6), 220), 1), 0.35),
  buzz: () => {
    const b = tone(2, () => 120, 'saw', 0.3);
    mix(b, tone(2, () => 240, 'sin', 0.15));
    for (let i = 0; i < b.length; i++) b[i] *= 0.8 + 0.2 * Math.sin((i / SR) * 2 * Math.PI * 3);
    return normalize(loopable(lowpass(b, 1800), 0.2), 0.3);
  },
  insects: () => {
    const b = make(5);
    for (let k = 0; k < 18; k++) {
      const start = rnd() * 4.5, f = 4200 + rnd() * 900;
      const chirp = tone(0.35, () => f, 'sin', 1);
      for (let i = 0; i < chirp.length; i++) chirp[i] *= Math.max(0, Math.sin((i / SR) * 2 * Math.PI * 30)) * Math.sin((Math.PI * i) / chirp.length);
      mix(b, chirp, 0.3 + rnd() * 0.3, start);
    }
    return normalize(loopable(b, 0.4), 0.25);
  },
  fire: () => {
    const b = lowpass(brown(5), 500);
    for (let i = 0; i < 300; i++) mix(b, decay(highpass(noise(0.02), 1500), 0.01), 0.5 + rnd() * 1.5, rnd() * 4.9);
    return normalize(loopable(b, 0.5), 0.6);
  },
  heartbeat: () => {
    const b = make(1.1);
    const thump = (o: number, g: number) => mix(b, decay(tone(0.25, (t) => 60 - t * 80, 'sin'), 0.15), g, o);
    thump(0, 1); thump(0.28, 0.7);
    return normalize(b, 0.8);
  },
  // ─────────────────────────────── music ───────────────────────────────
  drone: () => {
    const b = make(12);
    [55, 55.4, 82.4, 110.3, 164.6].forEach((f, k) => mix(b, tone(12, (t) => f + Math.sin(t * 0.3 + k) * 0.4, k % 2 ? 'tri' : 'sin', 0.25)));
    for (let i = 0; i < b.length; i++) b[i] *= 0.7 + 0.3 * Math.sin((i / SR) * 0.52);
    return normalize(loopable(lowpass(b, 900), 2), 0.5);
  },
  tension: () => {
    const b = make(8);
    mix(b, tone(8, (t) => 73.4 + Math.sin(t * 6) * 2, 'saw', 0.3));
    mix(b, tone(8, (t) => 77.8 + Math.sin(t * 5) * 2, 'saw', 0.3));
    for (let k = 0; k < 16; k++) mix(b, decay(tone(0.6, () => 36, 'sin'), 0.4), 0.9, k * 0.5);
    for (let i = 0; i < b.length; i++) b[i] *= 0.8 + 0.2 * Math.sin((i / SR) * 2 * Math.PI * 4);
    return normalize(loopable(lowpass(b, 1200), 0.5), 0.6);
  },
  musicbox: () => {
    // Original lullaby melody in A minor.
    const notes = [69, 72, 76, 74, 72, 71, 69, 0, 64, 67, 71, 69, 67, 65, 64, 0, 69, 72, 76, 77, 76, 74, 72, 71, 69, 0, 0, 0];
    const step = 0.42, sec = notes.length * step + 1.5;
    const b = make(sec);
    notes.forEach((n, i) => {
      if (!n) return;
      const f = 440 * Math.pow(2, (n - 69) / 12) * (1 + (rnd() - 0.5) * 0.004);
      mix(b, bell(1.6, f, [1, 3.01, 5.3], 1.4), 0.4, i * step);
    });
    return normalize(b, 0.7);
  },
  morning: () => {
    const b = make(10);
    [220, 277.2, 329.6, 440].forEach((f, k) => mix(b, env(tone(10, () => f, 'sin', 0.2), 2 + k * 0.4, 3), 1));
    return normalize(lowpass(b, 1500), 0.4);
  },
  // ─────────────────────────────── sfx ───────────────────────────────
  step1: () => step(1), step2: () => step(2), step3: () => step(3), step4: () => step(4),
  // slow, drawn-out hinge creak (a door easing open by itself)
  creak: () => {
    seed = 4242;
    const len = 3.4;
    const b = stickSlip(len, (t) => 8 + 110 * Math.pow(Math.sin((Math.PI * t) / len), 2) + 18 * Math.sin(t * 4.1) + 9 * Math.sin(t * 11.7), WOOD_RES, 0.35);
    mix(b, groan(len, 0.18), 0.25);
    return normalize(roomEcho(env(b, 0.15, 0.7), 0.35), 0.8);
  },
  // a door being opened: rusty hinge stick-slip that whines up, stutters and dies, then the latch knock
  door_open: () => {
    seed = 777;
    const len = 2.3;
    const b = stickSlip(len, (t) => {
      const k = t / len;
      return 12 + 190 * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.15)), 1.6) + 30 * Math.sin(t * 6.3) + 16 * Math.sin(t * 17.1);
    }, WOOD_RES, 0.3);
    mix(b, groan(len, 0.22), 0.22);
    mix(b, decay(lowpass(noise(0.18), 380), 0.12), 0.55, len - 0.2);
    return normalize(roomEcho(env(b, 0.03, 0.5), 0.3), 0.8);
  },
  door_slam: () => {
    const b = decay(lowpass(noise(0.9), 300), 0.5);
    mix(b, decay(tone(0.6, (t) => 70 - t * 30), 0.4), 0.9);
    mix(b, decay(highpass(noise(0.05), 2000), 0.03), 0.5);
    return normalize(b, 0.95);
  },
  door_locked: () => {
    const b = make(0.5);
    for (let k = 0; k < 3; k++) mix(b, decay(bandpass(noise(0.08), 1800, 5), 0.05), 1, k * 0.12);
    return normalize(b, 0.6);
  },
  knock: () => {
    const b = make(1.4);
    [0, 0.32, 0.64].forEach((o) => mix(b, decay(lowpass(noise(0.15), 500), 0.12), 1, o));
    [0, 0.32, 0.64].forEach((o) => mix(b, decay(tone(0.15, () => 110, 'sin'), 0.1), 0.6, o));
    return normalize(b, 0.9);
  },
  chair: () => {
    const b = tone(0.7, (t) => 140 + 90 * Math.sin(t * 40) * (1 - t), 'saw', 0.5);
    mix(b, lowpass(noise(0.7), 900), 0.4);
    return normalize(env(bandpass(b, 500, 1.5), 0.02, 0.2), 0.7);
  },
  locker: () => {
    const b = make(0.9);
    mix(b, decay(bell(0.9, 310, [1, 2.3, 4.1, 6.7], 0.5), 0.5), 0.6);
    mix(b, decay(lowpass(noise(0.2), 1200), 0.15), 0.8);
    return normalize(b, 0.7);
  },
  book: () => {
    const b = decay(lowpass(noise(0.4), 700), 0.2);
    mix(b, decay(lowpass(noise(0.3), 500), 0.15), 0.7, 0.12);
    return normalize(b, 0.8);
  },
  bell: () => {
    // Electric school bell: hammer striking a gong ~ 25Hz
    const sec = 4.5, b = make(sec);
    for (let k = 0; k < sec * 22; k++) mix(b, decay(bell(0.25, 880, [1, 2.4, 3.9], 0.4), 0.2), 0.3, k / 22);
    return normalize(env(b, 0.01, 0.4), 0.85);
  },
  whisper: () => {
    const b = make(2.2);
    for (let k = 0; k < 9; k++) {
      const s = env(bandpass(noise(0.22 + rnd() * 0.2), 1800 + rnd() * 1800, 2 + rnd() * 3), 0.05, 0.1);
      mix(b, s, 0.7, k * 0.22 + rnd() * 0.05);
    }
    return normalize(env(highpass(b, 900), 0.2, 0.5), 0.6);
  },
  breath: () => {
    const b = make(3);
    mix(b, env(bandpass(noise(1.1), 900, 1), 0.4, 0.5), 1, 0);
    mix(b, env(bandpass(noise(1.3), 600, 1), 0.3, 0.7), 0.8, 1.4);
    return normalize(b, 0.5);
  },
  cry: () => {
    const b = make(3.2);
    for (let k = 0; k < 3; k++) {
      const sob = tone(0.9, (t) => 420 - t * 120 + Math.sin(t * 38) * 18, 'saw', 0.4);
      mix(b, env(bandpass(sob, 900, 2), 0.1, 0.4), 0.8, k * 1.05);
    }
    return normalize(lowpass(b, 2500), 0.5);
  },
  stinger: () => {
    const b = make(2.5);
    [233, 247, 311, 466, 494].forEach((f) => mix(b, decay(tone(2.5, () => f, 'saw', 0.2), 1.6)));
    mix(b, decay(lowpass(noise(1.5), 2000), 0.6), 0.7);
    mix(b, decay(tone(1.5, (t) => 55 - t * 15), 1.2), 1);
    return normalize(lowpass(b, 4500), 0.95);
  },
  bass_hit: () => {
    const b = decay(tone(2.2, (t) => 48 - t * 12), 1.8);
    mix(b, decay(lowpass(noise(0.4), 200), 0.3), 0.5);
    return normalize(b, 1);
  },
  scream: () => {
    const b = tone(1.3, (t) => 900 - t * 350 + Math.sin(t * 60) * 40, 'saw', 1);
    mix(b, bandpass(noise(1.3), 2200, 1), 0.4);
    for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * 3);
    return normalize(env(bandpass(b, 1400, 0.8), 0.02, 0.5), 0.85);
  },
  impact: () => {
    const b = decay(lowpass(noise(0.5), 1200), 0.25);
    mix(b, decay(tone(0.5, (t) => 90 - t * 60), 0.3), 1);
    return normalize(b, 0.95);
  },
  click: () => normalize(decay(bandpass(noise(0.06), 2500, 3), 0.03), 0.6),
  switch: () => {
    const b = make(0.3);
    mix(b, decay(bandpass(noise(0.05), 1500, 3), 0.03), 1);
    mix(b, decay(lowpass(noise(0.1), 300), 0.06), 0.9, 0.02);
    return normalize(b, 0.8);
  },
  spark: () => {
    const b = make(0.8);
    for (let k = 0; k < 14; k++) mix(b, decay(highpass(noise(0.04), 2500), 0.02), 0.5 + rnd(), rnd() * 0.6);
    mix(b, decay(tone(0.6, () => 120, 'saw', 0.4), 0.4), 0.6);
    return normalize(b, 0.8);
  },
  power_on: () => {
    const b = tone(1.5, (t) => 40 + t * 80, 'saw', 0.5);
    for (let k = 0; k < 4; k++) mix(b, decay(bandpass(noise(0.08), 1500, 2), 0.05), 0.8, 0.1 + k * 0.28);
    return normalize(env(lowpass(b, 900), 0.05, 0.4), 0.8);
  },
  pickup: () => {
    const b = make(0.9);
    mix(b, bell(0.9, 660, [1, 2, 3], 0.7), 0.5);
    mix(b, bell(0.7, 990, [1, 2], 0.6), 0.35, 0.09);
    return normalize(lowpass(b, 3500), 0.45);
  },
  paper: () => {
    const b = make(0.6);
    for (let k = 0; k < 10; k++) mix(b, env(highpass(noise(0.05), 2200), 0.005, 0.03), 0.6 + rnd() * 0.4, rnd() * 0.5);
    return normalize(b, 0.5);
  },
  tape: () => {
    const b = make(0.7);
    mix(b, decay(bandpass(noise(0.05), 1200, 3), 0.04), 1);
    mix(b, lowpass(tone(0.6, () => 60, 'sq', 0.15), 300), 1, 0.1);
    return normalize(b, 0.6);
  },
  hiss: () => normalize(loopable(highpass(lowpass(noise(3), 6000), 2000), 0.3), 0.15),
  beep: () => normalize(env(tone(0.25, () => 1046, 'sq', 0.3), 0.005, 0.05), 0.4),
  error: () => normalize(env(tone(0.4, () => 180, 'sq', 0.3), 0.005, 0.1), 0.45),
  printer: () => {
    const b = make(3);
    for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(t * 2 * Math.PI * 95) > 0.3 ? 0.3 : -0.1) * (0.6 + 0.4 * Math.sin(t * 22)); }
    mix(b, lowpass(noise(3), 1500), 0.2);
    return normalize(env(bandpass(b, 600, 1), 0.05, 0.3), 0.6);
  },
  keypress: () => normalize(decay(bandpass(noise(0.05), 3000, 4), 0.025), 0.5),
  thunder: () => {
    const b = lowpass(brown(6), 180);
    mix(b, decay(lowpass(noise(0.5), 800), 0.3), 1.2, 0.1);
    for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] *= Math.exp(-t * 0.6) * (0.6 + 0.4 * Math.sin(t * 9)); }
    return normalize(b, 0.95);
  },
  glass: () => {
    const b = make(1.2);
    for (let k = 0; k < 20; k++) mix(b, decay(bell(0.4, 2500 + rnd() * 3000, [1, 2.7], 0.2), 0.2), 0.3, rnd() * 0.7);
    mix(b, decay(highpass(noise(0.3), 1500), 0.2), 0.7);
    return normalize(b, 0.8);
  },
  alarm: () => {
    const b = tone(2, (t) => (Math.floor(t * 3) % 2 ? 660 : 880), 'sq', 0.3);
    return normalize(loopable(lowpass(b, 2500), 0.05), 0.5);
  },
  shelf: () => {
    const b = make(1.5);
    for (let k = 0; k < 9; k++) mix(b, decay(lowpass(noise(0.3), 600 + rnd() * 400), 0.18), 0.6 + rnd() * 0.4, k * 0.09 + rnd() * 0.05);
    return normalize(b, 0.9);
  },
  chain: () => {
    const b = make(1);
    for (let k = 0; k < 10; k++) mix(b, decay(bell(0.2, 1800 + rnd() * 1200, [1, 2.2, 3.7], 0.15), 0.12), 0.5, k * 0.07 + rnd() * 0.04);
    return normalize(b, 0.7);
  },
  chalk: () => {
    const b = make(1.6);
    for (let k = 0; k < 6; k++) mix(b, env(bandpass(noise(0.18), 3200, 3), 0.01, 0.05), 0.8, k * 0.25 + rnd() * 0.05);
    return normalize(b, 0.6);
  },
  cough: () => {
    const b = make(1.2);
    [0, 0.35, 0.65].forEach((o) => mix(b, env(bandpass(noise(0.2), 700, 1.2), 0.01, 0.12), 1, o));
    return normalize(b, 0.7);
  },
  static: () => normalize(env(bandpass(noise(1), 2500, 0.6), 0.02, 0.2), 0.5),
  footsteps_far: () => {
    const b = make(4);
    for (let k = 0; k < 8; k++) mix(b, step(k % 4 + 1, 0.35), 0.8, k * 0.5);
    return normalize(lowpass(b, 900), 0.8);
  },
  run_far: () => {
    const b = make(2.5);
    for (let k = 0; k < 9; k++) mix(b, step(k % 4 + 1, 0.3), 0.9, k * 0.26);
    return normalize(lowpass(b, 1000), 0.8);
  },
  // heavy iron gate: a long metallic shriek from rusted pivots, low rumble, then the clang against the stop
  gate: () => {
    seed = 9001;
    const len = 3.0;
    const b = stickSlip(len, (t) => {
      const k = t / len;
      return 9 + 140 * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.1)), 1.3) + 22 * Math.sin(t * 3.7) + 12 * Math.sin(t * 13.3);
    }, METAL_RES, 0.2);
    mix(b, groan(len, 0.12, 55), 0.25);
    mix(b, decay(bell(1.4, 196, [1, 2.76, 5.4, 8.9], 0.8), 0.9), 0.55, len - 0.25);
    return normalize(roomEcho(env(b, 0.05, 0.6), 0.25, 0.11), 0.85);
  },
};

/** Resonances (Hz, gain, Q) of an old wooden door and of a rusted iron gate. */
const WOOD_RES: [number, number, number][] = [[420, 1, 9], [910, 0.8, 11], [1650, 0.55, 13], [2900, 0.25, 15]];
const METAL_RES: [number, number, number][] = [[780, 0.7, 22], [1530, 1, 28], [2470, 0.8, 30], [3650, 0.5, 34]];

/**
 * Stick-slip friction, the physics of a creaking hinge: an irregular train of tiny impulses whose
 * rate (per second) follows `rate(t)`, each one ringing the resonances. Low rates stutter
 * ("tik-tik-tik"), high rates turn into the long whining creak.
 */
function stickSlip(sec: number, rate: (t: number) => number, res: [number, number, number][], jitter: number): Buf {
  const pulses = make(sec);
  let phase = 0, wander = 0;
  for (let i = 0; i < pulses.length; i++) {
    const t = i / SR;
    wander += (white() * 0.5 - wander) * 0.0008;
    const r = Math.max(2, rate(t) * (1 + wander * jitter * 4));
    phase += r / SR;
    if (phase >= 1) {
      phase -= 1 + white() * jitter * 0.5; // irregular spacing
      const loud = 0.5 + 0.5 * Math.min(1, r / 60);
      pulses[i] = loud * (0.6 + 0.4 * rnd()) * (rnd() < 0.5 ? -1 : 1);
    }
  }
  const out = make(sec);
  for (const [f, g, q] of res) mix(out, bandpass(pulses.slice(), f * (0.97 + rnd() * 0.06), q), g);
  return out;
}

/** A low groan of the door's weight on its hinges, swelling with the movement. */
function groan(sec: number, amp: number, base = 70): Buf {
  const b = tone(sec, (t) => base + 18 * Math.sin(t * 1.9) + 6 * Math.sin(t * 7.3), 'saw', amp);
  for (let i = 0; i < b.length; i++) b[i] *= Math.pow(Math.sin((Math.PI * i) / b.length), 1.5);
  return lowpass(b, 260);
}

/** A short, cold reverb: the empty corridor answering back. */
function roomEcho(b: Buf, wet: number, room = 0.083): Buf {
  const tail = Math.floor(1.2 * SR);
  const out = new Float32Array(b.length + tail);
  out.set(b);
  const delays = [room, room * 1.37, room * 1.79, room * 2.31].map((d) => Math.floor(d * SR));
  const bufs = delays.map((d) => new Float32Array(d));
  const idx = delays.map(() => 0);
  for (let i = 0; i < out.length; i++) {
    const x = i < b.length ? b[i] : 0;
    let y = 0;
    for (let k = 0; k < delays.length; k++) {
      const v = bufs[k][idx[k]];
      bufs[k][idx[k]] = x + v * 0.62;
      idx[k] = (idx[k] + 1) % delays[k];
      y += v;
    }
    out[i] += (y / delays.length) * wet;
  }
  return lowpass(out, 5200);
}

function step(v: number, len = 0.22): Buf {
  seed = 1000 + v * 77;
  const b = decay(lowpass(noise(len), 500 + v * 120), 0.08);
  mix(b, decay(bandpass(noise(0.05), 1800 + v * 200, 2), 0.02), 0.25);
  return normalize(b, 0.7);
}

export const SOUND_NAMES = Object.keys(gens);

export function synthesize(name: string): Float32Array | null {
  const g = gens[name];
  if (!g) return null;
  seed = 1337 + name.length * 101 + name.charCodeAt(0);
  return g();
}

export function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
