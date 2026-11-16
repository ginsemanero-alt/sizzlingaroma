import * as THREE from 'three';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { game } from '@/store/gameStore';
import { runtime } from '@/systems/runtime';

export interface InteractableEntry {
  id: string;
  object: THREE.Object3D;
  /** Effective radius of the object for aiming. */
  radius: number;
  /** Maximum interaction distance from the eye. */
  range: number;
  /** Current prompt text, or null when not interactable right now. */
  prompt: () => string | null;
  onInteract: () => void;
  setFocus: (f: boolean) => void;
}

const entries = new Map<string, InteractableEntry>();
let focused: InteractableEntry | null = null;
const tmp = new THREE.Vector3();
const fwd = new THREE.Vector3();
const toObj = new THREE.Vector3();

export const InteractionSystem = {
  register(e: InteractableEntry): () => void {
    entries.set(e.id, e);
    return () => {
      if (entries.get(e.id) === e) entries.delete(e.id);
      if (focused === e) { focused = null; game().setPrompt(null); }
    };
  },

  get focusedId(): string | null { return focused?.id ?? null; },

  /** Pick the interactable closest to the centre of the view. */
  update(camera: THREE.Camera): void {
    let best: InteractableEntry | null = null;
    let bestScore = Infinity;
    const blocked = runtime.paused || runtime.player.locked;
    if (!blocked) {
      camera.getWorldDirection(fwd);
      for (const e of entries.values()) {
        const prompt = e.prompt();
        if (prompt === null) continue;
        e.object.getWorldPosition(tmp);
        toObj.subVectors(tmp, camera.position);
        const dist = toObj.length();
        if (dist > e.range + e.radius) continue;
        const along = toObj.dot(fwd);
        if (along < 0.05) continue;
        const perp = Math.sqrt(Math.max(0, dist * dist - along * along));
        const tolerance = e.radius + 0.12 + dist * 0.06;
        if (perp > tolerance) continue;
        // walls between the eye and the object
        const k = Math.max(0, (dist - e.radius - 0.15) / dist);
        if (k > 0 && CollisionSystem.lineBlocked(camera.position.x, camera.position.z, camera.position.x + toObj.x * k, camera.position.z + toObj.z * k, Math.min(2.2, Math.max(0.3, tmp.y)))) continue;
        const score = perp / tolerance + along * 0.15;
        if (score < bestScore) { bestScore = score; best = e; }
      }
    }
    if (best !== focused) {
      focused?.setFocus(false);
      best?.setFocus(true);
      focused = best;
    }
    game().setPrompt(focused ? focused.prompt() : null);
  },

  interact(): void {
    if (!focused || runtime.paused || runtime.player.locked) return;
    const p = focused.prompt();
    if (p === null) return;
    focused.onInteract();
  },

  /** Debug/testing helpers. */
  debugList(): { id: string; prompt: string | null; pos: [number, number, number] }[] {
    return [...entries.values()].map((e) => {
      e.object.getWorldPosition(tmp);
      return { id: e.id, prompt: e.prompt(), pos: [tmp.x, tmp.y, tmp.z] };
    });
  },
  debugTrigger(id: string): boolean {
    const e = entries.get(id);
    if (!e || e.prompt() === null) return false;
    e.onInteract();
    return true;
  },

  clear(): void {
    entries.clear();
    focused = null;
  },
};
