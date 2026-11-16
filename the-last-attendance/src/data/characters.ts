import type { SpeakerId } from '@/types';

export interface CharacterDef {
  id: SpeakerId;
  name: string;
  color: string;
  /** Voice synthesis parameters. */
  voice: { pitch: number; rate: number; preferFemale?: boolean };
  bio?: string;
}

export const CHARACTERS: Record<SpeakerId, CharacterDef> = {
  alex: {
    id: 'alex', name: 'Jasmine', color: '#cfd8e3', voice: { pitch: 0.9, rate: 0.95 },
    bio: 'Jasmine Semanero. Former student of Bubog National High School, Grade 12 – Sampaguita. Quiet, observant. Remembers transferring out before "the incident".',
  },
  reyes: {
    id: 'reyes', name: 'Ms. Reyes', color: '#e6b8b8', voice: { pitch: 0.55, rate: 0.72, preferFemale: true },
    bio: 'Ms. Elena Reyes. Adviser of Grade 12 – Sampaguita. Reported missing on the night of March 9, 2018.',
  },
  daniel: {
    id: 'daniel', name: 'Daniel', color: '#a9d6c0', voice: { pitch: 1.05, rate: 1.0 },
    bio: "Daniel Cruz. Jasmine's best friend. Recorded every review session on a cassette recorder. Reported missing.",
  },
  girl: { id: 'girl', name: '???', color: '#b9c6ff', voice: { pitch: 1.4, rate: 0.85, preferFemale: true } },
  villanueva: {
    id: 'villanueva', name: 'Mr. Villanueva', color: '#d9c38c', voice: { pitch: 0.7, rate: 0.9 },
    bio: 'Mr. Ricardo Villanueva. Principal of Bubog National High School, 2012–2018.',
  },
  narrator: { id: 'narrator', name: '', color: '#9aa4b1', voice: { pitch: 0.8, rate: 0.9 } },
  student: { id: 'student', name: 'Student', color: '#9fb4d9', voice: { pitch: 1.2, rate: 0.9 } },
  guard: { id: 'guard', name: 'Guard', color: '#c9b79a', voice: { pitch: 0.75, rate: 0.95 } },
  system: { id: 'system', name: '', color: '#777', voice: { pitch: 1, rate: 1 } },
};

/** The evening attendance roll of Grade 12 – Sampaguita, as Ms. Reyes calls it (surname first). */
export const ROLL_CALL: { surname: string; first: string }[] = [
  { surname: 'Aquino', first: 'Miguel' },
  { surname: 'Bautista', first: 'Andrea' },
  { surname: 'Cruz', first: 'Daniel' },
  { surname: 'Flores', first: 'Katrina' },
  { surname: 'Garcia', first: 'Nicole' },
  { surname: 'Lim', first: 'Hannah' },
  { surname: 'Mendoza', first: 'Carlo' },
  { surname: 'Navarro', first: 'Paolo' },
  { surname: 'Ramos', first: 'Joshua' },
  { surname: 'Santos', first: 'Erika' },
  { surname: 'Tan', first: 'Gabriel' },
];

export const FINAL_NAME = { surname: 'Semanero', first: 'Jasmine' };
export const HIDDEN_NAME = { surname: 'Dizon', first: 'Mara' };
