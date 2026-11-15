import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boxGeometry, getMaterial, TILE, type MatKey } from './materials';
import { world, type AABB } from '../../systems/PhysicsSystem/world';
import { useSettings } from '../../store/settingsStore';

export interface Gap {
  /** distance along the wall from point a to the gap centre */
  at: number;
  w: number;
  /** top of the opening (door height), default 2.15 */
  h?: number;
  /** windows: bottom of the opening; adds glass and blocks walking through */
  sill?: number;
}

export interface WallDef {
  a: [number, number];
  b: [number, number];
  h?: number;
  y?: number;
  t?: number;
  mat?: MatKey;
  gaps?: Gap[];
  noCollide?: boolean;
}

export interface FloorDef {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  y?: number;
  mat: MatKey;
  /** ceiling height above the floor; omit for none */
  ceil?: number;
  ceilMat?: MatKey;
  walk?: boolean;
}

export interface BlockDef {
  p: [number, number, number];
  s: [number, number, number];
  mat: MatKey;
  collide?: boolean;
  /** skip shadows for small decoration */
  noShadow?: boolean;
}

export interface LevelGeometryProps {
  walls?: WallDef[];
  floors?: FloorDef[];
  blocks?: BlockDef[];
  /** colour of window glass (night sky, fire glow, sunrise...) */
  windowColor?: string;
}

interface Piece {
  mat: MatKey;
  geo: THREE.BufferGeometry;
}

function wallPieces(w: WallDef, out: Piece[], boxes: AABB[], glass: { p: THREE.Vector3; s: THREE.Vector3 }[]) {
  const h = w.h ?? 2.8;
  const y0 = w.y ?? 0;
  const t = w.t ?? 0.16;
  const mat = w.mat ?? 'wallpaper';
  const [ax, az] = w.a;
  const [bx, bz] = w.b;
  const alongX = Math.abs(bx - ax) >= Math.abs(bz - az);
  const L = alongX ? Math.abs(bx - ax) : Math.abs(bz - az);
  const sign = alongX ? Math.sign(bx - ax) || 1 : Math.sign(bz - az) || 1;
  const tile = TILE[mat] ?? 1.5;

  const seg = (s0: number, s1: number, yb: number, yt: number, collide = true) => {
    if (s1 - s0 < 0.001 || yt - yb < 0.001) return;
    const len = s1 - s0;
    const mid = (s0 + s1) / 2;
    const cx = alongX ? ax + sign * mid : ax;
    const cz = alongX ? az : az + sign * mid;
    const sx = alongX ? len : t;
    const sz = alongX ? t : len;
    const g = boxGeometry(sx, yt - yb, sz, tile);
    g.translate(cx, (yb + yt) / 2, cz);
    out.push({ mat, geo: g });
    if (collide && !w.noCollide)
      boxes.push({ minX: cx - sx / 2, maxX: cx + sx / 2, minY: yb, maxY: yt, minZ: cz - sz / 2, maxZ: cz + sz / 2 });
  };

  const gaps = [...(w.gaps ?? [])].sort((p, q) => p.at - q.at);
  let cursor = 0;
  for (const g of gaps) {
    const s0 = g.at - g.w / 2;
    const s1 = g.at + g.w / 2;
    seg(cursor, s0, y0, y0 + h);
    const top = y0 + (g.h ?? 2.15);
    seg(s0, s1, top, y0 + h);
    if (g.sill !== undefined) {
      seg(s0, s1, y0, y0 + g.sill);
      const mid = (s0 + s1) / 2;
      const cx = alongX ? ax + sign * mid : ax;
      const cz = alongX ? az : az + sign * mid;
      glass.push({
        p: new THREE.Vector3(cx, y0 + (g.sill + (g.h ?? 2.15)) / 2, cz),
        s: new THREE.Vector3(alongX ? g.w : 0.03, (g.h ?? 2.15) - g.sill, alongX ? 0.03 : g.w),
      });
      // windows block movement
      if (!w.noCollide)
        boxes.push({
          minX: cx - (alongX ? g.w / 2 : t / 2),
          maxX: cx + (alongX ? g.w / 2 : t / 2),
          minY: y0,
          maxY: y0 + h,
          minZ: cz - (alongX ? t / 2 : g.w / 2),
          maxZ: cz + (alongX ? t / 2 : g.w / 2),
        });
      // frame
      const fg = boxGeometry(alongX ? g.w + 0.1 : t + 0.06, 0.08, alongX ? t + 0.06 : g.w + 0.1, 1);
      fg.translate(cx, y0 + g.sill, cz);
      out.push({ mat: 'dark_wood', geo: fg });
      const cross = boxGeometry(alongX ? 0.05 : t * 0.5, (g.h ?? 2.15) - g.sill, alongX ? t * 0.5 : 0.05, 1);
      cross.translate(cx, y0 + (g.sill + (g.h ?? 2.15)) / 2, cz);
      out.push({ mat: 'dark_wood', geo: cross });
    }
    cursor = s1;
  }
  seg(cursor, L, y0, y0 + h);
}

/**
 * Builds static level geometry from data. Pieces are merged per material
 * (one draw call per material) and their colliders/floors registered.
 */
export function LevelGeometry({ walls = [], floors = [], blocks = [], windowColor = '#0d1622' }: LevelGeometryProps) {
  const quality = useSettings((s) => s.quality);
  const built = useMemo(() => {
    const pieces: Piece[] = [];
    const boxes: AABB[] = [];
    const glass: { p: THREE.Vector3; s: THREE.Vector3 }[] = [];
    walls.forEach((w) => wallPieces(w, pieces, boxes, glass));
    const floorDefs: { minX: number; maxX: number; minZ: number; maxZ: number; y: number }[] = [];
    for (const f of floors) {
      const w = Math.abs(f.x1 - f.x0);
      const d = Math.abs(f.z1 - f.z0);
      const cx = (f.x0 + f.x1) / 2;
      const cz = (f.z0 + f.z1) / 2;
      const y = f.y ?? 0;
      const g = boxGeometry(w, 0.1, d, TILE[f.mat] ?? 2);
      g.translate(cx, y - 0.05, cz);
      pieces.push({ mat: f.mat, geo: g });
      if (f.walk !== false)
        floorDefs.push({ minX: Math.min(f.x0, f.x1), maxX: Math.max(f.x0, f.x1), minZ: Math.min(f.z0, f.z1), maxZ: Math.max(f.z0, f.z1), y });
      if (f.ceil) {
        const cm = f.ceilMat ?? 'ceiling';
        const c = boxGeometry(w, 0.1, d, TILE[cm] ?? 2);
        c.translate(cx, y + f.ceil + 0.05, cz);
        pieces.push({ mat: cm, geo: c });
      }
    }
    for (const b of blocks) {
      const g = boxGeometry(b.s[0], b.s[1], b.s[2], TILE[b.mat] ?? 1);
      g.translate(b.p[0], b.p[1], b.p[2]);
      pieces.push({ mat: b.mat, geo: g });
      if (b.collide)
        boxes.push({
          minX: b.p[0] - b.s[0] / 2,
          maxX: b.p[0] + b.s[0] / 2,
          minY: b.p[1] - b.s[1] / 2,
          maxY: b.p[1] + b.s[1] / 2,
          minZ: b.p[2] - b.s[2] / 2,
          maxZ: b.p[2] + b.s[2] / 2,
        });
    }
    const byMat = new Map<MatKey, THREE.BufferGeometry[]>();
    for (const p of pieces) {
      const arr = byMat.get(p.mat) ?? [];
      arr.push(p.geo);
      byMat.set(p.mat, arr);
    }
    const merged: { mat: MatKey; geo: THREE.BufferGeometry }[] = [];
    for (const [mat, geos] of byMat) {
      const m = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (m) merged.push({ mat, geo: m });
    }
    return { merged, boxes, glass, floorDefs };
  }, [walls, floors, blocks]);

  useEffect(() => {
    const ids = built.boxes.map((b) => world.addCollider(b));
    const fids = built.floorDefs.map((f) => world.addFloor(f));
    return () => {
      ids.forEach((i) => world.removeCollider(i));
      fids.forEach((i) => world.removeFloor(i));
    };
  }, [built]);

  useEffect(() => () => built.merged.forEach((m) => m.geo.dispose()), [built]);

  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: windowColor,
        emissive: windowColor,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85,
      }),
    [windowColor],
  );
  useEffect(() => () => glassMat.dispose(), [glassMat]);
  const shadows = quality !== 'low';

  return (
    <group>
      {built.merged.map((m) => (
        <mesh key={m.mat} geometry={m.geo} material={getMaterial(m.mat)} receiveShadow={shadows} castShadow={shadows} />
      ))}
      {built.glass.map((g, i) => (
        <mesh key={i} position={g.p} material={glassMat}>
          <boxGeometry args={[g.s.x, g.s.y, g.s.z]} />
        </mesh>
      ))}
    </group>
  );
}

/** Convenience: four walls around a rectangle with optional gaps per side. */
export function room(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  opts: {
    mat?: MatKey;
    h?: number;
    y?: number;
    n?: Gap[];
    s?: Gap[];
    e?: Gap[];
    w?: Gap[];
    skip?: ('n' | 's' | 'e' | 'w')[];
  } = {},
): WallDef[] {
  const base = { mat: opts.mat, h: opts.h, y: opts.y };
  const out: WallDef[] = [];
  const skip = opts.skip ?? [];
  // north = min z, south = max z, west = min x, east = max x
  if (!skip.includes('n')) out.push({ ...base, a: [x0, z0], b: [x1, z0], gaps: opts.n });
  if (!skip.includes('s')) out.push({ ...base, a: [x0, z1], b: [x1, z1], gaps: opts.s });
  if (!skip.includes('w')) out.push({ ...base, a: [x0, z0], b: [x0, z1], gaps: opts.w });
  if (!skip.includes('e')) out.push({ ...base, a: [x1, z0], b: [x1, z1], gaps: opts.e });
  return out;
}
