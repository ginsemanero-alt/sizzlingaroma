import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { rig } from '../Player/playerRig';
import { controlsActive } from '../../store/gameStore';

export interface TriggerProps {
  /** axis-aligned XZ rectangle */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  onEnter: () => void;
  onExit?: () => void;
  /** fire only once (default true) */
  once?: boolean;
  enabled?: boolean;
  /** require the player to have control (not during cutscenes) */
  requireControl?: boolean;
  minY?: number;
  maxY?: number;
}

/** Invisible zone that fires when the player walks into it. */
export function Trigger({ x0, z0, x1, z1, onEnter, onExit, once = true, enabled = true, requireControl = true, minY = -10, maxY = 100 }: TriggerProps) {
  const state = useRef({ inside: false, fired: false });
  const cb = useRef({ onEnter, onExit });
  cb.current = { onEnter, onExit };
  useFrame(() => {
    if (!enabled) return;
    if (once && state.current.fired) return;
    if (requireControl && !controlsActive()) return;
    const p = rig.pos;
    const inside =
      p.x >= Math.min(x0, x1) && p.x <= Math.max(x0, x1) && p.z >= Math.min(z0, z1) && p.z <= Math.max(z0, z1) && p.y >= minY && p.y <= maxY;
    if (inside && !state.current.inside) {
      state.current.fired = true;
      cb.current.onEnter();
    } else if (!inside && state.current.inside) {
      cb.current.onExit?.();
    }
    state.current.inside = inside;
  });
  return null;
}
