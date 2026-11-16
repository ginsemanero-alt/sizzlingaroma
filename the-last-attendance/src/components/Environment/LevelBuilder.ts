import type { AABB } from '@/systems/CollisionSystem/CollisionSystem';
import type { MatKey } from './materials';

export interface BoxDef {
  p: [number, number, number];
  s: [number, number, number];
  m: MatKey;
  color?: string;
  rotY?: number;
  shadow?: boolean;
}

export interface Opening {
  /** Distance from the wall start to the opening centre. */
  at: number;
  w: number;
  h: number;
  /** Bottom of the opening (0 for doors, ~1 for windows). */
  y?: number;
}

export interface WallOpts {
  h?: number;
  t?: number;
  openings?: Opening[];
  upper?: MatKey;
  lower?: MatKey | null;
  lowerH?: number;
}

/** Quarter-turn rotation (0..3). Local -Z is "forward". */
export type Rot = 0 | 1 | 2 | 3;

const BOOK_COLORS = ['#6b2a22', '#2c3f5c', '#4b5a2a', '#7a6a3a', '#3a2a40', '#7c4a1c', '#20343a', '#5c5c58', '#8a2f2f', '#2f4f3f'];

/**
 * Procedural level construction from boxes. Everything static in a chapter is assembled here and
 * rendered with one InstancedMesh per material by <StaticLevel/>.
 */
export class LevelBuilder {
  boxes: BoxDef[] = [];
  colliders: AABB[] = [];
  private seed = 7;

  rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, m: MatKey, color?: string, rotY?: number): this {
    this.boxes.push({ p: [cx, cy, cz], s: [sx, sy, sz], m, color, rotY });
    return this;
  }

  /** Collider from min/max on the floor plane. */
  block(minX: number, minZ: number, maxX: number, maxZ: number, minY = 0, maxY = 3, opaque = true): this {
    this.colliders.push({ minX, maxX, minZ, maxZ, minY, maxY, opaque });
    return this;
  }

  /** Box that also collides. */
  solid(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, m: MatKey, opaque = true, color?: string): this {
    this.box(cx, cy, cz, sx, sy, sz, m, color);
    this.block(cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2, cy - sy / 2, cy + sy / 2, opaque);
    return this;
  }

  floor(x0: number, z0: number, x1: number, z1: number, m: MatKey = 'tile', y = 0): this {
    return this.box((x0 + x1) / 2, y - 0.1, (z0 + z1) / 2, Math.abs(x1 - x0), 0.2, Math.abs(z1 - z0), m);
  }

  ceil(x0: number, z0: number, x1: number, z1: number, h = 3.2, m: MatKey = 'ceiling'): this {
    return this.box((x0 + x1) / 2, h + 0.1, (z0 + z1) / 2, Math.abs(x1 - x0), 0.2, Math.abs(z1 - z0), m);
  }

  /** Axis-aligned wall from (x0,z0) to (x1,z1) with openings for doors and windows. */
  wall(x0: number, z0: number, x1: number, z1: number, o: WallOpts = {}): this {
    const H = o.h ?? 3.2, T = o.t ?? 0.2;
    const alongX = Math.abs(z1 - z0) < 1e-6;
    const start = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const end = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const fixed = alongX ? z0 : x0;
    const flip = alongX ? x1 < x0 : z1 < z0;
    const L = end - start;
    const openings = (o.openings ?? [])
      .map((op) => ({ ...op, at: flip ? L - op.at : op.at }))
      .sort((a, b) => a.at - b.at);

    const seg = (a: number, b: number, y0: number, y1: number, collide: boolean) => {
      if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
      const lowerH = o.lowerH ?? 1.1;
      const parts: [number, number, MatKey][] = [];
      if (o.lower !== null && y0 < lowerH) {
        parts.push([y0, Math.min(y1, lowerH), o.lower ?? 'paintLower']);
        if (y1 > lowerH) parts.push([lowerH, y1, o.upper ?? 'plaster']);
      } else parts.push([y0, y1, o.upper ?? 'plaster']);
      for (const [ya, yb, m] of parts) {
        const c = (a + b) / 2, len = b - a;
        if (alongX) this.box(start + c, (ya + yb) / 2, fixed, len, yb - ya, T, m);
        else this.box(fixed, (ya + yb) / 2, start + c, T, yb - ya, len, m);
      }
      if (collide) {
        if (alongX) this.block(start + a, fixed - T / 2, start + b, fixed + T / 2, y0, y1, true);
        else this.block(fixed - T / 2, start + a, fixed + T / 2, start + b, y0, y1, true);
      }
    };

    let cursor = 0;
    for (const op of openings) {
      const a = op.at - op.w / 2, b = op.at + op.w / 2, y = op.y ?? 0;
      seg(cursor, a, 0, H, true);
      seg(a, b, y + op.h, H, true);
      if (y > 0) {
        seg(a, b, 0, y, true);
        // window: frame + glass
        const c = start + op.at;
        if (alongX) {
          this.box(c, y - 0.03, fixed, op.w, 0.06, T + 0.1, 'trim');
          this.box(c, y + op.h / 2, fixed, op.w, op.h, 0.03, 'glass');
          this.box(c, y + op.h / 2, fixed, 0.05, op.h, T, 'trim');
          this.block(start + a, fixed - T / 2, start + b, fixed + T / 2, y, y + op.h, false);
        } else {
          this.box(fixed, y - 0.03, c, T + 0.1, 0.06, op.w, 'trim');
          this.box(fixed, y + op.h / 2, c, 0.03, op.h, op.w, 'glass');
          this.box(fixed, y + op.h / 2, c, T, op.h, 0.05, 'trim');
          this.block(fixed - T / 2, start + a, fixed + T / 2, start + b, y, y + op.h, false);
        }
      } else {
        // door frame trim
        const c = start + op.at;
        if (alongX) {
          this.box(c - op.w / 2 - 0.04, op.h / 2, fixed, 0.08, op.h, T + 0.06, 'trim');
          this.box(c + op.w / 2 + 0.04, op.h / 2, fixed, 0.08, op.h, T + 0.06, 'trim');
          this.box(c, op.h + 0.04, fixed, op.w + 0.16, 0.08, T + 0.06, 'trim');
        } else {
          this.box(fixed, op.h / 2, c - op.w / 2 - 0.04, T + 0.06, op.h, 0.08, 'trim');
          this.box(fixed, op.h / 2, c + op.w / 2 + 0.04, T + 0.06, op.h, 0.08, 'trim');
          this.box(fixed, op.h + 0.04, c, T + 0.06, 0.08, op.w + 0.16, 'trim');
        }
      }
      cursor = b;
    }
    seg(cursor, L, 0, H, true);
    return this;
  }

  /** Rectangular room: floor, ceiling and four walls with openings per side. */
  room(
    x0: number, z0: number, x1: number, z1: number,
    o: { h?: number; floor?: MatKey; ceil?: MatKey | null; n?: Opening[]; s?: Opening[]; e?: Opening[]; w?: Opening[]; skip?: ('n' | 's' | 'e' | 'w')[]; upper?: MatKey; lower?: MatKey | null } = {},
  ): this {
    const h = o.h ?? 3.2;
    this.floor(x0, z0, x1, z1, o.floor ?? 'tile');
    if (o.ceil !== null) this.ceil(x0, z0, x1, z1, h, o.ceil ?? 'ceiling');
    const skip = new Set(o.skip ?? []);
    const wo = { h, upper: o.upper, lower: o.lower };
    if (!skip.has('n')) this.wall(x0, z0, x1, z0, { ...wo, openings: o.n });
    if (!skip.has('s')) this.wall(x0, z1, x1, z1, { ...wo, openings: o.s });
    if (!skip.has('w')) this.wall(x0, z0, x0, z1, { ...wo, openings: o.w });
    if (!skip.has('e')) this.wall(x1, z0, x1, z1, { ...wo, openings: o.e });
    return this;
  }

  // ─────────────────────────── furniture ───────────────────────────
  private place(x: number, z: number, r: Rot, lx: number, lz: number): [number, number] {
    switch (r) {
      case 1: return [x + lz, z - lx];
      case 2: return [x - lx, z - lz];
      case 3: return [x - lz, z + lx];
      default: return [x + lx, z + lz];
    }
  }
  private sz(r: Rot, sx: number, sz: number): [number, number] {
    return r % 2 ? [sz, sx] : [sx, sz];
  }
  /** Box in a local furniture frame. */
  lbox(x: number, z: number, r: Rot, lx: number, y: number, lz: number, sx: number, sy: number, szz: number, m: MatKey, color?: string): this {
    const [wx, wz] = this.place(x, z, r, lx, lz);
    const [a, b] = this.sz(r, sx, szz);
    return this.box(wx, y, wz, a, sy, b, m, color);
  }

  /** Filipino classroom armchair: seat, backrest and writing board. */
  desk(x: number, z: number, r: Rot = 0, toppled = false): this {
    if (toppled) {
      this.box(x, 0.2, z, 0.55, 0.4, 0.7, 'darkwood', undefined, this.rand() * 3);
      this.block(x - 0.35, z - 0.35, x + 0.35, z + 0.35, 0, 0.5, false);
      return this;
    }
    const legs: [number, number][] = [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]];
    legs.forEach(([lx, lz]) => this.lbox(x, z, r, lx, 0.22, lz, 0.04, 0.44, 0.04, 'metal'));
    this.lbox(x, z, r, 0, 0.45, 0, 0.5, 0.04, 0.45, 'wood');
    this.lbox(x, z, r, 0, 0.75, 0.21, 0.5, 0.55, 0.04, 'wood');
    this.lbox(x, z, r, 0.2, 0.72, -0.15, 0.3, 0.03, 0.45, 'wood');
    this.lbox(x, z, r, 0.27, 0.58, -0.05, 0.03, 0.28, 0.03, 'metal');
    const [w, d] = this.sz(r, 0.62, 0.62);
    this.block(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, 0.8, false);
    return this;
  }

  teacherDesk(x: number, z: number, r: Rot = 0): this {
    this.lbox(x, z, r, 0, 0.76, 0, 1.6, 0.06, 0.8, 'darkwood');
    this.lbox(x, z, r, -0.55, 0.38, 0, 0.45, 0.76, 0.74, 'darkwood');
    this.lbox(x, z, r, 0.55, 0.38, 0, 0.45, 0.76, 0.74, 'darkwood');
    this.lbox(x, z, r, 0, 0.5, 0.33, 0.66, 0.5, 0.04, 'darkwood');
    const [w, d] = this.sz(r, 1.6, 0.8);
    this.block(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, 0.82, false);
    return this;
  }

  table(x: number, z: number, w: number, d: number, h = 0.75, m: MatKey = 'wood'): this {
    this.box(x, h, z, w, 0.05, d, m);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => this.box(x + a * (w / 2 - 0.06), h / 2, z + b * (d / 2 - 0.06), 0.06, h, 0.06, 'metal'));
    this.block(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, h + 0.05, false);
    return this;
  }

  chair(x: number, z: number, r: Rot = 0): this {
    this.lbox(x, z, r, 0, 0.44, 0, 0.42, 0.04, 0.42, 'wood');
    this.lbox(x, z, r, 0, 0.7, 0.19, 0.42, 0.5, 0.04, 'wood');
    [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([a, b]) => this.lbox(x, z, r, a, 0.22, b, 0.04, 0.44, 0.04, 'metal'));
    this.block(x - 0.24, z - 0.24, x + 0.24, z + 0.24, 0, 0.5, false);
    return this;
  }

  cabinet(x: number, z: number, r: Rot = 0, w = 0.9, h = 1.9, d = 0.5, m: MatKey = 'metal'): this {
    this.lbox(x, z, r, 0, h / 2, 0, w, h, d, m);
    this.lbox(x, z, r, 0, h / 2, -d / 2 - 0.005, 0.02, h * 0.9, 0.01, 'black');
    const [a, b] = this.sz(r, w, d);
    this.block(x - a / 2, z - b / 2, x + a / 2, z + b / 2, 0, h, true);
    return this;
  }

  bookshelf(x: number, z: number, r: Rot = 0, len = 2.4, h = 2.2, fallen = 0): this {
    const d = 0.4, levels = 5;
    this.lbox(x, z, r, 0, h / 2, 0.18, len, h, 0.04, 'darkwood');
    this.lbox(x, z, r, -len / 2, h / 2, 0, 0.05, h, d, 'darkwood');
    this.lbox(x, z, r, len / 2, h / 2, 0, 0.05, h, d, 'darkwood');
    for (let i = 0; i <= levels; i++) {
      const y = 0.05 + (i * (h - 0.1)) / levels;
      this.lbox(x, z, r, 0, y, 0, len, 0.03, d, 'darkwood');
      if (i === levels) break;
      let cx = -len / 2 + 0.06;
      while (cx < len / 2 - 0.08) {
        const bw = 0.03 + this.rand() * 0.04, bh = 0.22 + this.rand() * 0.14;
        if (this.rand() > fallen) {
          this.lbox(x, z, r, cx + bw / 2, y + bh / 2 + 0.015, 0, bw, bh, 0.26, 'books', BOOK_COLORS[Math.floor(this.rand() * BOOK_COLORS.length)]);
        }
        cx += bw + 0.005;
      }
    }
    const [a, b] = this.sz(r, len, d);
    this.block(x - a / 2, z - b / 2, x + a / 2, z + b / 2, 0, h, true);
    return this;
  }

  lockers(x: number, z: number, r: Rot, count: number): this {
    const w = 0.45;
    for (let i = 0; i < count; i++) {
      const lx = (i - (count - 1) / 2) * w;
      this.lbox(x, z, r, lx, 0.95, 0, w - 0.02, 1.9, 0.5, 'locker');
      this.lbox(x, z, r, lx + 0.15, 1.0, -0.255, 0.03, 0.12, 0.01, 'metal');
    }
    const [a, b] = this.sz(r, w * count, 0.5);
    this.block(x - a / 2, z - b / 2, x + a / 2, z + b / 2, 0, 1.9, true);
    return this;
  }

  blackboard(x: number, z: number, r: Rot, w = 3.6): this {
    this.lbox(x, z, r, 0, 1.6, 0, w, 1.2, 0.05, 'chalkboard');
    this.lbox(x, z, r, 0, 2.23, 0, w + 0.1, 0.06, 0.08, 'trim');
    this.lbox(x, z, r, 0, 0.97, -0.04, w + 0.1, 0.06, 0.12, 'trim');
    return this;
  }

  computerDesk(x: number, z: number, r: Rot = 0, on = false): this {
    this.table(x, z, r % 2 ? 0.7 : 1.2, r % 2 ? 1.2 : 0.7, 0.74, 'darkwood');
    this.lbox(x, z, r, 0, 1.0, 0.05, 0.42, 0.36, 0.38, 'paper', '#b9b4a2');
    this.lbox(x, z, r, 0, 1.0, -0.15, 0.36, 0.28, 0.01, on ? 'emissive' : 'black');
    this.lbox(x, z, r, 0, 0.78, -0.25, 0.45, 0.03, 0.16, 'paper', '#a9a493');
    this.lbox(x, z, r, 0.45, 0.95, 0.05, 0.18, 0.4, 0.42, 'paper', '#a9a493');
    return this;
  }

  debris(x: number, z: number, spread = 1.5, count = 8, m: MatKey = 'paper'): this {
    for (let i = 0; i < count; i++) {
      const px = x + (this.rand() - 0.5) * spread, pz = z + (this.rand() - 0.5) * spread;
      const s = 0.1 + this.rand() * 0.25;
      this.box(px, 0.01, pz, s, 0.01, s * 0.8, m, undefined, this.rand() * 3);
    }
    return this;
  }

  bench(x: number, z: number): this {
    this.box(x, 0.45, z, 2.4, 0.06, 0.4, 'wood');
    this.box(x - 1, 0.22, z, 0.06, 0.44, 0.36, 'metal');
    this.box(x + 1, 0.22, z, 0.06, 0.44, 0.36, 'metal');
    this.block(x - 1.2, z - 0.2, x + 1.2, z + 0.2, 0, 0.5, false);
    return this;
  }

  pillar(x: number, z: number, w = 0.5, h = 3.2): this {
    return this.solid(x, h / 2, z, w, h, w, 'plaster');
  }

  /** Decorative stairs going up (non-walkable) with collider. */
  stairs(x: number, z: number, r: Rot, w = 2, steps = 10, rise = 0.18, run = 0.3): this {
    for (let i = 0; i < steps; i++) this.lbox(x, z, r, 0, (i + 1) * rise / 2, -i * run, w, (i + 1) * rise, run, 'concrete');
    const len = steps * run;
    const [cx, cz] = this.place(x, z, r, 0, -len / 2 + run / 2);
    const [a, b] = this.sz(r, w, len);
    this.block(cx - a / 2, cz - b / 2, cx + a / 2, cz + b / 2, 0, 3, false);
    return this;
  }
}
