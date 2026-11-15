import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';

export interface HumanoidLook {
  height: number;
  /** >1 stretches limbs (uncanny) */
  limb: number;
  shoulders: number;
  head: number;
  materials: {
    skin: THREE.Material;
    top: THREE.Material;
    legs: THREE.Material;
    hair?: THREE.Material;
  };
  face?: boolean;
  /** arms raised forward (pushing / beckoning) */
  armsForward?: number;
}

/**
 * A procedural human silhouette (TEMPORARY ASSET — swap for a rigged model).
 * Used for The Figure, Noah and Elias's reflection.
 */
export const Humanoid = forwardRef<THREE.Group, { look: HumanoidLook }>(function Humanoid({ look }, ref) {
  const { height: H, limb: L, shoulders: S, head: HD, materials: m, face, armsForward = 0 } = look;
  const geo = useMemo(
    () => ({
      head: new THREE.SphereGeometry(0.115 * HD, 16, 12),
      neck: new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8),
      torso: new THREE.CapsuleGeometry(0.17 * S, 0.38, 4, 10),
      hips: new THREE.CapsuleGeometry(0.15, 0.08, 4, 10),
      arm: new THREE.CapsuleGeometry(0.052, 0.55 * L, 4, 8),
      hand: new THREE.SphereGeometry(0.05, 8, 6),
      leg: new THREE.CapsuleGeometry(0.075, 0.78 * L, 4, 8),
      eye: new THREE.SphereGeometry(0.013, 6, 6),
    }),
    [S, L, HD],
  );
  const k = H / 1.75;
  const legLen = 0.78 * L;
  const hipY = legLen + 0.14;
  const torsoY = hipY + 0.36;
  const shoulderY = torsoY + 0.26;
  const headY = shoulderY + 0.2 + 0.1 * HD;
  const armLen = 0.55 * L;
  return (
    <group ref={ref} scale={[k, k, k]}>
      <mesh geometry={geo.head} material={m.skin} position={[0, headY, 0]} castShadow />
      {m.hair && (
        <mesh material={m.hair} position={[0, headY + 0.035, -0.015]} scale={[1.05, 0.85, 1.05]} castShadow>
          <sphereGeometry args={[0.118 * HD, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        </mesh>
      )}
      {face && (
        <>
          <mesh geometry={geo.eye} position={[-0.04, headY + 0.01, 0.1 * HD]}>
            <meshBasicMaterial color="#050505" />
          </mesh>
          <mesh geometry={geo.eye} position={[0.04, headY + 0.01, 0.1 * HD]}>
            <meshBasicMaterial color="#050505" />
          </mesh>
        </>
      )}
      <mesh geometry={geo.neck} material={m.skin} position={[0, shoulderY + 0.08, 0]} />
      <mesh geometry={geo.torso} material={m.top} position={[0, torsoY, 0]} scale={[1, 1, 0.65]} castShadow />
      <mesh geometry={geo.hips} material={m.legs} position={[0, hipY, 0]} scale={[1, 1, 0.7]} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.22 * S, shoulderY, 0]} rotation={[-armsForward * 1.35, 0, side * 0.08]}>
          <mesh geometry={geo.arm} material={m.top} position={[0, -armLen / 2 - 0.02, 0]} castShadow />
          <mesh geometry={geo.hand} material={m.skin} position={[0, -armLen - 0.08, 0]} />
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={geo.leg} material={m.legs} position={[side * 0.09, legLen / 2 + 0.04, 0]} castShadow />
      ))}
    </group>
  );
});
