import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rig, isLookingAt } from '../Player/playerRig';

type Pose = { pos: [number, number, number]; rot?: number };

/**
 * An object that changes position only while the player isn't looking at it
 * ("toys move when you look away"). Once `armed`, it waits until its spot is
 * out of view, then snaps to pose B and calls onMoved.
 */
export function MovingProp({ a, b, armed, onMoved, children }: { a: Pose; b: Pose; armed: boolean; onMoved?: () => void; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const st = useRef({ moved: false, unseen: 0 });
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || st.current.moved || !armed) return;
    const seen = isLookingAt(new THREE.Vector3(...a.pos), 0.35) || rig.pos.distanceTo(new THREE.Vector3(a.pos[0], 0, a.pos[2])) < 1.2;
    st.current.unseen = seen ? 0 : st.current.unseen + dt;
    if (st.current.unseen > 0.8) {
      st.current.moved = true;
      g.position.set(...b.pos);
      g.rotation.y = b.rot ?? 0;
      onMoved?.();
    }
  });
  return (
    <group ref={ref} position={a.pos} rotation={[0, a.rot ?? 0, 0]}>
      {children}
    </group>
  );
}
