import { create } from 'zustand';
import type { ChapterId, EndingId } from '../data/types';
import { CHAPTERS } from '../data/chapters';
import type { PuzzleId } from '../data/puzzles';
import type { Snapshot } from '../systems/SaveSystem/saveSystem';

export interface Objective {
  id: string;
  text: string;
  done: boolean;
  count: number;
  total?: number;
  optional?: boolean;
}

export interface Subtitle {
  id: number;
  who: string;
  text: string;
  faint?: boolean;
}

export interface ChoiceOption {
  id: string;
  text: string;
  /** shown greyed out with this reason when unavailable */
  locked?: string;
}

export interface ChoiceRequest {
  prompt: string;
  options: ChoiceOption[];
  resolve: (id: string) => void;
}

export interface PuzzleRequest {
  id: PuzzleId;
  resolve: (solved: boolean) => void;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'item' | 'info' | 'save';
}

export interface ChapterCard {
  title: string;
  subtitle: string;
  location: string;
}

interface GameState {
  chapter: ChapterId;
  /** increments each time a chapter (re)starts so scenes fully remount */
  runId: number;
  active: boolean;

  inventory: string[];
  flags: Record<string, number | boolean>;
  avoidance: number;
  flees: number;
  battery: number;
  flashlightOn: boolean;

  objectives: Objective[];
  focus: { id: string; prompt: string } | null;

  paused: boolean;
  inventoryOpen: boolean;
  viewItem: string | null;
  puzzle: PuzzleRequest | null;
  choice: ChoiceRequest | null;
  cutscene: boolean;

  subtitle: Subtitle | null;
  toasts: Toast[];
  chapterCard: ChapterCard | null;
  fade: number;
  fadeColor: string;
  distortion: number;
  pendingEnding: EndingId | null;
  /** short contextual hint, e.g. "Turn around" */
  hint: string | null;

  startFromSnapshot: (s: Snapshot) => void;
  snapshot: () => Snapshot;
  stop: () => void;

  setObjectiveDone: (id: string, done?: boolean) => void;
  incObjective: (id: string, by?: number) => void;

  addItem: (id: string) => void;
  hasItem: (id: string) => boolean;
  setFlag: (k: string, v?: number | boolean) => void;
  flag: (k: string) => number | boolean | undefined;
  addAvoidance: (n?: number) => void;
  addFlee: () => void;

  setBattery: (b: number) => void;
  setFlashlight: (on: boolean) => void;

  setFocus: (f: { id: string; prompt: string } | null) => void;
  setPaused: (p: boolean) => void;
  setInventoryOpen: (o: boolean) => void;
  setViewItem: (id: string | null) => void;
  setPuzzle: (p: PuzzleRequest | null) => void;
  setChoice: (c: ChoiceRequest | null) => void;
  setCutscene: (c: boolean) => void;
  setSubtitle: (s: Subtitle | null) => void;
  pushToast: (text: string, kind?: Toast['kind']) => void;
  dropToast: (id: number) => void;
  setChapterCard: (c: ChapterCard | null) => void;
  setFade: (f: number, color?: string) => void;
  setDistortion: (d: number) => void;
  setPendingEnding: (e: EndingId | null) => void;
  setHint: (h: string | null) => void;
}

let toastId = 1;

export const useGame = create<GameState>((set, get) => ({
  chapter: 1,
  runId: 0,
  active: false,
  inventory: [],
  flags: {},
  avoidance: 0,
  flees: 0,
  battery: 100,
  flashlightOn: false,
  objectives: [],
  focus: null,
  paused: false,
  inventoryOpen: false,
  viewItem: null,
  puzzle: null,
  choice: null,
  cutscene: false,
  subtitle: null,
  toasts: [],
  chapterCard: null,
  fade: 1,
  fadeColor: '#000',
  distortion: 0,
  pendingEnding: null,
  hint: null,

  startFromSnapshot: (s) =>
    set((st) => ({
      chapter: s.chapter,
      runId: st.runId + 1,
      active: true,
      inventory: [...s.inventory],
      flags: { ...s.flags },
      avoidance: s.avoidance,
      flees: s.flees,
      battery: s.battery,
      flashlightOn: false,
      objectives: CHAPTERS[s.chapter].objectives.map((o) => ({
        id: o.id,
        text: o.text,
        total: o.total,
        optional: o.optional,
        done: false,
        count: 0,
      })),
      focus: null,
      paused: false,
      inventoryOpen: false,
      viewItem: null,
      puzzle: null,
      choice: null,
      cutscene: false,
      subtitle: null,
      toasts: [],
      fade: 1,
      distortion: 0,
      pendingEnding: null,
      hint: null,
    })),

  snapshot: () => {
    const s = get();
    return {
      chapter: s.chapter,
      inventory: [...s.inventory],
      flags: { ...s.flags },
      avoidance: s.avoidance,
      flees: s.flees,
      battery: Math.max(s.battery, 40),
      savedAt: Date.now(),
    };
  },

  stop: () => set({ active: false, paused: false, puzzle: null, choice: null, viewItem: null, inventoryOpen: false }),

  setObjectiveDone: (id, done = true) =>
    set((s) => ({ objectives: s.objectives.map((o) => (o.id === id ? { ...o, done, count: o.total && done ? o.total : o.count } : o)) })),
  incObjective: (id, by = 1) =>
    set((s) => ({
      objectives: s.objectives.map((o) => {
        if (o.id !== id) return o;
        const count = Math.min(o.total ?? 1, o.count + by);
        return { ...o, count, done: count >= (o.total ?? 1) };
      }),
    })),

  addItem: (id) => {
    if (get().inventory.includes(id)) return;
    set((s) => ({ inventory: [...s.inventory, id] }));
  },
  hasItem: (id) => get().inventory.includes(id),
  setFlag: (k, v = true) => set((s) => ({ flags: { ...s.flags, [k]: v } })),
  flag: (k) => get().flags[k],
  addAvoidance: (n = 1) => set((s) => ({ avoidance: s.avoidance + n })),
  addFlee: () => set((s) => ({ flees: s.flees + 1, avoidance: s.avoidance + 1 })),

  setBattery: (b) => set({ battery: Math.max(0, Math.min(100, b)) }),
  setFlashlight: (on) => set({ flashlightOn: on }),

  setFocus: (f) => {
    const cur = get().focus;
    if (cur?.id === f?.id && cur?.prompt === f?.prompt) return;
    set({ focus: f });
  },
  setPaused: (p) => set({ paused: p }),
  setInventoryOpen: (o) => set({ inventoryOpen: o, viewItem: o ? get().viewItem : null }),
  setViewItem: (id) => set({ viewItem: id }),
  setPuzzle: (p) => set({ puzzle: p }),
  setChoice: (c) => set({ choice: c }),
  setCutscene: (c) => set({ cutscene: c }),
  setSubtitle: (s) => set({ subtitle: s }),
  pushToast: (text, kind = 'info') => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    setTimeout(() => get().dropToast(id), 3600);
  },
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setChapterCard: (c) => set({ chapterCard: c }),
  setFade: (f, color) => set({ fade: f, fadeColor: color ?? get().fadeColor }),
  setDistortion: (d) => set({ distortion: d }),
  setPendingEnding: (e) => set({ pendingEnding: e }),
  setHint: (h) => set({ hint: h }),
}));

/** True when the player is allowed to move / look around. */
export function controlsActive(): boolean {
  const s = useGame.getState();
  return s.active && !s.paused && !s.inventoryOpen && !s.viewItem && !s.puzzle && !s.choice && !s.cutscene;
}

/** True when a full-screen UI wants the mouse cursor. */
export function uiWantsCursor(): boolean {
  const s = useGame.getState();
  return s.paused || s.inventoryOpen || !!s.viewItem || !!s.puzzle || !!s.choice;
}
