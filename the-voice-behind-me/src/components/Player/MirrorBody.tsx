import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Humanoid, type HumanoidLook } from '../Enemies/Humanoid';
import { rig } from './playerRig';
import { MIRROR_LAYER } from '../Environment/Mirror';

export type ReflectionMode = 'follow' | 'lag' | 'frozen' | 'stare';

/** Controls how Elias's reflection behaves — the mirror horror events. */
export const reflection = { mode: 'follow' as ReflectionMode };

/**
 * Elias's body, visible only in mirrors. In 'lag' it copies the player a
 * second late; in 'frozen' it stops copying; in 'stare' it keeps facing the
 * mirror even when the player turns away.
 */
export function MirrorBody() {
  const ref = useRef<THREE.Group>(null);
  const history = useRef<{ x: number; z: number; yaw: number; t: number }[]>([]);
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#8a6a58', roughness: 0.8 }),
      top: new THREE.MeshStandardMaterial({ color: '#3e4436', roughness: 0.95 }),
      legs: new THREE.MeshStandardMaterial({ color: '#2c3340', roughness: 0.95 }),
      hair: new THREE.MeshStandardMaterial({ color: '#141110', roughness: 1 }),
    }),
    [],
  );
  const look: HumanoidLook = useMemo(() => ({ height: 1.78, limb: 1, shoulders: 1, head: 1, materials: mats, face: true }), [mats]);
  const frozenAt = useRef<{ x: number; z: number; yaw: number } | null>(null);

  useEffect(() => {
    ref.current?.traverse((o) => o.layers.set(MIRROR_LAYER));
  }, []);

  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    const h = history.current;
    h.push({ x: rig.pos.x, z: rig.pos.z, yaw: rig.yaw, t });
    while (h.length && t - h[0].t > 1.5) h.shift();
    let x = rig.pos.x;
    let z = rig.pos.z;
    let yaw = rig.yaw;
    if (reflection.mode !== 'frozen') frozenAt.current = null;
    if (reflection.mode === 'lag' && h.length) {
      const old = h.find((e) => t - e.t <= 1.0) ?? h[0];
      x = old.x;
      z = old.z;
      yaw = old.yaw;
    } else if (reflection.mode === 'frozen') {
      if (!frozenAt.current) frozenAt.current = { x, z, yaw };
      ({ x, z, yaw } = frozenAt.current);
    } else if (reflection.mode === 'stare') {
      yaw = rig.yaw + Math.PI;
    }
    g.position.set(x, rig.pos.y, z);
    // the body faces where the camera faces (Humanoid faces +z, camera faces -z)
    g.rotation.y = yaw + Math.PI;
    g.scale.y = rig.eyeHeight / 1.62;
  });

  return (
    <group ref={ref}>
      <Humanoid look={look} />
    </group>
  );
}
