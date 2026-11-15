/**
 * Game clock. Advances only while the game is unpaused, so scripted horror
 * sequences freeze with the pause menu. Resetting it (on chapter change)
 * abandons every pending wait so stale scripts simply stop.
 */
interface Timer {
  at: number;
  resolve: () => void;
}

let now = 0;
let generation = 0;
let timers: Timer[] = [];

/** Debug-only speed multiplier for automated tests (window.__tvbm.setTimeScale). */
export const timeScale = { value: 1 };

export const clock = {
  get time() {
    return now;
  },
  get generation() {
    return generation;
  },
  tick(dt: number) {
    now += dt;
    if (!timers.length) return;
    const due = timers.filter((t) => t.at <= now);
    if (!due.length) return;
    timers = timers.filter((t) => t.at > now);
    for (const t of due) t.resolve();
  },
  reset() {
    generation++;
    timers = [];
  },
};

/** Wait in game-time seconds. Never resolves if the chapter is reset meanwhile. */
export function wait(sec: number): Promise<void> {
  const gen = generation;
  return new Promise((resolve) => {
    timers.push({
      at: now + sec,
      resolve: () => {
        if (gen === generation) resolve();
      },
    });
  });
}

/** Resolve when `cond` is true (polled each frame-ish). */
export async function until(cond: () => boolean, poll = 0.1): Promise<void> {
  while (!cond()) await wait(poll);
}

/** Returns a guard; `alive()` turns false when the chapter is reset. */
export function scriptGuard() {
  const gen = generation;
  return { alive: () => gen === generation };
}
