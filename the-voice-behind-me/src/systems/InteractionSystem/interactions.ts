import * as THREE from 'three';
import { world } from '../PhysicsSystem/world';

export interface InteractEntry {
  id: string;
  /** world position of the interaction point */
  pos: THREE.Vector3;
  /** max reach in metres */
  reach: number;
  /** returns the prompt text, or null when the object can't be used right now */
  prompt: () => string | null;
  onInteract: () => void;
}

const entries = new Map<string, InteractEntry>();

export const interactions = {
  register(e: InteractEntry) {
    entries.set(e.id, e);
  },
  unregister(id: string) {
    entries.delete(id);
  },
  get(id: string) {
    return entries.get(id);
  },
  all() {
    return entries.values();
  },
  clear() {
    entries.clear();
  },
};

const tmp = new THREE.Vector3();

/** Pick the interactable the camera is aiming at. */
export function findFocus(camPos: THREE.Vector3, camDir: THREE.Vector3): { entry: InteractEntry; prompt: string } | null {
  let best: { entry: InteractEntry; prompt: string; score: number } | null = null;
  for (const e of entries.values()) {
    tmp.subVectors(e.pos, camPos);
    const dist = tmp.length();
    if (dist > e.reach || dist < 0.01) continue;
    tmp.divideScalar(dist);
    const dot = tmp.dot(camDir);
    // allow a wider cone for close objects
    const minDot = dist < 0.9 ? 0.6 : 0.88;
    if (dot < minDot) continue;
    const prompt = e.prompt();
    if (!prompt) continue;
    // line of sight, stopping short of the target so wall-mounted objects work
    const stop = Math.max(0, dist - 0.3) / dist;
    const bx = camPos.x + (e.pos.x - camPos.x) * stop;
    const bz = camPos.z + (e.pos.z - camPos.z) * stop;
    if (world.segmentBlocked(camPos.x, camPos.z, bx, bz, camPos.y - 0.2)) continue;
    const score = dot * 2 - dist * 0.15;
    if (!best || score > best.score) best = { entry: e, prompt, score };
  }
  return best ? { entry: best.entry, prompt: best.prompt } : null;
}
