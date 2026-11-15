import { HIDDEN_TAPES, IMPORTANT_EVIDENCE, OPTIONAL_CLUES } from '../../data/items';
import { useGame } from '../../store/gameStore';

export interface EndingProgress {
  evidence: number;
  evidenceTotal: number;
  clues: number;
  cluesTotal: number;
  tapes: number;
  tapesTotal: number;
  secretReady: boolean;
  avoidance: number;
  flees: number;
}

export function endingProgress(): EndingProgress {
  const { inventory, avoidance, flees } = useGame.getState();
  const has = (id: string) => inventory.includes(id);
  const evidence = IMPORTANT_EVIDENCE.filter(has).length;
  const clues = OPTIONAL_CLUES.filter(has).length;
  const tapes = HIDDEN_TAPES.filter(has).length;
  return {
    evidence,
    evidenceTotal: IMPORTANT_EVIDENCE.length,
    clues,
    cluesTotal: OPTIONAL_CLUES.length,
    tapes,
    tapesTotal: HIDDEN_TAPES.length,
    secretReady: clues === OPTIONAL_CLUES.length && tapes === HIDDEN_TAPES.length,
    avoidance,
    flees,
  };
}

/**
 * How many times the player may run the endless hallway before it traps them
 * (Ending C). Players who avoided memories and fled the Figure get fewer.
 */
export function hallwayLoopLimit(): number {
  const { avoidance } = useGame.getState();
  return Math.max(2, 5 - Math.floor(avoidance / 2));
}

/** Can the player accept the truth? Requires the evidence + the reconstruction. */
export function acceptanceReady(): boolean {
  const p = endingProgress();
  return p.evidence >= p.evidenceTotal && !!useGame.getState().flags.solved_timeline;
}
