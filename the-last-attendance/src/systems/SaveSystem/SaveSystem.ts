import type { ChapterId, MetaData, SaveData, Settings, Snapshot } from '@/types';

const SAVE_KEY = 'tla_save_v1';
const META_KEY = 'tla_meta_v1';
const SETTINGS_KEY = 'tla_settings_v1';
const VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  ambientVolume: 0.7,
  sfxVolume: 0.8,
  mouseSensitivity: 1,
  graphics: 'medium',
  brightness: 1,
  subtitles: true,
  subtitleLanguage: 'en',
  reducedShake: false,
  reducedFlashing: false,
  voices: true,
  fov: 70,
  invertY: false,
};

export const DEFAULT_META: MetaData = { version: VERSION, unlockedChapter: 1, endings: [], snapshots: {} };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the game continues without persistence */
  }
}

export const SaveSystem = {
  loadSave(): SaveData | null {
    const s = read<SaveData>(SAVE_KEY);
    if (!s || s.version !== VERSION || !s.chapter) return null;
    return s;
  },
  writeSave(data: Omit<SaveData, 'version' | 'savedAt'>): void {
    write(SAVE_KEY, { ...data, version: VERSION, savedAt: Date.now() });
  },
  hasSave(): boolean {
    return SaveSystem.loadSave() !== null;
  },
  deleteSave(): void {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  },
  loadMeta(): MetaData {
    const m = read<MetaData>(META_KEY);
    if (!m || m.version !== VERSION) return { ...DEFAULT_META, snapshots: {} };
    return m;
  },
  writeMeta(meta: MetaData): void {
    write(META_KEY, meta);
  },
  saveSnapshot(meta: MetaData, snap: Snapshot): MetaData {
    const next: MetaData = {
      ...meta,
      unlockedChapter: Math.max(meta.unlockedChapter, snap.chapter) as ChapterId,
      snapshots: { ...meta.snapshots, [snap.chapter]: snap },
    };
    SaveSystem.writeMeta(next);
    return next;
  },
  deleteAll(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(META_KEY);
    } catch { /* ignore */ }
  },
  loadSettings(): Settings {
    const s = read<Partial<Settings>>(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  },
  writeSettings(s: Settings): void {
    write(SETTINGS_KEY, s);
  },
};
