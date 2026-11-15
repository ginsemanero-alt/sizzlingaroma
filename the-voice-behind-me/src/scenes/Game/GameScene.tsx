import { Suspense, lazy, useEffect, useRef, type ComponentType, type LazyExoticComponent } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useGame } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import type { ChapterId } from '../../data/types';
import { PlayerController } from '../../components/Player/PlayerController';
import { Flashlight } from '../../components/Player/Flashlight';
import { MirrorBody, reflection } from '../../components/Player/MirrorBody';
import { Figure } from '../../components/Enemies/Figure';
import { hideFigure, figure } from '../../components/Enemies/figureDirector';
import { Noah, noah } from '../../components/Enemies/Noah';
import { PostFX } from '../../components/Effects/PostFX';
import { GameLoop } from '../../components/Effects/GameLoop';
import { HUD, Subtitles, FadeOverlay, ChapterCardOverlay, DistortionVeil } from '../../components/UI/HUD';
import { InventoryScreen, ItemViewer } from '../../components/UI/Inventory';
import { PuzzleOverlay } from '../../components/UI/puzzles/PuzzleOverlay';
import { ChoiceBox } from '../../components/UI/ChoiceBox';
import { PauseMenu } from '../../components/UI/PauseMenu';
import { clock } from '../../systems/ChapterSystem/clock';
import { setAmbientEvents, fx } from '../../systems/HorrorEventSystem/horror';
import { cancelDialogue } from '../../systems/DialogueSystem/dialogue';
import { stopAll } from '../../systems/AudioSystem/audioManager';
import { rig } from '../../components/Player/playerRig';
import { setTextureQuality } from '../../components/Environment/materials';
import { installDebugApi } from './debugApi';

const CHAPTER_SCENES: Record<ChapterId, LazyExoticComponent<ComponentType>> = {
  1: lazy(() => import('../Chapter1/Chapter1')),
  2: lazy(() => import('../Chapter2/Chapter2')),
  3: lazy(() => import('../Chapter3/Chapter3')),
  4: lazy(() => import('../Chapter4/Chapter4')),
  5: lazy(() => import('../Chapter5/Chapter5')),
  6: lazy(() => import('../Chapter6/Chapter6')),
};

/** Reset every runtime singleton before a chapter (re)mounts. */
function resetRuntime() {
  clock.reset();
  cancelDialogue();
  setAmbientEvents(null);
  hideFigure();
  figure.opts = {};
  noah.visible = false;
  noah.target = null;
  noah.style = 'warm';
  noah.arms = 0;
  noah.opacity = 1;
  reflection.mode = 'follow';
  fx.flashlightFlickerUntil = 0;
  fx.distortionPulse = 0;
  rig.speedScale = 1;
  rig.look = null;
  rig.move = null;
  rig.surface = 'wood';
  stopAll(0.8);
}

function ChapterHost() {
  const runId = useGame((s) => s.runId);
  const chapter = useGame((s) => s.chapter);
  const last = useRef(-1);
  if (last.current !== runId) {
    last.current = runId;
    resetRuntime();
  }
  const Scene = CHAPTER_SCENES[chapter];
  return (
    <Suspense fallback={null}>
      <Scene key={runId} />
    </Suspense>
  );
}

export default function GameScene() {
  const navigate = useNavigate();
  const active = useGame((s) => s.active);
  const quality = useSettings((s) => s.quality);
  setTextureQuality(quality);

  useEffect(() => {
    if (!active) navigate('/', { replace: true });
  }, [active, navigate]);

  useEffect(
    () =>
      useGame.subscribe((s) => {
        if (s.pendingEnding) {
          const id = s.pendingEnding;
          useGame.getState().setPendingEnding(null);
          navigate(`/ending/${id}`);
        }
      }),
    [navigate],
  );

  useEffect(() => {
    installDebugApi();
    return () => {
      resetRuntime();
      stopAll(0.4);
    };
  }, []);

  if (!active) return null;

  const dpr: [number, number] = quality === 'low' ? [0.6, 0.75] : quality === 'medium' ? [1, 1] : [1, 1.5];

  return (
    <div className="game-root">
      <Canvas
        shadows={quality !== 'low' ? { type: THREE.PCFSoftShadowMap } : false}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 72, near: 0.05, far: 140, position: [0, 1.6, 0] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <GameLoop />
        <PlayerController />
        <Flashlight />
        <MirrorBody />
        <Figure />
        <Noah />
        <ChapterHost />
        <PostFX />
      </Canvas>
      <DistortionVeil />
      <HUD />
      <Subtitles />
      <InventoryScreen />
      <ItemViewer />
      <PuzzleOverlay />
      <ChoiceBox />
      <FadeOverlay />
      <ChapterCardOverlay />
      <PauseMenu />
    </div>
  );
}
