import { Howl, Howler } from 'howler';
import type * as THREE from 'three';
import { encodeWav, synthesize } from './synth';
import type { Settings } from '@/types';

export type SoundCategory = 'music' | 'ambient' | 'sfx';

interface SoundDef { category: SoundCategory; loop?: boolean; volume?: number }

/**
 * Sound registry. All sounds are synthesized (see synth.ts). To use recorded assets instead,
 * add `src: '/audio/file.ogg'` overrides in ASSET_OVERRIDES — the rest of the game is unchanged.
 */
const DEFS: Record<string, SoundDef> = {
  rain: { category: 'ambient', loop: true, volume: 0.5 },
  wind: { category: 'ambient', loop: true, volume: 0.45 },
  roomtone: { category: 'ambient', loop: true, volume: 0.6 },
  buzz: { category: 'ambient', loop: true, volume: 0.35 },
  insects: { category: 'ambient', loop: true, volume: 0.3 },
  fire: { category: 'ambient', loop: true, volume: 0.6 },
  heartbeat: { category: 'sfx', loop: true, volume: 0.6 },
  hiss: { category: 'sfx', loop: true, volume: 0.4 },
  alarm: { category: 'ambient', loop: true, volume: 0.25 },
  drone: { category: 'music', loop: true, volume: 0.45 },
  tension: { category: 'music', loop: true, volume: 0.6 },
  musicbox: { category: 'music', volume: 0.8 },
  morning: { category: 'music', loop: true, volume: 0.6 },
};
const ASSET_OVERRIDES: Record<string, string> = {};

const howls = new Map<string, Howl>();
const loops = new Map<string, { id: number; target: number }>();
let settings: Settings | null = null;
let unlocked = false;

function categoryVolume(c: SoundCategory): number {
  if (!settings) return 1;
  return c === 'music' ? settings.musicVolume : c === 'ambient' ? settings.ambientVolume : settings.sfxVolume;
}

function getHowl(name: string): Howl | null {
  let h = howls.get(name);
  if (h) return h;
  const def = DEFS[name] ?? { category: 'sfx' };
  let src = ASSET_OVERRIDES[name];
  if (!src) {
    const data = synthesize(name);
    if (!data) return null;
    src = URL.createObjectURL(encodeWav(data));
  }
  h = new Howl({ src: [src], format: ['wav'], loop: !!def.loop, volume: (def.volume ?? 1) * categoryVolume(def.category), preload: true });
  howls.set(name, h);
  return h;
}

export interface PlayOpts {
  volume?: number;
  rate?: number;
  pos?: THREE.Vector3 | [number, number, number];
  /** Reference distance for positional falloff. */
  ref?: number;
}

export const AudioSystem = {
  /** Pre-generate a set of sounds (call during loading screens). */
  preload(names: string[]): void {
    names.forEach((n) => getHowl(n));
  },

  applySettings(s: Settings): void {
    settings = s;
    Howler.volume(s.masterVolume);
    for (const [name, l] of loops) {
      const h = howls.get(name);
      const def = DEFS[name];
      if (h && def) h.volume(l.target * (def.volume ?? 1) * categoryVolume(def.category), l.id);
    }
  },

  unlock(): void {
    if (unlocked) return;
    unlocked = true;
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  },

  play(name: string, opts: PlayOpts = {}): number | null {
    const h = getHowl(name);
    if (!h) return null;
    const def = DEFS[name] ?? { category: 'sfx' as SoundCategory };
    const id = h.play();
    h.volume((opts.volume ?? 1) * (def.volume ?? 1) * categoryVolume(def.category), id);
    if (opts.rate) h.rate(opts.rate, id);
    if (opts.pos) {
      const p = Array.isArray(opts.pos) ? opts.pos : [opts.pos.x, opts.pos.y, opts.pos.z];
      h.pos(p[0], p[1], p[2], id);
      h.pannerAttr({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: opts.ref ?? 2, rolloffFactor: 1.4, maxDistance: 60 }, id);
    }
    return id;
  },

  stop(name: string, id?: number): void {
    const h = howls.get(name);
    if (!h) return;
    if (id === undefined) h.stop(); else h.stop(id);
  },

  /** Start (or retarget) a looping sound. Volume 0 fades it out and stops it. */
  loop(name: string, volume = 1, fadeMs = 1500, pos?: [number, number, number]): void {
    const h = getHowl(name);
    if (!h) return;
    const def = DEFS[name] ?? { category: 'sfx' as SoundCategory };
    const base = (def.volume ?? 1) * categoryVolume(def.category);
    const cur = loops.get(name);
    if (volume <= 0) {
      if (cur) {
        const id = cur.id;
        h.fade(h.volume(id) as number, 0, fadeMs, id);
        loops.delete(name);
        window.setTimeout(() => { if (!loops.has(name)) h.stop(id); }, fadeMs + 50);
      }
      return;
    }
    if (cur) {
      if (cur.target !== volume) {
        h.fade(h.volume(cur.id) as number, volume * base, fadeMs, cur.id);
        cur.target = volume;
      }
      return;
    }
    const id = h.play();
    h.volume(0, id);
    if (pos) {
      h.pos(pos[0], pos[1], pos[2], id);
      h.pannerAttr({ panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2.5, rolloffFactor: 1.2, maxDistance: 60 }, id);
    }
    h.fade(0, volume * base, fadeMs, id);
    loops.set(name, { id, target: volume });
  },

  /** Set a running loop's level right now (no Howler fade), for per-frame mixing such as indoors/outdoors. */
  setLoopLevel(name: string, volume: number): void {
    const cur = loops.get(name);
    const h = howls.get(name);
    if (!cur || !h) return;
    const def = DEFS[name] ?? { category: 'sfx' as SoundCategory };
    cur.target = volume;
    h.volume(Math.max(0, volume) * (def.volume ?? 1) * categoryVolume(def.category), cur.id);
  },

  /** Debug: every running loop with its current volume. */
  debugLoops(): Record<string, number> {
    const out: Record<string, number> = {};
    loops.forEach((l, name) => { const h = getHowl(name); out[name] = h ? +(h.volume(l.id) as number).toFixed(3) : -1; });
    return out;
  },

  stopAllLoops(fadeMs = 800): void {
    for (const name of [...loops.keys()]) AudioSystem.loop(name, 0, fadeMs);
  },

  stopAll(): void {
    loops.clear();
    for (const h of howls.values()) h.stop();
    VoiceSystem.cancel();
  },

  /** Update the listener from the camera. */
  setListener(cam: THREE.Camera, fwd: THREE.Vector3): void {
    Howler.pos(cam.position.x, cam.position.y, cam.position.z);
    Howler.orientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
  },

  footstep(running: boolean, crouching: boolean): void {
    const v = 1 + Math.floor(Math.random() * 4);
    AudioSystem.play(`step${v}`, { volume: crouching ? 0.25 : running ? 0.9 : 0.55, rate: 0.9 + Math.random() * 0.2 });
  },
};

/** Optional speech synthesis for voiced lines (Settings → Synthesized voices). */
export const VoiceSystem = {
  speak(text: string, pitch: number, rate: number, preferFemale = false, lang: 'en' | 'fil' = 'en'): void {
    if (!settings?.voices || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)|\[.*?\]/g, ''));
      u.pitch = pitch;
      u.rate = rate;
      u.volume = Math.min(1, (settings.masterVolume ?? 1) * (settings.sfxVolume ?? 1));
      const voices = window.speechSynthesis.getVoices();
      const fil = voices.find((v) => /^(fil|tl)/i.test(v.lang));
      const female = voices.find((v) => /female|zira|samantha|victoria|karen|moira|tessa/i.test(v.name) && /^en/i.test(v.lang));
      if (lang === 'fil' && fil) u.voice = fil;
      else if (preferFemale && female) u.voice = female;
      window.speechSynthesis.speak(u);
    } catch { /* speech not available */ }
  },
  cancel(): void {
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  },
};
