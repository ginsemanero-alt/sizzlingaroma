export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6;

export type Speaker =
  | 'Elias'
  | 'Noah'
  | 'Voice'
  | 'The Figure'
  | 'Dad'
  | 'Mom'
  | 'Answering Machine'
  | 'Recorder'
  | 'Radio'
  | '';

export type VoiceKind = 'elias' | 'noah' | 'figure' | 'dad' | 'mom' | 'machine' | 'whisper' | 'none';

export interface Line {
  who: Speaker;
  text: string;
  /** seconds; computed from text length if omitted */
  dur?: number;
  voice?: VoiceKind;
  /** heard through a cassette / phone: adds tape hiss and band-pass */
  tape?: boolean;
  /** de-emphasised (faint whisper) styling */
  faint?: boolean;
}

export type ItemType = 'key' | 'photo' | 'note' | 'tape' | 'tool' | 'clue' | 'marking';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  chapter: ChapterId;
  description: string;
  /** body text shown when the item is read / inspected */
  text?: string;
  /** reverse side of a photograph */
  back?: string;
  /** lines played when a tape / voicemail is played from the inventory */
  tape?: Line[];
  important?: boolean;
  optionalClue?: boolean;
  hiddenTape?: boolean;
  /** simple procedural thumbnail colour */
  tint?: string;
}

export interface ObjectiveDef {
  id: string;
  text: string;
  total?: number;
  optional?: boolean;
}

export interface ChapterDef {
  id: ChapterId;
  title: string;
  subtitle: string;
  location: string;
  objectives: ObjectiveDef[];
}

export type EndingId = 'A' | 'B' | 'C' | 'D';

export interface EndingDef {
  id: EndingId;
  title: string;
  name: string;
  requirement: string;
  lines: Line[];
  epilogue: string[];
}
