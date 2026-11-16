import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { game } from '@/store/gameStore';

export type AmbientEvent = 'footsteps' | 'whisper' | 'knock' | 'creak' | 'flicker' | 'thunder' | 'cry' | 'run' | 'bell' | 'breath' | 'static';

/** Scripted helpers usable from chapter scripts. */
export const Horror = {
  flicker(seconds = 1.5, depth = 0.9): void {
    const reduced = game().settings.reducedFlashing;
    const end = runtime.time + seconds;
    const step = () => {
      if (runtime.time > end) { runtime.flicker = 1; return; }
      runtime.flicker = Math.random() > 0.5 ? 1 - depth * (reduced ? 0.4 : 1) : 1;
      window.setTimeout(step, reduced ? 220 : 60 + Math.random() * 90);
    };
    step();
  },
  blackout(ms: number): void {
    runtime.flicker = 0.02;
    window.setTimeout(() => { runtime.flicker = 1; }, ms);
  },
  lightning(): void {
    const reduced = game().settings.reducedFlashing;
    runtime.lightning = reduced ? 0.3 : 1;
    window.setTimeout(() => { runtime.lightning = 0; }, 90);
    if (!reduced) window.setTimeout(() => { runtime.lightning = 0.6; }, 160);
    window.setTimeout(() => { runtime.lightning = 0; }, 230);
    window.setTimeout(() => AudioSystem.play('thunder', { volume: 0.9 }), 700 + Math.random() * 1500);
  },
  /** Play a sound positioned behind/around the player at a distance. */
  around(name: string, dist = 6, volume = 1, behind = true): void {
    const p = runtime.player;
    const a = p.yaw + (behind ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
    const pos = new THREE.Vector3(p.pos.x - Math.sin(a) * dist, 1.4, p.pos.z - Math.cos(a) * dist);
    AudioSystem.play(name, { pos, volume });
  },
  stinger(): void {
    AudioSystem.play('stinger');
    runtime.shake = Math.max(runtime.shake, 0.5);
  },
};

/**
 * Randomised ambient horror events with cooldowns and no immediate repetition.
 * Scripted events live in each chapter.
 */
export function HorrorEventDirector({ pool, minGap = 22, maxGap = 50, enabled = true }: { pool: AmbientEvent[]; minGap?: number; maxGap?: number; enabled?: boolean }) {
  const next = useRef(15 + Math.random() * 15);
  const history = useRef<AmbientEvent[]>([]);
  useEffect(() => { next.current = runtime.time + 15 + Math.random() * 15; }, []);
  useFrame(() => {
    if (!enabled || runtime.paused || runtime.player.locked || pool.length === 0) return;
    if (runtime.time < next.current) return;
    if (runtime.teacherState === 'chasing') { next.current = runtime.time + 10; return; }
    next.current = runtime.time + minGap + Math.random() * (maxGap - minGap);
    const options = pool.filter((e) => !history.current.includes(e));
    const evt = (options.length ? options : pool)[Math.floor(Math.random() * (options.length || pool.length))];
    history.current = [...history.current.slice(-2), evt];
    switch (evt) {
      case 'footsteps': Horror.around('footsteps_far', 9, 0.8); break;
      case 'run': Horror.around('run_far', 10, 0.7, false); break;
      case 'whisper': Horror.around('whisper', 2.2, 0.8); break;
      case 'knock': Horror.around('knock', 5, 0.9, false); break;
      case 'creak': Horror.around('creak', 4, 0.7); break;
      case 'flicker': Horror.flicker(1.2, 0.85); AudioSystem.play('spark', { volume: 0.3 }); break;
      case 'thunder': Horror.lightning(); break;
      case 'cry': Horror.around('cry', 12, 0.6, false); break;
      case 'bell': AudioSystem.play('bell', { volume: 0.25, rate: 0.9 }); break;
      case 'breath': Horror.around('breath', 1.2, 0.6); break;
      case 'static': AudioSystem.play('static', { volume: 0.3 }); runtime.flashlightGlitch = 0.6; break;
    }
  });
  return null;
}
