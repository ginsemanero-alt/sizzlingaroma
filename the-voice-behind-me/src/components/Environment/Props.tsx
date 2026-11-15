import { useEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { Instances, Instance } from '@react-three/drei';
import { getMaterial, type MatKey } from './materials';
import { world, boxFrom } from '../../systems/PhysicsSystem/world';

/**
 * Procedural furniture. Everything here is built from primitives and is a
 * TEMPORARY ASSET that can be swapped for a modelled GLTF later — each prop
 * keeps its collider footprint so swapping the visuals won't affect gameplay.
 */

type V3 = [number, number, number];

/** Box primitive with a shared material. */
export function B({ p, s, m = 'wood', r, color, shadow = true }: { p: V3; s: V3; m?: MatKey; r?: V3; color?: string; shadow?: boolean }) {
  return (
    <mesh position={p} rotation={r} material={getMaterial(m, color ? { color } : undefined)} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

export function Cyl({ p, rt, rb, h, m = 'metal', seg = 12, r, color }: { p: V3; rt: number; rb: number; h: number; m?: MatKey; seg?: number; r?: V3; color?: string }) {
  return (
    <mesh position={p} rotation={r} material={getMaterial(m, color ? { color } : undefined)} castShadow receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
    </mesh>
  );
}

export function useCollider(pos: V3, size: V3, rot = 0, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const id = world.addCollider(boxFrom([pos[0], pos[1] + size[1] / 2, pos[2]], size, rot));
    return () => world.removeCollider(id);
  }, [pos[0], pos[1], pos[2], size[0], size[1], size[2], rot, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export interface PropProps {
  pos: V3;
  rot?: number;
  children?: ReactNode;
}

function Prop({ pos, rot = 0, collide, children }: PropProps & { collide?: V3 }) {
  useCollider(pos, collide ?? [0, 0, 0], rot, !!collide);
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {children}
    </group>
  );
}

// ───────────────────────── furniture ─────────────────────────

export function Bed({ pos, rot, kid = false, burnt = false }: PropProps & { kid?: boolean; burnt?: boolean }) {
  const w = kid ? 0.95 : 1.4;
  const blanket: MatKey = burnt ? 'burnt' : kid ? 'fabric_blue' : 'fabric';
  return (
    <Prop pos={pos} rot={rot} collide={[w + 0.06, 0.6, 2.05]}>
      <B p={[0, 0.2, 0]} s={[w, 0.25, 2.0]} m="dark_wood" />
      <B p={[0, 0.4, 0.02]} s={[w - 0.06, 0.16, 1.92]} m={burnt ? 'burnt' : 'mattress'} />
      <B p={[0, 0.5, 0.25]} s={[w - 0.02, 0.06, 1.4]} m={blanket} />
      <B p={[0, 0.52, -0.75]} s={[w * 0.6, 0.1, 0.35]} m={burnt ? 'burnt' : 'white'} />
      <B p={[0, 0.55, -1.0]} s={[w + 0.06, 1.0, 0.08]} m="dark_wood" />
      <B p={[0, 0.4, 1.0]} s={[w + 0.06, 0.55, 0.06]} m="dark_wood" />
    </Prop>
  );
}

export function Table({ pos, rot, w = 1.4, d = 0.8, h = 0.78, m = 'dark_wood' as MatKey }: PropProps & { w?: number; d?: number; h?: number; m?: MatKey }) {
  const legs: V3[] = [
    [w / 2 - 0.06, h / 2, d / 2 - 0.06],
    [-w / 2 + 0.06, h / 2, d / 2 - 0.06],
    [w / 2 - 0.06, h / 2, -d / 2 + 0.06],
    [-w / 2 + 0.06, h / 2, -d / 2 + 0.06],
  ];
  return (
    <Prop pos={pos} rot={rot} collide={[w, h, d]}>
      <B p={[0, h - 0.025, 0]} s={[w, 0.05, d]} m={m} />
      {legs.map((l, i) => (
        <B key={i} p={l} s={[0.06, h - 0.05, 0.06]} m={m} />
      ))}
    </Prop>
  );
}

export function Chair({ pos, rot, fallen = false }: PropProps & { fallen?: boolean }) {
  return (
    <Prop pos={pos} rot={rot} collide={[0.45, 0.9, 0.45]}>
      <group rotation={fallen ? [Math.PI / 2, 0, 0.3] : [0, 0, 0]} position={fallen ? [0, 0.22, 0] : [0, 0, 0]}>
        <B p={[0, 0.45, 0]} s={[0.44, 0.04, 0.42]} m="dark_wood" />
        <B p={[0, 0.72, -0.19]} s={[0.44, 0.5, 0.04]} m="dark_wood" />
        {[
          [0.19, 0.22, 0.18],
          [-0.19, 0.22, 0.18],
          [0.19, 0.22, -0.18],
          [-0.19, 0.22, -0.18],
        ].map((l, i) => (
          <B key={i} p={l as V3} s={[0.04, 0.44, 0.04]} m="dark_wood" />
        ))}
      </group>
    </Prop>
  );
}

export function Sofa({ pos, rot, w = 2.0, m = 'fabric' as MatKey }: PropProps & { w?: number; m?: MatKey }) {
  return (
    <Prop pos={pos} rot={rot} collide={[w, 0.85, 0.9]}>
      <B p={[0, 0.22, 0.05]} s={[w, 0.3, 0.8]} m="dark_wood" />
      <B p={[0, 0.45, 0.08]} s={[w - 0.3, 0.16, 0.7]} m={m} />
      <B p={[0, 0.65, -0.32]} s={[w, 0.6, 0.22]} m={m} />
      <B p={[w / 2 - 0.1, 0.52, 0.05]} s={[0.2, 0.36, 0.8]} m={m} />
      <B p={[-w / 2 + 0.1, 0.52, 0.05]} s={[0.2, 0.36, 0.8]} m={m} />
      <B p={[w / 4, 0.62, 0.05]} s={[0.4, 0.12, 0.35]} m="fabric_blue" r={[0.2, 0.3, 0]} />
    </Prop>
  );
}

const BOOK_COLORS = ['#5a2a22', '#2c3a4a', '#4a4a2a', '#6a5a3a', '#2a2a2a', '#3a2a3a', '#7a6a4a'];

export function Bookshelf({ pos, rot, w = 1.0, h = 1.9 }: PropProps & { w?: number; h?: number }) {
  const books = useMemo(() => {
    const out: { p: V3; s: V3; c: string; r: number }[] = [];
    let seed = Math.floor(pos[0] * 13 + pos[2] * 7);
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const shelves = Math.floor(h / 0.42);
    for (let s = 0; s < shelves; s++) {
      let x = -w / 2 + 0.06;
      while (x < w / 2 - 0.12) {
        const bw = 0.03 + rnd() * 0.04;
        const bh = 0.2 + rnd() * 0.12;
        if (rnd() > 0.12) out.push({ p: [x + bw / 2, 0.08 + s * 0.42 + bh / 2, 0.02], s: [bw, bh, 0.22], c: BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)], r: rnd() > 0.9 ? 0.25 : 0 });
        x += bw + 0.004;
      }
    }
    return out;
  }, [w, h, pos[0], pos[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Prop pos={pos} rot={rot} collide={[w, h, 0.36]}>
      <B p={[0, h / 2, -0.16]} s={[w, h, 0.03]} m="dark_wood" />
      <B p={[w / 2 - 0.02, h / 2, 0]} s={[0.04, h, 0.34]} m="dark_wood" />
      <B p={[-w / 2 + 0.02, h / 2, 0]} s={[0.04, h, 0.34]} m="dark_wood" />
      {Array.from({ length: Math.floor(h / 0.42) + 1 }).map((_, i) => (
        <B key={i} p={[0, 0.05 + i * 0.42, 0]} s={[w, 0.03, 0.34]} m="dark_wood" />
      ))}
      <Instances limit={books.length} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.9} />
        {books.map((b, i) => (
          <Instance key={i} position={b.p} scale={b.s} color={b.c} rotation={[0, 0, b.r]} />
        ))}
      </Instances>
    </Prop>
  );
}

export function Dresser({ pos, rot, w = 1.2, h = 0.9, d = 0.5 }: PropProps & { w?: number; h?: number; d?: number }) {
  const rows = 3;
  return (
    <Prop pos={pos} rot={rot} collide={[w, h, d]}>
      <B p={[0, h / 2, 0]} s={[w, h, d]} m="dark_wood" />
      {Array.from({ length: rows }).map((_, i) => (
        <group key={i}>
          <B p={[0, 0.15 + i * (h / rows), d / 2 + 0.005]} s={[w - 0.08, h / rows - 0.05, 0.02]} m="wood" />
          <B p={[0, 0.15 + i * (h / rows), d / 2 + 0.03]} s={[0.12, 0.025, 0.025]} m="metal" />
        </group>
      ))}
    </Prop>
  );
}

export function Wardrobe({ pos, rot }: PropProps) {
  return (
    <Prop pos={pos} rot={rot} collide={[1.0, 2.0, 0.6]}>
      <B p={[0, 1.0, 0]} s={[1.0, 2.0, 0.6]} m="dark_wood" />
      <B p={[-0.25, 1.0, 0.305]} s={[0.47, 1.85, 0.02]} m="wood" />
      <B p={[0.25, 1.0, 0.305]} s={[0.47, 1.85, 0.02]} m="wood" />
      <B p={[-0.04, 1.0, 0.33]} s={[0.02, 0.18, 0.03]} m="metal" />
      <B p={[0.04, 1.0, 0.33]} s={[0.02, 0.18, 0.03]} m="metal" />
    </Prop>
  );
}

export function Desk({ pos, rot }: PropProps) {
  return (
    <Prop pos={pos} rot={rot} collide={[1.2, 0.76, 0.6]}>
      <B p={[0, 0.74, 0]} s={[1.2, 0.04, 0.6]} m="wood" />
      <B p={[0.42, 0.37, 0]} s={[0.36, 0.72, 0.56]} m="wood" />
      <B p={[0.42, 0.55, 0.285]} s={[0.3, 0.18, 0.02]} m="dark_wood" />
      <B p={[0.42, 0.3, 0.285]} s={[0.3, 0.28, 0.02]} m="dark_wood" />
      <B p={[-0.57, 0.37, 0]} s={[0.04, 0.72, 0.56]} m="wood" />
    </Prop>
  );
}

export function Counter({ pos, rot, w = 2.4, sink = false }: PropProps & { w?: number; sink?: boolean }) {
  return (
    <Prop pos={pos} rot={rot} collide={[w, 0.92, 0.62]}>
      <B p={[0, 0.44, 0]} s={[w, 0.88, 0.6]} m="wood" color="#8a7a66" />
      <B p={[0, 0.9, 0]} s={[w + 0.04, 0.04, 0.64]} m="tile" />
      {Array.from({ length: Math.round(w / 0.6) }).map((_, i) => (
        <B key={i} p={[-w / 2 + 0.3 + i * 0.6, 0.45, 0.305]} s={[0.55, 0.75, 0.02]} m="wood" color="#6e604e" />
      ))}
      {sink && (
        <>
          <B p={[0, 0.88, 0]} s={[0.55, 0.06, 0.42]} m="metal" />
          <Cyl p={[0, 1.05, -0.22]} rt={0.015} rb={0.015} h={0.3} />
          <Cyl p={[0, 1.18, -0.14]} rt={0.012} rb={0.012} h={0.18} r={[Math.PI / 2, 0, 0]} />
        </>
      )}
    </Prop>
  );
}

export function Fridge({ pos, rot }: PropProps) {
  return (
    <Prop pos={pos} rot={rot} collide={[0.72, 1.75, 0.7]}>
      <B p={[0, 0.87, 0]} s={[0.72, 1.75, 0.7]} m="white" color="#a6a294" />
      <B p={[0, 1.25, 0.355]} s={[0.68, 0.02, 0.01]} m="black" />
      <B p={[0.28, 1.45, 0.37]} s={[0.03, 0.3, 0.03]} m="metal" />
      <B p={[0.28, 0.9, 0.37]} s={[0.03, 0.3, 0.03]} m="metal" />
    </Prop>
  );
}

export function Stove({ pos, rot }: PropProps) {
  return (
    <Prop pos={pos} rot={rot} collide={[0.7, 0.92, 0.62]}>
      <B p={[0, 0.45, 0]} s={[0.7, 0.9, 0.62]} m="white" color="#8e8a80" />
      <B p={[0, 0.5, 0.315]} s={[0.55, 0.45, 0.01]} m="black" />
      {[
        [-0.17, -0.14],
        [0.17, -0.14],
        [-0.17, 0.14],
        [0.17, 0.14],
      ].map(([x, z], i) => (
        <Cyl key={i} p={[x, 0.91, z]} rt={0.09} rb={0.09} h={0.02} m="black" />
      ))}
    </Prop>
  );
}

export function Toilet({ pos, rot }: PropProps) {
  return (
    <Prop pos={pos} rot={rot} collide={[0.45, 0.8, 0.7]}>
      <Cyl p={[0, 0.2, 0.05]} rt={0.2} rb={0.16} h={0.4} m="white" />
      <Cyl p={[0, 0.42, 0.05]} rt={0.22} rb={0.22} h={0.04} m="white" />
      <B p={[0, 0.6, -0.25]} s={[0.42, 0.4, 0.18]} m="white" />
    </Prop>
  );
}

export function Bathtub({ pos, rot }: PropProps) {
  return (
    <Prop pos={pos} rot={rot} collide={[0.8, 0.58, 1.65]}>
      <B p={[0, 0.27, 0]} s={[0.8, 0.54, 1.65]} m="white" />
      <B p={[0, 0.5, 0]} s={[0.62, 0.1, 1.45]} m="black" color="#2a2c28" />
    </Prop>
  );
}

export function SinkStand({ pos, rot }: PropProps) {
  return (
    <Prop pos={pos} rot={rot} collide={[0.55, 0.85, 0.45]}>
      <Cyl p={[0, 0.4, 0]} rt={0.07} rb={0.1} h={0.8} m="white" />
      <B p={[0, 0.84, 0]} s={[0.55, 0.12, 0.42]} m="white" />
    </Prop>
  );
}

export function CRT({ pos, rot, on = false }: PropProps & { on?: boolean }) {
  return (
    <Prop pos={pos} rot={rot} collide={[0.9, 1.05, 0.5]}>
      <B p={[0, 0.25, 0]} s={[0.9, 0.5, 0.5]} m="dark_wood" />
      <B p={[0, 0.78, -0.02]} s={[0.62, 0.52, 0.48]} m="black" color="#1c1b1a" />
      <mesh position={[0, 0.78, 0.225]}>
        <planeGeometry args={[0.48, 0.38]} />
        <meshStandardMaterial color="#0b0d0d" emissive={on ? '#8aa0a8' : '#000'} emissiveIntensity={on ? 0.6 : 0} roughness={0.15} />
      </mesh>
    </Prop>
  );
}

export function FloorLamp({ pos }: { pos: V3 }) {
  return (
    <Prop pos={pos} collide={[0.3, 1.6, 0.3]}>
      <Cyl p={[0, 0.02, 0]} rt={0.15} rb={0.15} h={0.04} m="black" />
      <Cyl p={[0, 0.8, 0]} rt={0.015} rb={0.015} h={1.6} m="metal" />
      <mesh position={[0, 1.6, 0]}>
        <coneGeometry args={[0.22, 0.28, 14, 1, true]} />
        <meshStandardMaterial color="#6a5a44" side={THREE.DoubleSide} />
      </mesh>
    </Prop>
  );
}

export function Rug({ pos, w = 2.2, d = 1.5, color = '#4a2e26' }: { pos: V3; w?: number; d?: number; color?: string }) {
  return (
    <mesh position={[pos[0], pos[1] + 0.006, pos[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

export function Frame({ pos, rot, w = 0.4, h = 0.5, tint = '#7a6a56', fallen = false }: PropProps & { w?: number; h?: number; tint?: string; fallen?: boolean }) {
  return (
    <group position={pos} rotation={fallen ? [-Math.PI / 2 + 0.05, rot ?? 0, 0] : [0, rot ?? 0, 0]}>
      <B p={[0, 0, 0]} s={[w, h, 0.03]} m="dark_wood" shadow={false} />
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[w - 0.08, h - 0.08]} />
        <meshStandardMaterial color={tint} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function Crates({ pos, rot, n = 3 }: PropProps & { n?: number }) {
  const layout: V3[] = [
    [0, 0.25, 0],
    [0.55, 0.25, 0.05],
    [0.25, 0.75, 0.02],
    [-0.5, 0.2, 0.1],
  ];
  return (
    <Prop pos={pos} rot={rot} collide={[1.6, n > 2 ? 1.0 : 0.5, 0.6]}>
      {layout.slice(0, n).map((p, i) => (
        <B key={i} p={p} s={i === 3 ? [0.45, 0.4, 0.45] : [0.52, 0.5, 0.52]} m={i % 2 ? 'paper' : 'wood'} color={i % 2 ? '#8a7a5a' : undefined} r={[0, i * 0.2, 0]} />
      ))}
    </Prop>
  );
}

export function ShelfUnit({ pos, rot, w = 1.6 }: PropProps & { w?: number }) {
  return (
    <Prop pos={pos} rot={rot} collide={[w, 1.9, 0.5]}>
      {[0.05, 0.6, 1.15, 1.7].map((y, i) => (
        <B key={i} p={[0, y, 0]} s={[w, 0.03, 0.48]} m="metal" />
      ))}
      {[
        [-w / 2, -0.22],
        [w / 2, -0.22],
        [-w / 2, 0.22],
        [w / 2, 0.22],
      ].map(([x, z], i) => (
        <B key={i} p={[x, 0.95, z]} s={[0.04, 1.9, 0.04]} m="metal" />
      ))}
      <B p={[-w / 4, 0.8, 0]} s={[0.4, 0.35, 0.35]} m="paper" color="#7a6a4a" />
      <B p={[w / 4, 0.25, 0]} s={[0.5, 0.35, 0.4]} m="paper" color="#6a5a3a" />
      <B p={[w / 5, 1.35, 0]} s={[0.35, 0.3, 0.3]} m="paper" color="#8a7a5a" />
    </Prop>
  );
}

export function Tree({ pos, s = 1 }: { pos: V3; s?: number }) {
  return (
    <Prop pos={pos} collide={[0.4 * s, 3, 0.4 * s]}>
      <Cyl p={[0, 1.6 * s, 0]} rt={0.12 * s} rb={0.2 * s} h={3.2 * s} m="dark_wood" seg={7} />
      <mesh position={[0, 3.6 * s, 0]} castShadow>
        <icosahedronGeometry args={[1.5 * s, 0]} />
        <meshStandardMaterial color="#141a12" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.6 * s, 3.0 * s, 0.3 * s]} castShadow>
        <icosahedronGeometry args={[1.0 * s, 0]} />
        <meshStandardMaterial color="#10150e" roughness={1} flatShading />
      </mesh>
    </Prop>
  );
}

export function Fence({ from, to, h = 1.1 }: { from: [number, number]; to: [number, number]; h?: number }) {
  const posts = useMemo(() => {
    const out: V3[] = [];
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const n = Math.max(1, Math.round(len / 0.5));
    for (let i = 0; i <= n; i++) out.push([from[0] + ((to[0] - from[0]) * i) / n, h / 2, from[1] + ((to[1] - from[1]) * i) / n]);
    return out;
  }, [from, to, h]);
  const mx = (from[0] + to[0]) / 2;
  const mz = (from[1] + to[1]) / 2;
  const alongX = Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1]);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  useCollider([mx, 0, mz], alongX ? [len, h, 0.15] : [0.15, h, len]);
  return (
    <group>
      <Instances limit={posts.length} castShadow>
        <boxGeometry args={[0.07, 1, 0.07]} />
        <meshStandardMaterial color="#2a241e" roughness={1} />
        {posts.map((p, i) => (
          <Instance key={i} position={p} scale={[1, h, 1]} />
        ))}
      </Instances>
      <B p={[mx, h * 0.8, mz]} s={alongX ? [len, 0.06, 0.04] : [0.04, 0.06, len]} m="dark_wood" />
      <B p={[mx, h * 0.35, mz]} s={alongX ? [len, 0.06, 0.04] : [0.04, 0.06, len]} m="dark_wood" />
    </group>
  );
}

export function Stairs({
  from,
  dir,
  width = 1.1,
  rise = 2.9,
  run = 4.2,
  steps = 14,
  mat = 'dark_wood' as MatKey,
}: {
  from: V3;
  dir: 'n' | 's' | 'e' | 'w';
  width?: number;
  rise?: number;
  run?: number;
  steps?: number;
  mat?: MatKey;
}) {
  const geo = useMemo(() => {
    const blocks: { p: V3; s: V3 }[] = [];
    const stepRun = run / steps;
    const stepRise = rise / steps;
    for (let i = 0; i < steps; i++) {
      const along = (i + 0.5) * stepRun;
      const y = from[1] + (i + 1) * stepRise;
      const sgn = dir === 'n' || dir === 'w' ? -1 : 1;
      const p: V3 = dir === 'n' || dir === 's' ? [from[0], y / 2 + from[1] / 2, from[2] + sgn * along] : [from[0] + sgn * along, y / 2 + from[1] / 2, from[2]];
      const s: V3 = dir === 'n' || dir === 's' ? [width, y - from[1], stepRun] : [stepRun, y - from[1], width];
      blocks.push({ p, s });
    }
    return blocks;
  }, [from, dir, width, rise, run, steps]);

  useEffect(() => {
    const sgn = dir === 'n' || dir === 'w' ? -1 : 1;
    const ns = dir === 'n' || dir === 's';
    const a = ns ? from[2] : from[0];
    const b = a + sgn * run;
    const f = ns
      ? { minX: from[0] - width / 2, maxX: from[0] + width / 2, minZ: Math.min(a, b), maxZ: Math.max(a, b), axis: 'z' as const }
      : { minZ: from[2] - width / 2, maxZ: from[2] + width / 2, minX: Math.min(a, b), maxX: Math.max(a, b), axis: 'x' as const };
    const y0 = sgn > 0 ? from[1] : from[1] + rise;
    const y1 = sgn > 0 ? from[1] + rise : from[1];
    const id = world.addFloor({ ...f, y: y0, y1 });
    return () => world.removeFloor(id);
  }, [from, dir, width, rise, run]);

  return (
    <group>
      {geo.map((b, i) => (
        <mesh key={i} position={b.p} material={getMaterial(mat)} castShadow receiveShadow>
          <boxGeometry args={b.s} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────── story objects ─────────────────────────

export function FuseBox({ pos, rot, on = false }: PropProps & { on?: boolean }) {
  return (
    <group position={pos} rotation={[0, rot ?? 0, 0]}>
      <B p={[0, 0, 0]} s={[0.4, 0.55, 0.12]} m="metal" />
      <B p={[0, 0, 0.065]} s={[0.34, 0.48, 0.01]} m="metal" color="#6a6e6e" />
      <B p={[0.08, on ? 0.08 : -0.06, 0.09]} s={[0.05, 0.12, 0.04]} m="red" />
      <mesh position={[-0.1, 0.18, 0.075]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color="#300" emissive={on ? '#40ff40' : '#ff2010'} emissiveIntensity={on ? 1.5 : 0.8} />
      </mesh>
    </group>
  );
}

export function AnsweringMachine({ pos, rot, blinking }: PropProps & { blinking: boolean }) {
  return (
    <group position={pos} rotation={[0, rot ?? 0, 0]}>
      <B p={[0, 0.03, 0]} s={[0.26, 0.06, 0.18]} m="black" color="#1a1918" />
      <B p={[-0.06, 0.07, 0]} s={[0.1, 0.03, 0.16]} m="black" color="#262422" />
      <BlinkLed pos={[0.08, 0.065, 0.06]} active={blinking} />
    </group>
  );
}

function BlinkLed({ pos, active }: { pos: V3; active: boolean }) {
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.012, 6, 6]} />
      <meshStandardMaterial color="#300" emissive="#ff3020" emissiveIntensity={active ? 2.2 : 0.05}>
      </meshStandardMaterial>
    </mesh>
  );
}

export function Calendar({ pos, rot }: PropProps) {
  return (
    <group position={pos} rotation={[0, rot ?? 0, 0]}>
      <B p={[0, 0, 0]} s={[0.32, 0.45, 0.01]} m="paper" shadow={false} />
      <B p={[0, 0.12, 0.006]} s={[0.28, 0.14, 0.002]} m="red" color="#6a3a30" shadow={false} />
      <mesh position={[0.05, -0.05, 0.008]}>
        <ringGeometry args={[0.022, 0.03, 16]} />
        <meshBasicMaterial color="#8a1a12" />
      </mesh>
    </group>
  );
}

export function PaperNote({ pos, rot, color = '#cbbf9f', w = 0.21, h = 0.28, flat = false }: PropProps & { color?: string; w?: number; h?: number; flat?: boolean }) {
  return (
    <mesh position={pos} rotation={flat ? [-Math.PI / 2, 0, rot ?? 0] : [0, rot ?? 0, 0]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={1} />
    </mesh>
  );
}

export function Cassette({ pos, rot = 0, color = '#8d4a3c' }: PropProps & { color?: string }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <B p={[0, 0.008, 0]} s={[0.1, 0.016, 0.064]} m="black" color="#1a1a1a" shadow={false} />
      <B p={[0, 0.017, 0]} s={[0.08, 0.002, 0.03]} m="paper" color={color} shadow={false} />
    </group>
  );
}

export function Recorder({ pos, rot = 0 }: PropProps) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <B p={[0, 0.04, 0]} s={[0.24, 0.08, 0.14]} m="red" color="#8c2a22" />
      <B p={[-0.04, 0.081, 0]} s={[0.12, 0.004, 0.1]} m="black" />
      {[0.05, 0.07, 0.09].map((x, i) => (
        <B key={i} p={[x, 0.085, 0.04]} s={[0.014, 0.01, 0.02]} m="metal" />
      ))}
    </group>
  );
}

export function MusicBox({ pos, rot = 0, open = false }: PropProps & { open?: boolean }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <B p={[0, 0.05, 0]} s={[0.18, 0.1, 0.13]} m="wood" color="#8a5a3a" />
      <group position={[0, 0.1, -0.065]} rotation={[open ? -1.6 : 0, 0, 0]}>
        <B p={[0, 0.01, 0.065]} s={[0.18, 0.02, 0.13]} m="wood" color="#7a4a2e" />
      </group>
      {open && (
        <mesh position={[0, 0.13, 0]}>
          <coneGeometry args={[0.015, 0.06, 6]} />
          <meshStandardMaterial color="#d8c8b0" />
        </mesh>
      )}
    </group>
  );
}

export function ToyBear({ pos, rot = 0 }: PropProps) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#6a4a32" roughness={1} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <sphereGeometry args={[0.065, 10, 8]} />
        <meshStandardMaterial color="#6a4a32" roughness={1} />
      </mesh>
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} position={[x, 0.3, 0]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#5a3a24" />
        </mesh>
      ))}
      {[-0.022, 0.022].map((x) => (
        <mesh key={x} position={[x, 0.25, 0.058]}>
          <sphereGeometry args={[0.009, 6, 6]} />
          <meshStandardMaterial color="#000" roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function ToyCar({ pos, rot = 0, color = '#7a2a22' }: PropProps & { color?: string }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <B p={[0, 0.04, 0]} s={[0.2, 0.05, 0.1]} m="red" color={color} />
      <B p={[-0.02, 0.08, 0]} s={[0.1, 0.04, 0.09]} m="red" color={color} />
      {[
        [0.06, 0.05],
        [-0.06, 0.05],
        [0.06, -0.05],
        [-0.06, -0.05],
      ].map(([x, z], i) => (
        <Cyl key={i} p={[x, 0.02, z]} rt={0.02} rb={0.02} h={0.02} m="black" r={[Math.PI / 2, 0, 0]} seg={8} />
      ))}
    </group>
  );
}

export function Corkboard({ pos, rot = 0, pinned = 0 }: PropProps & { pinned?: number }) {
  const tints = ['#6f8a96', '#7c8559', '#8d7a6a', '#a0574a'];
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <B p={[0, 0, 0]} s={[0.9, 0.6, 0.03]} m="wood" color="#9a7a50" shadow={false} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.32 + i * 0.21, 0.02, 0.018]}>
          <planeGeometry args={[0.15, 0.2]} />
          <meshStandardMaterial color={i < pinned ? tints[i] : '#7a6040'} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function Speaker({ pos, rot = 0 }: PropProps) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <B p={[0, 0.25, 0]} s={[0.3, 0.5, 0.25]} m="dark_wood" />
      <mesh position={[0, 0.3, 0.126]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0.12, 0.126]}>
        <circleGeometry args={[0.045, 12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

export function Candle({ pos, lit = true }: { pos: V3; lit?: boolean }) {
  return (
    <group position={pos}>
      <Cyl p={[0, 0.06, 0]} rt={0.02} rb={0.022} h={0.12} m="white" color="#d8d0b8" seg={8} />
      {lit && (
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#ffcf70" />
        </mesh>
      )}
    </group>
  );
}

export function Battery({ pos }: { pos: V3 }) {
  return (
    <group position={pos} rotation={[0, 0, Math.PI / 2]}>
      <Cyl p={[0, 0, 0]} rt={0.016} rb={0.016} h={0.06} m="metal" color="#c8a030" seg={10} />
      <Cyl p={[0, 0.033, 0]} rt={0.006} rb={0.006} h={0.006} m="metal" seg={6} />
    </group>
  );
}

export function KeyProp({ pos }: { pos: V3 }) {
  return (
    <group position={pos}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.006, 6, 12]} />
        <meshStandardMaterial color="#b0a060" metalness={0.8} roughness={0.3} />
      </mesh>
      <B p={[0.05, 0, 0]} s={[0.07, 0.008, 0.012]} m="metal" color="#b0a060" shadow={false} />
      <B p={[0.0, -0.05, 0]} s={[0.04, 0.05, 0.002]} m="paper" shadow={false} />
    </group>
  );
}
