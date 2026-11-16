import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InteractionSystem } from '@/systems/InteractionSystem/InteractionSystem';
import { runtime } from '@/systems/runtime';

type V3 = [number, number, number];

export interface InteractableProps {
  id: string;
  position: V3;
  rotation?: V3;
  /** Prompt text, or null to disable. Shown as "[E] text". */
  prompt: string | null;
  onInteract: () => void;
  radius?: number;
  range?: number;
  /** Subtle idle glow for small pickups so they can be found in the dark. */
  glint?: boolean;
  children?: ReactNode;
}

const FOCUS = new THREE.Color('#ffcf8a');

/** Wraps any 3D content and makes it interactable with highlight-on-focus. */
export function Interactable({ id, position, rotation, prompt, onInteract, radius = 0.35, range = 2.2, glint = false, children }: InteractableProps) {
  const group = useRef<THREE.Group>(null);
  const focus = useRef(false);
  const latest = useRef({ prompt, onInteract });
  latest.current = { prompt, onInteract };
  const mats = useRef<{ m: THREE.MeshStandardMaterial; base: THREE.Color; baseI: number }[]>([]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    // Clone materials so that highlighting never leaks into shared materials.
    mats.current = [];
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (mesh.userData.noHighlight as boolean)) return;
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (!m || !('emissive' in m)) return;
      const clone = m.clone();
      mesh.material = clone;
      mats.current.push({ m: clone, base: clone.emissive.clone(), baseI: clone.emissiveIntensity });
    });
    const unregister = InteractionSystem.register({
      id,
      object: g,
      radius,
      range,
      prompt: () => latest.current.prompt,
      onInteract: () => latest.current.onInteract(),
      setFocus: (f) => { focus.current = f; },
    });
    return () => {
      unregister();
      mats.current.forEach(({ m }) => m.dispose());
    };
  }, [id, radius, range]);

  useFrame(() => {
    const active = latest.current.prompt !== null;
    const t = runtime.time;
    for (const { m, base, baseI } of mats.current) {
      if (focus.current && active) {
        m.emissive.copy(FOCUS);
        m.emissiveIntensity = 0.25 + 0.12 * Math.sin(t * 5);
      } else if (glint && active) {
        m.emissive.copy(FOCUS);
        m.emissiveIntensity = 0.06 + 0.05 * Math.max(0, Math.sin(t * 2 + position[0]));
      } else {
        m.emissive.copy(base);
        m.emissiveIntensity = baseI;
      }
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      {children}
    </group>
  );
}

/** Invisible interaction volume (for wall-mounted things already drawn by the level). */
export function Hotspot(props: Omit<InteractableProps, 'children'> & { size?: V3 }) {
  const size = props.size ?? [0.4, 0.4, 0.4];
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), []);
  return (
    <Interactable {...props}>
      <mesh material={mat} userData={{ noHighlight: true }}>
        <boxGeometry args={size} />
      </mesh>
    </Interactable>
  );
}
