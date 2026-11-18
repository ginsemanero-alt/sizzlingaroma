import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HumanoidHandle, HumanoidLook, Pose } from './Humanoid';
import { ModelCharacter, studentModel, type ModelId } from './ModelCharacter';
import { runtime } from '@/systems/runtime';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { game } from '@/store/gameStore';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';

type V3 = [number, number, number];

/** A translucent student. Fades in/out with `visible`; can vanish when the player comes close. */
export function GhostStudent({
  position, rotationY = 0, visible = true, pose = 'sit', look, vanishDistance = 0, flicker = true, color = '#7f9cff', model,
}: { position: V3; rotationY?: number; visible?: boolean; pose?: Pose; look: HumanoidLook; vanishDistance?: number; flicker?: boolean; color?: string; model?: ModelId }) {
  const ref = useRef<HumanoidHandle>(null);
  const op = useRef(0);
  const gone = useRef(false);
  useFrame((_, dt) => {
    const d = Math.hypot(runtime.player.pos.x - position[0], runtime.player.pos.z - position[2]);
    if (vanishDistance > 0 && d < vanishDistance) gone.current = true;
    const target = visible && !gone.current ? 0.45 : 0;
    op.current += (target - op.current) * Math.min(1, dt * 1.5);
    let o = op.current;
    if (flicker && o > 0.05 && Math.sin(runtime.time * 37 + position[0] * 9) > 0.96) o *= 0.3;
    ref.current?.setOpacity(o);
  });
  useEffect(() => { if (visible) gone.current = false; }, [visible]);
  const id = model ?? studentModel(!!look.skirt, Math.abs(Math.round(position[0] * 3 + position[2] * 7)));
  // The models are standing-posed: "seated" ghosts stand at their desk, just behind the seat.
  const pos: V3 = pose === 'sit' ? [position[0] + Math.sin(rotationY) * 0.42, 0, position[2] + Math.cos(rotationY) * 0.42] : position;
  return <ModelCharacter ref={ref} model={id} position={pos} rotationY={rotationY} pose={pose} ghost ghostColor={color} opacity={0} fallback={{ ...look, eyes: 'glow' }} />;
}

/**
 * The girl in the hallway. Appears at a spot, points toward a hidden clue, and vanishes when
 * approached or after being looked at. `id` persists the "seen" state in flags.
 */
export function GhostGirl({ id, position, rotationY = 0, enabled = true, pose = 'point', whisper = true }: { id: string; position: V3; rotationY?: number; enabled?: boolean; pose?: Pose; whisper?: boolean }) {
  const ref = useRef<HumanoidHandle>(null);
  const op = useRef(0);
  const state = useRef<'waiting' | 'visible' | 'gone'>('waiting');
  const seen = useRef(0);
  useFrame((_, dt) => {
    if (!enabled || game().flags[`girl_${id}`]) { ref.current?.setOpacity(0); return; }
    const p = runtime.player.pos;
    const d = Math.hypot(p.x - position[0], p.z - position[2]);
    const los = !CollisionSystem.lineBlocked(p.x, p.z, position[0], position[2]);
    if (state.current === 'waiting' && d < 14 && los) {
      state.current = 'visible';
      if (whisper) AudioSystem.play('whisper', { pos: [position[0], 1.5, position[2]], volume: 0.7 });
    }
    if (state.current === 'visible') {
      const cam = runtime.camera;
      if (cam) {
        const f = new THREE.Vector3(); cam.getWorldDirection(f);
        const dir = new THREE.Vector3(position[0] - p.x, 0, position[2] - p.z).normalize();
        if (f.x * dir.x + f.z * dir.z > 0.9 && los) seen.current += dt;
      }
      if (d < 3.2 || seen.current > 4) {
        state.current = 'gone';
        game().setFlag(`girl_${id}`, true);
      }
    }
    const target = state.current === 'visible' ? 0.5 : 0;
    op.current += (target - op.current) * Math.min(1, dt * (state.current === 'gone' ? 3 : 1));
    ref.current?.setOpacity(op.current);
  });
  return (
    <ModelCharacter
      ref={ref}
      model="ghost_girl"
      position={position}
      rotationY={rotationY}
      pose={pose}
      ghost
      ghostColor="#9fb0ff"
      opacity={0}
      fallback={{ shirt: '#e8e6df', bottom: '#1f2b4a', skirt: true, hairStyle: 'long', eyes: 'glow', height: 0.93 }}
    />
  );
}

/** Glowing memory figure (Daniel in the flashback). */
export function MemoryFigure({ position, rotationY = 0, visible = true, pose = 'stand', color = '#ffd29a', model = 'boy_rigged' }: { position: V3; rotationY?: number; visible?: boolean; pose?: Pose; color?: string; model?: ModelId }) {
  const ref = useRef<HumanoidHandle>(null);
  const op = useRef(0);
  useFrame((_, dt) => {
    op.current += ((visible ? 0.55 : 0) - op.current) * Math.min(1, dt * 2);
    ref.current?.setOpacity(op.current * (0.85 + 0.15 * Math.sin(runtime.time * 6)));
  });
  return <ModelCharacter ref={ref} model={model} position={position} rotationY={rotationY} pose={pose} ghost ghostColor={color} opacity={0} fallback={{ shirt: '#e8e6df', bottom: '#1d2230', hairStyle: 'short' }} />;
}
