import * as THREE from 'three';
import { play } from '../AudioSystem/audioManager';
import { wait, clock } from '../ChapterSystem/clock';
import { rig, shake } from '../../components/Player/playerRig';
import { useGame } from '../../store/gameStore';

// ───────────────────────── lights ─────────────────────────

export interface LightApi {
  id: string;
  group: string;
  pos: THREE.Vector3;
  setOn: (on: boolean) => void;
  isOn: () => boolean;
  flicker: (dur: number) => void;
}

const lights = new Map<string, LightApi>();

export const lightRegistry = {
  register(l: LightApi) {
    lights.set(l.id, l);
  },
  unregister(id: string) {
    lights.delete(id);
  },
  clear() {
    lights.clear();
  },
};

export function setLights(group: string, on: boolean) {
  for (const l of lights.values()) if (l.group === group || group === '*') l.setOn(on);
}

export function setLight(id: string, on: boolean) {
  lights.get(id)?.setOn(on);
}

export function flickerLights(group: string, dur = 1.5) {
  let any = false;
  for (const l of lights.values())
    if ((l.group === group || group === '*') && l.isOn()) {
      l.flicker(dur);
      any = true;
    }
  if (any) play('flicker', { vol: 0.35 });
}

/** Flicker whichever lit lamp is nearest the player. */
export function flickerNearest(maxDist = 10) {
  let best: LightApi | null = null;
  let bd = maxDist;
  for (const l of lights.values()) {
    if (!l.isOn()) continue;
    const d = l.pos.distanceTo(rig.pos);
    if (d < bd) {
      bd = d;
      best = l;
    }
  }
  if (best) {
    best.flicker(1.2 + Math.random());
    play('flicker', { vol: 0.3, pos: [best.pos.x, best.pos.y, best.pos.z] });
  }
}

// ───────────────────────── flashlight / screen fx ─────────────────────────

export const fx = {
  flashlightFlickerUntil: 0,
  distortionPulse: 0,
};

export function flickerFlashlight(dur = 1.5) {
  fx.flashlightFlickerUntil = clock.time + dur;
}

/** Brief visual distortion (chromatic aberration + grain). Never strobes. */
export function distort(amount = 0.6) {
  fx.distortionPulse = Math.max(fx.distortionPulse, amount);
}

export function jolt(amount = 0.5) {
  shake(amount);
}

// ───────────────────────── sounds in space ─────────────────────────

export function soundAt(name: string, pos: [number, number, number], vol = 0.8, ref = 1.5) {
  return play(name, { pos, vol, ref });
}

/** A sound that comes from just behind the player's head. */
export function soundBehind(name: string, vol = 0.7, dist = 1.4) {
  const b = rig.forward.clone().setY(0).normalize().multiplyScalar(-dist);
  return play(name, { pos: [rig.camPos.x + b.x, rig.camPos.y, rig.camPos.z + b.z], vol, ref: 1 });
}

/** Footsteps walking from a to b (positional). */
export async function footstepTrail(
  from: [number, number, number],
  to: [number, number, number],
  steps = 8,
  interval = 0.55,
  sound = 'step_figure',
  vol = 0.8,
) {
  const g = clock.generation;
  for (let i = 0; i < steps; i++) {
    if (g !== clock.generation) return;
    const t = steps === 1 ? 1 : i / (steps - 1);
    play(sound, {
      pos: [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t],
      vol,
      ref: 2,
      rate: 0.9 + Math.random() * 0.1,
    });
    await wait(interval);
  }
}

/** Footsteps approaching the player from behind, stopping just short. */
export async function footstepsBehind(steps = 6, interval = 0.6) {
  const back = rig.forward.clone().setY(0).normalize().multiplyScalar(-1);
  const start = rig.pos.clone().addScaledVector(back, 6);
  const end = rig.pos.clone().addScaledVector(back, 1.2);
  await footstepTrail([start.x, 0.05, start.z], [end.x, 0.05, end.z], steps, interval);
}

// ───────────────────────── random ambient events ─────────────────────────

export interface AmbientConfig {
  minGap: number;
  maxGap: number;
  pool: ('creak' | 'knock' | 'whisper' | 'flicker' | 'thunder' | 'laugh' | 'reversed' | 'steps')[];
}

let ambientCfg: AmbientConfig | null = null;
let nextAmbient = 0;

export function setAmbientEvents(cfg: AmbientConfig | null) {
  ambientCfg = cfg;
  nextAmbient = clock.time + (cfg ? cfg.minGap : 0);
}

function randomAround(minR: number, maxR: number): [number, number, number] {
  const a = Math.random() * Math.PI * 2;
  const r = minR + Math.random() * (maxR - minR);
  return [rig.pos.x + Math.cos(a) * r, 1.5 + Math.random(), rig.pos.z + Math.sin(a) * r];
}

/** Called once per frame by the HorrorDirector component. */
export function tickAmbient() {
  if (!ambientCfg || clock.time < nextAmbient) return;
  const g = useGame.getState();
  if (g.cutscene || g.puzzle || g.choice) {
    nextAmbient = clock.time + 3;
    return;
  }
  nextAmbient = clock.time + ambientCfg.minGap + Math.random() * (ambientCfg.maxGap - ambientCfg.minGap);
  const ev = ambientCfg.pool[Math.floor(Math.random() * ambientCfg.pool.length)];
  switch (ev) {
    case 'creak':
      play(Math.random() < 0.5 ? 'creak_0' : 'creak_1', { pos: randomAround(3, 8), vol: 0.5, ref: 2 });
      break;
    case 'knock':
      play('knock', { pos: randomAround(5, 10), vol: 0.45, ref: 2 });
      break;
    case 'whisper':
      soundBehind(['whisper_0', 'whisper_1', 'whisper_2'][Math.floor(Math.random() * 3)], 0.35, 2);
      break;
    case 'flicker':
      flickerNearest();
      break;
    case 'thunder':
      play('thunder', { vol: 0.45, cat: 'ambience' });
      break;
    case 'laugh':
      play('child_laugh', { pos: randomAround(6, 10), vol: 0.25, ref: 2 });
      break;
    case 'reversed':
      play('reversed', { pos: randomAround(4, 8), vol: 0.3, ref: 2 });
      break;
    case 'steps': {
      const a = randomAround(6, 9);
      const b = randomAround(6, 9);
      footstepTrail([a[0], 2.9, a[2]], [b[0], 2.9, b[2]], 4, 0.6, 'step_figure', 0.4);
      break;
    }
  }
}

/** Short horror sting: sound + optional jolt + visual distortion. Used sparingly. */
export function sting(kind: 'soft' | 'hard' = 'soft') {
  if (kind === 'hard') {
    play('stinger', { vol: 0.75 });
    distort(0.8);
    jolt(0.6);
  } else {
    play('bass', { vol: 0.55 });
    distort(0.35);
  }
}
