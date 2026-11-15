import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { useSettings } from '../../store/settingsStore';
import { B } from './Props';

/** Objects on this layer are only visible inside mirrors. */
export const MIRROR_LAYER = 1;

/**
 * A real reflective mirror (three.js Reflector). The reflection camera also
 * renders MIRROR_LAYER, which is how the game shows things that exist only
 * in reflections — the player's own body and the Figure standing behind him.
 */
export function Mirror({ pos, rot = 0, w = 0.9, h = 1.6, cracked = false }: { pos: [number, number, number]; rot?: number; w?: number; h?: number; cracked?: boolean }) {
  const quality = useSettings((s) => s.quality);
  const reflector = useMemo(() => {
    const res = quality === 'low' ? 256 : quality === 'medium' ? 512 : 1024;
    const r = new Reflector(new THREE.PlaneGeometry(w, h), {
      textureWidth: res,
      textureHeight: Math.round((res * h) / w),
      color: new THREE.Color(cracked ? 0x6a6a6a : 0x8a8a88),
      clipBias: 0.003,
    });
    r.camera.layers.enable(MIRROR_LAYER);
    return r;
  }, [w, h, quality, cracked]);

  useEffect(
    () => () => {
      reflector.geometry.dispose();
      (reflector.material as THREE.Material).dispose();
      reflector.getRenderTarget().dispose();
    },
    [reflector],
  );

  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <primitive object={reflector} position={[0, 0, 0.012]} />
      <B p={[0, h / 2 + 0.04, 0]} s={[w + 0.12, 0.08, 0.04]} m="dark_wood" />
      <B p={[0, -h / 2 - 0.04, 0]} s={[w + 0.12, 0.08, 0.04]} m="dark_wood" />
      <B p={[w / 2 + 0.04, 0, 0]} s={[0.08, h, 0.04]} m="dark_wood" />
      <B p={[-w / 2 - 0.04, 0, 0]} s={[0.08, h, 0.04]} m="dark_wood" />
      {cracked && (
        <mesh position={[0.1, 0.2, 0.016]} rotation={[0, 0, 0.6]}>
          <planeGeometry args={[0.01, h * 0.7]} />
          <meshBasicMaterial color="#cfcfcf" transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
}
