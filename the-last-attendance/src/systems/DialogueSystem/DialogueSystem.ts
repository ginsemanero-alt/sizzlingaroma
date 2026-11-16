import * as THREE from 'three';
import type { DialogueLine, SpeakerId } from '@/types';
import { CHARACTERS } from '@/data/characters';
import { game, type ChoiceOption } from '@/store/gameStore';
import { AudioSystem, VoiceSystem } from '@/systems/AudioSystem/AudioSystem';
import { runtime } from '@/systems/runtime';

export class ScriptAborted extends Error {
  constructor() { super('script aborted'); }
}

/**
 * Async cutscene/script runner. Each chapter scene owns a ScriptContext; when the scene
 * unmounts the context is aborted and every pending helper rejects with ScriptAborted.
 */
export class ScriptContext {
  private aborted = false;
  private timers = new Set<number>();
  private running = new Set<string>();

  abort(): void {
    this.aborted = true;
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
    VoiceSystem.cancel();
    game().setSubtitle(null);
  }

  get isAborted(): boolean { return this.aborted; }

  private check(): void {
    if (this.aborted) throw new ScriptAborted();
  }

  /** Run a named script once at a time; errors from abort are swallowed. */
  run(name: string, fn: (ctx: ScriptContext) => Promise<void>): void {
    if (this.running.has(name) || this.aborted) return;
    this.running.add(name);
    fn(this)
      .catch((e) => { if (!(e instanceof ScriptAborted)) console.error(`[script ${name}]`, e); })
      .finally(() => { this.running.delete(name); });
  }

  isRunning(name: string): boolean { return this.running.has(name); }

  wait(ms: number): Promise<void> {
    this.check();
    return new Promise((resolve, reject) => {
      const tick = () => {
        this.timers.delete(t);
        if (this.aborted) reject(new ScriptAborted());
        else if (runtime.paused) { t = window.setTimeout(tick, 100); this.timers.add(t); } // pause-aware
        else resolve();
      };
      let t = window.setTimeout(tick, ms);
      this.timers.add(t);
    });
  }

  /** Show a subtitle and (optionally) speak it. Resolves when the line ends. */
  async say(line: DialogueLine | DialogueLine[]): Promise<void> {
    const lines = Array.isArray(line) ? line : [line];
    for (const l of lines) {
      this.check();
      const ch = CHARACTERS[l.s];
      game().setSubtitle({ speaker: l.s, en: l.en, fil: l.fil });
      if (l.s !== 'narrator' && l.s !== 'system' && l.s !== 'alex') {
        const spoken = l.lang === 'fil' && l.fil ? l.fil : l.en;
        VoiceSystem.speak(spoken, ch.voice.pitch, ch.voice.rate, ch.voice.preferFemale, l.lang ?? 'en');
      }
      const words = l.en.split(/\s+/).length;
      await this.wait(l.d ?? Math.max(1800, 900 + words * 330));
      game().setSubtitle(null);
      await this.wait(180);
    }
  }

  /** Shorthand for a single line. */
  line(s: SpeakerId, en: string, fil?: string, lang?: 'en' | 'fil', d?: number): Promise<void> {
    return this.say({ s, en, fil, lang, d });
  }

  async choose(prompt: string, options: ChoiceOption[], speaker?: SpeakerId): Promise<string> {
    this.check();
    const answer = await game().ask(prompt, options, speaker);
    this.check();
    return answer;
  }

  async fade(to: number, ms = 800): Promise<void> {
    this.check();
    game().setFade(to, ms);
    await this.wait(ms);
  }

  lock(on: boolean, lookToo = false): void {
    runtime.player.locked = on;
    runtime.player.lookLocked = on && lookToo;
    if (!on) runtime.player.lookTarget = null;
  }

  lookAt(x: number, y: number, z: number): void {
    runtime.player.lookTarget = new THREE.Vector3(x, y, z);
  }

  releaseLook(): void {
    runtime.player.lookTarget = null;
  }

  sfx(name: string, pos?: [number, number, number], volume = 1, rate?: number): void {
    if (this.aborted) return;
    AudioSystem.play(name, { pos, volume, rate });
  }

  async center(text: string, ms = 2600): Promise<void> {
    game().setCenterText(text);
    await this.wait(ms);
    game().setCenterText(null);
  }
}

/** Plays a recording item with tape sounds and subtitles. */
export async function playRecording(ctx: ScriptContext, lines: DialogueLine[]): Promise<void> {
  AudioSystem.play('tape');
  AudioSystem.loop('hiss', 1, 400);
  try {
    await ctx.wait(700);
    await ctx.say(lines);
  } finally {
    AudioSystem.loop('hiss', 0, 400);
    AudioSystem.play('tape');
  }
}

/** The script context of the currently mounted chapter (for UI-triggered playback). */
export const scriptHost: { ctx: ScriptContext | null } = { ctx: null };
