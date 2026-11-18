import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DRACO_PATH } from '@/components/Characters/ModelCharacter';
import { ENV_MODELS, type EnvModelId } from './EnvModel';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';

export interface PropModelProps {
  model: EnvModelId;
  position: [number, number, number];
  rotationY?: number;
  /** Size the prop by one of its dimensions (metres); otherwise `scale` is used. */
  height?: number;
  width?: number;
  depth?: number;
  scale?: number;
  /** Stretch to an exact [x, y, z] size (non-uniform). */
  size?: [number, number, number];
  /** Uniform scale so the largest dimension equals this (metres). */
  fit?: number;
  /** Meshes to drop (e.g. a ground plane baked into the file). */
  hide?: RegExp;
  /** Keep only meshes whose node or material name matches (extract one object from a set). */
  only?: RegExp;
  /** Keep only meshes whose centre lies in this box [x0, z0, x1, z1], in metres relative to the model's centre. */
  onlyBox?: [number, number, number, number];
  /** Drop meshes wider than this on X or Z (metres), e.g. a floor/carpet baked into the file. */
  maxPart?: number;
  tint?: string;
  /** Emissive boost for dark textures. */
  lift?: number;
  /** Register one box collider around the placed prop. */
  collide?: boolean | 'low';
  /** Play the file's first animation clip. */
  animate?: boolean;
  animSpeed?: number;
  shadows?: boolean;
  /** Anchor: 'floor' puts the bottom at y (default); 'center' centres the prop on y. */
  anchor?: 'floor' | 'center';
}

/**
 * A single GLB prop (Sketchfab, see README credits): normalised (centred, bottom at y), sized,
 * optionally animated and collidable. Visual stand-in for procedural boxes.
 */
export function PropModel({
  model, position, rotationY = 0, height, width, depth, scale = 1, size, fit, hide, only, onlyBox, maxPart, tint, lift = 0, collide = false, animate = false, animSpeed = 1, shadows = true, anchor = 'floor',
}: PropModelProps) {
  const gltf = useGLTF(ENV_MODELS[model].url, DRACO_PATH);
  const ref = useRef<THREE.Group>(null);

  const { root, mats, mixer, box } = useMemo(() => {
    const obj = cloneSkinned(gltf.scene) as THREE.Object3D;
    const drop: THREE.Object3D[] = [];
    let full: THREE.Box3 | null = null;
    const unit = ENV_MODELS[model].scale;
    if (onlyBox || maxPart) { obj.updateMatrixWorld(true); full = new THREE.Box3().setFromObject(obj); }
    const ms = new THREE.Vector3();
    const fc = full ? full.getCenter(new THREE.Vector3()) : null;
    const mc = new THREE.Vector3();
    const list: THREE.Material[] = [];
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mname = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name ?? '';
      if ((hide && (hide.test(mesh.name) || hide.test(mname))) || (only && !only.test(mesh.name) && !only.test(mname))) { drop.push(mesh); return; }
      if (maxPart) {
        new THREE.Box3().setFromObject(mesh).getSize(ms);
        if (Math.max(ms.x, ms.z) * unit > maxPart) { drop.push(mesh); return; }
      }
      if (onlyBox && fc) {
        new THREE.Box3().setFromObject(mesh).getCenter(mc);
        const x = (mc.x - fc.x) * unit, z = (mc.z - fc.z) * unit;
        if (x < onlyBox[0] || x > onlyBox[2] || z < onlyBox[1] || z > onlyBox[3]) { drop.push(mesh); return; }
      }
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
      const cl = (m: THREE.Material) => {
        const c = m.clone() as THREE.MeshStandardMaterial;
        if (tint && c.color) c.color.multiply(new THREE.Color(tint));
        if (lift > 0 && c.map && c.emissive) { c.emissive = new THREE.Color('#ffffff'); c.emissiveMap = c.map; c.emissiveIntensity = lift; }
        list.push(c);
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cl) : cl(mesh.material);
    });
    drop.forEach((d) => d.removeFromParent());
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(obj);
    const sz = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());
    const inner = new THREE.Group();
    inner.add(obj);
    obj.position.set(-c.x, anchor === 'floor' ? -b.min.y : -c.y, -c.z);
    let s: THREE.Vector3;
    if (size) s = new THREE.Vector3(size[0] / Math.max(sz.x, 1e-4), size[1] / Math.max(sz.y, 1e-4), size[2] / Math.max(sz.z, 1e-4));
    else {
      const u = fit ? fit / Math.max(sz.x, sz.y, sz.z, 1e-4) : height ? height / sz.y : width ? width / sz.x : depth ? depth / sz.z : scale;
      s = new THREE.Vector3(u, u, u);
    }
    inner.scale.copy(s);
    const holder = new THREE.Group();
    holder.add(inner);
    holder.rotation.y = rotationY;
    const mx = animate && gltf.animations.length ? new THREE.AnimationMixer(obj) : null;
    if (mx) { const a = mx.clipAction(gltf.animations[0]); a.play(); a.time = Math.random() * gltf.animations[0].duration; }
    return { root: holder, mats: list, mixer: mx, box: new THREE.Vector3(sz.x * s.x, sz.y * s.y, sz.z * s.z) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, model, onlyBox?.join(','), maxPart, hide, only, tint, lift, shadows, anchor, size?.join(','), fit, height, width, depth, scale, rotationY, animate]);

  useEffect(() => () => { mats.forEach((m) => m.dispose()); mixer?.stopAllAction(); }, [mats, mixer]);

  useEffect(() => {
    if (!collide) return;
    const c = Math.abs(Math.cos(rotationY)), sn = Math.abs(Math.sin(rotationY));
    const hx = (box.x * c + box.z * sn) / 2, hz = (box.x * sn + box.z * c) / 2;
    const id = CollisionSystem.add({
      minX: position[0] - hx, maxX: position[0] + hx, minZ: position[2] - hz, maxZ: position[2] + hz,
      minY: position[1], maxY: position[1] + (collide === 'low' ? Math.min(box.y, 0.9) : box.y), opaque: collide !== 'low' && box.y > 1.4,
    });
    return () => CollisionSystem.remove(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collide, box, position.join(','), rotationY]);

  useFrame((_, dt) => { if (mixer) mixer.update(Math.min(dt, 0.05) * animSpeed); });

  return <primitive ref={ref} object={root} position={position} />;
}
