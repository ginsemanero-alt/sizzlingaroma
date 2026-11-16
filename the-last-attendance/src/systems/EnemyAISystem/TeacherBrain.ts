import * as THREE from 'three';
import { NavGrid } from './NavGrid';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { game } from '@/store/gameStore';

export type TeacherState =
  | 'hidden' | 'idle' | 'watching' | 'patrolling' | 'investigating' | 'searching' | 'chasing' | 'disappearing' | 'scripted';

export type TeacherMode = 'off' | 'stalker' | 'hunter';

export interface TeacherConfig {
  bounds: [number, number, number, number];
  waypoints: [number, number][];
  patrolSpeed?: number;
  chaseSpeed?: number;
  sight?: number;
  /** Teacher won't leave this region when chasing (keeps chases local). */
  leash?: [number, number, number, number];
}

/**
 * Finite state machine for Ms. Reyes.
 *  idle → patrolling → (hear) investigating → searching → patrolling
 *                    → (see)  chasing → (lose) searching → disappearing → patrolling
 *  watching: scripted stalker appearances that vanish when approached.
 */
export class TeacherBrain {
  state: TeacherState = 'hidden';
  mode: TeacherMode = 'off';
  pos = new THREE.Vector3(999, 0, 999);
  yaw = 0;
  opacity = 0;
  speed = 0;
  private nav: NavGrid;
  private path: [number, number][] = [];
  private pathTimer = 0;
  private stateTime = 0;
  private wpIndex = 0;
  private lastSeen = new THREE.Vector3();
  private lostTime = 0;
  private searchTarget = new THREE.Vector3();
  private lookedAtTime = 0;
  private watchMax = 12;
  private respawnDelay = 0;
  private sawHide = false;
  private seeTimer = 0;
  private stepTimer = 0;
  private alertCooldown = 0;
  private catchEnabled = true;
  onStateChange?: (s: TeacherState) => void;

  constructor(public cfg: TeacherConfig) {
    const [a, b, c, d] = cfg.bounds;
    this.nav = new NavGrid(a, b, c, d);
  }

  setState(s: TeacherState): void {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    this.path = [];
    runtime.teacherState = s;
    this.onStateChange?.(s);
  }

  setMode(m: TeacherMode): void {
    this.mode = m;
    if (m === 'off') { this.opacity = 0; this.setState('hidden'); }
    if (m === 'hunter' && (this.state === 'hidden' || this.state === 'idle' || this.state === 'scripted')) {
      this.respawnDelay = 0.5;
      this.setState('hidden');
    }
  }

  /** Scripted placement (cutscenes). AI is paused until release(). */
  place(x: number, z: number, yaw: number, visible = true): void {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.opacity = visible ? 1 : 0;
    this.setState('scripted');
  }

  release(): void {
    if (this.mode === 'hunter') { this.respawnDelay = 3; this.setState('disappearing'); }
    else this.setState(this.opacity > 0 ? 'disappearing' : 'hidden');
  }

  /** Stalker appearance: stands and watches until approached. */
  appear(x: number, z: number, maxSeconds = 12): void {
    this.pos.set(x, 0, z);
    this.opacity = 0;
    this.watchMax = maxSeconds;
    this.lookedAtTime = 0;
    this.setState('watching');
  }

  vanish(): void {
    if (this.state !== 'hidden') this.setState('disappearing');
  }

  setCatchEnabled(on: boolean): void { this.catchEnabled = on; }

  private faceTowards(x: number, z: number, dt: number, rate = 4): void {
    const target = Math.atan2(-(x - this.pos.x), -(z - this.pos.z));
    let d = target - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * rate);
  }

  private moveAlongPath(dt: number, speed: number): boolean {
    if (!this.path.length) { this.speed = 0; return true; }
    const [tx, tz] = this.path[0];
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) { this.path.shift(); return this.path.length === 0; }
    const step = Math.min(d, speed * dt);
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    const out = { x: 0, z: 0 };
    CollisionSystem.resolveCircle(this.pos.x, this.pos.z, 0.28, out);
    this.pos.x = out.x; this.pos.z = out.z;
    this.faceTowards(tx, tz, dt, 6);
    this.speed = speed;
    this.stepTimer -= dt * speed;
    if (this.stepTimer <= 0) {
      this.stepTimer = 1.25;
      AudioSystem.play(`step${1 + Math.floor(Math.random() * 4)}`, { pos: [this.pos.x, 0.1, this.pos.z], volume: speed > 2.5 ? 1 : 0.75, rate: 0.75 });
    }
    return false;
  }

  private goTo(x: number, z: number): boolean {
    const p = this.nav.findPath(this.pos.x, this.pos.z, x, z);
    this.path = p ?? [];
    return !!p;
  }

  private canSeePlayer(): boolean {
    const p = runtime.player;
    if (p.hidden) return false;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    let range = this.cfg.sight ?? 13;
    if (game().flashlightOn) range += 4;
    if (p.crouching) range *= 0.55;
    if (dist > range) return false;
    if (dist > 1.6) {
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const cos = (dx * fx + dz * fz) / dist;
      if (cos < Math.cos((55 * Math.PI) / 180)) return false;
    }
    return !CollisionSystem.lineBlocked(this.pos.x, this.pos.z, p.pos.x, p.pos.z, 1.4);
  }

  private spawnFar(): void {
    const p = runtime.player.pos;
    let best: [number, number] | null = null, bestD = -1;
    for (const w of this.cfg.waypoints) {
      const d = Math.hypot(w[0] - p.x, w[1] - p.z);
      const visible = !CollisionSystem.lineBlocked(w[0], w[1], p.x, p.z, 1.4) && d < 15;
      if (!visible && d > bestD && d > 7) { best = w; bestD = d; }
    }
    if (!best) best = this.cfg.waypoints[0];
    this.pos.set(best[0], 0, best[1]);
    this.wpIndex = this.cfg.waypoints.indexOf(best);
  }

  update(dt: number): void {
    this.stateTime += dt;
    this.alertCooldown -= dt;
    const p = runtime.player;
    const toPlayer = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);

    switch (this.state) {
      case 'hidden': {
        this.opacity = 0;
        this.pos.set(999, 0, 999);
        if (this.mode === 'hunter') {
          this.respawnDelay -= dt;
          if (this.respawnDelay <= 0) {
            this.spawnFar();
            this.setState('patrolling');
          }
        }
        break;
      }
      case 'scripted':
        break;
      case 'idle': {
        this.opacity = Math.min(1, this.opacity + dt);
        if (this.mode === 'hunter' && this.stateTime > 2) this.setState('patrolling');
        if (this.mode === 'hunter' && this.canSeePlayer()) this.startChase();
        break;
      }
      case 'watching': {
        this.opacity = Math.min(1, this.opacity + dt * 0.8);
        this.faceTowards(p.pos.x, p.pos.z, dt, 1.5);
        // looked at by the player?
        const cam = runtime.camera;
        if (cam) {
          const fwd = new THREE.Vector3();
          cam.getWorldDirection(fwd);
          const dir = new THREE.Vector3(this.pos.x - p.pos.x, 0.9, this.pos.z - p.pos.z).normalize();
          if (fwd.dot(dir) > 0.93 && !CollisionSystem.lineBlocked(p.pos.x, p.pos.z, this.pos.x, this.pos.z)) this.lookedAtTime += dt;
        }
        if (toPlayer < 4.5 || this.lookedAtTime > 3.2 || this.stateTime > this.watchMax) this.setState('disappearing');
        break;
      }
      case 'patrolling': {
        this.opacity = Math.min(1, this.opacity + dt * 0.7);
        if (!this.path.length) {
          const wps = this.cfg.waypoints;
          this.wpIndex = (this.wpIndex + 1) % wps.length;
          if (!this.goTo(wps[this.wpIndex][0], wps[this.wpIndex][1])) this.path = [];
        }
        this.moveAlongPath(dt, this.cfg.patrolSpeed ?? 1.2);
        this.perceive(dt);
        break;
      }
      case 'investigating': {
        this.opacity = Math.min(1, this.opacity + dt);
        if (!this.path.length && this.stateTime < 0.1) this.goTo(this.searchTarget.x, this.searchTarget.z);
        const arrived = this.moveAlongPath(dt, (this.cfg.patrolSpeed ?? 1.2) * 1.5);
        if (arrived && this.stateTime > 0.2) this.setState('searching');
        if (this.stateTime > 14) this.setState('searching');
        this.perceive(dt);
        break;
      }
      case 'searching': {
        this.opacity = Math.min(1, this.opacity + dt);
        if (!this.path.length) {
          const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 3;
          if (!this.goTo(this.searchTarget.x + Math.cos(a) * r, this.searchTarget.z + Math.sin(a) * r)) this.path = [];
          if (!this.path.length) this.yaw += dt * 2;
        }
        this.moveAlongPath(dt, (this.cfg.patrolSpeed ?? 1.2) * 0.9);
        // A player who hid in plain sight is found.
        if (p.hidden && this.sawHide && toPlayer < 2.2) { this.catchPlayer('She saw where you hid.'); break; }
        this.perceive(dt);
        if (this.stateTime > 9) {
          this.sawHide = false;
          if (this.mode === 'hunter') { this.respawnDelay = 6 + Math.random() * 6; this.setState('disappearing'); }
          else this.setState('disappearing');
        }
        break;
      }
      case 'chasing': {
        this.opacity = 1;
        this.pathTimer -= dt;
        const sees = this.canSeePlayer();
        if (sees) { this.lastSeen.copy(p.pos); this.lostTime = 0; } else this.lostTime += dt;
        // the player dived into a hiding spot while she was watching
        if (p.hidden && p.hiddenTime < 0.7 && toPlayer < 7 && this.seeTimer > 0) this.sawHide = true;
        if (sees) this.seeTimer = 0.8; else this.seeTimer -= dt;
        if (this.pathTimer <= 0) {
          this.pathTimer = 0.35;
          const target = p.hidden ? this.lastSeen : sees ? p.pos : this.lastSeen;
          if (!this.goTo(target.x, target.z)) {
            // Unreachable (closed door): she phases away.
            this.respawnDelay = 5;
            this.setState('disappearing');
            break;
          }
        }
        this.moveAlongPath(dt, this.cfg.chaseSpeed ?? 3.2);
        if (toPlayer < 1.6) this.faceTowards(p.pos.x, p.pos.z, dt, 8);
        if (!p.hidden && toPlayer < 0.95 && this.catchEnabled) { this.catchPlayer(); break; }
        if (p.hidden && this.sawHide && toPlayer < 1.6) { this.catchPlayer('She saw where you hid.'); break; }
        if (this.lostTime > 3.5 || (p.hidden && !this.sawHide && this.lostTime > 0.5)) {
          this.searchTarget.copy(this.lastSeen);
          this.setState('searching');
        }
        const lim = this.cfg.leash;
        if (lim && (p.pos.x < lim[0] || p.pos.z < lim[1] || p.pos.x > lim[2] || p.pos.z > lim[3])) {
          this.respawnDelay = 8;
          this.setState('disappearing');
        }
        break;
      }
      case 'disappearing': {
        this.speed = 0;
        this.opacity = Math.max(0, this.opacity - dt * 1.4);
        if (this.opacity <= 0) {
          if (this.mode === 'hunter' && this.respawnDelay <= 0) this.respawnDelay = 6;
          this.setState('hidden');
        }
        break;
      }
    }

    // fear level drives music, heartbeat and post FX
    const near = this.opacity > 0.1 ? Math.max(0, 1 - toPlayer / 12) : 0;
    const chase = this.state === 'chasing' ? 1 : 0;
    const targetFear = Math.max(near * 0.6, chase);
    runtime.fear += (targetFear - runtime.fear) * Math.min(1, dt * 1.5);
    if (this.state === 'chasing' && toPlayer < 6 && Math.random() < dt * 2) runtime.flashlightGlitch = Math.max(runtime.flashlightGlitch, 0.4);
    runtime.teacherPos.copy(this.pos);
  }

  private perceive(dt: number): void {
    if (this.mode !== 'hunter') return;
    if (this.canSeePlayer()) {
      this.seeTimer += dt;
      // brief recognition delay, shorter when close
      const toPlayer = this.pos.distanceTo(runtime.player.pos);
      if (this.seeTimer > (toPlayer < 5 ? 0.15 : 0.6)) this.startChase();
      return;
    }
    this.seeTimer = Math.max(0, this.seeTimer - dt);
    const p = runtime.player;
    const d = this.pos.distanceTo(p.pos);
    if (p.noise > 0 && d < p.noise && !p.hidden && this.state !== 'investigating') {
      this.searchTarget.copy(p.pos);
      this.setState('investigating');
    }
  }

  private startChase(): void {
    if (this.state === 'chasing') return;
    this.lastSeen.copy(runtime.player.pos);
    this.lostTime = 0;
    this.seeTimer = 0.8;
    this.setState('chasing');
    if (this.alertCooldown <= 0) {
      AudioSystem.play('stinger', { volume: 0.7 });
      this.alertCooldown = 12;
    }
  }

  private catchPlayer(msg?: string): void {
    this.setState('scripted');
    AudioSystem.play('scream', { volume: 0.8 });
    AudioSystem.play('bass_hit');
    runtime.shake = 1;
    game().caught(msg);
  }

  /** Called by external noise events (thrown objects, slammed doors). */
  hearNoise(x: number, z: number, radius: number): void {
    if (this.mode !== 'hunter') return;
    if (this.state === 'chasing' || this.state === 'scripted') return;
    if (Math.hypot(x - this.pos.x, z - this.pos.z) > radius) return;
    this.searchTarget.set(x, 0, z);
    this.setState('investigating');
  }
}

/** The active teacher brain for scripts to command. */
export const teacherControl: { brain: TeacherBrain | null } = { brain: null };
