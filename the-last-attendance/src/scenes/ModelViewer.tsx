import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { CHARACTER_MODELS, ModelCharacter, type ModelId } from '@/components/Characters/ModelCharacter';
import { ENV_MODELS, EnvModel, type EnvModelId } from '@/components/Environment/EnvModel';
import type { AABB } from '@/systems/CollisionSystem/CollisionSystem';

/**
 * Developer model viewer: #/viewer?m=<id>[&top=1]. Environment models are shown exactly as the game
 * places them (metres, centred, floor at 0); top=1 adds an orthographic plan with generated colliders.
 */
function FitCamera({ inside, size }: { inside: string | null; size: [number, number, number] | null }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  useEffect(() => {
    if (size && !inside) {
      const r = Math.max(...size);
      camera.position.set(r * 0.9, size[1] * 0.6 + r * 0.5, r * 1.1);
      camera.near = r / 500; camera.far = r * 50; camera.updateProjectionMatrix();
      controls?.target.set(0, size[1] * 0.4, 0); controls?.update();
      return;
    }
    if (inside) {
      const d = ({ '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] } as Record<string, number[]>)[inside] ?? [0, -1];
      camera.fov = 75; camera.updateProjectionMatrix();
      camera.position.set(-d[0] * 1.5, 1.5, -d[1] * 1.5);
      controls?.target.set(d[0] * 10, 1.2, d[1] * 10);
    }
    else { camera.position.set(10, 9, 10); controls?.target.set(0, 0.8, 0); }
    controls?.update();
  }, [camera, controls, inside, size]);
  return null;
}

function Colliders({ boxes }: { boxes: AABB[] }) {
  return (
    <group>
      {boxes.map((b, i) => (
        <mesh key={i} position={[(b.minX + b.maxX) / 2, 3.5, (b.minZ + b.maxZ) / 2]}>
          <boxGeometry args={[b.maxX - b.minX, 0.05, b.maxZ - b.minZ]} />
          <meshBasicMaterial color={b.opaque ? '#ff3030' : '#ffb030'} transparent opacity={0.55} depthTest={false} />
        </mesh>
      ))}
    </group>
  );
}

export function ModelViewer() {
  const ids = [...Object.keys(ENV_MODELS), ...Object.keys(CHARACTER_MODELS)];
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [sel, setSel] = useState(q.get('m') ?? ids[0]);
  const top = q.get('top') === '1' || q.get('top') === '2';
  const plain = q.get('top') === '2';
  const zoom = Number(q.get('zoom') ?? 34);
  const inside = q.get('inside');
  const isEnv = sel in ENV_MODELS;
  const [boxes, setBoxes] = useState<AABB[]>([]);
  const [size, setSize] = useState<[number, number, number] | null>(null);
  const onBounds = useMemo(() => (sz: [number, number, number]) => { setSize(sz); (window as unknown as { __viewerBounds: unknown }).__viewerBounds = sz.map((v) => +v.toFixed(2)); }, []);
  const onCols = useMemo(() => (c: AABB[]) => { setBoxes(c); (window as unknown as { __viewerInfo: unknown }).__viewerInfo = { colliders: c.length }; }, []);
  return (
    <div className="screen" style={{ background: '#222' }}>
      <Canvas camera={{ position: [3, 2, 3], fov: 55 }}>
        <color attach="background" args={['#2a2d33']} />
        <ambientLight intensity={1.3} />
        <directionalLight position={[5, 10, 7]} intensity={2.2} />
        {top && <OrthographicCamera makeDefault position={[0, 30, 0]} zoom={zoom} up={[0, 0, -1]} onUpdate={(c) => c.lookAt(0, 0, 0)} />}
        <Suspense fallback={null}>
          {isEnv ? <EnvModel key={sel} model={sel as EnvModelId} position={[0, 0, 0]} rotationY={Number(q.get('rot') ?? 0)} collide={top} onColliders={onCols} onBounds={onBounds} hide={q.get('hide') ? new RegExp(q.get('hide')!, 'i') : top ? /ceil|ceiling|lambert1|material_1|wall004/i : undefined} /> : <ModelCharacter key={sel} model={sel as ModelId} />}
        </Suspense>
        {top && !plain && <Colliders boxes={boxes} />}
        <gridHelper args={[30, 30, '#88ff88', '#555']} position={[0, 0.02, 0]} />
        <axesHelper args={[2]} />
        {!top && <OrbitControls makeDefault />}
        {!top && <FitCamera inside={inside} size={isEnv ? size : null} />}
      </Canvas>
      <div style={{ position: 'fixed', left: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ids.map((id) => (
          <button key={id} className={`btn small ${id === sel ? 'selected' : ''}`} onClick={() => setSel(id)}>{id}</button>
        ))}
      </div>
    </div>
  );
}
