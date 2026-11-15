import { useEffect } from 'react';
import { useGame } from '../../store/gameStore';
import { CHAPTERS } from '../../data/chapters';
import { wait } from './clock';
import { fadeIn } from './chapterRuntime';

export interface ScriptOpts {
  /** skip the standard title card + fade in */
  customIntro?: boolean;
  cardDelay?: number;
}

/**
 * Runs a chapter's async script once on mount. The standard intro shows the
 * chapter title card over black, then fades the scene in.
 */
export function useChapterScript(run: () => Promise<void> | void, opts: ScriptOpts = {}) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = useGame.getState();
      const ch = CHAPTERS[g.chapter];
      if (!opts.customIntro) {
        g.setCutscene(true);
        g.setFade(1, '#000');
        g.setChapterCard({ title: ch.title, subtitle: ch.subtitle, location: ch.location });
        await wait(opts.cardDelay ?? 3.4);
        useGame.getState().setChapterCard(null);
        await fadeIn(1.6);
        useGame.getState().setCutscene(false);
        useGame.getState().pushToast('Checkpoint saved', 'save');
      }
      if (!cancelled) await run();
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Show the chapter card manually (for custom intros). */
export async function showChapterCard(sec = 3.4) {
  const g = useGame.getState();
  const ch = CHAPTERS[g.chapter];
  g.setChapterCard({ title: ch.title, subtitle: ch.subtitle, location: ch.location });
  await wait(sec);
  useGame.getState().setChapterCard(null);
}
