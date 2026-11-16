import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DRACO_PATH } from '@/components/Characters/ModelCharacter';
import { CollisionSystem, type AABB } from '@/systems/CollisionSystem/CollisionSystem';
import { buildMeshColliders } from '@/systems/CollisionSystem/meshColliders';

/**
 * Environment GLBs (Sketchfab, see README credits). `env_abandoned_classroom` is under the
 * Sketchfab Standard licence: use inside the game is fine, do not redistribute the file on its own.
 *
 * Each entry's `scale` converts the file's units to metres. After loading, a model is re-centred so
 * that its footprint centre is at the origin and its floor at y = 0 (before `rotationY`).
 */
export const ENV_MODELS = {
  env_abandoned_classroom: { url: 'models/env_abandoned_classroom.glb', scale: 0.0254, ignore: /^$/ },
  env_classroom: { url: 'models/env_classroom.glb', scale: 0.01, ignore: /godray|Rideau|neon|clock|board/i },
  env_old_classroom: { url: 'models/env_old_classroom.glb', scale: 1, ignore: /glass/i },
  env_hallway: { url: 'models/env_hallway.glb', scale: 1, ignore: /^$/ },
  env_cafeteria: { url: 'models/env_cafeteria.glb', scale: 1, ignore: /^$/ },
  env_construction_school: { url: 'models/env_construction_school.glb', scale: 1, ignore: /^$/ },
  env_school_exterior: { url: 'models/env_school_exterior.glb', scale: 1, ignore: /^$/ },
  env_library: { url: 'models/env_library.glb', scale: 1, ignore: /^$/ },
  env_lab: { url: 'models/env_lab.glb', scale: 1, ignore: /^$/ },
  env_chem_lab: { url: 'models/env_chem_lab.glb', scale: 1, ignore: /^$/ },
  env_office: { url: 'models/env_office.glb', scale: 1, ignore: /^$/ },
  env_old_office: { url: 'models/env_old_office.glb', scale: 1, ignore: /^$/ },
  env_detective_office: { url: 'models/env_detective_office.glb', scale: 1, ignore: /^$/ },
  env_staircase: { url: 'models/env_staircase.glb', scale: 1, ignore: /^$/ },
  prop_exit_door: { url: 'models/prop_exit_door.glb', scale: 1, ignore: /^$/ },
  prop_filing_cabinets: { url: 'models/prop_filing_cabinets.glb', scale: 1, ignore: /^$/ },
  prop_fire: { url: 'models/prop_fire.glb', scale: 1, ignore: /^$/ },
  prop_flag: { url: 'models/prop_flag.glb', scale: 1, ignore: /^$/ },
  prop_padlock: { url: 'models/prop_padlock.glb', scale: 1, ignore: /^$/ },
  prop_locker: { url: 'models/prop_locker.glb', scale: 1, ignore: /^$/ },
  prop_lab_table: { url: 'models/prop_lab_table.glb', scale: 1, ignore: /^$/ },
  prop_fuse_box: { url: 'models/prop_fuse_box.glb', scale: 1, ignore: /^$/ },
  prop_cassette_deck: { url: 'models/prop_cassette_deck.glb', scale: 1, ignore: /^$/ },
  prop_chemistry_set: { url: 'models/prop_chemistry_set.glb', scale: 1, ignore: /^$/ },
} as const;
export type EnvModelId = keyof typeof ENV_MODELS;

export function preloadEnvModels(ids: EnvModelId[]): void {
  ids.forEach((id) => useGLTF.preload(ENV_MODELS[id].url, DRACO_PATH));
}

export interface EnvModelProps {
  model: EnvModelId;
  /** World position of the model's footprint centre (floor level). */
  position: [number, number, number];
  rotationY?: number;
  /** Extra uniform scale on top of the unit conversion. */
  scale?: number;
  /** Multiply every material colour (lighting grade: night, fire, ruin…). */
  tint?: string;
  /** Emissive boost for dark textures (keeps the room readable under the flashlight). */
  lift?: number;
  /** Meshes to remove (name or material name). */
  hide?: RegExp;
  /** Register walkability colliders generated from the geometry. */
  collide?: boolean;
  /** Axis-aligned regions (world XZ) where generated colliders are dropped, e.g. doorways. */
  clear?: [number, number, number, number][];
  shadows?: boolean;
  /** World-space box [x0, y0, z0, x1, y1, z1] cut out of the model (a doorway through its wall). */
  hole?: [number, number, number, number, number, number];
  onColliders?: (c: AABB[]) => void;
  /** Reports the placed size in metres (after unit scale). */
  onBounds?: (size: [number, number, number]) => void;
}

/** Clipping planes whose intersection is the inside of a box (used with clipIntersection = true). */
function boxClipPlanes([x0, y0, z0, x1, y1, z1]: [number, number, number, number, number, number]): THREE.Plane[] {
  return [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), x0), new THREE.Plane(new THREE.Vector3(1, 0, 0), -x1),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), y0), new THREE.Plane(new THREE.Vector3(0, 1, 0), -y1),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), z0), new THREE.Plane(new THREE.Vector3(0, 0, 1), -z1),
  ];
}

/** A static environment model placed in the world, optionally walkable via mesh-generated colliders. */
export function EnvModel({ model, position, rotationY = 0, scale = 1, tint, lift = 0, hide, collide = false, clear, shadows = true, hole, onColliders, onBounds }: EnvModelProps) {
  const def = ENV_MODELS[model];
  const gltf = useGLTF(def.url, DRACO_PATH);

  const { root, mats, size } = useMemo(() => {
    const obj = gltf.scene.clone(true);
    const toRemove: THREE.Object3D[] = [];
    const list: THREE.Material[] = [];
    const planes = hole ? boxClipPlanes(hole) : null;
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mname = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name ?? '';
      if (hide && (hide.test(mesh.name) || hide.test(mname))) { toRemove.push(mesh); return; }
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      const cloneMat = (m: THREE.Material) => {
        const c2 = m.clone() as THREE.MeshStandardMaterial;
        if (tint && c2.color) c2.color.multiply(new THREE.Color(tint));
        if (lift > 0 && c2.emissive && c2.map) { c2.emissive = new THREE.Color('#ffffff'); c2.emissiveMap = c2.map; c2.emissiveIntensity = lift; }
        if (planes) { c2.clippingPlanes = planes; c2.clipIntersection = true; c2.clipShadows = true; }
        list.push(c2);
        return c2;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMat) : cloneMat(mesh.material);
    });
    toRemove.forEach((m) => m.removeFromParent());

    const unit = new THREE.Group();
    unit.scale.setScalar(def.scale * scale);
    unit.add(obj);
    unit.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(unit);
    const c = box.getCenter(new THREE.Vector3());
    const centred = new THREE.Group();
    centred.add(unit);
    unit.position.set(-c.x, -box.min.y, -c.z);
    const holder = new THREE.Group();
    holder.add(centred);
    centred.rotation.y = rotationY;
    holder.position.set(...position);
    const sz = box.getSize(new THREE.Vector3());
    return { root: holder, mats: list, size: [sz.x, sz.y, sz.z] as [number, number, number] };
  }, [gltf, def.scale, scale, rotationY, tint, lift, hide, shadows, position, hole]);

  useEffect(() => {
    if (!collide) return;
    const t0 = performance.now();
    const cols = buildMeshColliders(root, { ignore: def.ignore, clear });
    if (typeof window !== 'undefined' && /debug/.test(window.location.search)) console.warn(`[EnvModel] ${model}: ${cols.length} colliders in ${Math.round(performance.now() - t0)} ms`);
    onColliders?.(cols);
    const ids = cols.map((b) => CollisionSystem.add(b));
    return () => ids.forEach((id) => CollisionSystem.remove(id));
  }, [root, collide, clear, def.ignore, onColliders, model]);

  useEffect(() => { onBounds?.(size); }, [size, onBounds]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return <primitive object={root} />;
}
