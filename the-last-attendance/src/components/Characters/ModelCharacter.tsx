import { Suspense, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Humanoid, type HumanoidHandle, type HumanoidLook, type Pose } from './Humanoid';

/**
 * Character models (Sketchfab, CC-BY / CC-BY-SA — see README credits). Files live in public/models.
 * Every model is normalised at runtime: feet on the ground, target height, facing -Z.
 */
export const CHARACTER_MODELS = {
  teacher: { url: 'models/teacher.glb', height: 1.68, idleAnim: true },
  student: { url: 'models/student.glb', height: 1.62, idleAnim: false },
  girl_bob: { url: 'models/girl_bob.glb', height: 1.56, idleAnim: false },
  girl_ponytail: { url: 'models/girl_ponytail.glb', height: 1.58, idleAnim: false },
  boy_rigged: { url: 'models/boy_rigged.glb', height: 1.7, idleAnim: false },
  boy_stylized: { url: 'models/boy_stylized.glb', height: 1.68, idleAnim: false },
  boy_stylized6: { url: 'models/boy_stylized6.glb', height: 1.7, idleAnim: false },
  boy_animated: { url: 'models/boy_animated.glb', height: 1.68, idleAnim: true },
  ghost_girl: { url: 'models/ghost_girl.glb', height: 1.5, idleAnim: false },
  uniform_girl: { url: 'models/uniform_girl.glb', height: 1.6, idleAnim: false },
  guard: { url: 'models/guard.glb', height: 1.74, idleAnim: true },
} as const;
export type ModelId = keyof typeof CHARACTER_MODELS;

export const GIRL_MODELS: ModelId[] = ['girl_ponytail', 'girl_bob'];
export const BOY_MODELS: ModelId[] = ['boy_stylized', 'student', 'boy_stylized6', 'boy_rigged'];

/** Pick a model for a seat/index so a class looks varied. */
export function studentModel(isGirl: boolean, index: number): ModelId {
  const list = isGirl ? GIRL_MODELS : BOY_MODELS;
  return list[index % list.length];
}

/** Self-hosted Draco decoder (models are Draco-compressed with WebP textures). */
export const DRACO_PATH = 'draco/';

export function preloadCharacterModels(ids: ModelId[] = Object.keys(CHARACTER_MODELS) as ModelId[]): void {
  ids.forEach((id) => useGLTF.preload(CHARACTER_MODELS[id].url, DRACO_PATH));
}

export interface ModelLook {
  /** Translucent glowing ghost. */
  ghost?: boolean;
  ghostColor?: string;
  /** Multiply colour (e.g. pale/desaturated teacher). */
  tint?: string;
  /** Emissive glow colour for eyes/rim (distorted teacher). */
  glow?: string;
  glowIntensity?: number;
  opacity?: number;
  /** Extra uniform scale on top of the normalised height. */
  scale?: number;
}

interface Props extends ModelLook {
  model: ModelId;
  position?: [number, number, number];
  rotationY?: number;
  /** Seated ghosts stand behind their desk instead (the models are not posed for sitting). */
  pose?: Pose;
}

const ModelBody = forwardRef<HumanoidHandle, Props>(function ModelBody(
  { model, position, rotationY = 0, ghost, ghostColor = '#7f9cff', tint, glow, glowIntensity = 0.4, opacity, scale = 1 },
  ref,
) {
  const def = CHARACTER_MODELS[model];
  const gltf = useGLTF(def.url, DRACO_PATH);
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const walkSpeed = useRef(0);
  const tilt = useRef(0);

  const { root, mats, mixer, action } = useMemo(() => {
    const obj = cloneSkinned(gltf.scene) as THREE.Object3D;
    if (!gltf.animations.length) relaxArms(obj);
    // normalise: height, feet at y=0, centred, facing -Z (glTF faces +Z)
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const s = (def.height / Math.max(0.01, size.y)) * scale;
    const holder = new THREE.Group();
    const inner = new THREE.Group();
    inner.add(obj);
    const center = box.getCenter(new THREE.Vector3());
    obj.position.set(-center.x, -box.min.y, -center.z);
    inner.scale.setScalar(s);
    inner.rotation.y = Math.PI;
    holder.add(inner);

    const baseOpacity = opacity ?? (ghost ? 0.45 : 1);
    const list: THREE.MeshStandardMaterial[] = [];
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !ghost;
      mesh.receiveShadow = !ghost;
      mesh.frustumCulled = false; // skinned bounds are unreliable after scaling
      const src = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
      const next = src.map((m) => {
        const base = m as THREE.MeshStandardMaterial;
        // Convert unlit/basic materials to standard so they react to the flashlight.
        const std = base.isMeshStandardMaterial
          ? (base.clone() as THREE.MeshStandardMaterial)
          : new THREE.MeshStandardMaterial({ map: (base as unknown as THREE.MeshBasicMaterial).map ?? null, color: (base as unknown as THREE.MeshBasicMaterial).color ?? new THREE.Color('#fff') });
        std.roughness = Math.max(0.55, std.roughness ?? 0.8);
        std.metalness = 0;
        if (tint) std.color.multiply(new THREE.Color(tint));
        if (ghost) {
          std.transparent = true;
          std.depthWrite = false;
          std.emissive = new THREE.Color(ghostColor);
          std.emissiveIntensity = 0.45;
          std.color.lerp(new THREE.Color(ghostColor), 0.35);
        } else if (glow) {
          std.emissive = new THREE.Color(glow);
          std.emissiveIntensity = glowIntensity;
        }
        std.opacity = baseOpacity;
        if (baseOpacity < 1) std.transparent = true;
        list.push(std);
        return std;
      });
      mesh.material = Array.isArray(mesh.material) ? next : next[0];
    });

    const mx = gltf.animations.length ? new THREE.AnimationMixer(obj) : null;
    const act = mx ? mx.clipAction(gltf.animations[0]) : null;
    act?.play();
    if (act && def.idleAnim) act.time = Math.random() * (gltf.animations[0].duration || 1);
    return { root: holder, mats: list, mixer: mx, action: act };
  }, [gltf, def.height, def.idleAnim, scale, ghost, ghostColor, tint, glow, glowIntensity, opacity]);

  useEffect(() => () => { mats.forEach((m) => m.dispose()); mixer?.stopAllAction(); }, [mats, mixer]);

  useImperativeHandle(ref, () => ({
    group: group.current,
    setOpacity: (o: number) => {
      for (const m of mats) {
        m.opacity = o;
        m.transparent = o < 0.999 || !!ghost;
        m.depthWrite = !ghost && o > 0.95;
      }
      if (group.current) group.current.visible = o > 0.01;
    },
    walk: (s: number) => { walkSpeed.current = s; },
    headTilt: (r: number) => { tilt.current = r; },
  }), [mats, ghost]);

  useFrame((_, dt) => {
    if (mixer && group.current?.visible !== false) {
      if (action) {
        if (def.idleAnim) {
          // idle clip plays slowly for an uncanny sway; faster while moving
          action.timeScale = walkSpeed.current > 0 ? 0.8 + walkSpeed.current * 0.6 : 0.55;
        } else if (walkSpeed.current > 0) {
          action.paused = false;
          action.timeScale = 0.6 + walkSpeed.current * 0.6;
        } else {
          // walk-only rigs hold a standing frame when still
          action.paused = true;
          action.time = 0;
        }
      }
      mixer.update(Math.min(dt, 0.05));
    }
    if (head.current) head.current.rotation.z = THREE.MathUtils.lerp(head.current.rotation.z, tilt.current * 0.15, dt * 2);
    // models without a walk clip get a subtle bob instead
    if (group.current && !mixer) group.current.position.y = (position?.[1] ?? 0) + (walkSpeed.current > 0 ? Math.abs(Math.sin(performance.now() * 0.008)) * 0.03 : 0);
  });

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <group ref={head}>
        <primitive object={root} />
      </group>
    </group>
  );
});

/** Lower T-posed arms on rigged models (rotation about the model's forward axis, in model space). */
function relaxArms(obj: THREE.Object3D): void {
  obj.updateMatrixWorld(true);
  const bones: THREE.Object3D[] = [];
  obj.traverse((o) => { if ((o as THREE.Bone).isBone && /^(left|right)[_ ]?(upper[_ ]?)?arm|^arm\.[lr]_/i.test(o.name)) bones.push(o); });
  const wp = new THREE.Vector3(), child = new THREE.Vector3();
  for (const b of bones) {
    b.getWorldPosition(wp);
    const c = b.children.find((ch) => (ch as THREE.Bone).isBone);
    if (!c) continue;
    c.getWorldPosition(child);
    const dir = child.sub(wp).normalize();
    if (Math.abs(dir.x) < 0.7) continue; // already hanging down
    const r = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.sign(dir.x) * 1.22);
    const qw = b.getWorldQuaternion(new THREE.Quaternion());
    const parentQ = b.parent ? b.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    b.quaternion.copy(parentQ.invert().multiply(r).multiply(qw));
    b.updateMatrixWorld(true);
  }
  let skinned = false;
  obj.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true; });
  if (!skinned) bendRigidArms(obj);
}

/**
 * Unrigged T-pose models: rotate the arm vertices down around the shoulders (model space),
 * blending near the shoulder so the mesh doesn't tear.
 */
function bendRigidArms(obj: THREE.Object3D): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const H = size.y;
  if (size.x < H * 0.6) return; // arms already down
  const cx = (box.min.x + box.max.x) / 2;
  const xs = 0.12 * H, ys = box.min.y + 0.8 * H, band = 0.05 * H;
  const p = new THREE.Vector3(), n = new THREE.Vector3(), inv = new THREE.Matrix4(), nm = new THREE.Matrix3(), nmInv = new THREE.Matrix3();
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone();
    mesh.geometry = g;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute | undefined;
    inv.copy(mesh.matrixWorld).invert();
    nm.getNormalMatrix(mesh.matrixWorld);
    nmInv.copy(nm).invert();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const dx = p.x - cx;
      if (Math.abs(dx) <= xs || p.y < box.min.y + 0.55 * H) continue;
      const side = Math.sign(dx);
      const w = Math.min(1, (Math.abs(dx) - xs) / band);
      const a = -side * 1.25 * w;
      const px = p.x - (cx + side * xs), py = p.y - ys;
      const c = Math.cos(a), sn = Math.sin(a);
      p.set(cx + side * xs + px * c - py * sn, ys + px * sn + py * c, p.z).applyMatrix4(inv);
      pos.setXYZ(i, p.x, p.y, p.z);
      if (nor) {
        n.fromBufferAttribute(nor, i).applyMatrix3(nm);
        const nx = n.x * c - n.y * sn, ny = n.x * sn + n.y * c;
        n.set(nx, ny, n.z).applyMatrix3(nmInv).normalize();
        nor.setXYZ(i, n.x, n.y, n.z);
      }
    }
    pos.needsUpdate = true;
    if (nor) nor.needsUpdate = true;
    g.computeBoundingBox(); g.computeBoundingSphere();
  });
}

/**
 * GLB character with the procedural Humanoid as a loading fallback. Exposes the same handle
 * (setOpacity / walk / headTilt) so AI and scripts work with either.
 */
export const ModelCharacter = forwardRef<HumanoidHandle, Props & { fallback?: HumanoidLook }>(function ModelCharacter(props, ref) {
  const { fallback, ...rest } = props;
  return (
    <Suspense fallback={<Humanoid ref={ref} position={rest.position} rotationY={rest.rotationY} pose={rest.pose} {...(fallback ?? {})} ghost={rest.ghost} opacity={rest.opacity} />}>
      <ModelBody ref={ref} {...rest} />
    </Suspense>
  );
});
