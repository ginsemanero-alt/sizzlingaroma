import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { rig } from './playerRig';
import { world } from '../../systems/PhysicsSystem/world';
import { controlsActive, uiWantsCursor, useGame } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import { findFocus, interactions } from '../../systems/InteractionSystem/interactions';
import { footstep, setListener, play } from '../../systems/AudioSystem/audioManager';
import { MIRROR_LAYER } from '../Environment/Mirror';

const keys = new Set<string>();
let lastUnlock = 0;
const RADIUS = 0.28;

export function requestLock() {
  const c = document.querySelector('canvas');
  if (!c || document.pointerLockElement) return;
  try {
    const r = c.requestPointerLock() as unknown as Promise<void> | undefined;
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch {
    /* pointer lock unavailable (e.g. iframe); arrow keys still look around */
  }
}

export function releaseLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}

/**
 * First-person controller: WASD + mouse look (Pointer Lock), arrow-key look
 * as an accessible alternative, run, crouch, head bob, footsteps, collisions.
 */
export function PlayerController() {
  const { camera, gl } = useThree();
  const bob = useRef({ phase: 0, lastStep: 0, fallV: 0, focusTick: 0, roll: 0 });

  useEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.layers.disable(MIRROR_LAYER);
  }, [camera]);

  // keyboard + mouse
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = useGame.getState();
      if (e.code === 'Tab') {
        e.preventDefault();
        if (!g.active || g.paused || g.puzzle || g.choice) return;
        if (g.cutscene && !g.inventoryOpen) return;
        g.setInventoryOpen(!g.inventoryOpen);
        play('paper', { vol: 0.4 });
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        // Esc that just released pointer lock already paused the game
        if (e.code === 'Escape' && performance.now() - lastUnlock < 250) return;
        if (g.viewItem) g.setViewItem(null);
        else if (g.inventoryOpen) g.setInventoryOpen(false);
        else if (g.puzzle || g.choice) return;
        else if (g.active) g.setPaused(!g.paused);
        return;
      }
      if (e.ctrlKey && e.code !== 'ControlLeft' && e.code !== 'ControlRight') return;
      keys.add(e.code);
      if (!controlsActive()) return;
      if (e.code === 'KeyE') {
        const f = useGame.getState().focus;
        if (f) interactions.get(f.id)?.onInteract();
      }
      if (e.code === 'KeyF') {
        const on = !g.flashlightOn;
        g.setFlashlight(on);
        play('click', { vol: 0.5, rate: on ? 1.1 : 0.9 });
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement || !controlsActive()) return;
      const s = useSettings.getState();
      const k = 0.0022 * s.sensitivity;
      rig.yaw -= e.movementX * k;
      rig.pitch -= e.movementY * k * (s.invertY ? -1 : 1);
      rig.pitch = Math.max(-1.45, Math.min(1.45, rig.pitch));
    };
    const click = () => {
      if (controlsActive()) requestLock();
    };
    const lockChange = () => {
      const g = useGame.getState();
      if (!document.pointerLockElement) lastUnlock = performance.now();
      if (!document.pointerLockElement && g.active && controlsActive()) g.setPaused(true);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('mousemove', move);
    gl.domElement.addEventListener('click', click);
    document.addEventListener('pointerlockchange', lockChange);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('mousemove', move);
      gl.domElement.removeEventListener('click', click);
      document.removeEventListener('pointerlockchange', lockChange);
      keys.clear();
    };
  }, [gl]);

  // release the cursor whenever a full-screen UI opens
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        const wants = s.paused || s.inventoryOpen || !!s.viewItem || !!s.puzzle || !!s.choice;
        const wanted = prev.paused || prev.inventoryOpen || !!prev.viewItem || !!prev.puzzle || !!prev.choice;
        if (wants && !wanted) releaseLock();
      }),
    [],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = useGame.getState();
    if (!g.active || g.paused) return;
    const s = useSettings.getState();
    const active = controlsActive();
    const b = bob.current;

    // scripted look / move tweens
    if (rig.look) {
      rig.look.t += dt;
      const k = Math.min(1, rig.look.t / rig.look.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      rig.yaw = rig.look.fromYaw + (rig.look.toYaw - rig.look.fromYaw) * e;
      rig.pitch = rig.look.fromPitch + (rig.look.toPitch - rig.look.fromPitch) * e;
      if (k >= 1) rig.look = null;
    }
    if (rig.move) {
      rig.move.t += dt;
      const k = Math.min(1, rig.move.t / rig.move.dur);
      const e = 1 - Math.pow(1 - k, 3);
      rig.pos.x = rig.move.from.x + (rig.move.to.x - rig.move.from.x) * e;
      rig.pos.z = rig.move.from.z + (rig.move.to.z - rig.move.from.z) * e;
      if (k >= 1) rig.move = null;
    }

    // keyboard look (accessibility / no pointer lock)
    if (active) {
      const turn = 1.9 * s.sensitivity * dt;
      if (keys.has('ArrowLeft')) rig.yaw += turn;
      if (keys.has('ArrowRight')) rig.yaw -= turn;
      if (keys.has('ArrowUp')) rig.pitch = Math.min(1.45, rig.pitch + turn * 0.7);
      if (keys.has('ArrowDown')) rig.pitch = Math.max(-1.45, rig.pitch - turn * 0.7);
    }

    // movement
    const fwd = (active && keys.has('KeyW') ? 1 : 0) - (active && keys.has('KeyS') ? 1 : 0);
    const str = (active && keys.has('KeyD') ? 1 : 0) - (active && keys.has('KeyA') ? 1 : 0);
    rig.crouching = active && (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC'));
    rig.running = active && !rig.crouching && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && fwd > 0;
    const maxSpeed = (rig.crouching ? 1.15 : rig.running ? 4.1 : 2.15) * rig.speedScale;
    const dir = new THREE.Vector3(str, 0, -fwd);
    if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), rig.yaw).multiplyScalar(maxSpeed);
    const accel = dir.lengthSq() > 0 ? 9 : 11;
    rig.vel.x += (dir.x - rig.vel.x) * Math.min(1, dt * accel);
    rig.vel.z += (dir.z - rig.vel.z) * Math.min(1, dt * accel);
    if (!rig.move) {
      rig.pos.x += rig.vel.x * dt;
      rig.pos.z += rig.vel.z * dt;
      world.resolve(rig.pos, RADIUS, 1.75);
    }
    rig.speed = Math.hypot(rig.vel.x, rig.vel.z);
    rig.stillTime = rig.speed < 0.2 ? rig.stillTime + dt : 0;

    // floors / stairs / gravity
    rig.settle = Math.max(0, rig.settle - dt);
    const floor = world.floorAt(rig.pos.x, rig.pos.z, rig.pos.y);
    if (floor !== null && rig.settle <= 0) {
      if (floor > rig.pos.y) {
        rig.pos.y += (floor - rig.pos.y) * Math.min(1, dt * 18);
        b.fallV = 0;
      } else if (floor < rig.pos.y - 0.002) {
        b.fallV += 14 * dt;
        rig.pos.y = Math.max(floor, rig.pos.y - Math.max(b.fallV * dt, (rig.pos.y - floor) * Math.min(1, dt * 14)));
      } else b.fallV = 0;
    }

    // eye height, bob, footsteps
    const targetEye = rig.crouching ? 1.0 : 1.62;
    rig.eyeHeight += (targetEye - rig.eyeHeight) * Math.min(1, dt * 8);
    const shakeScale = s.reducedShake ? 0.2 : 1;
    if (rig.speed > 0.3) {
      const prev = b.phase;
      b.phase += dt * (rig.running ? 11.5 : rig.crouching ? 5.5 : 7.8);
      if (Math.floor(prev / Math.PI) !== Math.floor(b.phase / Math.PI)) {
        footstep(rig.surface, rig.crouching ? 0.18 : rig.running ? 0.55 : 0.35, rig.running ? 1.05 : 1);
      }
    } else {
      b.phase += (Math.round(b.phase / Math.PI) * Math.PI - b.phase) * Math.min(1, dt * 5);
    }
    const bobAmt = Math.min(1, rig.speed / 3) * shakeScale;
    const bobY = Math.abs(Math.sin(b.phase)) * 0.045 * bobAmt;
    const bobX = Math.cos(b.phase) * 0.025 * bobAmt;
    b.roll += ((-str * 0.012 * shakeScale) - b.roll) * Math.min(1, dt * 6);

    // shake
    rig.shakeAmt = Math.max(0, rig.shakeAmt - dt * 1.6);
    const sh = rig.shakeAmt * shakeScale * 0.06;
    const t = performance.now() / 1000;

    camera.position.set(
      rig.pos.x + bobX * Math.cos(rig.yaw) + Math.sin(t * 37) * sh,
      rig.pos.y + rig.eyeHeight + bobY + Math.sin(t * 43) * sh,
      rig.pos.z - bobX * Math.sin(rig.yaw) + Math.cos(t * 31) * sh,
    );
    camera.rotation.set(rig.pitch, rig.yaw, b.roll + Math.sin(t * 29) * sh * 0.5);
    rig.camPos.copy(camera.position);
    camera.getWorldDirection(rig.forward);
    setListener(camera.position, rig.forward);

    // interaction focus (every 3rd frame)
    b.focusTick = (b.focusTick + 1) % 3;
    if (b.focusTick === 0) {
      if (active) {
        const f = findFocus(camera.position, rig.forward);
        g.setFocus(f ? { id: f.entry.id, prompt: f.prompt } : null);
      } else if (g.focus) g.setFocus(null);
    }
  });

  return null;
}

export { uiWantsCursor };
