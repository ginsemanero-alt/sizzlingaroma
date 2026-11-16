import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '@/systems/runtime';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { InteractionSystem } from '@/systems/InteractionSystem/InteractionSystem';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { game, useGame } from '@/store/gameStore';

const WALK = 2.3, RUN = 4.4, CROUCH = 1.15, RADIUS = 0.3;
const STAND_EYE = 1.65, CROUCH_EYE = 1.0, HIDE_EYE = 0.75;

/**
 * First-person controller: pointer-lock look, WASD movement with acceleration, running, crouching,
 * collision, head bob, footsteps, hiding and scripted look-at.
 */
export function Player({ spawn, yaw: spawnYaw = 0 }: { spawn: [number, number]; yaw?: number }) {
  const { camera } = useThree();
  const bob = useRef(0);
  const lastStepPhase = useRef(0);
  const eye = useRef(STAND_EYE);
  const fov = useGame((s) => s.settings.fov);
  const out = useRef({ x: 0, z: 0 });

  useEffect(() => {
    const cp = game().checkpoint;
    const p = runtime.player;
    if (cp) { p.pos.set(cp.pos[0], 0, cp.pos[2]); p.yaw = cp.yaw; }
    else { p.pos.set(spawn[0], 0, spawn[1]); p.yaw = spawnYaw; }
    p.pitch = 0;
    p.vel.set(0, 0, 0);
    camera.rotation.order = 'YXZ';
    runtime.camera = camera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (camera as THREE.PerspectiveCamera).fov = fov;
    (camera as THREE.PerspectiveCamera).near = 0.05;
    (camera as THREE.PerspectiveCamera).far = 160;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, fov]);

  // mouse look
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const p = runtime.player;
      if (!runtime.pointerLocked || runtime.paused || p.lookLocked) return;
      const s = game().settings;
      const k = 0.0021 * s.mouseSensitivity;
      p.yaw -= e.movementX * k;
      p.pitch -= e.movementY * k * (s.invertY ? -1 : 1);
      p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));
      if (p.hidden) {
        let d = p.yaw - p.hidden.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        p.yaw = p.hidden.yaw + Math.max(-1.1, Math.min(1.1, d));
        p.pitch = Math.max(-0.6, Math.min(0.5, p.pitch));
      }
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = runtime.player;
    const keys = runtime.keys;
    if (!runtime.paused) runtime.time += dt;

    // ── scripted look-at ──
    if (p.lookTarget) {
      const dx = p.lookTarget.x - p.pos.x, dz = p.lookTarget.z - p.pos.z;
      const ty = Math.atan2(-dx, -dz);
      const tp = Math.atan2(p.lookTarget.y - eye.current, Math.hypot(dx, dz));
      let d = ty - p.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      p.yaw += d * Math.min(1, dt * 3);
      p.pitch += (tp - p.pitch) * Math.min(1, dt * 3);
    }

    // ── movement ──
    let speed = 0;
    if (p.hidden) {
      p.hiddenTime += dt;
      p.vel.set(0, 0, 0);
      p.moving = false;
      p.noise = 0;
      p.crouching = true;
    } else if (!runtime.paused) {
      const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      p.crouching = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
      const wantsMove = !p.locked && (fwd !== 0 || strafe !== 0);
      p.running = wantsMove && !p.crouching && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && fwd >= 0;
      const max = p.crouching ? CROUCH : p.running ? RUN : WALK;
      const wish = new THREE.Vector3();
      if (wantsMove) {
        const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
        wish.set(-sin * fwd + cos * strafe, 0, -cos * fwd - sin * strafe).normalize().multiplyScalar(max);
      }
      const accel = wantsMove ? 9 : 12;
      p.vel.x += (wish.x - p.vel.x) * Math.min(1, dt * accel);
      p.vel.z += (wish.z - p.vel.z) * Math.min(1, dt * accel);
      const nx = p.pos.x + p.vel.x * dt, nz = p.pos.z + p.vel.z * dt;
      CollisionSystem.resolveCircle(nx, nz, RADIUS, out.current);
      const movedX = out.current.x - p.pos.x, movedZ = out.current.z - p.pos.z;
      p.pos.x = out.current.x; p.pos.z = out.current.z;
      speed = Math.hypot(movedX, movedZ) / Math.max(dt, 1e-4);
      p.moving = speed > 0.3;
      p.noise = !p.moving ? 0 : p.crouching ? 1.5 : p.running ? 11 : 5;
    }

    // ── eye height, bob and footsteps ──
    const targetEye = p.hidden ? HIDE_EYE : p.crouching ? CROUCH_EYE : STAND_EYE;
    eye.current += (targetEye - eye.current) * Math.min(1, dt * 8);
    if (p.moving) {
      bob.current += dt * speed * 2.1;
      if (Math.floor(bob.current / Math.PI) !== Math.floor(lastStepPhase.current / Math.PI)) AudioSystem.footstep(p.running, p.crouching);
      lastStepPhase.current = bob.current;
    }
    const reduced = game().settings.reducedShake;
    const amp = p.moving ? (p.running ? 1.4 : p.crouching ? 0.5 : 1) * (reduced ? 0.3 : 1) : 0;
    const bobY = Math.sin(bob.current * 2) * 0.035 * amp;
    const bobX = Math.cos(bob.current) * 0.02 * amp;

    const camPos = p.hidden ? p.hidden.view : p.pos;
    camera.position.set(camPos.x, p.hidden ? p.hidden.view.y : eye.current + bobY, camPos.z);
    camera.position.x += Math.cos(p.yaw) * bobX;
    camera.position.z -= Math.sin(p.yaw) * bobX;

    // shake
    if (runtime.shake > 0) {
      const s = runtime.shake * (reduced ? 0.15 : 1) * 0.06;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      runtime.shake = Math.max(0, runtime.shake - dt * 1.5);
    }
    camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
    camera.updateMatrixWorld();

    // audio listener + interactions
    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    AudioSystem.setListener(camera, f);
    InteractionSystem.update(camera);
  });

  return null;
}
