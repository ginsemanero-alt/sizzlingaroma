import type { Line } from '../../data/types';
import { DIALOGUE, type DialogueKey } from '../../data/dialogue';
import { useGame, type ChoiceOption } from '../../store/gameStore';
import { speak, stopVoice } from '../AudioSystem/audioManager';
import { clock, wait } from '../ChapterSystem/clock';

let seq = 0;
let chain: Promise<void> = Promise.resolve();
let subId = 1;

export function lineDuration(l: Line) {
  return l.dur ?? Math.min(7.5, Math.max(1.8, 1.1 + l.text.length * 0.058));
}

async function run(lines: Line[], token: number, pos?: [number, number, number]) {
  const g = useGame.getState();
  const gen = clock.generation;
  for (const l of lines) {
    if (token !== seq || gen !== clock.generation) return;
    const dur = lineDuration(l);
    g.setSubtitle({ id: subId++, who: l.who, text: l.text, faint: l.faint });
    speak(l.voice, dur, l.tape, pos);
    await wait(dur);
    if (token !== seq) return;
    useGame.getState().setSubtitle(null);
    await wait(0.18);
  }
}

/**
 * Show subtitles (and play placeholder voice audio) for a list of lines.
 * Calls queue up; `interrupt` cancels whatever is currently being said.
 */
export function say(
  lines: Line[] | DialogueKey,
  opts: { interrupt?: boolean; pos?: [number, number, number] } = {},
): Promise<void> {
  const list = typeof lines === 'string' ? DIALOGUE[lines] : lines;
  if (opts.interrupt) {
    seq++;
    stopVoice();
    useGame.getState().setSubtitle(null);
    chain = Promise.resolve();
  }
  const token = seq;
  const p = chain.then(() => run(list, token, opts.pos));
  chain = p.catch(() => {});
  return p;
}

export function cancelDialogue() {
  seq++;
  chain = Promise.resolve();
  stopVoice();
  useGame.getState().setSubtitle(null);
}

/** Present a choice and resolve with the chosen option id. */
export function choose(prompt: string, options: ChoiceOption[]): Promise<string> {
  return new Promise((resolve) => {
    useGame.getState().setChoice({
      prompt,
      options,
      resolve: (id) => {
        useGame.getState().setChoice(null);
        resolve(id);
      },
    });
  });
}
