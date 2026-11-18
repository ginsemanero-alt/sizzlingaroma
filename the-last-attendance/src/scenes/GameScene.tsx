import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/store/gameStore';
import type { ChapterId } from '@/types';
import { CHAPTERS } from '@/data/chapters';
import { GameUI } from '@/components/UI/GameUI';
import { Exposure, PostFX } from '@/components/Effects/PostFX';
import { resetRuntime, runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { InteractionSystem } from '@/systems/InteractionSystem/InteractionSystem';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { LoadingScreen } from '@/components/UI/LoadingScreen';
import { installDebugApi } from '@/utils/debugApi';
import { preloadCharacterModels } from '@/components/Characters/ModelCharacter';
import { releaseEnvModels } from '@/components/Environment/EnvModel';
import { AdminLayer } from '@/components/Admin/AdminLayer';

/** Chapter environments are lazy-loaded (code-split) and fully unmounted between chapters. */
const CHAPTER_SCENES: Record<ChapterId, React.LazyExoticComponent<ComponentType>> = {
  1: lazy(() => import('./Chapter1/Chapter1')),
  2: lazy(() => import('./Chapter2/Chapter2')),
  3: lazy(() => import('./Chapter3/Chapter3')),
  4: lazy(() => import('./Chapter4/Chapter4')),
  5: lazy(() => import('./Chapter5/Chapter5')),
  6: lazy(() => import('./Chapter6/Chapter6')),
};

let lastChapter: ChapterId | null = null;

function ChapterHost({ chapter, nonce }: { chapter: ChapterId; nonce: number }) {
  const Scene = CHAPTER_SCENES[chapter];
  // Reset all per-scene runtime state before mounting a (re)loaded chapter.
  useMemo(() => {
    // a different chapter (or coming from the menu): free the previous scene's environment models (GPU memory)
    if (lastChapter !== chapter) releaseEnvModels();
    lastChapter = chapter;
    resetRuntime();
    InteractionSystem.clear();
    CollisionSystem.clear();
    const b = useGame.getState().flags.battery;
    runtime.battery = typeof b === 'number' ? b : 100;
  }, [chapter, nonce]);
  return <Scene key={`${chapter}_${nonce}`} />;
}

export function GameScene() {
  const navigate = useNavigate();
  const inGame = useGame((s) => s.inGame);
  const chapter = useGame((s) => s.chapter);
  const nonce = useGame((s) => s.sceneNonce);
  const graphics = useGame((s) => s.settings.graphics);
  const ending = useGame((s) => s.ending);
  const transitionTo = useGame((s) => s.transitionTo);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!inGame) navigate('/'); }, [inGame, navigate]);
  useEffect(() => { if (ending) { AudioSystem.stopAllLoops(400); navigate(`/ending/${ending}`); } }, [ending, navigate]);
  useEffect(() => { if (runtime.debug) installDebugApi(); preloadCharacterModels(); }, []);

  // loading screen per chapter load: at least 3 s, then until the chapter's models are loaded
  const { progress, active } = useProgress();
  const [minDone, setMinDone] = useState(false);
  useEffect(() => {
    setLoading(true);
    setMinDone(false);
    AudioSystem.preload(['step1', 'step2', 'step3', 'step4', 'door_open', 'pickup', 'paper', 'click', 'whisper', 'stinger', 'creak', 'breath']);
    const t = window.setTimeout(() => setMinDone(true), 3000);
    const cap = window.setTimeout(() => setLoading(false), 25000); // never get stuck on a slow asset
    return () => { window.clearTimeout(t); window.clearTimeout(cap); };
  }, [chapter, nonce]);
  useEffect(() => { if (minDone && (!active || progress >= 100)) setLoading(false); }, [minDone, active, progress]);

  // chapter transitions: end card, then load the next chapter
  useEffect(() => {
    if (!transitionTo) return;
    const s = useGame.getState();
    s.setFade(1, 1500);
    AudioSystem.stopAllLoops(1500);
    const t = window.setTimeout(() => useGame.getState().beginChapter(transitionTo), 2200);
    return () => window.clearTimeout(t);
  }, [transitionTo]);

  useEffect(() => () => { AudioSystem.stopAll(); runtime.paused = false; }, []);

  if (!inGame) return null;
  const dpr: [number, number] = graphics === 'high' ? [1, 2] : graphics === 'medium' ? [1, 1.5] : [0.75, 1];
  return (
    <div className="screen" id="game-canvas">
      <Canvas
        shadows={graphics !== 'low' ? { type: 2 } : false}
        dpr={dpr}
        gl={{ antialias: graphics !== 'low', powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.localClippingEnabled = true; if (runtime.debug) (window as unknown as { __gl: unknown }).__gl = gl; }}
        camera={{ fov: 70, near: 0.05, far: 160, position: [0, 1.65, 0] }}
      >
        <Exposure />
        <Suspense fallback={null}>
          <ChapterHost chapter={chapter} nonce={nonce} />
        </Suspense>
        <AdminLayer />
        <PostFX />
      </Canvas>
      <GameUI />
      {loading && <LoadingScreen title={CHAPTERS[chapter].title} subtitle={CHAPTERS[chapter].subtitle} tip={CHAPTERS[chapter].tip} progress={active ? progress : minDone ? 100 : Math.min(95, progress || 60)} />}
    </div>
  );
}
