import { PropModel } from '@/components/Environment/PropModel';
import type { EnvModelId } from '@/components/Environment/EnvModel';
import type { PlacedRoom } from './room13Sets';

type XZ = [number, number];
type V3 = [number, number, number];

/** Plan point just beside a seat (to the student's right, slightly toward the desk), on the floor. */
export function beside(seat: XZ, facing: XZ = [0, 0], side = 0.42, fwd = 0.15): XZ {
  // perpendicular of the facing vector (plan); seats in both rooms face ±Z
  const f = facing[0] || facing[1] ? facing : [0, -1];
  return [seat[0] + -f[1] * side + f[0] * fwd, seat[1] + f[0] * side + f[1] * fwd];
}

interface Piece { model: EnvModelId; fit: number; yaw: number; tint?: string; hide?: RegExp }

/** What lies beside each desk: bags, books and school things, chosen per seat so the room looks lived in. */
const FLOOR: Piece[] = [
  { model: 'prop_backpack', fit: 0.48, yaw: 0.3 },
  { model: 'prop_books', fit: 0.32, yaw: 1.1 },
  { model: 'prop_backpack', fit: 0.46, yaw: -0.6, tint: '#8a3030' },
  { model: 'prop_water_bottle', fit: 0.22, yaw: 0.8 },
  { model: 'prop_backpack', fit: 0.47, yaw: 2.2, tint: '#2e4a7a' },
  { model: 'prop_pencil_set', fit: 0.24, yaw: -1.2 },
  { model: 'prop_shoe', fit: 0.28, yaw: 0.4 },
  { model: 'prop_backpack', fit: 0.45, yaw: 1.4, tint: '#4a6a3a' },
  { model: 'prop_books', fit: 0.3, yaw: -0.4 },
  { model: 'prop_calculator', fit: 0.16, yaw: 0.2 },
  { model: 'prop_backpack', fit: 0.48, yaw: -2.4 },
  { model: 'prop_sketchpad', fit: 0.34, yaw: 0.9 },
];

/**
 * Classroom clutter for a Room 13 set: belongings by every seat, a wall clock and (2018) the
 * electric fans that were running that night. `worn` darkens everything for the 2028 ruin.
 */
export function Room13Clutter({ room, worn = false, fans = false }: { room: PlacedRoom; worn?: boolean; fans?: boolean }) {
  const { set } = room;
  const t = worn ? '#8a7a72' : undefined;
  return (
    <group>
      {set.seats.map((s, i) => {
        const pc = FLOOR[i % FLOOR.length];
        const at = beside(s, set.facing, -0.42, 0.1);
        return <PropModel key={i} model={pc.model} position={room.p(at)} fit={pc.fit} rotationY={pc.yaw + i * 0.37} tint={worn ? '#8a7a72' : pc.tint} shadows={false} />;
      })}
      {/* teacher's desk: the attendance clipboard and a ballpen */}
      <PropModel model="prop_clipboard" position={room.p([set.desk[0] + 0.25, set.desk[1]], set.deskTop)} fit={0.3} rotationY={room.teacherYaw + 0.2} tint={t} shadows={false} />
      <PropModel model="prop_ballpen" position={room.p([set.desk[0] + 0.5, set.desk[1] + 0.05], set.deskTop + 0.005)} fit={0.14} rotationY={0.7} tint={t} shadows={false} anchor="floor" />
      <PropModel model="prop_pencil_case" position={room.p([set.desk[0] - 0.2, set.desk[1] + 0.1], set.deskTop)} fit={0.2} rotationY={1.3} tint={t} shadows={false} />
      <PropModel model="prop_ruler" position={room.p([set.desk[0] + 0.05, set.desk[1] - 0.12], set.deskTop + 0.003)} fit={0.3} rotationY={0.2} tint={t} shadows={false} />
      {fans && (
        <>
          <PropModel model="prop_desk_fan" position={room.p([set.desk[0] - 0.45, set.desk[1]], set.deskTop)} height={0.38} rotationY={room.teacherYaw} animate shadows={false} />
          <PropModel model="prop_electric_fan" position={room.p([set.half[0] - 0.6, -set.facing[1] * (set.half[1] - 1.8)])} height={1.25} rotationY={room.studentYaw + Math.PI / 2} animate shadows={false} />
        </>
      )}
    </group>
  );
}

/** Candles and sampaguita flowers for the Sampaguita section, with an empty photo frame. */
export function Memorial({ position, rotationY = 0, lit = true }: { position: V3; rotationY?: number; lit?: boolean }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <PropModel model="prop_candles" position={[0, 0, 0]} height={0.3} animate={lit} shadows={false} />
      <PropModel model="prop_jasmine" position={[0.32, 0, 0.05]} height={0.38} rotationY={0.6} shadows={false} />
      <PropModel model="prop_jasmine" position={[-0.3, 0, 0.1]} height={0.3} rotationY={2.1} shadows={false} />
      <PropModel model="prop_photo_frame" position={[0.05, 0, -0.22]} height={0.26} rotationY={Math.PI / 2} tint="#d8c8b8" shadows={false} />
      {lit && <pointLight position={[0, 0.45, 0]} color="#ffb060" intensity={2.2} distance={3.2} decay={2} />}
    </group>
  );
}
