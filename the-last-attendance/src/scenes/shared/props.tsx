import { Suspense } from 'react';
import { PropModel } from '@/components/Environment/PropModel';
import type { Rot } from '@/components/Environment/LevelBuilder';

/**
 * Model-based replacements for LevelBuilder furniture. The builder keeps the colliders
 * (call it with visual = false); these draw the GLB in the same footprint.
 * Rotation follows the builder convention: local -Z is the front, `r` quarter turns.
 * glTF models face +Z, hence the extra half turn.
 */
const ONE_CABINET = /_low004_/;
const LOCKER_FLOOR = /Material\.002/;
const FIRE_GROUND = /Plane/;

const yaw = (r: Rot) => r * (Math.PI / 2) + Math.PI;

/** One filing cabinet taken from the "Filing Cabinets" set. */
export function GlbCabinet({ x, z, r = 0, w = 0.9, h = 1.9, d = 0.5, tint }: { x: number; z: number; r?: Rot; w?: number; h?: number; d?: number; tint?: string }) {
  return (
    <Suspense fallback={null}>
      <PropModel model="prop_filing_cabinets" only={ONE_CABINET} position={[x, 0, z]} rotationY={yaw(r)} size={[w, h, d]} tint={tint} />
    </Suspense>
  );
}

/** A bank of lockers along the builder's lockers() layout. */
export function GlbLockers({ x, z, r, count, tint }: { x: number; z: number; r: Rot; count: number; tint?: string }) {
  const w = 0.45;
  const c = Math.cos(r * (Math.PI / 2)), s = Math.sin(r * (Math.PI / 2));
  return (
    <Suspense fallback={null}>
      {Array.from({ length: count }, (_, i) => {
        const lx = (i - (count - 1) / 2) * w;
        return <PropModel key={i} model="prop_locker" hide={LOCKER_FLOOR} position={[x + lx * c, 0, z - lx * s]} rotationY={yaw(r)} size={[w - 0.02, 1.9, 0.5]} tint={tint} />;
      })}
    </Suspense>
  );
}

/** Animated fire (and its smoke column). */
export function GlbFire({ position, height = 2.6 }: { position: [number, number, number]; height?: number }) {
  return (
    <Suspense fallback={null}>
      <PropModel model="prop_fire" hide={FIRE_GROUND} position={position} height={height} animate shadows={false} />
    </Suspense>
  );
}
