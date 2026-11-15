import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Interactable } from '../Interactions/Interactable';
import { world } from '../../systems/PhysicsSystem/world';
import { play } from '../../systems/AudioSystem/audioManager';
import { say } from '../../systems/DialogueSystem/dialogue';
import { boxGeometry, getMaterial } from './materials';

export interface DoorApi {
  setOpen: (open: boolean, opts?: { slow?: boolean; silent?: boolean; slam?: boolean }) => void;
  isOpen: () => boolean;
}

const doors = new Map<string, DoorApi>();
export const doorRegistry = {
  get: (id: string) => doors.get(id),
  clear: () => doors.clear(),
};
export function setDoor(id: string, open: boolean, opts?: Parameters<DoorApi['setOpen']>[1]) {
  doors.get(id)?.setOpen(open, opts);
}

export interface DoorProps {
  id: string;
  /** centre of the doorway at floor level */
  pos: [number, number, number];
  /** 'x' when the doorway is in a wall running along X */
  axis: 'x' | 'z';
  width?: number;
  height?: number;
  /** which way it swings (+1 / -1) */
  swing?: 1 | -1;
  startOpen?: boolean;
  /** return true to allow, or a line Elias says when it won't open */
  canOpen?: () => true | string;
  onOpen?: () => void;
  /** player can't close it again */
  noClose?: boolean;
  /** not interactive (scripted only) */
  scripted?: boolean;
  color?: string;
}

export function Door({
  id,
  pos,
  axis,
  width = 0.92,
  height = 2.1,
  swing = 1,
  startOpen = false,
  canOpen,
  onOpen,
  noClose = false,
  scripted = false,
  color,
}: DoorProps) {
  const pivot = useRef<THREE.Group>(null);
  const st = useRef({ open: startOpen, angle: startOpen ? swing * 1.65 : 0, speed: 3 });
  const colliderId = useRef<string>('');
  const cbs = useRef({ canOpen, onOpen });
  cbs.current = { canOpen, onOpen };

  const thickness = 0.06;
  const panel = useMemo(() => boxGeometry(width - 0.04, height - 0.02, thickness, 1), [width, height]);
  useEffect(() => () => panel.dispose(), [panel]);
  const mat = useMemo(() => getMaterial('dark_wood', color ? { color } : undefined), [color]);

  useEffect(() => {
    const half = width / 2;
    const box =
      axis === 'x'
        ? { minX: pos[0] - half, maxX: pos[0] + half, minY: pos[1], maxY: pos[1] + height, minZ: pos[2] - 0.06, maxZ: pos[2] + 0.06 }
        : { minX: pos[0] - 0.06, maxX: pos[0] + 0.06, minY: pos[1], maxY: pos[1] + height, minZ: pos[2] - half, maxZ: pos[2] + half };
    colliderId.current = world.addCollider(box, `door_${id}`);
    world.setColliderEnabled(colliderId.current, !st.current.open);
    const api: DoorApi = {
      setOpen: (open, opts = {}) => {
        if (open === st.current.open) return;
        st.current.open = open;
        st.current.speed = opts.slow ? 0.5 : opts.slam ? 9 : 2.6;
        world.setColliderEnabled(colliderId.current, !open);
        if (!opts.silent) {
          if (opts.slam) play('door_slam', { pos: [pos[0], 1.2, pos[2]], vol: 0.9 });
          else play('door_creak', { pos: [pos[0], 1.2, pos[2]], vol: opts.slow ? 0.7 : 0.45, rate: opts.slow ? 0.8 : 1.2 });
        }
      },
      isOpen: () => st.current.open,
    };
    doors.set(id, api);
    return () => {
      world.removeCollider(colliderId.current);
      doors.delete(id);
    };
  }, [id, axis, pos[0], pos[1], pos[2], width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const s = st.current;
    const target = s.open ? swing * 1.65 : 0;
    s.angle += (target - s.angle) * Math.min(1, dt * s.speed);
    if (pivot.current) pivot.current.rotation.y = s.angle;
  });

  // hinge on the "start" side of the opening
  const hinge: [number, number, number] = axis === 'x' ? [pos[0] - width / 2, pos[1], pos[2]] : [pos[0], pos[1], pos[2] + width / 2];
  const baseRot = axis === 'x' ? 0 : Math.PI / 2;

  const interact = () => {
    const s = st.current;
    if (s.open) {
      if (!noClose) doors.get(id)?.setOpen(false);
      return;
    }
    const ok = cbs.current.canOpen ? cbs.current.canOpen() : true;
    if (ok !== true) {
      play('lock', { pos: [pos[0], 1, pos[2]], vol: 0.5 });
      say([{ who: 'Elias', text: ok, voice: 'elias' }], { interrupt: true });
      return;
    }
    doors.get(id)?.setOpen(true);
    cbs.current.onOpen?.();
  };

  return (
    <group>
      <group position={hinge} rotation={[0, baseRot, 0]}>
        <group ref={pivot}>
          <mesh geometry={panel} material={mat} position={[width / 2, height / 2, 0]} castShadow receiveShadow />
          <mesh position={[width - 0.12, 1.0, 0.05]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color="#8b7a4e" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[width - 0.12, 1.0, -0.05]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshStandardMaterial color="#8b7a4e" metalness={0.8} roughness={0.35} />
          </mesh>
        </group>
      </group>
      {!scripted && (
        <Interactable
          id={`door_${id}`}
          at={[pos[0], 1.05, pos[2]]}
          reach={2.0}
          prompt={() => (st.current.open ? (noClose ? null : 'Close door') : 'Open door')}
          onInteract={interact}
        />
      )}
    </group>
  );
}
