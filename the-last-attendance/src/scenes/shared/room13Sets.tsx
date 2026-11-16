import { useEffect, useMemo } from 'react';
import { EnvModel, type EnvModelId } from '@/components/Environment/EnvModel';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';

type XZ = [number, number];

/**
 * A Room 13 built from an environment model. Anchors are in the model's own PLAN coordinates
 * (metres, as shown by #/viewer?m=<id>&top=2: model centred, unrotated, -Z up on screen).
 * `rotationY` turns the room so its doorway faces the hallway (world +Z, "south").
 */
export interface RoomSet {
  model: EnvModelId;
  rotationY: number;
  /** Half extents of the interior in plan coordinates. */
  half: XZ;
  hide?: RegExp;
  /** Doorway: plan-space centre on a wall, its width, and the plan axis the opening runs along. */
  door: { at: XZ; width: number; along: 'x' | 'z' };
  /** Direction students face, in plan space (unit vector toward the blackboard). */
  facing: XZ;
  teacher: XZ;
  desk: XZ;
  deskTop: number;
  /** Centre of the blackboard surface (plan) and the chalk area width. */
  board: XZ;
  boardWidth: number;
  /** Where ghost students stand (behind each chair): 11 students + Alex. */
  seats: XZ[];
  /** The unrecorded desk at the back (Mara). */
  extraSeat: XZ;
  /** Just inside the doorway. */
  entry: XZ;
}

/** "Abandoned classroom" — Room 13 in 2028. Plan: board at -Z, windows at -X, lockers at +Z. */
export const ROOM_ABANDONED: RoomSet = {
  model: 'env_abandoned_classroom',
  rotationY: -Math.PI / 2, // board ends up on the east wall; the plan's east wall becomes the hallway wall
  half: [2.72, 5.42],
  door: { at: [2.72, 4.15], width: 1.2, along: 'z' },
  facing: [0, -1],
  teacher: [0.3, -4.55],
  desk: [0, -3.9],
  deskTop: 0.8,
  board: [0, -5.3],
  boardWidth: 2.8,
  seats: [
    [-1.2, -1.8], [2.13, -2.05], [-1.87, -1.4], [1.67, -1.45], [2.2, -0.35], [-1.87, 0.2],
    [1.73, 0.55], [-1.87, 1.45], [2.07, 1.65], [-1.13, 2.4], [1.93, 2.35], [-0.67, 3.2],
  ],
  extraSeat: [-0.33, 4.45],
  entry: [2.0, 4.0],
};

/** "Classroom" — Room 13 on March 9, 2018 (and restored). Plan: board at +Z, door on -X, windows +X. */
export const ROOM_2018: RoomSet = {
  model: 'env_classroom',
  rotationY: Math.PI,
  half: [4.0, 5.0],
  hide: /casiers/i,
  door: { at: [0.5, -5.0], width: 1.1, along: 'x' },
  facing: [0, 1],
  teacher: [0.07, 4.25],
  desk: [0.07, 3.43],
  deskTop: 0.79,
  board: [0, 4.92],
  boardWidth: 3.6,
  seats: [
    [2.93, 1.6], [1.07, 1.6], [-0.8, 1.6], [-2.64, 1.6],
    [2.93, 0.23], [1.07, 0.23], [-0.8, 0.23], [-2.64, 0.23],
    [2.93, -1.14], [1.07, -1.14], [-0.8, -1.14], [-2.64, -1.14],
  ],
  extraSeat: [2.93, -3.86],
  entry: [0.5, -4.1],
};

/** Places a room so its centre is at (cx, cz); converts plan coordinates to world. */
export function roomAt(set: RoomSet, cx: number, cz: number) {
  const c = Math.cos(set.rotationY), s = Math.sin(set.rotationY);
  const rot = (l: XZ): XZ => [l[0] * c + l[1] * s, -l[0] * s + l[1] * c];
  const w = (l: XZ): XZ => { const r = rot(l); return [cx + r[0], cz + r[1]]; };
  const quarter = Math.abs(Math.round(Math.sin(set.rotationY))) === 1;
  const hx = quarter ? set.half[1] : set.half[0], hz = quarter ? set.half[0] : set.half[1];
  const door = w(set.door.at);
  const f = rot(set.facing);
  const studentYaw = Math.atan2(-f[0], -f[1]);
  return {
    set,
    /** Plan → world position. */
    p: (l: XZ, y = 0): [number, number, number] => { const r = w(l); return [r[0], y, r[1]]; },
    xz: w,
    min: [cx - hx, cz - hz] as XZ,
    max: [cx + hx, cz + hz] as XZ,
    centre: [cx, cz] as XZ,
    doorX: door[0],
    southZ: cz + hz,
    /** Yaw for someone facing the blackboard (students) and facing the class (teacher). */
    studentYaw,
    teacherYaw: studentYaw + Math.PI,
    /** Rotation for a plane on the blackboard facing the class (a plane's front faces local +Z). */
    boardRotY: studentYaw,
    /** A point just in front of the board surface. */
    boardFront: (y: number): [number, number, number] => {
      const b = w(set.board);
      return [b[0] - f[0] * 0.07, y, b[1] - f[1] * 0.07];
    },
    /** A point on the students' side of the teacher's desk. */
    deskFront: (y: number): [number, number, number] => {
      const d = w(set.desk);
      return [d[0] - f[0] * 0.5, y, d[1] - f[1] * 0.5];
    },
  };
}
export type PlacedRoom = ReturnType<typeof roomAt>;

/**
 * Renders a Room 13 model with mesh-generated colliders, a doorway cut through its south wall,
 * and invisible boundary walls (so nobody can leave through gaps in the model).
 */
export function Room13Model({ room, tint, lift = 0, hideExtra, shadows = true, clearExtra }: { room: PlacedRoom; tint?: string; lift?: number; hideExtra?: RegExp; shadows?: boolean; /** Extra world XZ rects kept walkable. */ clearExtra?: [number, number, number, number][] }) {
  const { set } = room;
  const position = useMemo<[number, number, number]>(() => [room.centre[0], 0, room.centre[1]], [room.centre]);
  const dw = set.door.width / 2;
  const hole = useMemo<[number, number, number, number, number, number]>(
    () => [room.doorX - dw, -0.1, room.southZ - 0.7, room.doorX + dw, 2.2, room.southZ + 0.7], [room.doorX, room.southZ, dw]);
  const clear = useMemo<[number, number, number, number][]>(
    () => [[room.doorX - dw - 0.35, room.southZ - 0.9, room.doorX + dw + 0.35, room.southZ + 1.0], ...(clearExtra ?? [])], [room.doorX, room.southZ, dw, clearExtra]);
  const hide = useMemo(() => {
    const parts = [set.hide?.source, hideExtra?.source].filter(Boolean);
    return parts.length ? new RegExp(parts.join('|'), 'i') : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.hide, hideExtra?.source]);

  useEffect(() => {
    const t = 0.15, [x0, z0] = room.min, [x1, z1] = room.max;
    const ids = [
      CollisionSystem.add({ minX: x0 - t, maxX: x1 + t, minZ: z0 - t, maxZ: z0, minY: 0, maxY: 3, opaque: true }),
      CollisionSystem.add({ minX: x0 - t, maxX: x0, minZ: z0, maxZ: z1, minY: 0, maxY: 3, opaque: true }),
      CollisionSystem.add({ minX: x1, maxX: x1 + t, minZ: z0, maxZ: z1, minY: 0, maxY: 3, opaque: true }),
      CollisionSystem.add({ minX: x0 - t, maxX: room.doorX - dw, minZ: z1, maxZ: z1 + t, minY: 0, maxY: 3, opaque: true }),
      CollisionSystem.add({ minX: room.doorX + dw, maxX: x1 + t, minZ: z1, maxZ: z1 + t, minY: 0, maxY: 3, opaque: true }),
    ];
    return () => ids.forEach((id) => CollisionSystem.remove(id));
  }, [room.min, room.max, room.doorX, dw]);

  return <EnvModel model={set.model} position={position} rotationY={set.rotationY} tint={tint} lift={lift} hide={hide} collide clear={clear} hole={hole} shadows={shadows} />;
}
