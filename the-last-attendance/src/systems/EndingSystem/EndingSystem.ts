import type { EndingId, Flags } from '@/types';
import { HIDDEN_CLUES, KEY_EVIDENCE, SECRET_RECORDS } from '@/data/items';

export interface FinalDecision {
  /** What Jasmine did with the attendance book. */
  record: 'restore' | 'leave' | 'tear';
  /** Number of truthful answers to Ms. Reyes's questions (0..3). */
  truthful: number;
  /** Final answer to "Jasmine?" */
  answer: 'present' | 'silent' | 'never';
}

export interface EvidenceSummary {
  keyFound: number;
  keyTotal: number;
  keyMissing: string[];
  secretFound: number;
  secretTotal: number;
  allKey: boolean;
  allSecret: boolean;
  secretTimeline: boolean;
}

export function summarizeEvidence(collected: string[], flags: Flags): EvidenceSummary {
  const set = new Set(collected);
  const keyMissing = KEY_EVIDENCE.filter((k) => !set.has(k));
  const secretList = [...SECRET_RECORDS, ...HIDDEN_CLUES];
  const secretFound = secretList.filter((k) => set.has(k)).length;
  return {
    keyFound: KEY_EVIDENCE.length - keyMissing.length,
    keyTotal: KEY_EVIDENCE.length,
    keyMissing,
    secretFound,
    secretTotal: secretList.length,
    allKey: keyMissing.length === 0,
    allSecret: secretFound === secretList.length,
    secretTimeline: !!flags.puzzle_secret_timeline,
  };
}

/** Whether the secret timeline puzzle can be attempted. */
export function canAttemptSecretTimeline(collected: string[]): boolean {
  const set = new Set(collected);
  return [...SECRET_RECORDS, ...HIDDEN_CLUES].every((k) => set.has(k));
}

/**
 * Ending resolution:
 *  - ABSENT: the record is left untouched, or Jasmine refuses to answer / denies she was there.
 *  - THE NEW STUDENT: Jasmine answers "present" but has not remembered (missing key evidence,
 *    untruthful answers, or a torn record). Also reached by being caught in Chapter 6.
 *  - PRESENT: all key evidence, timeline reconstructed, record restored, truthful answers, "present".
 *  - THE UNRECORDED: PRESENT + every optional record and hidden clue + secret timeline solved.
 */
export function resolveEnding(collected: string[], flags: Flags, d: FinalDecision): EndingId {
  const ev = summarizeEvidence(collected, flags);
  if (d.record === 'leave' || d.answer !== 'present') return 'absent';
  const remembered = ev.allKey && !!flags.puzzle_timeline && d.truthful === 3 && d.record === 'restore';
  if (!remembered) return 'new_student';
  if (ev.allSecret && ev.secretTimeline) return 'unrecorded';
  return 'present';
}
