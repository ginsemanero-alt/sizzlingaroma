import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { runtime } from '@/systems/runtime';
import { InteractionSystem } from '@/systems/InteractionSystem/InteractionSystem';
import { ITEMS } from '@/data/items';
import { useAdmin } from './admin';

interface Marker { id: string; label: string; kind: 'belonging' | 'secret' | 'key' | 'item' | 'door' | 'other'; pos: [number, number, number] }

function classify(id: string, prompt: string | null): Marker | null {
  const m = /^pickup_(.+)$/.exec(id);
  if (m) {
    const def = ITEMS[m[1]];
    if (!def) return null;
    const kind = def.category === 'keepsake' ? 'belonging' : def.secret ? 'secret' : def.key ? 'key' : 'item';
    return { id, label: def.name, kind, pos: [0, 0, 0] };
  }
  if (!prompt) return null;
  if (id.startsWith('door')) return { id, label: prompt, kind: 'door', pos: [0, 0, 0] };
  if (/^battery_/.test(id)) return { id, label: 'Batteries', kind: 'item', pos: [0, 0, 0] };
  return { id, label: prompt, kind: 'other', pos: [0, 0, 0] };
}

const COLORS: Record<Marker['kind'], string> = {
  belonging: '#ffcf5a', secret: '#c79bff', key: '#ff6a5a', item: '#9fd8ff', door: '#8a9a8a', other: '#d8d8d8',
};

const CUT = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.7)];

/**
 * In-scene part of admin mode: X-ray labels for every item/clue/door, the teacher and Jasmine
 * markers, fog off and ceilings cut away while spectating, and optional full-bright lighting.
 */
export function AdminLayer() {
  useAdmin((s) => s.v);
  const a = runtime.admin;
  const { scene, gl } = useThree();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const fog = useRef<THREE.Fog | THREE.FogExp2 | null>(null);
  const teacher = useRef<THREE.Group>(null);
  const jasmine = useRef<THREE.Group>(null);
  const [teacherState, setTeacherState] = useState('');
  const t = useRef(0);

  // refresh the marker list twice a second (pickups disappear, prompts change)
  useFrame((_, dt) => {
    if (!a.active) return;
    t.current += dt;
    if (teacher.current) { teacher.current.position.copy(runtime.teacherPos); teacher.current.visible = a.labels && runtime.teacherPos.x < 900; }
    if (jasmine.current) { jasmine.current.position.copy(runtime.player.pos); jasmine.current.visible = a.fly; }
    if (t.current < 0.5) return;
    t.current = 0;
    if (runtime.teacherState !== teacherState) setTeacherState(runtime.teacherState);
    if (!a.labels) { if (markers.length) setMarkers([]); return; }
    const list = InteractionSystem.debugList().map((e) => { const m = classify(e.id, e.prompt); if (m) m.pos = e.pos; return m; }).filter((m): m is Marker => !!m);
    const sig = list.map((m) => m.id + m.label).join('|');
    if (sig !== markers.map((m) => m.id + m.label).join('|')) setMarkers(list);
  });

  // spectating: no fog, and (overhead map) everything above head height cut away
  const spectating = a.active && a.fly;
  useEffect(() => {
    if (spectating) { fog.current = scene.fog; scene.fog = null; }
    return () => { if (fog.current) { scene.fog = fog.current; fog.current = null; } };
  }, [spectating, scene]);
  const cut = a.active && a.top;
  useEffect(() => {
    gl.clippingPlanes = cut ? CUT : [];
    return () => { gl.clippingPlanes = []; };
  }, [cut, gl]);

  const style = useMemo(() => (c: string): React.CSSProperties => ({
    font: '600 11px "IBM Plex Mono", monospace', color: '#000', background: c, padding: '1px 5px', whiteSpace: 'nowrap',
    borderRadius: 2, opacity: 0.92, pointerEvents: 'none', transform: 'translateY(-50%)',
  }), []);

  if (!a.active) return null;
  return (
    <group>
      {a.fullbright && (<><ambientLight intensity={2.2} color="#ffffff" /><hemisphereLight args={['#ffffff', '#666666', 1.4]} /></>)}
      {a.labels && markers.map((m) => (
        <Html key={m.id} position={[m.pos[0], m.pos[1] + 0.25, m.pos[2]]} center zIndexRange={m.kind === 'door' || m.kind === 'other' ? [10, 0] : [20, 11]}>
          <div style={m.kind === 'door' || m.kind === 'other' ? { ...style(COLORS[m.kind]), fontSize: 9, fontWeight: 400, opacity: 0.5 } : style(COLORS[m.kind])}>{m.kind === 'belonging' ? '★ ' : m.kind === 'secret' ? '◆ ' : ''}{m.label}</div>
        </Html>
      ))}
      <group ref={teacher}>
        <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.35, 0.35, 2, 12, 1, true]} /><meshBasicMaterial color="#ff2020" wireframe depthTest={false} transparent opacity={0.7} /></mesh>
        <Html position={[0, 2.3, 0]} center zIndexRange={[21, 0]}><div style={style('#ff4040')}>MS. REYES · {teacherState}</div></Html>
      </group>
      <group ref={jasmine}>
        <mesh position={[0, 0.85, 0]}><capsuleGeometry args={[0.28, 1.1, 4, 10]} /><meshBasicMaterial color="#40c0ff" wireframe depthTest={false} transparent opacity={0.8} /></mesh>
        <Html position={[0, 2.0, 0]} center zIndexRange={[21, 0]}><div style={style('#40c0ff')}>JASMINE</div></Html>
      </group>
    </group>
  );
}
