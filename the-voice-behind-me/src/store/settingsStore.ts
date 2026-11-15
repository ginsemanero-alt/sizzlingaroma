import { create } from 'zustand';

export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  master: number;
  music: number;
  ambience: number;
  sfx: number;
  sensitivity: number;
  quality: Quality;
  subtitles: boolean;
  subtitleSize: 'small' | 'medium' | 'large';
  brightness: number;
  reducedShake: boolean;
  invertY: boolean;
}

const KEY = 'tvbm.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8,
  music: 0.6,
  ambience: 0.8,
  sfx: 0.9,
  sensitivity: 1,
  quality: 'medium',
  subtitles: true,
  subtitleSize: 'medium',
  brightness: 1,
  reducedShake: false,
  invertY: false,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULT_SETTINGS };
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch);
    try {
      const { set: _s, reset: _r, ...rest } = get();
      localStorage.setItem(KEY, JSON.stringify(rest));
    } catch {
      /* ignore */
    }
  },
  reset: () => get().set({ ...DEFAULT_SETTINGS }),
}));
