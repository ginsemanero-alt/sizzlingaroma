import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lightRegistry } from '../../systems/HorrorEventSystem/horror';
import { clock } from '../../systems/ChapterSystem/clock';
import { useSettings } from '../../store/settingsStore';

export interface HouseLightProps {
  id: string;
  group?: string;
  pos: [number, number, number];
  color?: string;
  intensity?: number;
  distance?: number;
  on?: boolean;
  /** constant subtle flicker (dying bulb / fire) */
  unstable?: number;
  /** render a bulb + shade */
  fixture?: 'bulb' | 'shade' | 'none' | 'fire';
  shadow?: boolean;
}

/**
 * A point light that the horror system can switch and flicker. Flicker is a
 * smooth brightness dip pattern, never a hard full-screen strobe.
 */
export function HouseLight({
  id,
  group = 'default',
  pos,
  color = '#ffcf8a',
  intensity = 6,
  distance = 9,
  on = true,
  unstable = 0,
  fixture = 'bulb',
  shadow = false,
}: HouseLightProps) {
  const light = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.MeshStandardMaterial>(null);
  const st = useRef({ on, level: on ? 1 : 0, flickerUntil: 0, seed: Math.random() * 100 });
  const quality = useSettings((s) => s.quality);

  useEffect(() => {
    lightRegistry.register({
      id,
      group,
      pos: new THREE.Vector3(...pos),
      setOn: (v) => {
        st.current.on = v;
      },
      isOn: () => st.current.on,
      flicker: (dur) => {
        st.current.flickerUntil = clock.time + dur;
      },
    });
    return () => lightRegistry.unregister(id);
  }, [id, group, pos[0], pos[1], pos[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime + st.current.seed;
    const target = st.current.on ? 1 : 0;
    st.current.level += (target - st.current.level) * Math.min(1, dt * (st.current.on ? 4 : 12));
    let k = st.current.level;
    if (unstable > 0) k *= 1 - unstable * (0.5 + 0.5 * Math.sin(t * 13) * Math.sin(t * 7.3)) * 0.6;
    if (clock.time < st.current.flickerUntil) {
      const n = Math.sin(t * 31) * Math.sin(t * 17.7) + Math.sin(t * 5.1);
      k *= n > 0.2 ? 1 : n > -0.6 ? 0.35 : 0.08;
    }
    if (light.current) light.current.intensity = intensity * k;
    if (bulb.current) bulb.current.emissiveIntensity = 2.5 * k;
  });

  const castShadow = shadow && quality === 'high';

  return (
    <group position={pos}>
      <pointLight
        ref={light}
        color={color}
        intensity={on ? intensity : 0}
        distance={distance}
        decay={1.6}
        castShadow={castShadow}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.002}
      />
      {fixture === 'bulb' && (
        <>
          <mesh>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial ref={bulb} color="#3a3220" emissive={color} emissiveIntensity={on ? 2.5 : 0} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.5]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </>
      )}
      {fixture === 'shade' && (
        <>
          <mesh position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial ref={bulb} color="#3a3220" emissive={color} emissiveIntensity={on ? 2.5 : 0} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <coneGeometry args={[0.28, 0.24, 16, 1, true]} />
            <meshStandardMaterial color="#5a4a36" side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        </>
      )}
    </group>
  );
}
