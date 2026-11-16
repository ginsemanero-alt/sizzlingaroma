import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';

/** Grid-based A* navigation built from the collision system. Rebuilt lazily when colliders change. */
export class NavGrid {
  private w = 0;
  private h = 0;
  private blocked: Uint8Array = new Uint8Array(0);
  private builtVersion = -1;

  constructor(private minX: number, private minZ: number, private maxX: number, private maxZ: number, private radius = 0.32, private cell = 0.4) {}

  private ensure(): void {
    if (this.builtVersion === CollisionSystem.version) return;
    this.w = Math.ceil((this.maxX - this.minX) / this.cell);
    this.h = Math.ceil((this.maxZ - this.minZ) / this.cell);
    this.blocked = new Uint8Array(this.w * this.h);
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = this.minX + (i + 0.5) * this.cell;
        const z = this.minZ + (j + 0.5) * this.cell;
        this.blocked[j * this.w + i] = CollisionSystem.overlaps(x, z, this.radius) ? 1 : 0;
      }
    }
    this.builtVersion = CollisionSystem.version;
  }

  private toCell(x: number, z: number): [number, number] {
    return [
      Math.max(0, Math.min(this.w - 1, Math.floor((x - this.minX) / this.cell))),
      Math.max(0, Math.min(this.h - 1, Math.floor((z - this.minZ) / this.cell))),
    ];
  }

  isFree(x: number, z: number): boolean {
    this.ensure();
    const [i, j] = this.toCell(x, z);
    return this.blocked[j * this.w + i] === 0;
  }

  /** Nearest free cell centre to a point, searching outward. */
  nearestFree(x: number, z: number): [number, number] | null {
    this.ensure();
    const [ci, cj] = this.toCell(x, z);
    for (let r = 0; r < 12; r++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = ci + di, j = cj + dj;
          if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue;
          if (!this.blocked[j * this.w + i]) return [i, j];
        }
      }
    }
    return null;
  }

  /** Returns a list of world-space waypoints (x,z) or null if unreachable. */
  findPath(sx: number, sz: number, tx: number, tz: number, maxNodes = 6000): [number, number][] | null {
    this.ensure();
    const s = this.nearestFree(sx, sz);
    const t = this.nearestFree(tx, tz);
    if (!s || !t) return null;
    const W = this.w;
    const start = s[1] * W + s[0];
    const goal = t[1] * W + t[0];
    if (start === goal) return [[tx, tz]];

    const g = new Map<number, number>();
    const came = new Map<number, number>();
    const open: { n: number; f: number }[] = [{ n: start, f: 0 }];
    g.set(start, 0);
    const closed = new Set<number>();
    const gi = t[0], gj = t[1];
    let expanded = 0;

    while (open.length) {
      // small open lists — linear min search is fine and allocation-free
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (open[k].f < open[bi].f) bi = k;
      const cur = open[bi].n;
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === goal) break;
      if (closed.has(cur)) continue;
      closed.add(cur);
      if (++expanded > maxNodes) return null;
      const ci = cur % W, cj = (cur - ci) / W;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di, nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= W || nj >= this.h) continue;
          const nn = nj * W + ni;
          if (this.blocked[nn]) continue;
          if (di && dj && (this.blocked[cj * W + ni] || this.blocked[nj * W + ci])) continue; // no corner cutting
          const cost = (g.get(cur) ?? 0) + (di && dj ? 1.414 : 1);
          if (cost < (g.get(nn) ?? Infinity)) {
            g.set(nn, cost);
            came.set(nn, cur);
            const hx = Math.abs(ni - gi), hz = Math.abs(nj - gj);
            open.push({ n: nn, f: cost + Math.max(hx, hz) + 0.414 * Math.min(hx, hz) });
          }
        }
      }
    }
    if (!came.has(goal)) return null;
    const cells: number[] = [];
    let c: number | undefined = goal;
    while (c !== undefined && c !== start) { cells.push(c); c = came.get(c); }
    cells.reverse();
    const pts: [number, number][] = cells.map((n) => {
      const i = n % W, j = (n - i) / W;
      return [this.minX + (i + 0.5) * this.cell, this.minZ + (j + 0.5) * this.cell];
    });
    return this.smooth([sx, sz], pts);
  }

  /** String-pulling: drop waypoints that have a clear straight line. */
  private smooth(from: [number, number], pts: [number, number][]): [number, number][] {
    if (pts.length < 3) return pts;
    const out: [number, number][] = [];
    let anchor = from;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clearLine(anchor, pts[j])) j--;
      out.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return out;
  }

  private clearLine(a: [number, number], b: [number, number]): boolean {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const steps = Math.ceil(Math.hypot(dx, dz) / (this.cell * 0.5));
    for (let k = 1; k <= steps; k++) {
      const x = a[0] + (dx * k) / steps, z = a[1] + (dz * k) / steps;
      const [i, j] = this.toCell(x, z);
      if (this.blocked[j * this.w + i]) return false;
    }
    return true;
  }
}
