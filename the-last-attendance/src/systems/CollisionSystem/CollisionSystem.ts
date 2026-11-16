/**
 * Axis-aligned 2.5D collision. All static level geometry and dynamic blockers (closed doors)
 * register AABBs here. Characters are circles on the XZ plane.
 */
export interface AABB {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
  /** Blocks line of sight (walls, tall furniture). */
  opaque: boolean;
}

const colliders = new Map<string, AABB>();
let version = 0;
let autoId = 0;

/** Bodies collide only with boxes in this vertical band (feet to head). */
const BODY_MIN_Y = 0.25;
const BODY_MAX_Y = 1.7;

export const CollisionSystem = {
  get version() { return version; },

  add(box: AABB, id?: string): string {
    const key = id ?? `c${autoId++}`;
    colliders.set(key, box);
    version++;
    return key;
  },
  remove(id: string): void {
    if (colliders.delete(id)) version++;
  },
  clear(): void {
    colliders.clear();
    version++;
  },
  all(): IterableIterator<AABB> {
    return colliders.values();
  },

  /** Push a circle at (x,z) out of all colliders. Returns corrected position. */
  resolveCircle(x: number, z: number, r: number, out: { x: number; z: number }): { x: number; z: number } {
    let px = x, pz = z;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of colliders.values()) {
        if (b.maxY < BODY_MIN_Y || b.minY > BODY_MAX_Y) continue;
        if (px + r < b.minX || px - r > b.maxX || pz + r < b.minZ || pz - r > b.maxZ) continue;
        const cx = Math.max(b.minX, Math.min(px, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pz, b.maxZ));
        let dx = px - cx, dz = pz - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = r - d;
          px += (dx / d) * push;
          pz += (dz / d) * push;
        } else {
          // centre inside the box: push out along the shortest axis
          const left = px - b.minX, right = b.maxX - px, back = pz - b.minZ, front = b.maxZ - pz;
          const m = Math.min(left, right, back, front);
          if (m === left) px = b.minX - r; else if (m === right) px = b.maxX + r;
          else if (m === back) pz = b.minZ - r; else pz = b.maxZ + r;
          dx = dz = 0;
        }
        moved = true;
      }
      if (!moved) break;
    }
    out.x = px; out.z = pz;
    return out;
  },

  /** True when the circle overlaps any collider. */
  overlaps(x: number, z: number, r: number): boolean {
    for (const b of colliders.values()) {
      if (b.maxY < BODY_MIN_Y || b.minY > BODY_MAX_Y) continue;
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    return false;
  },

  /**
   * Line of sight between two points at eye height. Only opaque colliders whose
   * vertical extent covers `y` block the ray.
   */
  lineBlocked(ax: number, az: number, bx: number, bz: number, y = 1.4): boolean {
    const dx = bx - ax, dz = bz - az;
    for (const b of colliders.values()) {
      if (!b.opaque || b.maxY < y || b.minY > y) continue;
      if (segmentHitsBox(ax, az, dx, dz, b)) return true;
    }
    return false;
  },
};

function segmentHitsBox(ax: number, az: number, dx: number, dz: number, b: AABB): boolean {
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax < b.minX || ax > b.maxX) return false;
  } else {
    let t1 = (b.minX - ax) / dx, t2 = (b.maxX - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (az < b.minZ || az > b.maxZ) return false;
  } else {
    let t1 = (b.minZ - az) / dz, t2 = (b.maxZ - az) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}
