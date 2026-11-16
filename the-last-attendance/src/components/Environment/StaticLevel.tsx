import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getMaterial, type MatKey } from './materials';
import type { LevelBuilder } from './LevelBuilder';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { useGame } from '@/store/gameStore';

const unitBox = new THREE.BoxGeometry(1, 1, 1);

/**
 * Renders every box of a LevelBuilder with one InstancedMesh per material and registers its colliders.
 */
export function StaticLevel({ builder }: { builder: LevelBuilder }) {
  const graphics = useGame((s) => s.settings.graphics);

  const meshes = useMemo(() => {
    const groups = new Map<MatKey, typeof builder.boxes>();
    for (const b of builder.boxes) {
      if (!groups.has(b.m)) groups.set(b.m, []);
      groups.get(b.m)!.push(b);
    }
    const out: THREE.InstancedMesh[] = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const col = new THREE.Color();
    for (const [key, list] of groups) {
      const mesh = new THREE.InstancedMesh(unitBox, getMaterial(key), list.length);
      const anyColor = list.some((b) => b.color);
      list.forEach((b, i) => {
        e.set(0, b.rotY ?? 0, 0);
        q.setFromEuler(e);
        m4.compose(v.set(...b.p), q, s.set(...b.s));
        mesh.setMatrixAt(i, m4);
        if (anyColor) mesh.setColorAt(i, col.set(b.color ?? '#ffffff'));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.receiveShadow = key !== 'glass';
      mesh.castShadow = !['glass', 'tile', 'floorWood', 'concrete', 'grass', 'ceiling', 'emissive'].includes(key);
      mesh.name = `static_${key}`;
      out.push(mesh);
    }
    return out;
  }, [builder]);

  useEffect(() => {
    const ids = builder.colliders.map((c) => CollisionSystem.add(c));
    return () => ids.forEach((id) => CollisionSystem.remove(id));
  }, [builder]);

  useEffect(() => () => meshes.forEach((m) => m.dispose()), [meshes]);

  const shadows = graphics !== 'low';
  return (
    <group>
      {meshes.map((m) => {
        m.castShadow = m.castShadow && shadows;
        return <primitive key={m.uuid} object={m} />;
      })}
    </group>
  );
}
