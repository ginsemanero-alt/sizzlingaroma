import { useGame } from '@/store/gameStore';
import { runtime } from '@/systems/runtime';
import { InteractionSystem } from '@/systems/InteractionSystem/InteractionSystem';
import { teacherControl } from '@/systems/EnemyAISystem/TeacherBrain';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { NavGrid } from '@/systems/EnemyAISystem/NavGrid';
import { scriptHost } from '@/systems/DialogueSystem/DialogueSystem';
import type { ChapterId, EndingId, PuzzleId } from '@/types';

/**
 * Test hooks exposed on window.__tla. Used by the automated playthrough tests (see README)
 * and handy for QA. They only call the same actions the game itself uses.
 */
export function installDebugApi(): void {
  const api = {
    state: () => {
      const s = useGame.getState();
      return {
        chapter: s.chapter, flags: s.flags, collected: s.collected, overlay: s.overlay, prompt: s.prompt, subtitle: s.subtitle?.en ?? null,
        choice: s.choice ? { prompt: s.choice.prompt, options: s.choice.options } : null, ending: s.ending, transitionTo: s.transitionTo,
        player: { x: runtime.player.pos.x, z: runtime.player.pos.z, yaw: runtime.player.yaw, hidden: !!runtime.player.hidden, locked: runtime.player.locked },
        teacher: teacherControl.brain ? { state: teacherControl.brain.state, mode: teacherControl.brain.mode, x: teacherControl.brain.pos.x, z: teacherControl.brain.pos.z } : null,
        caught: s.caughtMessage,
        paused: runtime.paused, time: runtime.time, fade: s.fade, card: !!s.chapterCard, checkpoint: s.checkpoint?.id ?? null,
        script: scriptHost.ctx ? { aborted: scriptHost.ctx.isAborted } : null,
      };
    },
    teleport: (x: number, z: number, yaw?: number) => { runtime.player.pos.set(x, 0, z); if (yaw !== undefined) runtime.player.yaw = yaw; },
    interactables: () => InteractionSystem.debugList(),
    interact: (id: string) => InteractionSystem.debugTrigger(id),
    solve: (id: PuzzleId) => useGame.getState().solvePuzzle(id),
    answer: (id: string) => useGame.getState().answerChoice(id),
    closeOverlay: () => useGame.getState().closeOverlay(),
    collect: (id: string) => useGame.getState().collect(id, { silent: true }),
    setFlag: (k: string, v: boolean | number | string = true) => useGame.getState().setFlag(k, v),
    chapter: (n: ChapterId) => useGame.getState().beginChapter(n),
    ending: (id: EndingId) => useGame.getState().triggerEnding(id),
    teacherMode: (m: 'off' | 'stalker' | 'hunter') => teacherControl.brain?.setMode(m),
    /** Walkable path length for a player-sized body (null = blocked). */
    path: (x0: number, z0: number, x1: number, z1: number, cell = 0.1) => {
      const g = new NavGrid(Math.min(x0, x1) - 4, Math.min(z0, z1) - 4, Math.max(x0, x1) + 4, Math.max(z0, z1) + 4, 0.3, cell);
      const p = g.findPath(x0, z0, x1, z1, 400000);
      return p ? p.length : null;
    },
    colliderCount: () => [...CollisionSystem.all()].length,
    collidersAt: (x: number, z: number) => [...CollisionSystem.all()].filter((b) => x >= b.minX - 0.3 && x <= b.maxX + 0.3 && z >= b.minZ - 0.3 && z <= b.maxZ + 0.3 && b.maxY > 0.25 && b.minY < 1.7)
      .map((b) => [b.minX, b.maxX, b.minZ, b.maxZ, b.minY, b.maxY].map((v) => +v.toFixed(2))),
    blockedAt: (x: number, z: number) => CollisionSystem.overlaps(x, z, 0.3),
    key: (code: string, down: boolean) => { if (down) runtime.keys.add(code); else runtime.keys.delete(code); },
  };
  (window as unknown as { __tla: typeof api }).__tla = api;
}
