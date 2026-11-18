import { useMemo } from 'react';
import * as THREE from 'three';
import type { ItemModel as ItemModelKind } from '@/types';
import { textTexture } from '@/components/Environment/textures';
import { GLB_ITEMS, GlbItem } from './GlbItem';

/**
 * Model for a collectible, used both in-world and in the inspect view: a GLB where one exists
 * (GLB_ITEMS), otherwise a procedural low-poly stand-in (also shown while the GLB loads).
 */
export function ItemModel({ kind, label, color, centered }: { kind: ItemModelKind; label?: string; color?: string; centered?: boolean }) {
  const proc = <ProceduralItem kind={kind} label={label} color={color} />;
  return GLB_ITEMS[kind] ? <GlbItem kind={kind} fallback={proc} centered={centered} /> : proc;
}

export const isGlbItem = (kind: ItemModelKind): boolean => !!GLB_ITEMS[kind];
export const glbItemSize = (kind: ItemModelKind): number => GLB_ITEMS[kind]?.size ?? 0.2;

function ProceduralItem({ kind, label, color }: { kind: ItemModelKind; label?: string; color?: string }) {
  const labelTex = useMemo(() => (label ? textTexture([label], { w: 256, h: 128, bg: '#e6dcc0', size: 30, color: '#2a2a2a' }) : null), [label]);
  switch (kind) {
    case 'paper':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0.2]} position={[0, 0.005, 0]} castShadow>
          <planeGeometry args={[0.21, 0.29]} />
          <meshStandardMaterial color="#ddd5bd" side={THREE.DoubleSide} map={labelTex ?? undefined} roughness={0.9} />
        </mesh>
      );
    case 'folder':
      return (
        <group rotation={[0, 0.3, 0]}>
          <mesh position={[0, 0.012, 0]} castShadow>
            <boxGeometry args={[0.24, 0.025, 0.32]} />
            <meshStandardMaterial color={color ?? '#b89a5e'} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 0.08]} />
            <meshStandardMaterial map={labelTex ?? undefined} color="#fff" />
          </mesh>
        </group>
      );
    case 'book':
      return (
        <group rotation={[0, 0.4, 0]}>
          <mesh position={[0, 0.025, 0]} castShadow>
            <boxGeometry args={[0.17, 0.05, 0.24]} />
            <meshStandardMaterial color={color ?? '#3d2b4a'} roughness={0.7} />
          </mesh>
          <mesh position={[0.005, 0.025, 0]}>
            <boxGeometry args={[0.165, 0.042, 0.23]} />
            <meshStandardMaterial color="#e3dac2" />
          </mesh>
        </group>
      );
    case 'card':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[0, 0.004, 0]} castShadow>
          <boxGeometry args={[0.086, 0.054, 0.004]} />
          <meshStandardMaterial color="#e8eef5" map={labelTex ?? undefined} roughness={0.3} />
        </mesh>
      );
    case 'photo':
      return (
        <mesh rotation={[-Math.PI / 2, 0, -0.3]} position={[0, 0.004, 0]} castShadow>
          <boxGeometry args={[0.2, 0.14, 0.003]} />
          <meshStandardMaterial color="#cfc6b0" map={labelTex ?? undefined} roughness={0.4} />
        </mesh>
      );
    case 'cassette':
      return (
        <group rotation={[0, 0.6, 0]}>
          <mesh position={[0, 0.008, 0]} castShadow>
            <boxGeometry args={[0.1, 0.016, 0.064]} />
            <meshStandardMaterial color="#1d1d1f" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.08, 0.035]} />
            <meshStandardMaterial color="#e9e0c8" map={labelTex ?? undefined} />
          </mesh>
        </group>
      );
    case 'key':
      return (
        <group rotation={[Math.PI / 2, 0, 0.4]} position={[0, 0.01, 0]}>
          <mesh castShadow>
            <torusGeometry args={[0.018, 0.006, 8, 16]} />
            <meshStandardMaterial color="#b8923a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.045, 0]}>
            <boxGeometry args={[0.008, 0.06, 0.004]} />
            <meshStandardMaterial color="#b8923a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.03, 0.03, 0]}>
            <boxGeometry args={[0.04, 0.025, 0.002]} />
            <meshStandardMaterial color="#a8251e" />
          </mesh>
        </group>
      );
    case 'clip':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.008, 5]} />
          <meshStandardMaterial color="#4f6dff" emissive="#22336a" emissiveIntensity={0.4} roughness={0.3} />
        </mesh>
      );
    case 'cloth':
      return (
        <mesh position={[0, 0.02, 0]} rotation={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.26, 0.04, 0.2]} />
          <meshStandardMaterial color={color ?? '#d8b23a'} roughness={1} />
        </mesh>
      );
    case 'glasses':
      return (
        <group position={[0, 0.02, 0]} rotation={[0, 0.3, 0]}>
          {[-0.035, 0.035].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.025, 0.004, 6, 16]} />
              <meshStandardMaterial color="#6b4a2a" />
            </mesh>
          ))}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.02, 0.004, 0.004]} />
            <meshStandardMaterial color="#6b4a2a" />
          </mesh>
        </group>
      );
    case 'pick':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} castShadow>
          <circleGeometry args={[0.02, 3]} />
          <meshStandardMaterial color="#2a8a4a" side={THREE.DoubleSide} />
        </mesh>
      );
    case 'flashlight':
      return (
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.03, 0.22, 12]} />
          <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
        </mesh>
      );
    case 'phone':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <boxGeometry args={[0.07, 0.14, 0.008]} />
          <meshStandardMaterial color="#111" emissive="#3a5a8a" emissiveIntensity={0.3} />
        </mesh>
      );
    case 'cord':
      return (
        <group position={[0, 0.02, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.04, 0.07]} />
            <meshStandardMaterial color="#1c1a18" roughness={1} />
          </mesh>
          <mesh position={[0.25, -0.01, 0.05]} rotation={[0, 0.6, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      );
    case 'chain':
      return (
        <group>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[0, i * 0.06 - 0.18, 0]} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]}>
              <torusGeometry args={[0.03, 0.008, 6, 12]} />
              <meshStandardMaterial color="#6a6560" metalness={0.8} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, -0.26, 0]}>
            <boxGeometry args={[0.07, 0.08, 0.03]} />
            <meshStandardMaterial color="#b8923a" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      );
    case 'mirror':
      return (
        <mesh>
          <planeGeometry args={[0.5, 0.7]} />
          <meshStandardMaterial color="#9aa7b4" metalness={1} roughness={0.15} />
        </mesh>
      );
    default:
      return (
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      );
  }
}
