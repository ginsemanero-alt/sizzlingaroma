import { useGame } from '../../store/gameStore';
import { rig, teleport } from '../../components/Player/playerRig';
import { interactions } from '../../systems/InteractionSystem/interactions';
import { world } from '../../systems/PhysicsSystem/world';
import { figure } from '../../components/Enemies/figureDirector';
import { giveItem } from '../../systems/InventorySystem/inventory';
import { completeChapter, triggerEnding } from '../../systems/ChapterSystem/chapterRuntime';
import { clock, timeScale } from '../../systems/ChapterSystem/clock';

/**
 * Developer / automated-test helpers, exposed as window.__tvbm when the game
 * runs in dev mode or with ?debug in the URL. Not used by gameplay.
 */
export function installDebugApi() {
  const enabled = import.meta.env.DEV || location.search.includes('debug') || location.hash.includes('debug');
  if (!enabled) return;
  (window as unknown as Record<string, unknown>).__tvbm = {
    game: useGame,
    rig,
    teleport,
    world,
    figure,
    clock,
    setTimeScale: (v: number) => (timeScale.value = v),
    giveItem,
    completeChapter,
    triggerEnding,
    interactables: () => [...interactions.all()].map((e) => ({ id: e.id, pos: e.pos.toArray(), prompt: e.prompt() })),
    interact: (id: string) => interactions.get(id)?.onInteract(),
  };
}
