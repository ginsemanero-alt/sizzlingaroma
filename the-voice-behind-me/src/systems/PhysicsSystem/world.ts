/**
 * A tiny collision world: axis-aligned boxes for walls/furniture/doors and
 * walkable floor regions (flat or ramped, for stairs). The player is a
 * vertical cylinder resolved against the boxes on the XZ plane, filtered by
 * height so stairs, lintels and stacked floors work.
 */
export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Floor {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  /** ramp: height goes from y to y1 along axis, from min to max side */
  y1?: number;
  axis?: 'x' | 'z';
}

interface ColliderEntry {
  box: AABB;
  enabled: boolean;
}

const colliders = new Map<string, ColliderEntry>();
const floors = new Map<string, Floor>();
let autoId = 0;

export const STEP = 0.45;

export const world = {
  addCollider(box: AABB, id = `c${autoId++}`) {
    colliders.set(id, { box, enabled: true });
    return id;
  },
  removeCollider(id: string) {
    colliders.delete(id);
  },
  setColliderEnabled(id: string, enabled: boolean) {
    const c = colliders.get(id);
    if (c) c.enabled = enabled;
  },
  addFloor(f: Floor, id = `f${autoId++}`) {
    floors.set(id, f);
    return id;
  },
  removeFloor(id: string) {
    floors.delete(id);
  },
  clear() {
    colliders.clear();
    floors.clear();
  },

  /** Highest walkable surface at (x,z) that is reachable from feetY. */
  floorAt(x: number, z: number, feetY: number): number | null {
    let best: number | null = null;
    for (const f of floors.values()) {
      if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
      let h = f.y;
      if (f.y1 !== undefined) {
        const t = f.axis === 'x' ? (x - f.minX) / (f.maxX - f.minX) : (z - f.minZ) / (f.maxZ - f.minZ);
        h = f.y + (f.y1 - f.y) * Math.max(0, Math.min(1, t));
      }
      if (h <= feetY + STEP && (best === null || h > best)) best = h;
    }
    return best;
  },

  /** Push a cylinder (feet position, radius, height) out of all colliders. Mutates pos. */
  resolve(pos: { x: number; y: number; z: number }, radius: number, height: number) {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of colliders.values()) {
        if (!c.enabled) continue;
        const b = c.box;
        if (b.maxY <= pos.y + STEP * 0.8 || b.minY >= pos.y + height) continue;
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          const push = radius - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          // centre inside the box: leave along the shallowest axis
          const left = pos.x - b.minX + radius;
          const right = b.maxX - pos.x + radius;
          const back = pos.z - b.minZ + radius;
          const front = b.maxZ - pos.z + radius;
          const m = Math.min(left, right, back, front);
          if (m === left) pos.x -= left;
          else if (m === right) pos.x += right;
          else if (m === back) pos.z -= back;
          else pos.z += front;
        }
        moved = true;
      }
      if (!moved) break;
    }
  },

  /** True if the segment a→b (at height y) passes through a collider. */
  segmentBlocked(ax: number, az: number, bx: number, bz: number, y: number): boolean {
    const dx = bx - ax;
    const dz = bz - az;
    for (const c of colliders.values()) {
      if (!c.enabled) continue;
      const b = c.box;
      if (y < b.minY || y > b.maxY) continue;
      let t0 = 0;
      let t1 = 1;
      const slab = (p: number, d: number, mn: number, mx: number) => {
        if (Math.abs(d) < 1e-9) return p >= mn && p <= mx;
        let ta = (mn - p) / d;
        let tb = (mx - p) / d;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
        return t0 <= t1;
      };
      if (slab(ax, dx, b.minX, b.maxX) && slab(az, dz, b.minZ, b.maxZ) && t1 > 0 && t0 < 1) return true;
    }
    return false;
  },
};

/** Build an AABB from a centre, a size and a quarter-turn rotation. */
export function boxFrom(
  center: [number, number, number],
  size: [number, number, number],
  rotY = 0,
): AABB {
  const quarter = Math.round(rotY / (Math.PI / 2)) % 2 !== 0;
  const w = quarter ? size[2] : size[0];
  const d = quarter ? size[0] : size[2];
  return {
    minX: center[0] - w / 2,
    maxX: center[0] + w / 2,
    minY: center[1] - size[1] / 2,
    maxY: center[1] + size[1] / 2,
    minZ: center[2] - d / 2,
    maxZ: center[2] + d / 2,
  };
}
