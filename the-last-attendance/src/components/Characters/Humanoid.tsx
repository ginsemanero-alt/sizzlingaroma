import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type Pose = 'stand' | 'sit' | 'point' | 'book' | 'walk' | 'reach';

export interface HumanoidLook {
  skin?: string;
  shirt?: string;
  bottom?: string;
  hair?: string;
  hairStyle?: 'long' | 'short' | 'ribbon' | 'bun';
  skirt?: boolean;
  /** Ghost rendering: translucent and faintly glowing. */
  ghost?: boolean;
  ghostColor?: string;
  opacity?: number;
  eyes?: 'normal' | 'dark' | 'glow';
  height?: number;
  accessory?: 'glasses' | 'jersey' | 'pick' | 'none';
}

export interface HumanoidHandle {
  group: THREE.Group | null;
  setOpacity: (o: number) => void;
  /** Walk cycle speed (0 = still). */
  walk: (speed: number) => void;
  headTilt: (rad: number) => void;
}

/** Procedural stylised humanoid built from primitives. Used for the teacher, ghosts and memories. */
export const Humanoid = forwardRef<HumanoidHandle, HumanoidLook & { pose?: Pose; position?: [number, number, number]; rotationY?: number }>(
  function Humanoid({ pose = 'stand', position, rotationY = 0, ...look }, ref) {
    const group = useRef<THREE.Group>(null);
    const legL = useRef<THREE.Group>(null);
    const legR = useRef<THREE.Group>(null);
    const armL = useRef<THREE.Group>(null);
    const armR = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const walkSpeed = useRef(pose === 'walk' ? 1 : 0);
    const phase = useRef(Math.random() * 10);
    const tilt = useRef(0);

    const mats = useMemo(() => {
      const ghost = !!look.ghost;
      const op = look.opacity ?? (ghost ? 0.42 : 1);
      const make = (c: string) => new THREE.MeshStandardMaterial({
        color: c, roughness: 0.85, transparent: ghost || op < 1, opacity: op, depthWrite: !ghost,
        emissive: ghost ? new THREE.Color(look.ghostColor ?? '#6f8fd8') : new THREE.Color('#000'), emissiveIntensity: ghost ? 0.35 : 0,
      });
      return {
        skin: make(look.skin ?? '#c9a58a'),
        shirt: make(look.shirt ?? '#e8e6df'),
        bottom: make(look.bottom ?? '#20263a'),
        hair: make(look.hair ?? '#0d0b0b'),
        eye: new THREE.MeshStandardMaterial({
          color: look.eyes === 'glow' ? '#cfe0ff' : '#050505', emissive: look.eyes === 'glow' ? '#9fc0ff' : '#000', emissiveIntensity: look.eyes === 'glow' ? 2 : 0,
          transparent: ghost, opacity: look.opacity ?? (ghost ? 0.8 : 1),
        }),
        accent: make(look.accessory === 'jersey' ? '#b3262a' : '#2a8a4a'),
        ribbon: make('#e2c03a'),
      };
    }, [look.ghost, look.ghostColor, look.opacity, look.skin, look.shirt, look.bottom, look.hair, look.eyes, look.accessory]);

    useImperativeHandle(ref, () => ({
      group: group.current,
      setOpacity: (o: number) => {
        Object.values(mats).forEach((m) => {
          m.transparent = true;
          m.opacity = o;
          m.depthWrite = o > 0.95 && !look.ghost;
        });
        if (group.current) group.current.visible = o > 0.01;
      },
      walk: (s: number) => { walkSpeed.current = s; },
      headTilt: (r: number) => { tilt.current = r; },
    }), [mats, look.ghost]);

    useFrame((_, dt) => {
      const s = walkSpeed.current;
      phase.current += dt * (s > 0 ? 6 * s : 0.8);
      const p = phase.current;
      if (pose !== 'sit') {
        const swing = s > 0 ? Math.sin(p) * 0.45 * Math.min(1, s) : 0;
        if (legL.current) legL.current.rotation.x = swing;
        if (legR.current) legR.current.rotation.x = -swing;
        if (pose === 'stand' || pose === 'walk') {
          if (armL.current) armL.current.rotation.x = -swing * 0.6;
          if (armR.current) armR.current.rotation.x = swing * 0.6;
        }
      }
      if (head.current) {
        head.current.rotation.z = THREE.MathUtils.lerp(head.current.rotation.z, tilt.current, dt * 2);
        head.current.rotation.y = Math.sin(p * 0.3) * 0.04;
      }
      if (group.current && s === 0 && pose !== 'sit') group.current.position.y = (position?.[1] ?? 0) + Math.sin(p * 0.9) * 0.005;
    });

    const H = look.height ?? 1;
    const sit = pose === 'sit';
    const longHair = look.hairStyle === 'long' || look.hairStyle === 'ribbon';
    return (
      <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={[H, H, H]}>
        <group position={[0, sit ? -0.38 : 0, 0]}>
          {/* legs */}
          <group ref={legL} position={[-0.08, 0.82, 0]} rotation={[sit ? -Math.PI / 2 : 0, 0, 0]}>
            <mesh position={[0, -0.4, 0]} material={look.skirt ? mats.skin : mats.bottom} castShadow>
              <cylinderGeometry args={[0.055, 0.045, 0.8, 8]} />
            </mesh>
            {sit && <mesh position={[0, -0.8, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={mats.bottom}><cylinderGeometry args={[0.045, 0.045, 0.42, 6]} /></mesh>}
          </group>
          <group ref={legR} position={[0.08, 0.82, 0]} rotation={[sit ? -Math.PI / 2 : 0, 0, 0]}>
            <mesh position={[0, -0.4, 0]} material={look.skirt ? mats.skin : mats.bottom} castShadow>
              <cylinderGeometry args={[0.055, 0.045, 0.8, 8]} />
            </mesh>
            {sit && <mesh position={[0, -0.8, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={mats.bottom}><cylinderGeometry args={[0.045, 0.045, 0.42, 6]} /></mesh>}
          </group>
          {/* skirt / hips */}
          {look.skirt ? (
            <mesh position={[0, sit ? 0.82 : 0.68, sit ? -0.1 : 0]} material={mats.bottom} castShadow rotation={[sit ? -0.9 : 0, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.27, sit ? 0.45 : 0.62, 12]} />
            </mesh>
          ) : (
            <mesh position={[0, 0.86, 0]} material={mats.bottom}>
              <cylinderGeometry args={[0.16, 0.16, 0.16, 10]} />
            </mesh>
          )}
          {/* torso */}
          <mesh position={[0, 1.18, 0]} material={mats.shirt} castShadow>
            <cylinderGeometry args={[0.18, 0.15, 0.52, 10]} />
          </mesh>
          {look.accessory === 'jersey' && (
            <mesh position={[0, 1.18, 0.001]} material={mats.accent}><cylinderGeometry args={[0.182, 0.152, 0.3, 10]} /></mesh>
          )}
          {look.accessory === 'pick' && (
            <mesh position={[0, 1.24, -0.17]} material={mats.accent}><boxGeometry args={[0.03, 0.03, 0.01]} /></mesh>
          )}
          {/* arms */}
          <group ref={armL} position={[-0.22, 1.4, 0]} rotation={pose === 'book' ? [-1.1, 0, 0.2] : pose === 'reach' ? [-1.4, 0, 0] : sit ? [-0.5, 0, 0] : [0, 0, 0.08]}>
            <mesh position={[0, -0.3, 0]} material={mats.shirt} castShadow><cylinderGeometry args={[0.045, 0.04, 0.6, 8]} /></mesh>
            <mesh position={[0, -0.63, 0]} material={mats.skin}><sphereGeometry args={[0.045, 8, 6]} /></mesh>
          </group>
          <group ref={armR} position={[0.22, 1.4, 0]} rotation={pose === 'point' ? [-1.5, 0, 0] : pose === 'book' ? [-1.1, 0, -0.2] : pose === 'reach' ? [-1.4, 0, 0] : sit ? [-0.5, 0, 0] : [0, 0, -0.08]}>
            <mesh position={[0, -0.3, 0]} material={mats.shirt} castShadow><cylinderGeometry args={[0.045, 0.04, 0.6, 8]} /></mesh>
            <mesh position={[0, -0.63, 0]} material={mats.skin}><sphereGeometry args={[0.045, 8, 6]} /></mesh>
          </group>
          {pose === 'book' && (
            <mesh position={[0, 1.22, -0.42]} rotation={[-0.6, 0, 0]}>
              <boxGeometry args={[0.32, 0.03, 0.24]} />
              <meshStandardMaterial color="#3b2418" roughness={0.8} />
            </mesh>
          )}
          {/* neck + head */}
          <mesh position={[0, 1.48, 0]} material={mats.skin}><cylinderGeometry args={[0.05, 0.05, 0.1, 8]} /></mesh>
          <group ref={head} position={[0, 1.6, 0]}>
            <mesh material={mats.skin} castShadow><sphereGeometry args={[0.115, 16, 12]} /></mesh>
            <mesh position={[-0.04, 0.01, -0.105]} material={mats.eye}><sphereGeometry args={[look.eyes === 'dark' ? 0.022 : 0.015, 8, 6]} /></mesh>
            <mesh position={[0.04, 0.01, -0.105]} material={mats.eye}><sphereGeometry args={[look.eyes === 'dark' ? 0.022 : 0.015, 8, 6]} /></mesh>
            {look.accessory === 'glasses' && (
              <>
                <mesh position={[-0.045, 0.01, -0.115]}><torusGeometry args={[0.028, 0.005, 6, 12]} /><meshStandardMaterial color="#5a3a1a" /></mesh>
                <mesh position={[0.045, 0.01, -0.115]}><torusGeometry args={[0.028, 0.005, 6, 12]} /><meshStandardMaterial color="#5a3a1a" /></mesh>
              </>
            )}
            {/* hair cap */}
            <mesh position={[0, 0.03, 0.01]} material={mats.hair} scale={[1.06, 1.02, 1.08]}>
              <sphereGeometry args={[0.115, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            </mesh>
            {longHair && (
              <>
                <mesh position={[0, -0.2, 0.06]} material={mats.hair}><boxGeometry args={[0.25, 0.48, 0.1]} /></mesh>
                <mesh position={[-0.11, -0.12, -0.03]} material={mats.hair}><boxGeometry args={[0.04, 0.34, 0.12]} /></mesh>
                <mesh position={[0.11, -0.12, -0.03]} material={mats.hair}><boxGeometry args={[0.04, 0.34, 0.12]} /></mesh>
              </>
            )}
            {look.hairStyle === 'ribbon' && (
              <mesh position={[0.08, 0.08, 0.06]} material={mats.ribbon}><boxGeometry args={[0.08, 0.05, 0.03]} /></mesh>
            )}
            {look.hairStyle === 'bun' && (
              <mesh position={[0, 0.06, 0.11]} material={mats.hair}><sphereGeometry args={[0.06, 10, 8]} /></mesh>
            )}
          </group>
        </group>
      </group>
    );
  },
);

/** Student uniform presets. */
export const STUDENT_LOOKS: Record<string, HumanoidLook> = {
  girl: { shirt: '#e9e6dc', bottom: '#1f2b4a', skirt: true, hairStyle: 'long' },
  boy: { shirt: '#e9e6dc', bottom: '#1d2230', hairStyle: 'short' },
};
