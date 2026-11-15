import type { ChapterId, EndingId } from '../../data/types';

/** Snapshot of everything that persists between chapters. */
export interface Snapshot {
  chapter: ChapterId;
  inventory: string[];
  flags: Record<string, number | boolean>;
  avoidance: number;
  flees: number;
  battery: number;
  savedAt: number;
}

export interface SaveData {
  version: 1;
  /** latest checkpoint — used by CONTINUE */
  latest: Snapshot | null;
  /** checkpoint at the start of every reached chapter — used by CHAPTER SELECT */
  chapters: Partial<Record<ChapterId, Snapshot>>;
  unlocked: ChapterId[];
  endings: EndingId[];
  /** how many times the player has looped through the denial ending */
  loops: number;
}

const KEY = 'tvbm.save.v1';

const empty = (): SaveData => ({ version: 1, latest: null, chapters: {}, unlocked: [1], endings: [], loops: 0 });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return empty();
    return { ...empty(), ...data };
  } catch {
    return empty();
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full / unavailable — the game still runs */
  }
}

export function saveCheckpoint(snap: Snapshot) {
  const data = loadSave();
  data.latest = snap;
  data.chapters[snap.chapter] = snap;
  if (!data.unlocked.includes(snap.chapter)) data.unlocked = [...data.unlocked, snap.chapter].sort() as ChapterId[];
  writeSave(data);
}

export function recordEnding(id: EndingId) {
  const data = loadSave();
  if (!data.endings.includes(id)) data.endings.push(id);
  if (id === 'B') data.loops += 1;
  writeSave(data);
}

export function hasContinue(): boolean {
  return !!loadSave().latest;
}

export function newGameSnapshot(): Snapshot {
  const loops = loadSave().loops;
  return {
    chapter: 1,
    inventory: [],
    flags: loops > 0 ? { looped: loops } : {},
    avoidance: 0,
    flees: 0,
    battery: 100,
    savedAt: Date.now(),
  };
}

export function wipeSave() {
  writeSave(empty());
}
