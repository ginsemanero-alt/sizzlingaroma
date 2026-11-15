import type { PuzzleId } from '../../data/puzzles';
import { useGame } from '../../store/gameStore';

/** Open a puzzle overlay. Resolves true if solved, false if the player backs out. */
export function openPuzzle(id: PuzzleId): Promise<boolean> {
  return new Promise((resolve) => {
    useGame.getState().setPuzzle({
      id,
      resolve: (solved) => {
        useGame.getState().setPuzzle(null);
        if (solved) useGame.getState().setFlag(`solved_${id}`);
        resolve(solved);
      },
    });
  });
}

export function isSolved(id: PuzzleId) {
  return !!useGame.getState().flags[`solved_${id}`];
}
