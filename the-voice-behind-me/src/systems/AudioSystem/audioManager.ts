import { Howl, Howler } from 'howler';
import { generate, toWavDataUri } from './synth';
import { useSettings } from '../../store/settingsStore';
import type { VoiceKind } from '../../data/types';

export type Category = 'music' | 'ambience' | 'sfx';

export interface PlayOpts {
  vol?: number;
  rate?: number;
  loop?: boolean;
  cat?: Category;
  /** world position for 3D positional playback */
  pos?: [number, number, number];
  /** reference distance for positional falloff (metres) */
  ref?: number;
  fadeIn?: number;
}

export interface SoundHandle {
  stop: (fade?: number) => void;
  setVolume: (v: number, fade?: number) => void;
  setPos: (p: [number, number, number]) => void;
  playing: () => boolean;
}

interface Active {
  howl: Howl;
  id: number;
  cat: Category;
  base: number;
}

const cache = new Map<string, Howl>();
const active = new Set<Active>();

function catVolume(cat: Category) {
  const s = useSettings.getState();
  return cat === 'music' ? s.music : cat === 'ambience' ? s.ambience : s.sfx;
}

function getHowl(name: string): Howl {
  let h = cache.get(name);
  if (!h) {
    const src = toWavDataUri(generate(name));
    h = new Howl({ src: [src], format: ['wav'], preload: true, html5: false });
    cache.set(name, h);
  }
  return h;
}

/** Generate sounds ahead of time so first playback has no hitch. */
export function preload(names: string[]) {
  for (const n of names) {
    try {
      getHowl(n);
    } catch (e) {
      console.warn(e);
    }
  }
}

const NULL_HANDLE: SoundHandle = { stop: () => {}, setVolume: () => {}, setPos: () => {}, playing: () => false };

export function play(name: string, o: PlayOpts = {}): SoundHandle {
  let howl: Howl;
  try {
    howl = getHowl(name);
  } catch (e) {
    console.warn(e);
    return NULL_HANDLE;
  }
  const cat = o.cat ?? 'sfx';
  const base = o.vol ?? 1;
  const id = howl.play();
  howl.loop(!!o.loop, id);
  if (o.rate) howl.rate(o.rate, id);
  const target = base * catVolume(cat);
  if (o.pos) {
    howl.pannerAttr(
      {
        panningModel: 'HRTF',
        refDistance: o.ref ?? 1.5,
        rolloffFactor: 1.4,
        distanceModel: 'inverse',
        maxDistance: 60,
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 1,
      },
      id,
    );
    howl.pos(o.pos[0], o.pos[1], o.pos[2], id);
  }
  if (o.fadeIn) {
    howl.volume(0, id);
    howl.fade(0, target, o.fadeIn * 1000, id);
  } else {
    howl.volume(target, id);
  }
  const entry: Active = { howl, id, cat, base };
  active.add(entry);
  if (!o.loop) howl.once('end', () => active.delete(entry), id);

  let stopped = false;
  return {
    stop: (fade = 0) => {
      if (stopped) return;
      stopped = true;
      if (fade > 0) {
        howl.fade(howl.volume(id) as number, 0, fade * 1000, id);
        setTimeout(() => {
          howl.stop(id);
          active.delete(entry);
        }, fade * 1000 + 30);
      } else {
        howl.stop(id);
        active.delete(entry);
      }
    },
    setVolume: (v, fade = 0) => {
      entry.base = v;
      const t = v * catVolume(cat);
      if (fade > 0) howl.fade(howl.volume(id) as number, t, fade * 1000, id);
      else howl.volume(t, id);
    },
    setPos: (p) => howl.pos(p[0], p[1], p[2], id),
    playing: () => !stopped && howl.playing(id),
  };
}

/** Re-apply category volumes after the settings change. */
export function refreshVolumes() {
  const s = useSettings.getState();
  Howler.volume(s.master);
  for (const a of active) a.howl.volume(a.base * catVolume(a.cat), a.id);
}

export function setListener(
  pos: { x: number; y: number; z: number },
  fwd: { x: number; y: number; z: number },
) {
  Howler.pos(pos.x, pos.y, pos.z);
  Howler.orientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
}

// ───────────── ambience layers (crossfaded loops) ─────────────

const layers = new Map<string, SoundHandle>();

/** Set the full ambience mix. Layers missing from `mix` fade out. */
export function setAmbience(mix: Record<string, number>, fade = 2) {
  for (const [name, h] of layers) {
    if (!(name in mix) || mix[name] <= 0) {
      h.stop(fade);
      layers.delete(name);
    }
  }
  for (const [name, vol] of Object.entries(mix)) {
    if (vol <= 0) continue;
    const h = layers.get(name);
    if (h) h.setVolume(vol, fade);
    else layers.set(name, play(name, { loop: true, cat: name.includes('music') || name === 'drone' || name === 'drone_low' || name === 'hopeful' || name === 'music_box' ? 'music' : 'ambience', vol, fadeIn: fade }));
  }
}

let musicHandle: { name: string; h: SoundHandle } | null = null;

export function setMusic(name: string | null, vol = 0.6, fade = 3) {
  if (musicHandle && musicHandle.name === name) {
    musicHandle.h.setVolume(vol, fade);
    return;
  }
  musicHandle?.h.stop(fade);
  musicHandle = name ? { name, h: play(name, { loop: true, cat: 'music', vol, fadeIn: fade }) } : null;
}

export function stopAll(fade = 0.5) {
  for (const [, h] of layers) h.stop(fade);
  layers.clear();
  musicHandle?.h.stop(fade);
  musicHandle = null;
  for (const a of [...active]) {
    if (fade > 0) a.howl.fade(a.howl.volume(a.id) as number, 0, fade * 1000, a.id);
    setTimeout(() => a.howl.stop(a.id), fade * 1000 + 20);
  }
  active.clear();
}

// ───────────── voices ─────────────

let voiceHandle: SoundHandle | null = null;
let voiceVariant = 0;

/** Plays a placeholder synthesized voice texture under a subtitle line. */
export function speak(kind: VoiceKind | undefined, dur: number, tape?: boolean, pos?: [number, number, number]) {
  voiceHandle?.stop(0.08);
  voiceHandle = null;
  if (!kind || kind === 'none') return;
  const variant = voiceVariant++ % 3;
  const name = `voice_${kind}_${variant}${tape ? '_tape' : ''}`;
  const vol = kind === 'whisper' ? 0.5 : kind === 'figure' ? 0.75 : 0.55;
  const h = play(name, { loop: true, vol, pos, rate: 0.96 + Math.random() * 0.08 });
  voiceHandle = h;
  setTimeout(() => {
    if (voiceHandle === h) {
      h.stop(0.25);
      voiceHandle = null;
    }
  }, Math.max(400, (dur - 0.35) * 1000));
}

export function stopVoice() {
  voiceHandle?.stop(0.1);
  voiceHandle = null;
}

// ───────────── convenience ─────────────

const stepCounters: Record<string, number> = {};
export function footstep(surface: 'wood' | 'outside' | 'concrete', vol = 0.5, rate = 1) {
  const variants = surface === 'wood' ? 3 : 2;
  stepCounters[surface] = ((stepCounters[surface] ?? 0) + 1) % variants;
  play(`step_${surface}_${stepCounters[surface]}`, { vol, rate: rate * (0.92 + Math.random() * 0.16) });
}

export function uiClick() {
  play('ui_click', { vol: 0.6 });
}
export function uiHover() {
  play('ui_hover', { vol: 0.5 });
}

export const Audio = { play, preload, setAmbience, setMusic, stopAll, speak, stopVoice, footstep, refreshVolumes, setListener };
