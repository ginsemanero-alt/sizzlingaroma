// Shared type definitions for THE LAST ATTENDANCE.

export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6;
export type EndingId = 'present' | 'absent' | 'new_student' | 'unrecorded';
export type SpeakerId = 'alex' | 'reyes' | 'daniel' | 'girl' | 'villanueva' | 'narrator' | 'student' | 'guard' | 'system';
export type Vec3 = [number, number, number];

export type FlagValue = boolean | number | string;
export type Flags = Record<string, FlagValue>;

export interface DialogueLine {
  /** Speaker id. */
  s: SpeakerId;
  /** English text (translation if the line is spoken in Filipino). */
  en: string;
  /** Filipino text (original if spoken in Filipino). */
  fil?: string;
  /** Spoken language for voice synthesis. Defaults to English. */
  lang?: 'en' | 'fil';
  /** Optional explicit duration in ms. */
  d?: number;
}

export type ItemCategory = 'item' | 'document' | 'photo' | 'recording';

export type ItemModel =
  | 'paper' | 'card' | 'book' | 'cassette' | 'photo' | 'key' | 'clip' | 'cloth'
  | 'glasses' | 'pick' | 'flashlight' | 'phone' | 'folder' | 'cord' | 'chain' | 'mirror';

export interface PhotoSpec {
  /** Short visual description used by the procedural photo renderer. */
  kind: 'class' | 'portrait' | 'polaroid';
  /** Figures drawn in the picture. */
  figures?: { label?: string; accent?: string; glasses?: boolean; ribbon?: boolean; jersey?: string; long?: boolean }[];
  caption?: string;
  tint?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  chapter: ChapterId;
  model: ItemModel;
  /** Short description shown in the inventory list. */
  description: string;
  /** Full text for documents, notes and files. */
  content?: string;
  /** Lines for audio recordings. */
  recording?: DialogueLine[];
  photo?: PhotoSpec;
  /** Text on the reverse side, revealed with Q-inspect → turn over. Optional hidden clue id unlocked on turning. */
  back?: { text: string; clue?: string };
  /** Key evidence required for the true ending. */
  key?: boolean;
  /** Optional record or hidden student clue (secret ending). */
  secret?: 'record' | 'hidden';
  /** Not shown as evidence (tools, keys). */
  tool?: boolean;
}

export type PuzzleId =
  | 'fusebox' | 'photo_match' | 'seating' | 'pc_password' | 'attendance'
  | 'archive_lock' | 'evacuation' | 'timeline' | 'secret_timeline';

export interface ObjectiveDef {
  id: string;
  text: string;
  /** Flag that marks this objective complete. */
  flag: string;
}

export interface ChapterMeta {
  id: ChapterId;
  title: string;
  subtitle: string;
  location: string;
  time: string;
  objectives: ObjectiveDef[];
  tip: string;
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  graphics: 'low' | 'medium' | 'high';
  brightness: number;
  subtitles: boolean;
  subtitleLanguage: 'en' | 'fil';
  reducedShake: boolean;
  reducedFlashing: boolean;
  voices: boolean;
  fov: number;
  invertY: boolean;
}

export interface Snapshot {
  chapter: ChapterId;
  collected: string[];
  flags: Flags;
  timesCaught: number;
}

export interface Checkpoint {
  id: string;
  pos: Vec3;
  yaw: number;
}

export interface SaveData extends Snapshot {
  version: number;
  checkpoint: Checkpoint | null;
  savedAt: number;
}

export interface MetaData {
  version: number;
  unlockedChapter: ChapterId;
  endings: EndingId[];
  snapshots: Partial<Record<ChapterId, Snapshot>>;
}
