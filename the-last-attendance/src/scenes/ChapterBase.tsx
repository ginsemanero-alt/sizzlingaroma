import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ScriptContext, scriptHost } from '@/systems/DialogueSystem/DialogueSystem';
import { game, useGame } from '@/store/gameStore';
import { CHAPTERS } from '@/data/chapters';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Player } from '@/components/Player/Player';
import { Flashlight } from '@/components/Player/Flashlight';
import { HorrorEventDirector, type AmbientEvent } from '@/systems/HorrorEventSystem/HorrorEventSystem';
import type { ChapterId, Vec3 } from '@/types';

/** Creates the chapter's script context; aborted automatically on unmount. */
export function useScript(): ScriptContext {
  const ctx = useMemo(() => new ScriptContext(), []);
  useEffect(() => {
    scriptHost.ctx = ctx;
    return () => { ctx.abort(); if (scriptHost.ctx === ctx) scriptHost.ctx = null; };
  }, [ctx]);
  return ctx;
}

/** Runs `fn` once when a flag transitions from false to true while mounted. */
export function useFlagEffect(flag: string, fn: () => void): void {
  const value = useGame((s) => !!s.flags[flag]);
  const prev = useRef(value);
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (value && !prev.current) cb.current();
    prev.current = value;
  }, [value]);
}

export function useFlag(flag: string): boolean {
  return useGame((s) => !!s.flags[flag]);
}

export function useHas(item: string): boolean {
  return useGame((s) => s.collected.includes(item));
}

interface ChapterBaseProps {
  chapter: ChapterId;
  ctx: ScriptContext;
  spawn: [number, number];
  yaw: number;
  ambience: { name: string; volume?: number; pos?: Vec3 }[];
  events?: AmbientEvent[];
  eventsEnabled?: boolean;
  /** Runs on a fresh chapter start (not when loading a checkpoint). */
  intro?: (ctx: ScriptContext) => Promise<void>;
  /** Runs every time the chapter mounts (fresh or from checkpoint) after the fade-in. */
  onReady?: (ctx: ScriptContext) => void;
  children: ReactNode;
}

/**
 * Shared chapter scaffolding: player, flashlight, ambience, random horror events, chapter title card,
 * start-of-chapter autosave and the intro script.
 */
export function ChapterBase({ chapter, ctx, spawn, yaw, ambience, events = [], eventsEnabled = true, intro, onReady, children }: ChapterBaseProps) {
  useEffect(() => {
    const s = game();
    const fresh = !s.checkpoint;
    ambience.forEach((a) => AudioSystem.loop(a.name, a.volume ?? 1, 3000, a.pos as [number, number, number] | undefined));
    if (fresh) {
      const meta = CHAPTERS[chapter];
      useGame.setState({ chapterCard: { title: meta.title, subtitle: meta.subtitle, location: meta.location, time: meta.time } });
      ctx.run('chapter_start', async (c) => {
        await c.wait(1700);
        await c.wait(4400);
        useGame.setState({ chapterCard: null });
        game().setFade(0, 1500);
        game().saveCheckpoint('start', [spawn[0], 0, spawn[1]], yaw);
        if (intro) await intro(c);
        onReady?.(c);
      });
    } else {
      ctx.run('chapter_resume', async (c) => {
        await c.wait(1700);
        game().setFade(0, 900);
        onReady?.(c);
      });
    }
    return () => {
      useGame.setState({ chapterCard: null });
      ambience.forEach((a) => AudioSystem.loop(a.name, 0, 600));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Player spawn={spawn} yaw={yaw} />
      <Flashlight />
      <HorrorEventDirector pool={events} enabled={eventsEnabled} />
      {children}
    </>
  );
}
