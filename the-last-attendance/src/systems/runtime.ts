import * as THREE from 'three';

/**
 * Mutable per-frame runtime state. Kept outside React/Zustand so that per-frame
 * updates never trigger re-renders.
 */
export interface HideSpot {
  id: string;
  view: THREE.Vector3;
  exit: THREE.Vector3;
  yaw: number;
}

export const runtime = {
  player: {
    pos: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    eyeHeight: 1.65,
    crouching: false,
    running: false,
    moving: false,
    hidden: null as HideSpot | null,
    /** Seconds since the player entered the current hiding spot. */
    hiddenTime: 0,
    /** Locks movement (cutscenes). Look remains free unless lookLocked. */
    locked: false,
    lookLocked: false,
    lookTarget: null as THREE.Vector3 | null,
    noise: 0,
    breath: 100,
    inSmoke: false,
  },
  camera: null as THREE.Camera | null,
  keys: new Set<string>(),
  pointerLocked: false,
  /** Pointer lock is unavailable (e.g. sandboxed iframe): look by dragging the mouse instead. */
  noPointerLock: false,
  battery: 100,
  /** Global light flicker multiplier, driven by HorrorEventSystem. */
  flicker: 1,
  /** Flashlight malfunction timer (seconds). */
  flashlightGlitch: 0,
  /** Screen shake strength. */
  shake: 0,
  /** Fear/chase intensity 0..1 for post FX and music. */
  fear: 0,
  /** Lightning flash 0..1. */
  lightning: 0,
  /** Elapsed time of the current scene. */
  time: 0,
  /** Whether the game simulation is paused (overlay open). */
  paused: false,
  /** Teacher world position (for audio/fx). */
  teacherPos: new THREE.Vector3(999, 0, 999),
  teacherState: 'idle' as string,
  debug: typeof window !== 'undefined' && /[?&]debug/.test(window.location.search + window.location.hash),
};

export function resetRuntime(): void {
  const p = runtime.player;
  p.vel.set(0, 0, 0);
  p.crouching = false;
  p.running = false;
  p.moving = false;
  p.hidden = null;
  p.hiddenTime = 0;
  p.locked = false;
  p.lookLocked = false;
  p.lookTarget = null;
  p.noise = 0;
  p.breath = 100;
  p.inSmoke = false;
  runtime.flicker = 1;
  runtime.flashlightGlitch = 0;
  runtime.shake = 0;
  runtime.fear = 0;
  runtime.lightning = 0;
  runtime.time = 0;
  runtime.teacherPos.set(999, 0, 999);
  runtime.teacherState = 'idle';
  runtime.keys.clear();
}

/** Simple typed event bus for world events (doors, props, ghosts). */
type Handler = (payload?: unknown) => void;
const handlers = new Map<string, Set<Handler>>();

export const bus = {
  on(evt: string, h: Handler): () => void {
    if (!handlers.has(evt)) handlers.set(evt, new Set());
    handlers.get(evt)!.add(h);
    return () => handlers.get(evt)?.delete(h);
  },
  emit(evt: string, payload?: unknown): void {
    handlers.get(evt)?.forEach((h) => h(payload));
  },
};
