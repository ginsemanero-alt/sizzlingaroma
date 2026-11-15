/**
 * Procedural sound synthesis.
 *
 * The game ships with no audio files: every sound below is generated as raw
 * PCM, encoded to a WAV data URI and handed to Howler. Each generator is a
 * TEMPORARY ASSET that can be replaced by a recorded file — see
 * README.md › "Replacing placeholder assets".
 */

export const SR = 22050;

type Gen = () => Float32Array;

// ───────────────────────────── helpers ─────────────────────────────

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const len = (sec: number) => Math.max(1, Math.floor(sec * SR));
const TAU = Math.PI * 2;

function onePoleLP(x: Float32Array, fc: number) {
  const a = 1 - Math.exp((-TAU * fc) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += a * (x[i] - y);
    x[i] = y;
  }
  return x;
}

function onePoleHP(x: Float32Array, fc: number) {
  const a = 1 - Math.exp((-TAU * fc) / SR);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    lp += a * (x[i] - lp);
    x[i] = x[i] - lp;
  }
  return x;
}

class Biquad {
  b0 = 0; b1 = 0; b2 = 0; a1 = 0; a2 = 0;
  x1 = 0; x2 = 0; y1 = 0; y2 = 0;
  bandpass(f: number, q: number) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b1 = 0;
    this.b2 = -alpha / a0;
    this.a1 = (-2 * Math.cos(w)) / a0;
    this.a2 = (1 - alpha) / a0;
    return this;
  }
  lowpass(f: number, q = 0.707) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    const a0 = 1 + alpha;
    this.b0 = (1 - c) / 2 / a0;
    this.b1 = (1 - c) / a0;
    this.b2 = (1 - c) / 2 / a0;
    this.a1 = (-2 * c) / a0;
    this.a2 = (1 - alpha) / a0;
    return this;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

function bandpass(x: Float32Array, f: number, q: number) {
  const b = new Biquad().bandpass(f, q);
  for (let i = 0; i < x.length; i++) x[i] = b.run(x[i]);
  return x;
}

function lowpass(x: Float32Array, f: number, q = 0.707) {
  const b = new Biquad().lowpass(f, q);
  for (let i = 0; i < x.length; i++) x[i] = b.run(x[i]);
  return x;
}

function noise(n: number, seed = 1) {
  const r = rng(seed);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
  return x;
}

function brown(n: number, seed = 2) {
  const r = rng(seed);
  const x = new Float32Array(n);
  let v = 0;
  for (let i = 0; i < n; i++) {
    v = (v + 0.02 * (r() * 2 - 1)) * 0.998;
    x[i] = v * 3.5;
  }
  return x;
}

function normalize(x: Float32Array, peak = 0.9) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  if (m > 0) {
    const g = peak / m;
    for (let i = 0; i < x.length; i++) x[i] *= g;
  }
  return x;
}

function envAD(x: Float32Array, attack: number, decayPow = 1) {
  const a = len(attack);
  for (let i = 0; i < x.length; i++) {
    const e = i < a ? i / a : Math.pow(1 - (i - a) / Math.max(1, x.length - a), decayPow);
    x[i] *= e;
  }
  return x;
}

function fadeEdges(x: Float32Array, sec = 0.01) {
  const f = Math.min(len(sec), x.length >> 1);
  for (let i = 0; i < f; i++) {
    x[i] *= i / f;
    x[x.length - 1 - i] *= i / f;
  }
  return x;
}

/** Make a buffer loop seamlessly by crossfading the tail into the head. */
function makeLoop(x: Float32Array, xfade = 0.5) {
  const f = len(xfade);
  const out = new Float32Array(x.length - f);
  out.set(x.subarray(0, out.length));
  for (let i = 0; i < f; i++) {
    const t = i / f;
    out[i] = x[i] * t + x[out.length + i] * (1 - t);
  }
  return out;
}

function mix(into: Float32Array, src: Float32Array, at = 0, gain = 1) {
  for (let i = 0; i < src.length && at + i < into.length; i++) {
    if (at + i >= 0) into[at + i] += src[i] * gain;
  }
  return into;
}

function softclip(x: Float32Array, drive = 1.5) {
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive);
  return x;
}

function reverb(x: Float32Array, size = 0.3, wet = 0.35, extra = 1) {
  const n = x.length + len(extra);
  const out = new Float32Array(n);
  out.set(x);
  const taps = [0.0297, 0.0371, 0.0411, 0.0437].map((t) => len(t * (1 + size * 3)));
  const fb = 0.6 + size * 0.3;
  for (const d of taps) {
    const buf = new Float32Array(d);
    let p = 0;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const input = i < x.length ? x[i] : 0;
      const y = buf[p];
      lp = lp + 0.4 * (y - lp);
      buf[p] = input + lp * fb;
      p = (p + 1) % d;
      out[i] += (y * wet) / taps.length;
    }
  }
  return out;
}

function tapeProcess(x: Float32Array, seed = 9) {
  onePoleHP(x, 280);
  lowpass(x, 3200);
  softclip(x, 2.2);
  const r = rng(seed);
  let wob = 0;
  for (let i = 0; i < x.length; i++) {
    wob = Math.sin((i / SR) * TAU * 0.7) * 0.06 + Math.sin((i / SR) * TAU * 5.3) * 0.03;
    x[i] = x[i] * (0.9 + wob) + (r() * 2 - 1) * 0.035;
  }
  return x;
}

// ───────────────────────────── voices ─────────────────────────────

const VOWELS: Record<string, [number, number, number]> = {
  a: [800, 1200, 2500],
  e: [420, 2000, 2600],
  i: [300, 2300, 3000],
  o: [470, 820, 2600],
  u: [330, 720, 2400],
};

interface VoiceOpts {
  pitch: number;
  dur: number;
  seed: number;
  breathy?: number;
  jitter?: number;
  syllables?: { v: string; c?: 'k' | 's' | 'h' | 'n' | 'y' | ''; d: number; p?: number }[];
  robotic?: boolean;
}

function formantVoice(o: VoiceOpts) {
  const r = rng(o.seed);
  const n = len(o.dur);
  const out = new Float32Array(n);
  const syl =
    o.syllables ??
    (() => {
      const s: NonNullable<VoiceOpts['syllables']> = [];
      let t = 0;
      const vs = Object.keys(VOWELS);
      const cs: ('k' | 's' | 'h' | 'n' | '')[] = ['k', 's', 'h', 'n', '', '', ''];
      while (t < o.dur - 0.2) {
        const d = 0.11 + r() * 0.17;
        s.push({ v: vs[Math.floor(r() * vs.length)], c: cs[Math.floor(r() * cs.length)], d });
        t += d;
        if (r() < 0.16) {
          const gap = 0.12 + r() * 0.25;
          s.push({ v: '', d: gap });
          t += gap;
        }
      }
      return s;
    })();

  const f1 = new Biquad(), f2 = new Biquad(), f3 = new Biquad();
  let phase = 0;
  let idx = 0;
  let sylStart = 0;
  let cur = syl[0];
  let prevF = VOWELS[cur.v || 'a'];
  const noiseSrc = rng(o.seed + 7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (cur && t > sylStart + cur.d && idx < syl.length - 1) {
      prevF = VOWELS[cur.v || 'a'];
      sylStart += cur.d;
      idx++;
      cur = syl[idx];
    }
    if (!cur) break;
    const local = (t - sylStart) / cur.d;
    const target = VOWELS[cur.v || 'a'];
    const k = Math.min(1, local * 3);
    if (i % 32 === 0) {
      f1.bandpass(prevF[0] + (target[0] - prevF[0]) * k, 6);
      f2.bandpass(prevF[1] + (target[1] - prevF[1]) * k, 9);
      f3.bandpass(prevF[2] + (target[2] - prevF[2]) * k, 12);
    }
    const intonation = 1 + 0.08 * Math.sin(t * 2.1 + o.seed) - 0.06 * (idx / syl.length);
    const vib = o.robotic ? 1 : 1 + 0.012 * Math.sin(t * TAU * 5.5) + (o.jitter ?? 0.01) * (r() - 0.5);
    const f0 = o.pitch * intonation * vib * (cur.p ?? 1);
    phase += f0 / SR;
    if (phase > 1) phase -= 1;
    const glottal = o.robotic ? (phase < 0.5 ? 1 : -1) * 0.6 : 1 - 2 * phase;
    const breath = (noiseSrc() * 2 - 1) * (o.breathy ?? 0.15);
    let env = cur.v ? Math.sin(Math.PI * Math.min(1, local)) ** 0.6 : 0;
    let src = glottal * (1 - (o.breathy ?? 0.15)) + breath;
    // consonant onsets
    if (cur.c && local < 0.25) {
      const ce = 1 - local / 0.25;
      if (cur.c === 's') src = src * (1 - ce) + (noiseSrc() * 2 - 1) * 1.6 * ce;
      if (cur.c === 'h') src = src * (1 - ce * 0.7) + (noiseSrc() * 2 - 1) * ce;
      if (cur.c === 'k' && local < 0.07) {
        src = (noiseSrc() * 2 - 1) * 2.2;
        env = 1;
      }
      if (cur.c === 'n') src *= 0.4 + 0.6 * (1 - ce);
    }
    const y = f1.run(src) * 1.0 + f2.run(src) * 0.6 + f3.run(src) * 0.25;
    out[i] = y * env;
  }
  return normalize(onePoleHP(out, 90), 0.85);
}

export type VoiceName = 'noah' | 'elias' | 'figure' | 'dad' | 'mom' | 'machine' | 'whisper';

function voiceGen(kind: VoiceName, seed: number): Float32Array {
  const dur = 4;
  switch (kind) {
    case 'noah':
      return formantVoice({ pitch: 235, dur, seed, breathy: 0.18, jitter: 0.02 });
    case 'elias':
      return formantVoice({ pitch: 118, dur, seed, breathy: 0.12 });
    case 'dad':
      return formantVoice({ pitch: 98, dur, seed, breathy: 0.1 });
    case 'mom':
      return formantVoice({ pitch: 205, dur, seed, breathy: 0.15 });
    case 'machine':
      return formantVoice({ pitch: 140, dur, seed, robotic: true, breathy: 0.02 });
    case 'figure': {
      const low = formantVoice({ pitch: 62, dur, seed, breathy: 0.35, jitter: 0.05 });
      const whisper = formantVoice({ pitch: 118, dur, seed, breathy: 0.95 });
      const out = new Float32Array(low.length);
      for (let i = 0; i < out.length; i++) {
        const ring = Math.sin((i / SR) * TAU * 31);
        out[i] = low[i] * (0.7 + 0.3 * ring) + whisper[i] * 0.55;
      }
      return normalize(reverb(out, 0.6, 0.5, 0.2).subarray(0, out.length).slice(), 0.85);
    }
    case 'whisper':
      return normalize(formantVoice({ pitch: 150, dur, seed, breathy: 1 }), 0.7);
  }
}

// ───────────────────────────── generators ─────────────────────────────

function rainLoop(muffled: boolean): Float32Array {
  const n = len(8.5);
  const x = noise(n, 11);
  onePoleHP(x, muffled ? 120 : 500);
  onePoleLP(x, muffled ? 700 : 4200);
  const r = rng(12);
  for (let k = 0; k < (muffled ? 300 : 1100); k++) {
    const at = Math.floor(r() * n);
    const dl = len(0.004 + r() * 0.01);
    const f = muffled ? 300 + r() * 600 : 1500 + r() * 4000;
    const amp = (muffled ? 0.4 : 0.25) * r();
    for (let i = 0; i < dl && at + i < n; i++) x[at + i] += Math.sin((i / SR) * TAU * f) * amp * (1 - i / dl);
  }
  for (let i = 0; i < n; i++) x[i] *= 0.85 + 0.15 * Math.sin((i / n) * TAU * 3);
  return normalize(makeLoop(x, 0.5), muffled ? 0.55 : 0.6);
}

function windLoop(): Float32Array {
  const n = len(10.5);
  const src = noise(n, 21);
  const out = new Float32Array(n);
  const b = new Biquad();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 64 === 0) b.bandpass(380 + 220 * Math.sin(t * 0.7) + 120 * Math.sin(t * 1.9), 2.2);
    out[i] = b.run(src[i]) * (0.6 + 0.4 * Math.sin(t * 0.45 + 1) ** 2);
  }
  return normalize(makeLoop(out, 0.5), 0.6);
}

function roomTone(): Float32Array {
  const n = len(6.5);
  const x = brown(n, 31);
  onePoleLP(x, 180);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] = x[i] * 0.6 + Math.sin(t * TAU * 50) * 0.05 + Math.sin(t * TAU * 100) * 0.02;
  }
  return normalize(makeLoop(x, 0.5), 0.5);
}

function insectsLoop(): Float32Array {
  const n = len(6.5);
  const x = new Float32Array(n);
  const r = rng(41);
  for (let g = 0; g < 26; g++) {
    const at = Math.floor(r() * n);
    const f = 3600 + r() * 1400;
    const pulses = 4 + Math.floor(r() * 10);
    const rate = 0.035 + r() * 0.03;
    const amp = 0.15 + r() * 0.25;
    for (let p = 0; p < pulses; p++) {
      const s = at + len(p * rate);
      const d = len(0.018);
      for (let i = 0; i < d && s + i < n; i++) x[s + i] += Math.sin((i / SR) * TAU * f) * amp * Math.sin((Math.PI * i) / d);
    }
  }
  return normalize(makeLoop(x, 0.3), 0.4);
}

function buzzLoop(): Float32Array {
  const n = len(2.3);
  const x = new Float32Array(n);
  const r = rng(51);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let h = 1; h < 12; h++) v += Math.sin(t * TAU * 60 * h) / (h * 1.3);
    x[i] = v * 0.3 + (r() * 2 - 1) * 0.05 * (Math.sin(t * TAU * 120) > 0.95 ? 1 : 0.2);
  }
  return normalize(makeLoop(onePoleLP(x, 2400), 0.3), 0.5);
}

function fireLoop(): Float32Array {
  const n = len(6.5);
  const x = brown(n, 61);
  onePoleLP(x, 400);
  const r = rng(62);
  for (let k = 0; k < 520; k++) {
    const at = Math.floor(r() * n);
    const d = len(0.002 + r() * 0.012);
    const amp = r() * r() * 1.4;
    for (let i = 0; i < d && at + i < n; i++) x[at + i] += (r() * 2 - 1) * amp * (1 - i / d);
  }
  const hiss = onePoleHP(noise(n, 63), 2000);
  mix(x, hiss, 0, 0.08);
  return normalize(makeLoop(x, 0.5), 0.65);
}

function droneLoop(root: number, minor = true, sec = 16.5): Float32Array {
  const n = len(sec);
  const x = new Float32Array(n);
  const ratios = minor ? [1, 1.5, 2, 2.378, 3] : [1, 1.5, 2, 2.52, 3];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    ratios.forEach((r, k) => {
      const f = root * r;
      const det = 1 + 0.003 * Math.sin(t * 0.3 + k);
      v += (Math.sin(t * TAU * f * det) + 0.5 * Math.sin(t * TAU * f * 1.004)) * (0.5 + 0.5 * Math.sin(t * (0.13 + k * 0.05) + k * 2)) / (k + 1.2);
    });
    x[i] = v;
  }
  const air = onePoleLP(noise(n, 71), 900);
  mix(x, air, 0, 0.08);
  return normalize(makeLoop(onePoleLP(x, 1600), 2), 0.6);
}

function pianoNote(f: number, dur: number, seed: number): Float32Array {
  const n = len(dur);
  const x = new Float32Array(n);
  const r = rng(seed);
  const inh = 1 + r() * 0.0005;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let h = 1; h <= 6; h++) v += Math.sin(t * TAU * f * h * Math.pow(inh, h * h)) * Math.exp(-t * (1.2 + h * 0.9)) / h;
    x[i] = v * Math.min(1, t * 400);
  }
  return x;
}

function bellNote(f: number, dur: number): Float32Array {
  const n = len(dur);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] =
      (Math.sin(t * TAU * f) * Math.exp(-t * 2.2) +
        0.5 * Math.sin(t * TAU * f * 2.76) * Math.exp(-t * 4) +
        0.25 * Math.sin(t * TAU * f * 5.4) * Math.exp(-t * 7)) *
      Math.min(1, t * 800);
  }
  return x;
}

const NOTE = (semi: number) => 220 * Math.pow(2, semi / 12);

function menuMusic(): Float32Array {
  const sec = 25;
  const x = droneLoop(55, true, sec + 2);
  for (let i = 0; i < x.length; i++) x[i] *= 0.55;
  // a slow, sparse, original melody in A minor
  const mel = [0, 3, 7, 5, 3, 2, 0, -2, 0, 3, 8, 7];
  mel.forEach((s, k) => {
    const note = pianoNote(NOTE(s + 12), 3.5, k);
    mix(x, note, len(k * 2.0 + 0.4), 0.22);
  });
  const out = reverb(x, 0.8, 0.5, 0);
  return normalize(out.subarray(0, len(sec)).slice(), 0.6);
}

function musicBox(): Float32Array {
  const sec = 9.6;
  const x = new Float32Array(len(sec + 1.5));
  // a lullaby-like original tune, slightly detuned as if the comb is bent
  const tune = [12, 16, 19, 16, 14, 12, 11, 12, 16, 14, 12, 7, 9, 11, 12, -100, 19, 17, 16, 14, 12, 14, 16, 12];
  tune.forEach((s, k) => {
    if (s < -50) return;
    const f = NOTE(s + 12) * (1 + (k % 5 === 0 ? -0.012 : 0.004));
    mix(x, bellNote(f, 1.4), len(k * 0.4), 0.35);
  });
  return normalize(makeLoop(reverb(x, 0.3, 0.3, 0).subarray(0, x.length).slice(), 1.0), 0.6);
}

function hopefulMusic(): Float32Array {
  const sec = 22;
  const x = droneLoop(65.4, false, sec + 2);
  for (let i = 0; i < x.length; i++) x[i] *= 0.5;
  const mel = [4, 7, 11, 12, 11, 7, 9, 7, 4, 2, 4, 7];
  mel.forEach((s, k) => mix(x, pianoNote(NOTE(s + 3 + 12), 3.5, 100 + k), len(k * 1.8 + 0.3), 0.2));
  return normalize(reverb(x, 0.8, 0.5, 0).subarray(0, len(sec)).slice(), 0.6);
}

function heartbeatLoop(): Float32Array {
  const n = len(0.86);
  const x = new Float32Array(n);
  const thump = (at: number, amp: number) => {
    const d = len(0.14);
    for (let i = 0; i < d; i++) {
      const t = i / SR;
      x[at + i] += Math.sin(t * TAU * (55 - t * 120)) * Math.exp(-t * 30) * amp;
    }
  };
  thump(0, 1);
  thump(len(0.22), 0.7);
  return normalize(x, 0.8);
}

function breathingLoop(): Float32Array {
  const n = len(4.2);
  const x = noise(n, 81);
  bandpass(x, 900, 1.2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ph = (t % 2.1) / 2.1;
    const e = ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : ph < 0.9 ? 0.8 * Math.sin(((ph - 0.4) / 0.5) * Math.PI) : 0;
    x[i] *= e * (ph < 0.4 ? 0.6 : 1);
  }
  return normalize(x, 0.6);
}

function tapeHissLoop(): Float32Array {
  const n = len(3.3);
  const x = onePoleHP(noise(n, 91), 1800);
  for (let i = 0; i < n; i++) x[i] *= 0.6 + 0.4 * Math.sin((i / SR) * TAU * 1.5);
  return normalize(makeLoop(x, 0.3), 0.3);
}

function footstep(seed: number, kind: 'wood' | 'outside' | 'concrete' | 'figure'): Float32Array {
  const r = rng(seed);
  const n = len(0.32);
  const x = noise(n, seed);
  if (kind === 'outside') {
    onePoleLP(x, 1800);
    onePoleHP(x, 300);
    envAD(x, 0.01, 3);
  } else {
    onePoleLP(x, kind === 'concrete' ? 2500 : 900);
    envAD(x, 0.004, 6);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      x[i] += Math.sin(t * TAU * (kind === 'figure' ? 60 : 95 + r() * 20)) * Math.exp(-t * 28) * 0.9;
    }
  }
  if (kind === 'wood' && r() < 0.35) {
    const c = creak(seed + 3, 0.25);
    mix(x, c, len(0.02), 0.15);
  }
  return normalize(x, kind === 'figure' ? 0.9 : 0.7);
}

function creak(seed: number, dur = 1.3): Float32Array {
  const r = rng(seed);
  const n = len(dur);
  const x = new Float32Array(n);
  let ph = 0;
  const base = 90 + r() * 70;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = base * (1 + 0.4 * Math.sin(t * 3 + r() * 0.2) + 0.2 * t) * (1 + (r() - 0.5) * 0.15);
    ph += f / SR;
    if (ph > 1) ph -= 1;
    x[i] = (ph < 0.15 ? 1 : -0.18) * (0.6 + 0.4 * Math.sin(t * 17));
  }
  bandpass(x, 900 + r() * 500, 3);
  for (let i = 0; i < n; i++) x[i] *= Math.sin((Math.PI * i) / n) ** 0.8;
  return normalize(x, 0.7);
}

function impact(seed: number, low = 70, dur = 1.2): Float32Array {
  const n = len(dur);
  const x = noise(n, seed);
  onePoleLP(x, 1400);
  envAD(x, 0.002, 8);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] += Math.sin(t * TAU * (low - t * 20)) * Math.exp(-t * 5) * 1.2;
  }
  return normalize(reverb(x, 0.4, 0.3, 0.3), 0.95);
}

function knock(): Float32Array {
  const n = len(1.6);
  const x = new Float32Array(n);
  [0, 0.28, 0.56].forEach((at, k) => {
    const d = len(0.12);
    const h = noise(d, 100 + k);
    onePoleLP(h, 1200);
    for (let i = 0; i < d; i++) {
      const t = i / SR;
      h[i] = h[i] * Math.exp(-t * 60) + Math.sin(t * TAU * 140) * Math.exp(-t * 35);
    }
    mix(x, h, len(at));
  });
  return normalize(reverb(x, 0.4, 0.3, 0), 0.9);
}

function drawer(): Float32Array {
  const n = len(0.8);
  const x = noise(n, 111);
  bandpass(x, 700, 1.4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] *= t < 0.55 ? (0.4 + 0.6 * Math.abs(Math.sin(t * 60))) * Math.min(1, t * 20) : 0;
  }
  mix(x, impact(112, 120, 0.25), len(0.55), 0.6);
  return normalize(x, 0.7);
}

function glass(): Float32Array {
  const n = len(1.8);
  const x = noise(n, 121);
  onePoleHP(x, 2000);
  envAD(x, 0.001, 10);
  const r = rng(122);
  for (let k = 0; k < 40; k++) {
    const at = Math.floor(r() * r() * n * 0.6);
    const f = 2500 + r() * 5000;
    const d = len(0.15 + r() * 0.4);
    for (let i = 0; i < d && at + i < n; i++) x[at + i] += Math.sin((i / SR) * TAU * f) * Math.exp((-i / SR) * 18) * 0.3;
  }
  return normalize(x, 0.8);
}

function thunder(): Float32Array {
  const n = len(6.5);
  const x = brown(n, 131);
  onePoleLP(x, 300);
  const crack = onePoleLP(noise(len(0.4), 132), 3000);
  envAD(crack, 0.003, 4);
  mix(x, crack, len(0.05), 0.5);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] *= Math.min(1, t * 6) * Math.exp(-t * 0.55) * (0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 2.3));
  }
  return normalize(x, 0.9);
}

function whisper(seed: number, dur = 2.2): Float32Array {
  const x = formantVoice({ pitch: 140, dur, seed, breathy: 1 });
  return normalize(reverb(x, 0.6, 0.6, 0.8), 0.7);
}

function kuya(tape: boolean): Float32Array {
  const x = formantVoice({
    pitch: 240,
    dur: 1.2,
    seed: 140,
    breathy: 0.35,
    syllables: [
      { v: 'u', c: 'k', d: 0.26 },
      { v: 'a', c: 'y', d: 0.55, p: 0.92 },
      { v: '', d: 0.3 },
    ],
  });
  const y = reverb(x, 0.7, 0.55, 1.2);
  return normalize(tape ? tapeProcess(y) : y, 0.75);
}

function stinger(): Float32Array {
  const n = len(2.8);
  const x = new Float32Array(n);
  const fs = [233, 247, 262, 349, 370];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    fs.forEach((f, k) => (v += Math.sin(t * TAU * f * (1 + t * 0.04 * (k - 2))) * (k % 2 ? 1 : 0.7)));
    x[i] = v * Math.min(1, t * 8) * Math.exp(-t * 0.9);
  }
  const sw = onePoleHP(noise(n, 151), 1500);
  envAD(sw, 0.02, 3);
  mix(x, sw, 0, 0.6);
  mix(x, impact(152, 45, 2), 0, 1.2);
  return normalize(softclip(x, 1.3), 0.95);
}

function bassBoom(): Float32Array {
  const n = len(3.5);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] = Math.sin(t * TAU * (48 - t * 6)) * Math.min(1, t * 30) * Math.exp(-t * 1.1);
  }
  return normalize(x, 0.95);
}

function distortedScream(): Float32Array {
  const n = len(1.8);
  const x = new Float32Array(n);
  let ph = 0;
  const r = rng(161);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = (520 - t * 220) * (1 + 0.05 * Math.sin(t * TAU * 7) + (r() - 0.5) * 0.08);
    ph += f / SR;
    x[i] = ((ph % 1) * 2 - 1) * Math.min(1, t * 10) * Math.exp(-t * 1.4);
  }
  const b1 = new Biquad().bandpass(900, 4), b2 = new Biquad().bandpass(2400, 6);
  for (let i = 0; i < n; i++) x[i] = b1.run(x[i]) + b2.run(x[i]) * 0.6;
  return normalize(reverb(softclip(normalize(x, 1), 4), 0.6, 0.5, 0.5), 0.8);
}

function reversedVoice(): Float32Array {
  const x = formantVoice({ pitch: 150, dur: 2.6, seed: 171, breathy: 0.5 });
  const y = reverb(x, 0.7, 0.6, 0.5);
  y.reverse();
  for (let i = 0; i < y.length; i++) y[i] *= Math.pow(i / y.length, 1.5);
  return normalize(y, 0.7);
}

function childLaugh(): Float32Array {
  const x = formantVoice({
    pitch: 330,
    dur: 1.4,
    seed: 181,
    breathy: 0.4,
    syllables: [
      { v: 'a', c: 'h', d: 0.13, p: 1.1 },
      { v: 'a', c: 'h', d: 0.12, p: 1.05 },
      { v: 'a', c: 'h', d: 0.12, p: 1.0 },
      { v: 'e', c: 'h', d: 0.14, p: 0.95 },
      { v: '', d: 0.5 },
    ],
  });
  return normalize(reverb(x, 0.8, 0.6, 1.4), 0.6);
}

function chime(): Float32Array {
  const x = new Float32Array(len(1.4));
  mix(x, bellNote(NOTE(19), 1.2), 0, 0.5);
  mix(x, bellNote(NOTE(24), 1.2), len(0.12), 0.4);
  return normalize(x, 0.4);
}

function click(seed = 191, f = 2500): Float32Array {
  const n = len(0.06);
  const x = noise(n, seed);
  bandpass(x, f, 2);
  envAD(x, 0.0005, 6);
  return normalize(x, 0.6);
}

function tapeClick(): Float32Array {
  const n = len(0.9);
  const x = new Float32Array(n);
  mix(x, click(201, 1800), 0, 1);
  const motor = noise(len(0.7), 202);
  bandpass(motor, 400, 3);
  for (let i = 0; i < motor.length; i++) motor[i] *= 0.3 * (0.8 + 0.2 * Math.sin((i / SR) * TAU * 30));
  mix(x, motor, len(0.1), 1);
  return normalize(x, 0.6);
}

function machineBeep(): Float32Array {
  const n = len(0.45);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.sin((i / SR) * TAU * 1000) * 0.5;
  return fadeEdges(x, 0.01);
}

function phoneBuzz(): Float32Array {
  const n = len(2.0);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const on = t % 0.9 < 0.45 ? 1 : 0;
    x[i] = Math.sign(Math.sin(t * TAU * 170)) * 0.3 * on * (0.6 + 0.4 * Math.sin(t * TAU * 23));
  }
  return normalize(onePoleLP(x, 900), 0.6);
}

function flickerZap(): Float32Array {
  const n = len(0.9);
  const x = new Float32Array(n);
  const r = rng(211);
  for (let k = 0; k < 9; k++) {
    const at = Math.floor(r() * n * 0.8);
    const d = len(0.02 + r() * 0.05);
    const z = noise(d, 212 + k);
    onePoleHP(z, 1500);
    for (let i = 0; i < d; i++) z[i] = z[i] * 0.5 + Math.sin((i / SR) * TAU * 120) * 0.5;
    mix(x, fadeEdges(z, 0.003), at, 0.7);
  }
  return normalize(x, 0.6);
}

function paper(): Float32Array {
  const n = len(0.6);
  const x = noise(n, 221);
  onePoleHP(x, 1200);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    x[i] *= Math.abs(Math.sin(t * 40)) * Math.exp(-t * 4);
  }
  return normalize(x, 0.4);
}

function doorSlam(): Float32Array {
  const x = impact(231, 60, 1.6);
  mix(x, creak(232, 0.3), 0, 0.3);
  return normalize(x, 0.95);
}

function lockClunk(): Float32Array {
  const x = new Float32Array(len(0.5));
  mix(x, click(241, 1200), 0, 1);
  mix(x, impact(242, 200, 0.3), len(0.08), 0.5);
  return normalize(x, 0.7);
}

function rumble(): Float32Array {
  const n = len(4.5);
  const x = brown(n, 251);
  onePoleLP(x, 120);
  for (let i = 0; i < n; i++) x[i] *= Math.sin((Math.PI * i) / n);
  return normalize(x, 0.9);
}

function collapse(): Float32Array {
  const x = impact(261, 40, 3);
  const debris = noise(len(2.5), 262);
  onePoleLP(debris, 2500);
  for (let i = 0; i < debris.length; i++) debris[i] *= Math.exp((-i / SR) * 2) * (Math.random() < 0.02 ? 3 : 0.5);
  mix(x, debris, len(0.1), 0.5);
  return normalize(x, 0.95);
}

function swell(): Float32Array {
  const n = len(4);
  const x = droneLoop(41.2, true, 4.6).subarray(0, n).slice();
  for (let i = 0; i < n; i++) x[i] *= Math.pow(i / n, 2);
  const s = onePoleHP(noise(n, 271), 600);
  for (let i = 0; i < n; i++) s[i] *= Math.pow(i / n, 3) * 0.5;
  mix(x, s);
  return normalize(x, 0.8);
}

// ───────────────────────────── registry ─────────────────────────────

const GENERATORS: Record<string, Gen> = {
  rain: () => rainLoop(false),
  rain_inside: () => rainLoop(true),
  wind: windLoop,
  roomtone: roomTone,
  insects: insectsLoop,
  buzz: buzzLoop,
  fire: fireLoop,
  drone: () => droneLoop(55, true),
  drone_low: () => droneLoop(36.7, true),
  menu_music: menuMusic,
  music_box: musicBox,
  hopeful: hopefulMusic,
  heartbeat: heartbeatLoop,
  breathing: breathingLoop,
  tape_hiss: tapeHissLoop,
  step_wood_0: () => footstep(301, 'wood'),
  step_wood_1: () => footstep(302, 'wood'),
  step_wood_2: () => footstep(303, 'wood'),
  step_outside_0: () => footstep(311, 'outside'),
  step_outside_1: () => footstep(312, 'outside'),
  step_concrete_0: () => footstep(321, 'concrete'),
  step_concrete_1: () => footstep(322, 'concrete'),
  step_figure: () => footstep(331, 'figure'),
  creak_0: () => creak(341),
  creak_1: () => creak(342, 1.8),
  door_creak: () => creak(351, 2.2),
  door_slam: doorSlam,
  knock,
  drawer,
  glass,
  thunder,
  whisper_0: () => whisper(361),
  whisper_1: () => whisper(362, 3),
  whisper_2: () => whisper(363, 1.6),
  kuya: () => kuya(false),
  kuya_tape: () => kuya(true),
  stinger,
  impact: () => impact(371),
  bass: bassBoom,
  scream: distortedScream,
  reversed: reversedVoice,
  child_laugh: childLaugh,
  pickup: chime,
  click: () => click(),
  ui_hover: () => normalize(click(381, 4000), 0.2),
  ui_click: () => normalize(click(382, 2000), 0.35),
  tape_click: tapeClick,
  machine_beep: machineBeep,
  phone_buzz: phoneBuzz,
  flicker: flickerZap,
  paper,
  lock: lockClunk,
  rumble,
  collapse,
  swell,
};

export function hasSound(name: string) {
  return name in GENERATORS || name.startsWith('voice_');
}

export function generate(name: string): Float32Array {
  if (name.startsWith('voice_')) {
    // voice_<kind>_<variant>[_tape]
    const parts = name.split('_');
    const kind = parts[1] as VoiceName;
    const variant = Number(parts[2] ?? 0);
    const tape = parts[3] === 'tape';
    const v = voiceGen(kind, 400 + variant * 17 + kind.length * 3);
    return tape ? normalize(tapeProcess(v), 0.8) : v;
  }
  const g = GENERATORS[name];
  if (!g) throw new Error(`No generator for sound "${name}"`);
  return g();
}

/** Encode mono float PCM as a 16-bit WAV data URI. */
export function toWavDataUri(x: Float32Array): string {
  const n = x.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SR, true);
  v.setUint32(28, SR * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, x[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return 'data:audio/wav;base64,' + btoa(bin);
}
