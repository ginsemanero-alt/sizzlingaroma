import { create } from 'zustand';
import { runtime } from '@/systems/runtime';
import { game } from '@/store/gameStore';
import { teacherControl } from '@/systems/EnemyAISystem/TeacherBrain';
import { ITEMS, KEEPSAKES } from '@/data/items';

/**
 * Admin ("god's eye") mode. Unlocked with a PIN; only its SHA-256 hash is stored here.
 * To change the PIN: run `echo -n "NEWPIN" | sha256sum` and paste the hash below (PINs are upper-cased).
 *
 * This is a client-side lock: it keeps players out, not someone who edits the game's code.
 */
const PIN_HASH = '2f9c66ee2c32f405a387a170bffde99d05cc38818a32cf2289bcf41b23da2255';
const SESSION_KEY = 'tla_admin_v1';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function adminLogin(pin: string): Promise<boolean> {
  if (!crypto?.subtle) return false;
  const ok = (await sha256(pin.trim().toUpperCase())) === PIN_HASH;
  if (ok) {
    runtime.admin.active = true;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage blocked */ }
  }
  return ok;
}

/** Restore the login for this browser tab (sessionStorage), so the PIN is asked once per tab. */
export function restoreAdmin(): void {
  try { if (sessionStorage.getItem(SESSION_KEY) === '1') runtime.admin.active = true; } catch { /* storage blocked */ }
}

export function adminLogout(): void {
  setFly(false);
  Object.assign(runtime.admin, { active: false, invisible: false, fullbright: false });
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ }
  bump();
}

/** Version counter: admin UI re-renders when runtime.admin changes. */
export const useAdmin = create<{ v: number }>(() => ({ v: 0 }));
export function bump(): void { useAdmin.setState((s) => ({ v: s.v + 1 })); }

export function setFly(on: boolean): void {
  const a = runtime.admin;
  if (on && !a.fly) {
    const cam = runtime.camera;
    if (cam) a.cam.pos.copy(cam.position);
    a.cam.yaw = runtime.player.yaw;
    a.cam.pitch = runtime.player.pitch;
  }
  a.fly = on;
  if (!on) a.top = false;
  bump();
}

export function setTop(on: boolean): void {
  const a = runtime.admin;
  if (on) {
    if (!a.fly) setFly(true);
    a.cam.height = Math.max(18, a.cam.pos.y + 16);
  }
  a.top = on;
  bump();
}

export function toggle(key: 'invisible' | 'labels' | 'fullbright'): void {
  runtime.admin[key] = !runtime.admin[key];
  bump();
}

/** Put Jasmine where the spectator camera is (on the floor). */
export function teleportHere(): void {
  const a = runtime.admin.cam;
  runtime.player.pos.set(a.pos.x, 0, a.pos.z);
  runtime.player.yaw = a.yaw;
  runtime.player.hidden = null;
  setFly(false);
  game().notify('Jasmine teleported to the camera', 'info');
}

export function teacherMode(m: 'off' | 'stalker' | 'hunter'): void {
  teacherControl.brain?.setMode(m);
  game().notify(`Teacher: ${m}`, 'info');
  bump();
}

export function giveChapterItems(): void {
  const ch = game().chapter;
  Object.values(ITEMS).filter((i) => i.chapter <= ch).forEach((i) => game().collect(i.id, { silent: true }));
  game().notify(`All items up to chapter ${ch} added`, 'info');
}

export function giveBelongings(): void {
  KEEPSAKES.forEach((k) => game().collect(k, { silent: true }));
  game().notify(`All ${KEEPSAKES.length} belongings added`, 'info');
}
