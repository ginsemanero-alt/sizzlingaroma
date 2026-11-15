import * as THREE from 'three';
import { wait } from '../../systems/ChapterSystem/clock';

export type Surface = 'wood' | 'outside' | 'concrete';

interface LookTween {
  fromYaw: number;
  fromPitch: number;
  toYaw: number;
  toPitch: number;
  t: number;
  dur: number;
}

interface MoveTween {
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  dur: number;
}

/**
 * Mutable player state shared by the controller, scripts and the AI.
 * Kept outside React so per-frame updates never trigger re-renders.
 */
export const rig = {
  pos: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  vel: new THREE.Vector3(),
  eyeHeight: 1.62,
  crouching: false,
  running: false,
  speed: 0,
  surface: 'wood' as Surface,
  camPos: new THREE.Vector3(),
  forward: new THREE.Vector3(0, 0, -1),
  look: null as LookTween | null,
  move: null as MoveTween | null,
  shakeAmt: 0,
  /** limits walking speed (e.g. slow-walk in memories) */
  speedScale: 1,
  /** time the player has been standing still */
  stillTime: 0,
  /** seconds to hold height after a teleport, while new floors register */
  settle: 0,
};

function shortestAngle(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function teleport(x: number, z: number, yaw?: number, y = 0) {
  rig.pos.set(x, y, z);
  rig.vel.set(0, 0, 0);
  rig.settle = 0.4;
  if (yaw !== undefined) rig.yaw = yaw;
  rig.pitch = 0;
  rig.look = null;
  rig.move = null;
}

/** Yaw that faces from the player toward a world point. */
export function yawTo(x: number, z: number) {
  return Math.atan2(-(x - rig.pos.x), -(z - rig.pos.z));
}

export async function lookAt(target: [number, number, number], dur = 1) {
  const dx = target[0] - rig.camPos.x;
  const dy = target[1] - rig.camPos.y;
  const dz = target[2] - rig.camPos.z;
  const toYaw = Math.atan2(-dx, -dz);
  const toPitch = Math.atan2(dy, Math.hypot(dx, dz));
  rig.look = {
    fromYaw: rig.yaw,
    fromPitch: rig.pitch,
    toYaw: rig.yaw + shortestAngle(rig.yaw, toYaw),
    toPitch,
    t: 0,
    dur,
  };
  await wait(dur);
}

export async function moveTo(x: number, z: number, dur = 1) {
  rig.move = { from: rig.pos.clone(), to: new THREE.Vector3(x, rig.pos.y, z), t: 0, dur };
  await wait(dur);
}

export function shake(amount: number) {
  rig.shakeAmt = Math.max(rig.shakeAmt, amount);
}

/** Is the player looking toward a world point? (cosine threshold) */
export function isLookingAt(p: THREE.Vector3 | [number, number, number], threshold = 0.8) {
  const v = Array.isArray(p) ? new THREE.Vector3(...p) : p.clone();
  v.sub(rig.camPos);
  v.y *= 0.3;
  v.normalize();
  const f = rig.forward.clone();
  f.y *= 0.3;
  f.normalize();
  return v.dot(f) > threshold;
}

export function distTo(x: number, z: number) {
  return Math.hypot(rig.pos.x - x, rig.pos.z - z);
}
