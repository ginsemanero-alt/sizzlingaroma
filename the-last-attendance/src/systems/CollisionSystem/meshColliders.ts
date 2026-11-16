import * as THREE from 'three';
import type { AABB } from './CollisionSystem';

export interface MeshColliderOptions {
  /** Grid cell size in metres. */
  cell?: number;
  /** Only geometry inside this height band blocks movement (feet → head). */
  yMin?: number;
  yMax?: number;
  /** Geometry taller than this marks the cell as line-of-sight blocking. */
  opaqueY?: number;
  /** Meshes whose name or material name matches are ignored (e.g. light shafts, glass). */
  ignore?: RegExp;
  /** World XZ rectangles [x0, z0, x1, z1] kept walkable (doorways). */
  clear?: [number, number, number, number][];
  /** Erode low (desk-height) occupancy by this many cells, compensating for cell quantisation. */
  erode?: number;
}

/**
 * Builds walkability colliders for an arbitrary (possibly merged) environment mesh by sampling
 * every triangle inside the body's height band and marking the XZ grid cells it touches. Rows of
 * marked cells are merged into AABBs. Works in the object's world space (call after placement).
 */
export function buildMeshColliders(root: THREE.Object3D, o: MeshColliderOptions = {}): AABB[] {
  const cell = o.cell ?? 0.12, yMin = o.yMin ?? 0.2, yMax = o.yMax ?? 1.75, opaqueY = o.opaqueY ?? 1.45;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const minX = box.min.x, minZ = box.min.z;
  const W = Math.max(1, Math.ceil((box.max.x - minX) / cell));
  const H = Math.max(1, Math.ceil((box.max.z - minZ) / cell));
  const top = new Float32Array(W * H).fill(-Infinity);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), p = new THREE.Vector3();

  const mark = (x: number, y: number, z: number) => {
    if (y < yMin || y > yMax) return;
    if (o.clear && o.clear.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) return;
    const i = Math.floor((x - minX) / cell), j = Math.floor((z - minZ) / cell);
    if (i < 0 || j < 0 || i >= W || j >= H) return;
    const k = j * W + i;
    if (y > top[k]) top[k] = y;
  };

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
    if (o.ignore && (o.ignore.test(mesh.name) || o.ignore.test(mat?.name ?? ''))) return;
    if (mat && (mat as THREE.MeshStandardMaterial).transparent && (mat as THREE.MeshStandardMaterial).opacity < 0.3) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute | undefined;
    if (!pos) return;
    const idx = geo.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    const m = mesh.matrixWorld;
    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(m);
      b.fromBufferAttribute(pos, i1).applyMatrix4(m);
      c.fromBufferAttribute(pos, i2).applyMatrix4(m);
      const lo = Math.min(a.y, b.y, c.y), hi = Math.max(a.y, b.y, c.y);
      if (hi < yMin || lo > yMax) continue;
      // sample the triangle densely enough to hit every cell it crosses
      const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
      const n = Math.min(200, Math.max(1, Math.ceil(e / (cell * 0.6))));
      for (let u = 0; u <= n; u++) {
        for (let v = 0; v <= n - u; v++) {
          const w = n - u - v;
          p.set(0, 0, 0).addScaledVector(a, u / n).addScaledVector(b, v / n).addScaledVector(c, w / n);
          mark(p.x, p.y, p.z);
        }
      }
    }
  });

  // erode low furniture so aisles keep their real width (tall geometry is left untouched)
  for (let pass = 0; pass < (o.erode ?? 1); pass++) {
    const prev = top.slice();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (prev[k] === -Infinity || prev[k] >= opaqueY) continue;
      const empty = (ii: number, jj: number) => ii < 0 || jj < 0 || ii >= W || jj >= H || prev[jj * W + ii] === -Infinity;
      if (empty(i - 1, j) || empty(i + 1, j) || empty(i, j - 1) || empty(i, j + 1)) top[k] = -Infinity;
    }
  }

  // merge horizontal runs with the same opacity into AABBs
  const out: AABB[] = [];
  for (let j = 0; j < H; j++) {
    let i = 0;
    while (i < W) {
      const k = j * W + i;
      if (top[k] === -Infinity) { i++; continue; }
      const opaque = top[k] >= opaqueY;
      let e = i;
      let maxTop = top[k];
      while (e + 1 < W && top[j * W + e + 1] !== -Infinity && (top[j * W + e + 1] >= opaqueY) === opaque) { e++; maxTop = Math.max(maxTop, top[j * W + e]); }
      out.push({ minX: minX + i * cell, maxX: minX + (e + 1) * cell, minZ: minZ + j * cell, maxZ: minZ + (j + 1) * cell, minY: 0, maxY: opaque ? 3 : Math.max(0.5, maxTop), opaque });
      i = e + 1;
    }
  }
  return out;
}
