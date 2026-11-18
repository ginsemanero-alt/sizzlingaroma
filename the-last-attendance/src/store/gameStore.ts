import { create } from 'zustand';
import type {
  ChapterId, Checkpoint, EndingId, FlagValue, Flags, MetaData, PuzzleId, SaveData, Settings, Snapshot, SpeakerId, Vec3,
} from '@/types';
import { SaveSystem } from '@/systems/SaveSystem/SaveSystem';
import { ITEMS, KEEPSAKES } from '@/data/items';
import { bus, runtime } from '@/systems/runtime';

export type Overlay = 'none' | 'pause' | 'puzzle' | 'choice' | 'reader' | 'inspect' | 'settings';

export interface ChoiceOption { id: string; label: string; disabled?: boolean; hint?: string }
export interface ChoiceRequest { prompt: string; speaker?: SpeakerId; options: ChoiceOption[]; resolve: (id: string) => void }
export interface Notification { id: number; text: string; kind: 'evidence' | 'item' | 'info' | 'objective' | 'save' }
export interface Subtitle { speaker: SpeakerId; en: string; fil?: string; id: number }

interface GameState {
  // ── persisted progress ──
  chapter: ChapterId;
  collected: string[];
  flags: Flags;
  timesCaught: number;
  checkpoint: Checkpoint | null;
  meta: MetaData;
  settings: Settings;

  // ── session/UI ──
  sceneNonce: number;
  inGame: boolean;
  overlay: Overlay;
  inventoryOpen: boolean;
  readerItem: string | null;
  inspectItem: string | null;
  selectedItem: string | null;
  activePuzzle: PuzzleId | null;
  prompt: string | null;
  subtitle: Subtitle | null;
  choice: ChoiceRequest | null;
  notifications: Notification[];
  flashlightOn: boolean;
  /** Black screen overlay opacity target 0..1. */
  fade: number;
  fadeMs: number;
  chapterCard: { title: string; subtitle: string; location: string; time: string } | null;
  transitionTo: ChapterId | null;
  ending: EndingId | null;
  caughtMessage: string | null;
  centerText: string | null;

  // ── actions ──
  setFlag: (k: string, v?: FlagValue) => void;
  incFlag: (k: string, by?: number) => number;
  flag: (k: string) => FlagValue | undefined;
  has: (id: string) => boolean;
  collect: (id: string, opts?: { silent?: boolean; open?: boolean }) => void;
  notify: (text: string, kind?: Notification['kind']) => void;
  dismissNotification: (id: number) => void;
  setPrompt: (p: string | null) => void;
  setSubtitle: (s: Omit<Subtitle, 'id'> | null) => void;
  ask: (prompt: string, options: ChoiceOption[], speaker?: SpeakerId) => Promise<string>;
  answerChoice: (id: string) => void;
  openOverlay: (o: Overlay) => void;
  closeOverlay: () => void;
  setInventory: (open: boolean) => void;
  openReader: (id: string) => void;
  openInspect: (id: string) => void;
  selectItem: (id: string | null) => void;
  openPuzzle: (id: PuzzleId) => void;
  solvePuzzle: (id: PuzzleId) => void;
  setFlashlight: (on: boolean) => void;
  setFade: (v: number, ms?: number) => void;
  setCenterText: (t: string | null) => void;
  updateSettings: (s: Partial<Settings>) => void;

  saveCheckpoint: (id: string, pos?: Vec3, yaw?: number) => void;
  newGame: () => void;
  continueGame: () => boolean;
  startChapterFromSelect: (ch: ChapterId) => void;
  reloadCheckpoint: () => void;
  completeChapter: () => void;
  beginChapter: (ch: ChapterId) => void;
  triggerEnding: (id: EndingId) => void;
  unlockEnding: (id: EndingId) => void;
  caught: (message?: string) => void;
  exitToMenu: () => void;
  deleteAllProgress: () => void;
}

let noteId = 1;
let subId = 1;

function freshSnapshot(ch: ChapterId): Snapshot {
  return { chapter: ch, collected: [], flags: {}, timesCaught: 0 };
}

export const useGame = create<GameState>((set, get) => ({
  chapter: 1,
  collected: [],
  flags: {},
  timesCaught: 0,
  checkpoint: null,
  meta: SaveSystem.loadMeta(),
  settings: SaveSystem.loadSettings(),

  sceneNonce: 0,
  inGame: false,
  overlay: 'none',
  inventoryOpen: false,
  readerItem: null,
  inspectItem: null,
  selectedItem: null,
  activePuzzle: null,
  prompt: null,
  subtitle: null,
  choice: null,
  notifications: [],
  flashlightOn: false,
  fade: 0,
  fadeMs: 800,
  chapterCard: null,
  transitionTo: null,
  ending: null,
  caughtMessage: null,
  centerText: null,

  setFlag: (k, v = true) => set((s) => (s.flags[k] === v ? s : { flags: { ...s.flags, [k]: v } })),
  incFlag: (k, by = 1) => {
    const cur = Number(get().flags[k] ?? 0) + by;
    set((s) => ({ flags: { ...s.flags, [k]: cur } }));
    return cur;
  },
  flag: (k) => get().flags[k],
  has: (id) => get().collected.includes(id),

  collect: (id, opts = {}) => {
    if (get().collected.includes(id)) return;
    const def = ITEMS[id];
    set((s) => ({ collected: [...s.collected, id], selectedItem: id }));
    if (!def || opts.silent) return;
    if (def.category === 'keepsake') {
      const n = KEEPSAKES.filter((k) => get().collected.includes(k)).length;
      get().notify(`Belonging returned: ${def.name} (${n}/${KEEPSAKES.length})`, 'evidence');
      if (n === KEEPSAKES.length) window.setTimeout(() => get().notify('Every belonging has been found. They will remember.', 'objective'), 1800);
      bus.emit('keepsake', id);
      if (def.memory && !get().subtitle) {
        const speaker: SpeakerId = def.owner === 'Reyes' ? 'reyes' : def.owner === 'Dizon' ? 'girl' : def.owner === 'Cruz' ? 'daniel' : 'student';
        get().setSubtitle({ speaker, en: def.memory.en, fil: def.memory.fil });
        const sid = get().subtitle?.id;
        window.setTimeout(() => { if (get().subtitle?.id === sid) get().setSubtitle(null); }, 5200);
      }
      return;
    }
    const label = def.tool ? 'Item' : def.category === 'recording' ? 'Recording' : def.category === 'photo' ? 'Photograph' : 'Evidence';
    get().notify(`${label}: ${def.name}`, def.tool ? 'item' : 'evidence');
    if (opts.open && (def.category === 'document' || def.category === 'photo')) get().openReader(id);
  },

  notify: (text, kind = 'info') => {
    const id = noteId++;
    set((s) => ({ notifications: [...s.notifications.slice(-3), { id, text, kind }] }));
    window.setTimeout(() => get().dismissNotification(id), 4200);
  },
  dismissNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setPrompt: (p) => { if (get().prompt !== p) set({ prompt: p }); },
  setSubtitle: (sub) => set({ subtitle: sub ? { ...sub, id: subId++ } : null }),

  ask: (prompt, options, speaker) =>
    new Promise<string>((resolve) => {
      set({ choice: { prompt, options, speaker, resolve }, overlay: 'choice' });
    }),
  answerChoice: (id) => {
    const c = get().choice;
    if (!c) return;
    set({ choice: null, overlay: 'none' });
    c.resolve(id);
  },

  openOverlay: (o) => set({ overlay: o }),
  closeOverlay: () => set({ overlay: 'none', readerItem: null, inspectItem: null, activePuzzle: null }),
  setInventory: (open) => set({ inventoryOpen: open }),
  openReader: (id) => set({ overlay: 'reader', readerItem: id }),
  openInspect: (id) => set({ overlay: 'inspect', inspectItem: id, inventoryOpen: false }),
  selectItem: (id) => set({ selectedItem: id }),
  openPuzzle: (id) => set({ overlay: 'puzzle', activePuzzle: id }),
  solvePuzzle: (id) => {
    get().setFlag(`puzzle_${id}`, true);
    set({ overlay: 'none', activePuzzle: null });
  },
  setFlashlight: (on) => set({ flashlightOn: on }),
  setFade: (v, ms = 800) => set({ fade: v, fadeMs: ms }),
  setCenterText: (t) => set({ centerText: t }),

  updateSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    SaveSystem.writeSettings(settings);
    set({ settings });
  },

  saveCheckpoint: (id, pos, yaw) => {
    const p = runtime.player;
    const cp: Checkpoint = { id, pos: pos ?? [p.pos.x, p.pos.y, p.pos.z], yaw: yaw ?? p.yaw };
    set((st) => ({ flags: { ...st.flags, battery: Math.round(runtime.battery) } }));
    const s = get();
    SaveSystem.writeSave({ chapter: s.chapter, collected: s.collected, flags: s.flags, timesCaught: s.timesCaught, checkpoint: cp });
    set({ checkpoint: cp });
    get().notify('Progress saved', 'save');
  },

  newGame: () => {
    SaveSystem.deleteSave();
    get().beginChapter(1);
  },

  continueGame: () => {
    const save = SaveSystem.loadSave();
    if (!save) return false;
    applySave(save);
    return true;
  },

  startChapterFromSelect: (ch) => {
    const snap = get().meta.snapshots[ch] ?? (ch === 1 ? freshSnapshot(1) : null);
    if (!snap) return;
    set({ chapter: ch, collected: [...snap.collected], flags: { ...snap.flags }, timesCaught: snap.timesCaught, checkpoint: null });
    const s = get();
    SaveSystem.writeSave({ chapter: ch, collected: s.collected, flags: s.flags, timesCaught: s.timesCaught, checkpoint: null });
    enterGame();
  },

  reloadCheckpoint: () => {
    const save = SaveSystem.loadSave();
    if (save) applySave(save);
    else get().beginChapter(get().chapter);
  },

  completeChapter: () => {
    const ch = get().chapter;
    if (ch >= 6) return;
    set({ transitionTo: (ch + 1) as ChapterId });
  },

  beginChapter: (ch) => {
    const prev = get();
    const keepProgress = ch !== 1;
    const snap: Snapshot = {
      chapter: ch,
      collected: keepProgress ? prev.collected : [],
      flags: keepProgress ? prev.flags : {},
      timesCaught: keepProgress ? prev.timesCaught : 0,
    };
    const meta = SaveSystem.saveSnapshot(prev.meta, snap);
    SaveSystem.writeSave({ ...snap, checkpoint: null });
    set({ ...snap, meta, checkpoint: null, transitionTo: null });
    enterGame();
  },

  triggerEnding: (id) => {
    get().unlockEnding(id);
    set({ ending: id });
  },
  unlockEnding: (id) => {
    const meta = get().meta;
    if (meta.endings.includes(id)) return;
    const next = { ...meta, endings: [...meta.endings, id] };
    SaveSystem.writeMeta(next);
    set({ meta: next });
  },

  caught: (message = 'She found you.') => {
    if (get().caughtMessage) return;
    set((s) => ({ caughtMessage: message, timesCaught: s.timesCaught + 1 }));
    const s = get();
    // persist the caught counter without moving the checkpoint
    const save = SaveSystem.loadSave();
    if (save) SaveSystem.writeSave({ ...save, timesCaught: s.timesCaught });
    if (s.chapter === 6) {
      window.setTimeout(() => { set({ caughtMessage: null }); get().triggerEnding('new_student'); }, 2600);
    } else {
      window.setTimeout(() => { set({ caughtMessage: null }); get().reloadCheckpoint(); }, 2800);
    }
  },

  exitToMenu: () => set({ inGame: false, overlay: 'none', inventoryOpen: false, subtitle: null, choice: null, prompt: null, chapterCard: null, transitionTo: null, ending: null, caughtMessage: null, centerText: null, fade: 0 }),

  deleteAllProgress: () => {
    SaveSystem.deleteAll();
    set({ meta: SaveSystem.loadMeta(), chapter: 1, collected: [], flags: {}, timesCaught: 0, checkpoint: null });
  },
}));

function applySave(save: SaveData): void {
  useGame.setState({
    chapter: save.chapter,
    collected: [...save.collected],
    flags: { ...save.flags },
    timesCaught: save.timesCaught ?? 0,
    checkpoint: save.checkpoint,
  });
  enterGame();
}

function enterGame(): void {
  useGame.setState((s) => ({
    inGame: true,
    sceneNonce: s.sceneNonce + 1,
    overlay: 'none',
    inventoryOpen: false,
    readerItem: null,
    inspectItem: null,
    activePuzzle: null,
    prompt: null,
    subtitle: null,
    choice: null,
    caughtMessage: null,
    ending: null,
    centerText: null,
    flashlightOn: false,
    fade: 1,
    fadeMs: 0,
  }));
}

/** Non-React accessor for scripts and systems. */
export const game = () => useGame.getState();
