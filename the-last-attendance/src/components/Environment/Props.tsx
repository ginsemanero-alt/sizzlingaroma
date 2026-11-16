import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '@/systems/runtime';
import { textTexture, Textures } from './textures';
import { useGame } from '@/store/gameStore';

type V3 = [number, number, number];

/** Ceiling fluorescent fixture with an optional real light. */
export function FluoroLight({
  position, on = true, color = '#dfe8ff', intensity = 6, distance = 9, flicker = 'subtle', light = true, length = 1.2, rotY = 0,
}: { position: V3; on?: boolean; color?: string; intensity?: number; distance?: number; flicker?: 'none' | 'subtle' | 'broken'; light?: boolean; length?: number; rotY?: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color(color), emissiveIntensity: 0 }), [color]);
  const phase = useMemo(() => Math.random() * 100, []);
  const reducedFlashing = useGame((s) => s.settings.reducedFlashing);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_, dt) => {
    let k = on ? 1 : 0;
    if (on) {
      const t = runtime.time + phase;
      if (flicker === 'subtle') k *= Math.sin(t * 50) > 0.97 && !reducedFlashing ? 0.6 : 1;
      if (flicker === 'broken') {
        const n = Math.sin(t * 3.1) * Math.sin(t * 7.7 + 1) * Math.sin(t * 13.3);
        k *= reducedFlashing ? 0.6 : n > 0.15 ? 1 : n > -0.1 ? 0.15 : 0.02;
      }
      k *= runtime.flicker;
    }
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, k * 2.2, Math.min(1, dt * 30));
    if (lightRef.current) lightRef.current.intensity = mat.emissiveIntensity / 2.2 * intensity;
  });
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[length + 0.1, 0.06, 0.28]} />
        <meshStandardMaterial color="#9a9a90" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.09, -0.06]} material={mat}>
        <boxGeometry args={[length, 0.04, 0.05]} />
      </mesh>
      <mesh position={[0, -0.09, 0.06]} material={mat}>
        <boxGeometry args={[length, 0.04, 0.05]} />
      </mesh>
      {light && on && <pointLight ref={lightRef} position={[0, -0.4, 0]} color={color} intensity={0} distance={distance} decay={1.6} />}
    </group>
  );
}

/** Warm/red emergency light box with a slow pulse. */
export function EmergencyLight({ position, color = '#ff3a2a', intensity = 3, distance = 8, pulse = true }: { position: V3; color?: string; intensity?: number; distance?: number; pulse?: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  const reduced = useGame((s) => s.settings.reducedFlashing);
  useFrame(() => {
    if (!ref.current) return;
    const p = pulse && !reduced ? 0.65 + 0.35 * Math.sin(runtime.time * 2.4) : 1;
    ref.current.intensity = intensity * p * runtime.flicker;
  });
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.3, 0.12, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
      <pointLight ref={ref} position={[0, -0.3, 0.2]} color={color} intensity={intensity} distance={distance} decay={1.6} />
    </group>
  );
}

/** A flat textured sign/poster/paper on a wall. */
export function Sign({
  position, rotation = [0, 0, 0], size = [1, 0.5], lines, bg = '#d8cfb2', color = '#1b1b1b', font, fontSize, chalk, border, emissive = 0,
}: { position: V3; rotation?: V3; size?: [number, number]; lines: string[]; bg?: string; color?: string; font?: string; fontSize?: number; chalk?: boolean; border?: string; emissive?: number }) {
  const tex = useMemo(() => {
    const aspect = size[0] / size[1];
    const w = 512, h = Math.max(64, Math.round(512 / aspect));
    return textTexture(lines, { w, h, bg, color, font, size: fontSize ?? Math.min(56, (h / (lines.length + 1)) * 0.8), chalk, border });
  }, [lines.join('|'), bg, color, chalk]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} transparent={!bg || bg === 'transparent'} roughness={0.9} emissive={emissive ? '#ffffff' : '#000000'} emissiveMap={emissive ? tex : null} emissiveIntensity={emissive} />
    </mesh>
  );
}

/** Chalk writing on a blackboard. */
export function ChalkText({ position, rotation = [0, 0, 0], size = [3.4, 1.1], lines, color = '#e8eee8', glow = 0 }: { position: V3; rotation?: V3; size?: [number, number]; lines: string[]; color?: string; glow?: number }) {
  return <Sign position={position} rotation={rotation} size={size} lines={lines} bg="transparent" color={color} chalk font="'Special Elite', cursive" emissive={glow} />;
}

/** Wall clock frozen at 7:38 — the minute the fire started. */
export function Clock({ position, rotation = [0, 0, 0] }: { position: V3; rotation?: V3 }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e9e3cf'; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#222'; g.font = "28px 'Special Elite', serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(String(i), 128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95); }
    const hand = (ang: number, len: number, w: number) => { g.lineWidth = w; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(ang) * len, 128 + Math.sin(ang) * len); g.stroke(); };
    hand(((7 + 38 / 60) / 12) * Math.PI * 2 - Math.PI / 2, 55, 8);
    hand((38 / 60) * Math.PI * 2 - Math.PI / 2, 85, 5);
    g.fillStyle = 'rgba(80,60,20,0.25)'; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <mesh position={position} rotation={rotation}>
      <circleGeometry args={[0.22, 32]} />
      <meshStandardMaterial map={tex} roughness={0.6} />
    </mesh>
  );
}

/** Falling rain around the player (outdoor areas only). */
export function Rain({ count = 1400, area = 26, bounds }: { count?: number; area?: number; bounds?: { minX: number; maxX: number; minZ: number; maxZ: number } }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * area, y: Math.random() * 12, z: (Math.random() - 0.5) * area, v: 14 + Math.random() * 6 })), [count, area]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const px = runtime.player.pos.x, pz = runtime.player.pos.z;
    data.forEach((d, i) => {
      d.y -= d.v * dt;
      if (d.y < 0) { d.y = 10 + Math.random() * 3; d.x = (Math.random() - 0.5) * area; d.z = (Math.random() - 0.5) * area; }
      let x = px + d.x, z = pz + d.z;
      if (bounds && (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ)) { x = 9999; z = 9999; }
      dummy.position.set(x, d.y, z);
      dummy.rotation.set(0.08, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.01, 0.5, 0.01]} />
      <meshBasicMaterial color="#8fa6c4" transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  );
}

/** Floating dust motes near the camera. */
export function Dust({ count = 220, color = '#c9d3e6', size = 0.025 }: { count?: number; color?: string; size?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { arr[i * 3] = (Math.random() - 0.5) * 12; arr[i * 3 + 1] = Math.random() * 3; arr[i * 3 + 2] = (Math.random() - 0.5) * 12; }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count]);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(Math.round(runtime.player.pos.x / 12) * 12, 0, Math.round(runtime.player.pos.z / 12) * 12);
    ref.current.rotation.y = runtime.time * 0.01;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color={color} size={size} transparent opacity={0.5} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/** Billboard smoke volume. */
export function Smoke({ center, size, density = 26, color = '#3a3330', opacity = 0.5, rise = 0.15 }: { center: V3; size: V3; density?: number; color?: string; opacity?: number; rise?: number }) {
  const tex = Textures.smoke();
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => Array.from({ length: density }, () => ({
    x: (Math.random() - 0.5) * size[0], y: Math.random() * size[1], z: (Math.random() - 0.5) * size[2], s: 1.5 + Math.random() * 2.5, sp: 0.5 + Math.random(),
  })), [density, size]);
  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const p = puffs[i];
      p.y += rise * p.sp * dt;
      if (p.y > size[1]) p.y = 0;
      c.position.set(p.x + Math.sin(runtime.time * 0.3 + i) * 0.3, p.y, p.z);
      c.quaternion.copy(camera.quaternion);
    });
  });
  return (
    <group ref={group} position={center}>
      {puffs.map((p, i) => (
        <mesh key={i} scale={p.s}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} fog />
        </mesh>
      ))}
    </group>
  );
}

/** Stylised fire: flickering emissive flames with a warm light. */
export function Fire({ position, scale = 1, light = true }: { position: V3; scale?: number; light?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const tex = Textures.glow();
  useFrame(() => {
    const t = runtime.time;
    ref.current?.children.forEach((c, i) => {
      const k = 0.8 + 0.3 * Math.sin(t * (8 + i * 3) + i) * Math.sin(t * 5.3 + i * 2);
      c.scale.set(scale * (0.6 + i * 0.1), scale * k * (1.2 - i * 0.15), 1);
      c.position.y = scale * 0.4 * k;
    });
    if (lightRef.current) lightRef.current.intensity = 8 * scale * (0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 7));
  });
  return (
    <group position={position}>
      <group ref={ref}>
        {[0, 1, 2].map((i) => (
          <sprite key={i}>
            <spriteMaterial map={tex} color={i === 0 ? '#ff5a1a' : i === 1 ? '#ff9a3a' : '#ffd27a'} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
      {light && <pointLight ref={lightRef} position={[0, 0.6, 0]} color="#ff7a30" intensity={8} distance={9 * scale} decay={1.5} />}
    </group>
  );
}

/** Scene-wide atmosphere: fog, ambient lights, lightning. */
export function Atmosphere({
  fog = '#0b1220', density = 0.06, ambient = '#4a5a80', ambientIntensity = 0.35, hemi = ['#30405f', '#120d0a'], hemiIntensity = 0.35, moon = true,
}: { fog?: string; density?: number; ambient?: string; ambientIntensity?: number; hemi?: [string, string]; hemiIntensity?: number; moon?: boolean }) {
  const flashRef = useRef<THREE.DirectionalLight>(null);
  const brightness = useGame((s) => s.settings.brightness);
  useFrame(({ scene }) => {
    if (flashRef.current) flashRef.current.intensity = runtime.lightning * 3.2;
    if (scene.fog instanceof THREE.FogExp2) scene.fog.density = density / Math.max(0.6, brightness);
  });
  return (
    <>
      <color attach="background" args={[fog]} />
      <fogExp2 attach="fog" args={[fog, density]} />
      <ambientLight color={ambient} intensity={ambientIntensity} />
      <hemisphereLight args={[hemi[0], hemi[1], hemiIntensity]} />
      {moon && <directionalLight position={[-20, 30, 10]} color="#7f95c8" intensity={0.25} />}
      <directionalLight ref={flashRef} position={[10, 40, 20]} color="#cfe0ff" intensity={0} />
    </>
  );
}

/** Night sky dome with a faint moon glow. */
export function Sky() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#020308'); grd.addColorStop(0.5, '#0a1222'); grd.addColorStop(1, '#1a2238');
    g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <mesh>
      <sphereGeometry args={[120, 24, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} />
    </mesh>
  );
}
