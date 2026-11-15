import { getItem } from '../../data/items';
import { useGame } from '../../store/gameStore';
import { play } from '../AudioSystem/audioManager';
import { say } from '../DialogueSystem/dialogue';

export function giveItem(id: string, opts: { silent?: boolean } = {}) {
  const g = useGame.getState();
  if (g.inventory.includes(id)) return;
  g.addItem(id);
  if (!opts.silent) {
    const item = getItem(id);
    play(item.type === 'tape' ? 'tape_click' : item.type === 'note' || item.type === 'clue' ? 'paper' : 'pickup', { vol: 0.7 });
    g.pushToast(item.optionalClue ? `Clue found — ${item.name}` : item.hiddenTape ? `Hidden recording — ${item.name}` : `${item.name}`, 'item');
  }
}

export function hasItem(id: string) {
  return useGame.getState().inventory.includes(id);
}

export function countItems(ids: string[]) {
  const inv = useGame.getState().inventory;
  return ids.filter((i) => inv.includes(i)).length;
}

/** Open the item inspector (notes, photos, clues). */
export function inspectItem(id: string) {
  play('paper', { vol: 0.5 });
  useGame.getState().setViewItem(id);
}

/** Play a recording. Tapes other than the voicemail need Noah's cassette player. */
export function canPlay(id: string): boolean {
  const item = getItem(id);
  if (!item.tape) return false;
  if (id === 'voicemail' || id === 'final_tape') return true;
  return hasItem('cassette_player');
}

export function playTape(id: string) {
  const item = getItem(id);
  if (!item.tape) return;
  if (!canPlay(id)) {
    say([{ who: 'Elias', text: 'I need something to play this on.', voice: 'elias' }], { interrupt: true });
    return;
  }
  useGame.getState().setFlag(`heard_${id}`);
  play('tape_click', { vol: 0.6 });
  say(item.tape, { interrupt: true });
}
