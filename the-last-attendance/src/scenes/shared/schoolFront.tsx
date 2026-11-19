import { PropModel } from '@/components/Environment/PropModel';
import { Sign } from '@/components/Environment/Props';
import type { LevelBuilder } from '@/components/Environment/LevelBuilder';

/**
 * The front of Bubog National High School: street, gate, courtyard (flagpole, tree, benches,
 * planters) and the two-storey facade with the main entrance at z = 6. Used by Chapter 1 and by
 * the ABSENT ending, so the school you walk away from is the one you walked into.
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
  // facade (two storeys) with the main entrance
  b.wall(-22, 6, 22, 6, { h: 7, t: 0.3, openings: [{ at: 22, w: 2.4, h: 2.6 }, { at: 8, w: 1.8, h: 1.3, y: 1.1 }, { at: 14, w: 1.8, h: 1.3, y: 1.1 }, { at: 30, w: 1.8, h: 1.3, y: 1.1 }, { at: 36, w: 1.8, h: 1.3, y: 1.1 }] });
  for (let i = 0; i < 8; i++) { const x = -18 + i * 5.2; b.box(x, 4.6, 6.17, 1.8, 1.3, 0.05, 'glass'); b.box(x, 3.9, 6.25, 2.0, 0.08, 0.2, 'trim'); }
  b.box(0, 7.1, 0, 44.6, 0.3, 12.6, 'concrete'); // roof slab
  b.box(0, 3.4, 6.35, 44, 0.15, 0.4, 'concrete'); // ledge
  b.box(-22.05, 3.6, 0, 0.3, 7.2, 12, 'plaster'); b.box(22.05, 3.6, 0, 0.3, 7.2, 12, 'plaster');
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
 * Models around the school front: the Philippine flag in the courtyard, and (backdrop) the rest
 * of the campus over the fence plus the neighbouring school across the street.
 */
export function SchoolFrontModels({ backdrop = true, tint }: { backdrop?: boolean; tint?: string }) {
  return (
    <>
      <PropModel model="prop_flag" position={[-8, 0.5, 20]} height={6} rotationY={-Math.PI / 2} animate />
      {backdrop && (
        <>
          <PropModel model="env_construction_school" position={[-50, 0, 22]} width={44} rotationY={Math.PI / 2} tint={tint ?? '#59606e'} shadows={false} />
          <PropModel model="env_library" position={[36, 0, 24]} height={11} rotationY={-Math.PI / 2} tint={tint ?? '#5a5a66'} shadows={false} />
          {/* across the street, behind you at the gate */}
          <PropModel model="env_school_exterior" position={[0, 0, 74]} width={40} rotationY={0} tint={tint ?? '#5a5a66'} shadows={false} />
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
