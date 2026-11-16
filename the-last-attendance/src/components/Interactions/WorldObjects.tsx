import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Interactable } from './Interactable';
import { ItemModel } from '@/components/Inventory/ItemModel';
import { ITEMS } from '@/data/items';
import { game, useGame } from '@/store/gameStore';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { bus, runtime } from '@/systems/runtime';

type V3 = [number, number, number];

/** A collectible item lying in the world. Disappears once collected. */
export function Pickup({
  item, position, rotation, verb = 'Collect', onCollect, open = true, label, color, hidden = false, range,
}: { item: string; position: V3; rotation?: V3; verb?: string; onCollect?: () => void; open?: boolean; label?: string; color?: string; hidden?: boolean; range?: number }) {
  const has = useGame((s) => s.collected.includes(item));
  const def = ITEMS[item];
  if (has || hidden || !def) return null;
  return (
    <Interactable
      id={`pickup_${item}`}
      position={position}
      rotation={rotation}
      radius={0.22}
      range={range ?? 2.1}
      glint
      prompt={`${verb}: ${def.name}`}
      onInteract={() => {
        AudioSystem.play(def.category === 'document' || def.category === 'photo' ? 'paper' : 'pickup');
        game().collect(item, { open });
        onCollect?.();
      }}
    >
      <ItemModel kind={def.model} label={label} color={color} />
    </Interactable>
  );
}

/** Flashlight battery pickup. */
export function BatteryPickup({ id, position }: { id: string; position: V3 }) {
  const taken = useGame((s) => !!s.flags[`bat_${id}`]);
  if (taken) return null;
  return (
    <Interactable
      id={`battery_${id}`}
      position={position}
      radius={0.15}
      glint
      prompt="Take batteries"
      onInteract={() => {
        game().setFlag(`bat_${id}`, true);
        runtime.battery = Math.min(100, runtime.battery + 45);
        AudioSystem.play('pickup');
        game().notify('Flashlight battery +45%', 'item');
      }}
    >
      <group rotation={[0, 0.4, Math.PI / 2]} position={[0, 0.03, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.05, 10]} />
          <meshStandardMaterial color="#c9a21a" />
        </mesh>
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.05, 10]} />
          <meshStandardMaterial color="#c9a21a" />
        </mesh>
      </group>
    </Interactable>
  );
}

export interface DoorProps {
  id: string;
  /** Hinge-side centre of the door opening. */
  position: V3;
  /** 'x' when the wall runs along X (door slides on the X axis), 'z' otherwise. */
  axis: 'x' | 'z';
  width?: number;
  height?: number;
  /** Lock state; when a string, it's the message shown when locked. */
  locked?: boolean;
  lockedText?: string;
  /** Opening swing direction (+1 / -1). */
  swing?: 1 | -1;
  /** Externally controlled open state (flag name). */
  flag?: string;
  startOpen?: boolean;
  onOpen?: () => void;
  onLockedTry?: () => void;
  color?: string;
  double?: boolean;
  metal?: boolean;
  noInteract?: boolean;
}

/**
 * Hinged door. Open state persists in flags (`door_<id>`). Closed doors register a collider.
 * Listens for bus events `door:<id>` with payload 'open' | 'close' | 'slam' | 'creak'.
 */
export function Door({ id, position, axis, width = 1.1, height = 2.2, locked = false, lockedText = 'Locked', swing = 1, flag, startOpen = false, onOpen, onLockedTry, color = '#6a4a32', double = false, metal = false, noInteract = false }: DoorProps) {
  const key = flag ?? `door_${id}`;
  const stored = useGame((s) => s.flags[key]);
  const open = stored === undefined ? startOpen : !!stored;
  const pivot = useRef<THREE.Group>(null);
  const pivot2 = useRef<THREE.Group>(null);
  const angle = useRef(open ? 1 : 0);
  const speed = useRef(2.2);

  // collider while closed
  useEffect(() => {
    if (open) return;
    const [x, , z] = position;
    const t = 0.12;
    const cid = CollisionSystem.add(
      axis === 'x'
        ? { minX: x - width / 2, maxX: x + width / 2, minZ: z - t, maxZ: z + t, minY: 0, maxY: height, opaque: true }
        : { minX: x - t, maxX: x + t, minZ: z - width / 2, maxZ: z + width / 2, minY: 0, maxY: height, opaque: true },
      `door_${id}`,
    );
    return () => CollisionSystem.remove(cid);
  }, [open, id, position, axis, width, height]);

  useEffect(() => bus.on(`door:${id}`, (p) => {
    const cmd = p as string;
    const pos = new THREE.Vector3(...position);
    if (cmd === 'open' || cmd === 'creak') {
      speed.current = cmd === 'creak' ? 0.35 : 2.2;
      AudioSystem.play(cmd === 'creak' ? 'creak' : 'door_open', { pos, rate: cmd === 'creak' ? 0.8 : 1 });
      game().setFlag(key, true);
    } else if (cmd === 'close' || cmd === 'slam') {
      speed.current = cmd === 'slam' ? 7 : 2.2;
      AudioSystem.play(cmd === 'slam' ? 'door_slam' : 'door_open', { pos });
      if (cmd === 'slam') runtime.shake = Math.max(runtime.shake, 0.4);
      game().setFlag(key, false);
    }
  }), [id, key, position]);

  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    angle.current += Math.sign(target - angle.current) * Math.min(Math.abs(target - angle.current), dt * speed.current);
    const a = angle.current * (Math.PI / 2) * 0.95 * swing;
    if (pivot.current) pivot.current.rotation.y = a;
    if (pivot2.current) pivot2.current.rotation.y = -a;
  });

  const leafW = double ? width / 2 : width;
  const mat = metal ? <meshStandardMaterial color={color} metalness={0.6} roughness={0.6} /> : <meshStandardMaterial color={color} roughness={0.8} />;
  const leaf = (dir: 1 | -1) => (
    <group>
      <mesh position={[(dir * leafW) / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[leafW - 0.02, height - 0.02, 0.06]} />
        {mat}
      </mesh>
      <mesh position={[dir * (leafW - 0.12), 1.0, 0.05]}>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial color="#9c8a5a" metalness={0.8} roughness={0.3} />
      </mesh>
      {!metal && (
        <mesh position={[(dir * leafW) / 2, height * 0.72, 0.035]}>
          <planeGeometry args={[leafW * 0.45, 0.4]} />
          <meshStandardMaterial color="#1a2433" roughness={0.2} metalness={0.2} />
        </mesh>
      )}
    </group>
  );

  const rotY = axis === 'x' ? 0 : Math.PI / 2;
  const [x, y, z] = position;
  const content = (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <group position={[-width / 2, 0, 0]} ref={pivot}>{leaf(1)}</group>
      {double && <group position={[width / 2, 0, 0]} ref={pivot2}>{leaf(-1)}</group>}
    </group>
  );
  if (noInteract) return content;
  return (
    <>
      {content}
      <Interactable
        id={`doorhs_${id}`}
        position={[x, 1.1, z]}
        radius={0.45}
        range={2.0}
        prompt={locked ? lockedText : open ? 'Close door' : 'Open door'}
        onInteract={() => {
          if (locked) {
            AudioSystem.play('door_locked', { pos: new THREE.Vector3(x, 1, z) });
            onLockedTry?.();
            return;
          }
          if (!open) {
            AudioSystem.play('door_open', { pos: new THREE.Vector3(x, 1, z) });
            game().setFlag(key, true);
            onOpen?.();
          } else {
            // Don't trap the player in the door swing.
            const p = runtime.player.pos;
            if (Math.hypot(p.x - x, p.z - z) < 0.55) return;
            AudioSystem.play('door_open', { pos: new THREE.Vector3(x, 1, z), rate: 1.2 });
            game().setFlag(key, false);
          }
        }}
      >
        <mesh userData={{ noHighlight: true }}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Interactable>
    </>
  );
}

/** A place to hide (under a desk, inside a cabinet, behind furniture). */
export function HidingSpot({ id, position, view, exit, yaw, label = 'Hide' }: { id: string; position: V3; view: V3; exit: V3; yaw: number; label?: string }) {
  const [hidden, setHidden] = useState(false);
  const spot = useMemo(() => ({ id, view: new THREE.Vector3(...view), exit: new THREE.Vector3(...exit), yaw }), [id, view, exit, yaw]);
  useFrame(() => {
    const h = runtime.player.hidden?.id === id;
    if (h !== hidden) setHidden(h);
  });
  return (
    <Interactable
      id={`hide_${id}`}
      position={position}
      radius={0.45}
      range={1.9}
      prompt={hidden ? 'Leave hiding spot' : label}
      onInteract={() => {
        const p = runtime.player;
        if (p.hidden?.id === id) {
          p.hidden = null;
          p.pos.set(spot.exit.x, 0, spot.exit.z);
          AudioSystem.play('creak', { volume: 0.4, rate: 1.3 });
        } else if (!p.hidden) {
          p.hidden = spot;
          p.hiddenTime = 0;
          p.yaw = spot.yaw;
          p.pitch = 0;
          AudioSystem.play('creak', { volume: 0.4, rate: 1.5 });
        }
      }}
    >
      <mesh userData={{ noHighlight: true }}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </Interactable>
  );
}

/** Zone trigger: calls onEnter when the player enters the box (min/max on XZ). */
export function Trigger({ id, min, max, onEnter, once = true, enabled = true }: { id: string; min: [number, number]; max: [number, number]; onEnter: () => void; once?: boolean; enabled?: boolean }) {
  const fired = useRef(false);
  const inside = useRef(false);
  const flagKey = `trig_${id}`;
  const cb = useRef(onEnter);
  cb.current = onEnter;
  useFrame(() => {
    if (!enabled || runtime.paused) return;
    if (once && (fired.current || game().flags[flagKey])) return;
    const p = runtime.player.pos;
    const now = p.x >= min[0] && p.x <= max[0] && p.z >= min[1] && p.z <= max[1];
    if (now && !inside.current) {
      fired.current = true;
      if (once) game().setFlag(flagKey, true);
      cb.current();
    }
    inside.current = now;
  });
  return null;
}

/** A chair that slides by itself when `chair:<id>` is emitted on the bus. */
export function MovingChair({ id, position, rotY = 0, to }: { id: string; position: V3; rotY?: number; to: V3 }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  const moving = useRef(false);
  useEffect(() => bus.on(`chair:${id}`, () => {
    moving.current = true;
    AudioSystem.play('chair', { pos: new THREE.Vector3(...position) });
  }), [id, position]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (moving.current && t.current < 1) t.current = Math.min(1, t.current + dt * 1.6);
    const k = t.current;
    ref.current.position.set(position[0] + (to[0] - position[0]) * k, 0, position[2] + (to[2] - position[2]) * k);
    ref.current.rotation.y = rotY + k * 0.8;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.44, 0]} castShadow><boxGeometry args={[0.42, 0.04, 0.42]} /><meshStandardMaterial color="#6e4a2e" /></mesh>
      <mesh position={[0, 0.72, 0.19]} castShadow><boxGeometry args={[0.42, 0.5, 0.04]} /><meshStandardMaterial color="#6e4a2e" /></mesh>
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([a, b], i) => (
        <mesh key={i} position={[a, 0.22, b]}><boxGeometry args={[0.04, 0.44, 0.04]} /><meshStandardMaterial color="#555" /></mesh>
      ))}
    </group>
  );
}

/** Books that fall from a shelf when `books:<id>` is emitted. */
export function FallingBooks({ id, position, dir = [0, 0, 1] }: { id: string; position: V3; dir?: V3 }) {
  const ref = useRef<THREE.Group>(null);
  const state = useRef<{ p: THREE.Vector3; v: THREE.Vector3; r: THREE.Vector3; w: THREE.Vector3 }[]>([]);
  const active = useRef(false);
  const colors = useMemo(() => Array.from({ length: 7 }, (_, i) => ['#6b2a22', '#2c3f5c', '#4b5a2a', '#7a6a3a', '#3a2a40', '#7c4a1c', '#20343a'][i]), []);
  useEffect(() => {
    state.current = colors.map((_, i) => ({ p: new THREE.Vector3(i * 0.05 - 0.15, 1.4 + (i % 3) * 0.4, 0), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3() }));
    return bus.on(`books:${id}`, () => {
      active.current = true;
      state.current.forEach((s) => {
        s.v.set(dir[0] * (1 + Math.random() * 1.5) + (Math.random() - 0.5), Math.random(), dir[2] * (1 + Math.random() * 1.5) + (Math.random() - 0.5));
        s.w.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      });
      AudioSystem.play('shelf', { pos: new THREE.Vector3(...position) });
    });
  }, [id, colors, dir, position]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    state.current.forEach((s, i) => {
      if (active.current && s.p.y > 0.03) {
        s.v.y -= 9.8 * dt;
        s.p.addScaledVector(s.v, dt);
        s.r.addScaledVector(s.w, dt);
        if (s.p.y <= 0.03) { s.p.y = 0.03; s.r.set(-Math.PI / 2, s.r.y, 0); }
      }
      const c = ref.current!.children[i];
      c.position.copy(s.p);
      c.rotation.set(s.r.x, s.r.y, s.r.z);
    });
  });
  return (
    <group ref={ref} position={position}>
      {colors.map((c, i) => (
        <mesh key={i} castShadow>
          <boxGeometry args={[0.05, 0.26, 0.19]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}
