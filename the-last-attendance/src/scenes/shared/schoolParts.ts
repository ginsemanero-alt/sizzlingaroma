import { LevelBuilder, type Opening, type Rot } from '@/components/Environment/LevelBuilder';

/**
 * Room 13 layout (shared by Chapter 1, Chapter 6 and the endings).
 * Spans x ∈ [ox, ox+10], z ∈ [oz-8.5, oz]. Door on the south wall near the east end,
 * windows on the east wall, blackboard on the north wall.
 */
export const R13 = { w: 10, d: 8.5 };

export function room13Seats(ox: number, oz: number): { x: number; z: number; col: number; row: number }[] {
  const seats: { x: number; z: number; col: number; row: number }[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) seats.push({ x: ox + 2 + col * 2, z: oz - 5 + row * 1.45, col, row });
  }
  return seats;
}

export function addRoom13(b: LevelBuilder, ox: number, oz: number, o: { toppled?: boolean; skipSouth?: boolean; doorAt?: number; extraDesk?: boolean } = {}): void {
  const doorAt = o.doorAt ?? 8.6;
  b.room(ox, oz - R13.d, ox + R13.w, oz, {
    floor: 'floorWood',
    s: [{ at: doorAt, w: 1.1, h: 2.2 }],
    e: [{ at: 1.6, w: 1.6, h: 1.4, y: 1.0 }, { at: 4.2, w: 1.6, h: 1.4, y: 1.0 }, { at: 6.8, w: 1.6, h: 1.4, y: 1.0 }],
    skip: o.skipSouth ? ['s'] : [],
  });
  b.blackboard(ox + 5, oz - R13.d + 0.13, 0, 4.2);
  b.box(ox + 5, 0.1, oz - 7.6, 6, 0.2, 1.6, 'darkwood'); // teacher platform
  b.block(ox + 2, oz - 8.4, ox + 8, oz - 6.8, 0, 0.2, false);
  b.teacherDesk(ox + 5, oz - 6.6, 2);
  b.chair(ox + 5, oz - 7.3, 2);
  room13Seats(ox, oz).forEach((s, i) => b.desk(s.x, s.z, 0, !!o.toppled && i % 3 === 1));
  if (o.extraDesk) b.desk(ox + 9.1, oz - 0.9, 0);
  b.cabinet(ox + 0.5, oz - 1.2, 3, 0.9, 1.9, 0.5, 'metal');
  b.bookshelf(ox + 0.35, oz - 3.6, 3, 1.8, 1.4);
}

/** Generic classroom with desks in rows facing north. */
export function addClassroom(
  b: LevelBuilder, x0: number, z0: number, x1: number, z1: number,
  o: { n?: Opening[]; s?: Opening[]; e?: Opening[]; w?: Opening[]; cols?: number; rows?: number; toppled?: number[]; skip?: ('n' | 's' | 'e' | 'w')[]; board?: boolean } = {},
): { seats: { x: number; z: number }[] } {
  b.room(x0, z0, x1, z1, { floor: 'floorWood', n: o.n, s: o.s, e: o.e, w: o.w, skip: o.skip });
  if (o.board !== false) b.blackboard((x0 + x1) / 2, z0 + 0.13, 0, 3.6);
  const cols = o.cols ?? 4, rows = o.rows ?? 3;
  const seats: { x: number; z: number }[] = [];
  const w = x1 - x0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + w * ((c + 1) / (cols + 1));
    const z = z0 + 3.2 + r * 1.45;
    const i = r * cols + c;
    b.desk(x, z, 0 as Rot, !!o.toppled?.includes(i));
    seats.push({ x, z });
  }
  b.teacherDesk((x0 + x1) / 2, z0 + 1.6, 2);
  return { seats };
}
