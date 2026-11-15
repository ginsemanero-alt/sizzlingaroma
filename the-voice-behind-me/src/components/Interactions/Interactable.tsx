import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { interactions } from '../../systems/InteractionSystem/interactions';
import { useGame } from '../../store/gameStore';
import { rig } from '../Player/playerRig';

export interface InteractableProps {
  id: string;
  /** world position of the interaction point */
  at: [number, number, number];
  /** prompt text, or a function returning text / null (disabled) */
  prompt: string | (() => string | null);
  onInteract: () => void;
  reach?: number;
  /** when false the object can't be used and shows no prompt */
  enabled?: boolean;
  /** subtle glint marking important objects when nearby */
  glint?: boolean;
  children?: ReactNode;
}

/**
 * Registers an interactable object with the interaction system, and shows a
 * soft highlight when the player is aiming at it.
 */
export function Interactable({ id, at, prompt, onInteract, reach = 2.1, enabled = true, glint = false, children }: InteractableProps) {
  const latest = useRef({ prompt, onInteract, enabled });
  latest.current = { prompt, onInteract, enabled };
  const focused = useGame((s) => s.focus?.id === id);

  useEffect(() => {
    interactions.register({
      id,
      pos: new THREE.Vector3(...at),
      reach,
      prompt: () => {
        const l = latest.current;
        if (!l.enabled) return null;
        return typeof l.prompt === 'function' ? l.prompt() : l.prompt;
      },
      onInteract: () => latest.current.onInteract(),
    });
    return () => interactions.unregister(id);
  }, [id, at[0], at[1], at[2], reach]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      {children}
      {enabled && (focused || glint) && <Glint at={at} strong={focused} />}
    </group>
  );
}

function Glint({ at, strong }: { at: [number, number, number]; strong: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    if (!ref.current || !mat.current) return;
    const t = st.clock.elapsedTime;
    const d = rig.camPos.distanceTo(ref.current.position);
    const near = strong ? 1 : Math.max(0, 1 - d / 4.5);
    mat.current.opacity = (strong ? 0.55 : 0.22) * near * (0.75 + 0.25 * Math.sin(t * 3));
    ref.current.lookAt(rig.camPos);
    const s = (strong ? 0.011 : 0.008) * Math.max(0.4, d);
    ref.current.scale.setScalar(s * (1 + 0.15 * Math.sin(t * 2.4)));
  });
  return (
    <mesh ref={ref} position={at} renderOrder={10}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial ref={mat} color="#f2e2b8" transparent depthWrite={false} depthTest={false} opacity={0.3} />
    </mesh>
  );
}
