import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { rig } from '../Player/playerRig';
import { play } from '../../systems/AudioSystem/audioManager';
import { useSettings } from '../../store/settingsStore';
import { clock } from '../../systems/ChapterSystem/clock';

// ───────────────────────── rain ─────────────────────────

const rainVert = /* glsl */ `
  attribute float aEnd;
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uSize;
  uniform float uHeight;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float half_ = uSize * 0.5;
    p.x = mod(p.x - uCenter.x + half_, uSize) + uCenter.x - half_;
    p.z = mod(p.z - uCenter.z + half_, uSize) + uCenter.z - half_;
    p.y = mod(p.y - uTime * 11.0, uHeight);
    p.y += aEnd * 0.38;
    p.x += aEnd * 0.05;
    vAlpha = mix(0.0, 0.26, aEnd) * smoothstep(0.0, 1.5, p.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const rainFrag = /* glsl */ `
  varying float vAlpha;
  void main() { gl_FragColor = vec4(0.62, 0.68, 0.75, vAlpha); }
`;

/** Shader-driven rain streaks that follow the player. Optionally limited to a region (outside). */
export function Rain({ count = 3500, size = 34, height = 14, bounds }: { count?: number; size?: number; height?: number; bounds?: { minX: number; maxX: number; minZ: number; maxZ: number } }) {
  const quality = useSettings((s) => s.quality);
  const n = quality === 'low' ? Math.floor(count * 0.4) : quality === 'medium' ? Math.floor(count * 0.7) : count;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 6);
    const end = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      let x = (Math.random() - 0.5) * size;
      let z = (Math.random() - 0.5) * size;
      if (bounds) {
        x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      }
      const y = Math.random() * height;
      pos.set([x, y, z, x, y, z], i * 6);
      end[i * 2] = 0;
      end[i * 2 + 1] = 1;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    return g;
  }, [n, size, height, bounds]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: rainVert,
        fragmentShader: rainFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uSize: { value: bounds ? 1e5 : size }, uHeight: { value: height } },
      }),
    [size, height, bounds],
  );
  useFrame((s) => {
    mat.uniforms.uTime.value = s.clock.elapsedTime;
    if (!bounds) mat.uniforms.uCenter.value.copy(rig.pos);
  });
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />;
}

// ───────────────────────── fire ─────────────────────────

const fireVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fireFrag = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5;} return v; }
  void main() {
    vec2 uv = vUv;
    float t = uTime * 1.6 + uSeed;
    float n = fbm(vec2(uv.x * 3.0, uv.y * 2.5 - t));
    float shape = 1.0 - smoothstep(0.0, 0.5, abs(uv.x - 0.5) * (1.4 + uv.y * 1.6));
    float f = shape * (1.0 - uv.y) * 1.6 * n;
    f = smoothstep(0.18, 0.75, f);
    vec3 col = mix(vec3(0.9, 0.18, 0.02), vec3(1.0, 0.75, 0.3), f);
    gl_FragColor = vec4(col * 1.6, f * 0.95);
  }
`;

export function FireSprite({ pos, scale = 1 }: { pos: [number, number, number]; scale?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fireVert,
        fragmentShader: fireFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uSeed: { value: Math.random() * 10 } },
      }),
    [],
  );
  useFrame((s) => (mat.uniforms.uTime.value = s.clock.elapsedTime));
  return (
    <Billboard position={[pos[0], pos[1] + 0.6 * scale, pos[2]]} lockX lockZ>
      <mesh material={mat}>
        <planeGeometry args={[1.1 * scale, 1.5 * scale]} />
      </mesh>
    </Billboard>
  );
}

/** Rising embers/ash in an area. */
export function Embers({ center, spread = 8, count = 220, color = '#ff8a3a', up = 1 }: { center: [number, number, number]; spread?: number; count?: number; color?: string; up?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, speeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const sp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = center[0] + (Math.random() - 0.5) * spread;
      p[i * 3 + 1] = Math.random() * 3;
      p[i * 3 + 2] = center[2] + (Math.random() - 0.5) * spread;
      sp[i] = 0.2 + Math.random() * 0.6;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return { geo: g, speeds: sp };
  }, [center, spread, count]);
  useFrame((s, dt) => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) + speeds[i] * dt * up;
      if (y > 3) y = 0;
      if (y < 0) y = 3;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(s.clock.elapsedTime + i) * dt * 0.1);
    }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={color} size={0.035} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** A thick, slowly drifting smoke layer near the ceiling. */
export function SmokeLayer({ center, size = 30, y = 2.2, color = '#2a1d16', opacity = 0.55 }: { center: [number, number, number]; size?: number; y?: number; color?: string; opacity?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.position.y = y + Math.sin(s.clock.elapsedTime * 0.3) * 0.06;
  });
  return (
    <mesh ref={ref} position={[center[0], y, center[2]]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ───────────────────────── lightning ─────────────────────────

/**
 * Occasional lightning: a soft brightening of the sky light (no hard strobe)
 * followed by delayed thunder.
 */
export function Lightning({ minGap = 14, maxGap = 30, intensity = 2.2, enabled = true }: { minGap?: number; maxGap?: number; intensity?: number; enabled?: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const st = useRef({ next: clock.time + 6, flash: 0 });
  useFrame((_, dt) => {
    if (!light.current) return;
    if (enabled && clock.time > st.current.next) {
      st.current.next = clock.time + minGap + Math.random() * (maxGap - minGap);
      st.current.flash = 1;
      const delay = 600 + Math.random() * 1600;
      setTimeout(() => play('thunder', { vol: 0.55 + Math.random() * 0.3, cat: 'ambience' }), delay);
    }
    st.current.flash = Math.max(0, st.current.flash - dt * 2.2);
    const f = st.current.flash;
    light.current.intensity = intensity * (f > 0.6 ? 1 : f > 0.4 ? 0.3 : f);
  });
  return <directionalLight ref={light} position={[-10, 20, 8]} color="#b8c8ff" intensity={0} />;
}
