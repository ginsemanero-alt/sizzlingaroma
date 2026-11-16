import type { PuzzleId } from '@/types';

/** Puzzle data and pure validators. UI components live in components/Puzzles. */

export const FUSE_BREAKERS = ['MAIN', 'CANTEEN', 'ROOM 13', 'HALLWAY'] as const;
export const FUSE_SOLUTION = ['MAIN', 'HALLWAY', 'ROOM 13'];

export const SEATING_NAMES = ['Jasmine', 'Daniel', 'Hannah', 'Carlo', 'Katrina', 'Joshua'] as const;
/** Seats 1..6: front row 1-2-3, back row 4-5-6; window side is seat 3/6. */
export const SEATING_SOLUTION: Record<number, string> = { 1: 'Katrina', 2: 'Hannah', 3: 'Jasmine', 4: 'Joshua', 5: 'Carlo', 6: 'Daniel' };

export interface PhotoCard { id: string; description: string; answer: string }
export const PHOTO_CARDS: PhotoCard[] = [
  { id: 'p1', description: 'A girl with long hair, a ribbon tied in it.', answer: 'Hannah Lim' },
  { id: 'p2', description: 'A boy grinning, a number 7 jersey showing under his uniform.', answer: 'Carlo Mendoza' },
  { id: 'p3', description: 'A girl with thick round glasses, mid-laugh.', answer: 'Katrina Flores' },
  { id: 'p4', description: 'A boy with a pick on a string around his neck.', answer: 'Joshua Ramos' },
];
export const PHOTO_NAMES = ['Carlo Mendoza', 'Hannah Lim', 'Joshua Ramos', 'Katrina Flores'];

export const PC_PASSWORD = 'SAMPAGUITA13';
export const ARCHIVE_CODE = '0738';

export const ATTENDANCE_CANDIDATES = [
  'Aquino, Miguel', 'Bautista, Andrea', 'Cruz, Daniel', 'Flores, Katrina', 'Garcia, Nicole', 'Ilagan, Ramon',
  'Lim, Hannah', 'Mendoza, Carlo', 'Navarro, Paolo', 'Ocampo, Liza', 'Ramos, Joshua',
  'Santos, Erika', 'Semanero, Jasmine', 'Tan, Gabriel', 'Torres, Beatriz',
];
export const ATTENDANCE_SOLUTION = [
  'Aquino, Miguel', 'Bautista, Andrea', 'Cruz, Daniel', 'Flores, Katrina', 'Garcia, Nicole', 'Lim, Hannah',
  'Mendoza, Carlo', 'Navarro, Paolo', 'Ramos, Joshua', 'Santos, Erika', 'Semanero, Jasmine', 'Tan, Gabriel',
];

export interface SequenceEvent { id: string; label: string }
export interface SequencePuzzleDef { title: string; instructions: string; events: SequenceEvent[] /* in correct order */ }

export const SEQUENCES: Record<'evacuation' | 'timeline' | 'secret_timeline', SequencePuzzleDef> = {
  evacuation: {
    title: 'Evacuation — Room 13 Blackboard',
    instructions:
      'Ms. Reyes chalked the evacuation as she planned it. Arrange the route the class actually took, from first to last. Listen to what you heard in the halls.',
    events: [
      { id: 'e1', label: 'Room 13 — Ms. Reyes counts the students (Jasmine and Daniel missing)' },
      { id: 'e2', label: 'Main stairs — filled with smoke, impassable' },
      { id: 'e3', label: 'East hallway — the class moves toward the emergency exit' },
      { id: 'e4', label: 'East emergency exit — the last place they were' },
    ],
  },
  timeline: {
    title: 'Incident Timeline — Archive Board',
    instructions:
      'Pin the events of March 9, 2018 in the order they happened. The times are in your evidence: the original attendance scan, the guard and library logs, the diary, the report.',
    events: [
      { id: 't1', label: 'Evening session begins in Room 13; attendance is taken' },
      { id: 't2', label: 'Daniel leaves for the science lab to get his reviewer' },
      { id: 't3', label: 'Jasmine leaves Room 13 to look for Daniel' },
      { id: 't4', label: 'Fire starts at the extension cord in the lab' },
      { id: 't5', label: 'Ms. Reyes leads the class toward the east exit' },
      { id: 't6', label: 'Jasmine and Daniel are separated at the stairs' },
      { id: 't7', label: 'The principal declares the evacuation "complete"' },
    ],
  },
  secret_timeline: {
    title: 'The Unrecorded Timeline',
    instructions:
      'Everything that was done before and after the fire. Order all eight events. Dates are in the memos, forms, logs and both sides of the confession.',
    events: [
      { id: 's1', label: 'Ms. Reyes first reports the overloaded extension cord' },
      { id: 's2', label: 'The principal orders the east exit chained after 5 PM' },
      { id: 's3', label: 'Mara Dizon enrolls — her form is never encoded' },
      { id: 's4', label: 'The fire starts in the science lab' },
      { id: 's5', label: 'The guard finds the east exit chained; the key is with the principal' },
      { id: 's6', label: 'The incident report is rewritten at 2:14 AM' },
      { id: 's7', label: 'The East Wing is sealed; no search is ordered' },
      { id: 's8', label: "Jasmine Semanero's record is changed to \"transferred\"" },
    ],
  },
};

export const PUZZLE_TITLES: Record<PuzzleId, string> = {
  fusebox: 'Breaker Panel',
  photo_match: 'Faculty Photo Board',
  seating: 'Seating Plan',
  pc_password: 'Records Computer',
  attendance: 'Attendance Reconstruction',
  archive_lock: 'Archive Keypad',
  evacuation: 'Evacuation Route',
  timeline: 'Incident Timeline',
  secret_timeline: 'The Unrecorded Timeline',
};

export function checkSequence(order: string[], def: SequencePuzzleDef): { correct: number; solved: boolean } {
  let correct = 0;
  def.events.forEach((e, i) => { if (order[i] === e.id) correct++; });
  return { correct, solved: correct === def.events.length };
}

export function checkAttendance(selected: string[]): { solved: boolean; count: number; wrong: number } {
  const set = new Set(selected);
  const wrong = selected.filter((n) => !ATTENDANCE_SOLUTION.includes(n)).length;
  const missing = ATTENDANCE_SOLUTION.filter((n) => !set.has(n)).length;
  return { solved: wrong === 0 && missing === 0, count: selected.length, wrong };
}

export function checkSeating(assign: Record<number, string>): { solved: boolean; correct: number } {
  let correct = 0;
  for (let s = 1; s <= 6; s++) if (assign[s] === SEATING_SOLUTION[s]) correct++;
  return { solved: correct === 6, correct };
}
