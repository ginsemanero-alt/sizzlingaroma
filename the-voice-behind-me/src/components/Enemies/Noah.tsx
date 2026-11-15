import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Humanoid, type HumanoidLook } from './Humanoid';
import { rig } from '../Player/playerRig';
import { play } from '../../systems/AudioSystem/audioManager';

/** Mutable control for Noah's memory-figure. */
export const noah = {
  visible: false,
  pos: new THREE.Vector3(),
  target: null as THREE.Vector3 | null,
  speed: 2.4,
  /** 'warm' = the true memory (lit, gentle), 'shadow' = the false memory silhouette */
  style: 'warm' as 'warm' | 'shadow',
  arms: 0,
  opacity: 1,
  faceTarget: null as THREE.Vector3 | null,
};

export function setNoah(p: Partial<Omit<typeof noah, 'pos'>> & { pos?: [number, number, number] }) {
  const { pos, ...rest } = p;
  Object.assign(noah, rest);
  if (pos) noah.pos.set(...pos);
}

export function noahWalkTo(x: number, z: number, speed = 2.4) {
  noah.target = new THREE.Vector3(x, noah.pos.y, z);
  noah.speed = speed;
}

/**
 * Noah as he appears in Elias's memories: a 15-year-old in a yellow shirt,
 * faintly glowing so he is always readable through smoke.
 */
export function Noah() {
  const ref = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#b08a6a', emissive: '#4a2a12', emissiveIntensity: 0.6, transparent: true }),
      top: new THREE.MeshStandardMaterial({ color: '#c8a23a', emissive: '#6a4a10', emissiveIntensity: 0.7, transparent: true }),
      legs: new THREE.MeshStandardMaterial({ color: '#3a4258', emissive: '#10141e', emissiveIntensity: 0.5, transparent: true }),
      hair: new THREE.MeshStandardMaterial({ color: '#141110', transparent: true }),
    }),
    [],
  );
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#060607', transparent: true }), []);
  const lookWarm: HumanoidLook = useMemo(() => ({ height: 1.6, limb: 0.95, shoulders: 0.88, head: 1.02, materials: mats, face: true }), [mats]);
  const lookPush: HumanoidLook = useMemo(() => ({ ...lookWarm, armsForward: 1 }), [lookWarm]);
  const lookShadow: HumanoidLook = useMemo(
    () => ({ height: 1.6, limb: 0.95, shoulders: 0.88, head: 1.02, materials: { skin: shadowMat, top: shadowMat, legs: shadowMat, hair: shadowMat } }),
    [shadowMat],
  );
  const glow = useRef<THREE.PointLight>(null);
  const vWarm = useRef<THREE.Group>(null);
  const vPush = useRef<THREE.Group>(null);
  const vShadow = useRef<THREE.Group>(null);
  const stepT = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = ref.current;
    if (!g) return;
    g.visible = noah.visible;
    if (!noah.visible) return;
    if (noah.target) {
      const d = new THREE.Vector3().subVectors(noah.target, noah.pos).setY(0);
      const len = d.length();
      if (len < 0.05) noah.target = null;
      else {
        noah.pos.addScaledVector(d.normalize(), Math.min(len, noah.speed * dt));
        stepT.current += dt;
        if (stepT.current > 0.33) {
          stepT.current = 0;
          play('step_wood_0', { pos: [noah.pos.x, noah.pos.y + 0.05, noah.pos.z], vol: 0.35, rate: 1.25, ref: 2 });
        }
      }
    }
    g.position.copy(noah.pos);
    const face = noah.target ?? noah.faceTarget ?? rig.pos;
    g.rotation.y = Math.atan2(face.x - noah.pos.x, face.z - noah.pos.z);
    for (const m of [...Object.values(mats), shadowMat]) m.opacity = noah.opacity;
    if (vWarm.current) vWarm.current.visible = noah.style === 'warm' && noah.arms < 0.5;
    if (vPush.current) vPush.current.visible = noah.style === 'warm' && noah.arms >= 0.5;
    if (vShadow.current) vShadow.current.visible = noah.style === 'shadow';
    if (glow.current) glow.current.intensity = noah.style === 'warm' ? 1.4 * noah.opacity : 0;
  });

  return (
    <group ref={ref} visible={false}>
      <group ref={vWarm}>
        <Humanoid look={lookWarm} />
      </group>
      <group ref={vPush} visible={false}>
        <Humanoid look={lookPush} />
      </group>
      <group ref={vShadow} visible={false}>
        <Humanoid look={lookShadow} />
      </group>
      <pointLight ref={glow} position={[0, 1.3, 0.4]} color="#ffcf8a" distance={3} intensity={0} decay={2} />
    </group>
  );
}
