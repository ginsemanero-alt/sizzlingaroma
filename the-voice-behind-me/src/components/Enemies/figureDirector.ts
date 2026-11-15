import * as THREE from 'three';

export type FigureMode = 'hidden' | 'stand' | 'behind' | 'chase';

export interface FigureOpts {
  /** vanish when the player comes within this distance */
  vanishDist?: number;
  /** vanish after the player has looked straight at it for N seconds */
  vanishOnLook?: number;
  /** count a "flee" if the player looks at it and backs away */
  fleeCheck?: boolean;
  /** vanish after N seconds no matter what */
  duration?: number;
  /** behind-mode distance */
  behindDist?: number;
  /** behind-mode: stay when looked at, and call onFaced instead of vanishing */
  holdWhenFaced?: boolean;
  /** chase speed m/s */
  speed?: number;
  onVanish?: () => void;
  onFaced?: () => void;
  onCatch?: () => void;
  onFlee?: () => void;
  /** only visible in mirrors */
  mirrorOnly?: boolean;
  /** 0 = shadow, 1 = clearly Elias */
  reveal?: number;
  /** override base opacity */
  opacity?: number;
}

/**
 * Mutable command state for The Figure Behind. Scripts set a mode; the
 * <Figure/> component carries out the behaviour each frame.
 */
export const figure = {
  mode: 'hidden' as FigureMode,
  pos: new THREE.Vector3(),
  opts: {} as FigureOpts,
  /** bumps each command so the component can reset per-command timers */
  serial: 0,
};

export function showFigure(pos: [number, number, number], opts: FigureOpts = {}) {
  figure.mode = 'stand';
  figure.pos.set(...pos);
  figure.opts = opts;
  figure.serial++;
}

export function figureBehind(opts: FigureOpts = {}) {
  figure.mode = 'behind';
  figure.opts = { behindDist: 2.6, ...opts };
  figure.serial++;
}

export function chaseFigure(pos: [number, number, number], opts: FigureOpts = {}) {
  figure.mode = 'chase';
  figure.pos.set(...pos);
  figure.opts = { speed: 2.2, ...opts };
  figure.serial++;
}

export function hideFigure() {
  figure.mode = 'hidden';
  figure.opts = {};
  figure.serial++;
}
