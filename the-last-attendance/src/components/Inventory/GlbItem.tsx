import { Suspense, type ReactNode } from 'react';
import type { ItemModel as ItemModelKind } from '@/types';
import type { EnvModelId } from '@/components/Environment/EnvModel';
import { PropModel } from '@/components/Environment/PropModel';

interface GlbItemSpec {
  model: EnvModelId;
  /** Largest dimension in metres. */
  size: number;
  tint?: string;
  hide?: RegExp;
  only?: RegExp;
  /** Extra yaw so the item lies naturally. */
  yaw?: number;
}

/** Item kinds that use a Sketchfab GLB (see README credits) instead of the procedural stand-in. */
export const GLB_ITEMS: Partial<Record<ItemModelKind, GlbItemSpec>> = {
  flashlight: { model: 'item_flashlight', size: 0.24 },
  phone: { model: 'item_phone', size: 0.12 },
  key: { model: 'item_key', size: 0.08, tint: '#e0b868' },
  clip: { model: 'item_hair_clip', size: 0.06, tint: '#9fb0ff' },
  glasses: { model: 'item_glasses', size: 0.14, only: /Large_Framed|^(Glass|Frame|Arms|Metal)_1$/ },
  cord: { model: 'item_power_strip', size: 0.5, tint: '#5a4438' },
  book: { model: 'item_notebook', size: 0.24, yaw: 0.4 },
  jersey: { model: 'item_jersey', size: 0.55, tint: '#c02a2a' },
  basketball: { model: 'item_basketball', size: 0.24 },
  sketchbook: { model: 'item_sketchbook', size: 0.3, hide: /table_top/ },
  recorder: { model: 'item_recorder', size: 0.26, yaw: 0.5 },
  rubiks: { model: 'item_rubiks', size: 0.06, yaw: 0.6 },
  umbrella: { model: 'item_umbrella', size: 0.85, hide: /Serum/ },
  rosary: { model: 'item_rosary', size: 0.22 },
  teddy: { model: 'item_teddy', size: 0.32, hide: /floor/i },
  handbag: { model: 'item_handbag', size: 0.32, tint: '#8a5a3a', yaw: -0.5 },
};

/** Renders a GLB item, falling back to `fallback` while it loads. `centered` puts its centre at the origin (inspect view). */
export function GlbItem({ kind, fallback, centered = false, tint }: { kind: ItemModelKind; fallback: ReactNode; centered?: boolean; tint?: string }) {
  const spec = GLB_ITEMS[kind];
  if (!spec) return <>{fallback}</>;
  return (
    <Suspense fallback={fallback}>
      <PropModel model={spec.model} position={[0, 0, 0]} rotationY={spec.yaw ?? 0} fit={spec.size} tint={tint ?? spec.tint} hide={spec.hide} only={spec.only} anchor={centered ? 'center' : 'floor'} />
    </Suspense>
  );
}
