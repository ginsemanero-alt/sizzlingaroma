import type { ChapterId, EndingId } from '../../data/types';
import { useGame } from '../../store/gameStore';
import { saveCheckpoint, recordEnding, loadSave } from '../SaveSystem/saveSystem';
import { cancelDialogue } from '../DialogueSystem/dialogue';
import { wait } from './clock';
import { play } from '../AudioSystem/audioManager';

export function completeObjective(id: string) {
  const g = useGame.getState();
  const o = g.objectives.find((x) => x.id === id);
  if (!o || o.done) return;
  g.setObjectiveDone(id);
}

export function progressObjective(id: string, by = 1) {
  const g = useGame.getState();
  const o = g.objectives.find((x) => x.id === id);
  if (!o || o.done) return;
  g.incObjective(id, by);
}

export function isObjectiveDone(id: string) {
  return !!useGame.getState().objectives.find((o) => o.id === id)?.done;
}

export async function fadeOut(sec = 1.2, color = '#000') {
  useGame.getState().setFade(1, color);
  await wait(sec);
}

export async function fadeIn(sec = 1.2) {
  useGame.getState().setFade(0);
  await wait(sec);
}

/** Autosave the current progress as the checkpoint for `next`, then load it. */
export async function completeChapter(next: ChapterId) {
  const g = useGame.getState();
  g.setCutscene(true);
  await fadeOut(1.6);
  cancelDialogue();
  const snap = { ...g.snapshot(), chapter: next, battery: Math.max(useGame.getState().battery, 60) };
  saveCheckpoint(snap);
  play('swell', { vol: 0.35 });
  useGame.getState().startFromSnapshot(snap);
}

export async function triggerEnding(id: EndingId) {
  const g = useGame.getState();
  g.setCutscene(true);
  await fadeOut(2.2, id === 'A' ? '#f3e6cf' : '#000');
  cancelDialogue();
  recordEnding(id);
  useGame.getState().setPendingEnding(id);
}

/** Restart the current chapter from its checkpoint. */
export function restartCheckpoint() {
  cancelDialogue();
  const g = useGame.getState();
  const snap = loadSave().chapters[g.chapter];
  if (snap) g.startFromSnapshot(snap);
}
