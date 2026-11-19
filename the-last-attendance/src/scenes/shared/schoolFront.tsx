import { PropModel } from '@/components/Environment/PropModel';
import { Sign } from '@/components/Environment/Props';
import type { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { EnvModel } from '@/components/Environment/EnvModel';

type Box = [number, number, number, number, number, number];

/**
 * Placement of "Crenshaw High School - Main Building exterior" as Bubog National High School:
 * 1.75x scale, the centre of its front block on the main door (x = 0, front face z = 6) and its
 * ground level at y = 0. Measured from the model (see README credits).
 */
const SCHOOL_POS: [number, number, number] = [11.99, -1.85, -23.23];
const SCHOOL_SCALE = 1.75;
/** Half width of the building's front block (world metres). */
const BLOCK_HALF = 18.9;
/** Chapter 1: the inside of the school (lobby, hallway, rooms) and the main doorway are cut out of the model. */
const INTERIOR_CUTOUTS: Box[] = [
  [-20.4, -0.5, -14.6, 20.4, 3.8, 5.8],
  [-1.3, -0.5, 5.0, 1.3, 2.7, 7.5],
];

/**
 * The front of Bubog National High School: street, gate, courtyard (flagpole, tree, benches,
 * planters) and the two-storey facade with the main entrance at z = 6. Used by Chapter 1 and by
 * the ABSENT ending, so the school you walk away from is the one you walked into. The building is
 * the school model; this adds the street, gate, courtyard and the colliders along its front.
 */
export function addSchoolFront(b: LevelBuilder): void {
  b.floor(-24, 6, 24, 46, 'concrete');
  b.floor(-60, 46, 60, 96, 'concrete'); // the street and beyond
  b.box(0, -0.05, 41, 48, 0.1, 6, 'ash');
  b.wall(-22, 6.2, -22, 36, { h: 2.4, lower: null, upper: 'concrete', t: 0.3 });
  b.wall(22, 6.2, 22, 36, { h: 2.4, lower: null, upper: 'concrete', t: 0.3 });
  b.wall(-22, 36, 22, 36, { h: 2.4, lower: null, upper: 'concrete', t: 0.3, openings: [{ at: 22, w: 3.2, h: 2.4 }] });
  b.block(-24, 44, 24, 45); b.block(-24, 36, -23, 45); b.block(23, 36, 24, 45); // street limits
  b.box(-1.75, 1.4, 36, 0.3, 2.8, 0.4, 'concrete'); b.box(1.75, 1.4, 36, 0.3, 2.8, 0.4, 'concrete');
  b.box(0, 2.9, 36, 3.8, 0.25, 0.3, 'rust');
  // the school building itself is the Crenshaw-style model (SchoolFrontModels); its front face is z = 6.
  // Invisible facade colliders either side of the main door, and low walls closing the gaps
  // between the building's front block and the courtyard walls.
  b.block(-BLOCK_HALF, 5.85, -1.2, 6.15, 0, 4);
  b.block(1.2, 5.85, BLOCK_HALF, 6.15, 0, 4);
  b.wall(-22, 6, -BLOCK_HALF, 6, { h: 2.4, lower: null, upper: 'concrete', t: 0.3 });
  b.wall(BLOCK_HALF, 6, 22, 6, { h: 2.4, lower: null, upper: 'concrete', t: 0.3 });
  // courtyard props
  b.block(-8.1, 19.9, -7.9, 20.1); // flagpole (model)
  b.solid(-8, 0.25, 20, 1.2, 0.5, 1.2, 'concrete');
  b.solid(10, 1.6, 22, 0.5, 3.2, 0.5, 'darkwood'); // tree trunk
  [[10, 4.2, 22, 2.6], [9, 3.6, 21, 1.8], [11.2, 3.8, 23, 2]].forEach(([x, y, z, s]) => b.box(x, y, z, s, s * 0.8, s, 'grass'));
  b.solid(-14, 0.3, 14, 2.4, 0.08, 0.5, 'wood'); b.box(-15, 0.15, 14, 0.1, 0.3, 0.4, 'metal'); b.box(-13, 0.15, 14, 0.1, 0.3, 0.4, 'metal');
  b.solid(14, 0.3, 12, 2.4, 0.08, 0.5, 'wood');
  b.solid(-4, 0.35, 10, 4, 0.7, 1, 'concrete'); b.box(-4, 0.72, 10, 3.8, 0.05, 0.8, 'grass');
  b.solid(4, 0.35, 10, 4, 0.7, 1, 'concrete'); b.box(4, 0.72, 10, 3.8, 0.05, 0.8, 'grass');
  b.debris(3, 26, 6, 18, 'ash');
}

/**
 * The school building, the Philippine flag in the courtyard and (backdrop) the rest of the campus
 * over the fence. `interior`: cut the model open where Chapter 1's lobby, hallway and rooms are.
 */
export function SchoolFrontModels({ backdrop = true, tint, interior = false }: { backdrop?: boolean; tint?: string; interior?: boolean }) {
  return (
    <>
      <EnvModel model="env_school_exterior" position={SCHOOL_POS} scale={SCHOOL_SCALE} tint={tint ?? '#a8a296'} shadows={false} cutouts={interior ? INTERIOR_CUTOUTS : undefined} />
      <PropModel model="prop_flag" position={[-8, 0.5, 20]} height={6} rotationY={-Math.PI / 2} animate />
      {backdrop && (
        <>
          <PropModel model="env_construction_school" position={[-50, 0, 22]} width={44} rotationY={Math.PI / 2} tint={tint ?? '#59606e'} shadows={false} />
          <PropModel model="env_library" position={[36, 0, 24]} height={11} rotationY={-Math.PI / 2} tint={tint ?? '#5a5a66'} shadows={false} />
        </>
      )}
    </>
  );
}

export function SchoolFrontSigns() {
  return (
    <>
      <Sign position={[0, 5.4, 6.2]} size={[6, 0.8]} lines={['BUBOG NATIONAL HIGH SCHOOL']} bg="#cfc6a8" color="#2a2a2a" />
      <Sign position={[0, 1.4, 36.25]} rotation={[0, Math.PI, 0]} size={[1.4, 0.5]} lines={['CLOSED BY ORDER', 'OF THE DIVISION']} bg="#b9a77a" />
    </>
  );
}
