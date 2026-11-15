import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { HouseGround, HouseShell, Yard } from '../shared/house';
import { LevelGeometry, type WallDef, type FloorDef } from '../../components/Environment/LevelGeometry';
import { Door, setDoor } from '../../components/Environment/Door';
import { HouseLight } from '../../components/Environment/HouseLight';
import { Rain, FireSprite, Embers, SmokeLayer } from '../../components/Environment/Atmosphere';
import { Sofa, Table, Chair, Bookshelf, CRT, Rug, Frame, Counter, Stove, Fridge, Bed, Desk, Wardrobe, Candle, B, Recorder } from '../../components/Environment/Props';
import { Interactable } from '../../components/Interactions/Interactable';
import { Trigger } from '../../components/Interactions/Trigger';
import { useChapterScript, showChapterCard } from '../../systems/ChapterSystem/useChapterScript';
import { completeObjective, completeChapter, fadeIn, fadeOut } from '../../systems/ChapterSystem/chapterRuntime';
import { say } from '../../systems/DialogueSystem/dialogue';
import { setAmbience, play } from '../../systems/AudioSystem/audioManager';
import { wait, until } from '../../systems/ChapterSystem/clock';
import { teleport, rig, lookAt, moveTo, isLookingAt, distTo, shake } from '../../components/Player/playerRig';
import { soundAt, soundBehind, distort, sting } from '../../systems/HorrorEventSystem/horror';
import { showFigure, hideFigure } from '../../components/Enemies/figureDirector';
import { setNoah, noah, noahWalkTo } from '../../components/Enemies/Noah';
import { useGame } from '../../store/gameStore';

const UP = 2.9;

/** Upstairs of the house as it was seven years ago (only Chapter 5 visits it). */
function Upstairs() {
  const walls: WallDef[] = useMemo(
    () => [
      { a: [-3, -8], b: [1, -8], y: UP, h: 2.7, gaps: [{ at: 2, w: 1.1, sill: 0.9, h: 2.0 }] },
      { a: [-3, -3.5], b: [1, -3.5], y: UP, h: 2.7 },
      { a: [-3, -8], b: [-3, -3.5], y: UP, h: 2.7 },
      { a: [1, -8], b: [1, -3.5], y: UP, h: 2.7, gaps: [{ at: 1, w: 0.95 }] },
      { a: [1, -8], b: [8, -8], y: UP, h: 2.7 },
      { a: [1, -6], b: [3.5, -6], y: UP, h: 2.7, gaps: [{ at: 1.25, w: 0.95 }] },
      { a: [8, -8], b: [8, -6], y: UP, h: 2.7 },
    ],
    [],
  );
  const floors: FloorDef[] = useMemo(
    () => [
      { x0: -3, z0: -8, x1: 1, z1: -3.5, y: UP + 0.005, mat: 'wood_floor', ceil: 2.7 },
      { x0: 1, z0: -8, x1: 8, z1: -6, y: UP + 0.005, mat: 'wood_floor', ceil: 2.7 },
    ],
    [],
  );
  return <LevelGeometry walls={walls} floors={floors} windowColor="#0b1018" />;
}

export default function Chapter5() {
  const [pass, setPass] = useState<1 | 2>(1);
  const [collapsed, setCollapsed] = useState(false);
  const [outside, setOutside] = useState(false);
  const stage = useRef<'false' | 'follow' | 'stairs' | 'escape' | 'outside' | 'back' | 'done'>('false');

  useState(() => {
    teleport(-1.6, -5.2, -Math.PI / 2, UP);
    rig.surface = 'wood';
    rig.speedScale = 0.85;
    setAmbience({ rain_inside: 0.5, drone_low: 0.35, heartbeat: 0.12 }, 2);
    return 0;
  });

  // ─────────── pass 1: the false memory ───────────
  useChapterScript(
    async () => {
      const g = useGame.getState();
      g.setCutscene(true);
      g.setFade(1, '#000');
      await showChapterCard(3.4);
      useGame.getState().setDistortion(0.25);
      await fadeIn(2);
      useGame.getState().setCutscene(false);
      await say('c5_false_intro');
      soundAt('kuya', [2.25, UP + 1.4, -5.2], 0.7, 2);
    },
    { customIntro: true },
  );

  const falseExit = async () => {
    if (stage.current !== 'false') return;
    stage.current = 'follow';
    const g = useGame.getState();
    g.setCutscene(true);
    showFigure([2.25, 0, 10.5], { opacity: 0.9 });
    await lookAt([2.25, 1.8, 10.5], 1.2);
    sting('soft');
    await say('c5_false_exit');
    completeObjective('remember');
    distort(1);
    play('reversed', { vol: 0.6 });
    useGame.getState().setDistortion(0.9);
    await fadeOut(1.8, '#fff');
    hideFigure();
    // ─────────── pass 2: how it happened ───────────
    setPass(2);
    setOutside(false);
    setDoor('front', false, { silent: true });
    setDoor('upstairs', false, { silent: true });
    setDoor('eroom', false, { silent: true });
    teleport(-1.6, -5.0, -Math.PI / 2, UP);
    rig.eyeHeight = 0.9;
    setAmbience({ fire: 0.75, rain_inside: 0.3, heartbeat: 0.3, drone_low: 0.3 }, 1);
    play('swell', { vol: 0.5 });
    useGame.getState().setDistortion(0.15);
    setNoah({ visible: true, style: 'warm', pos: [0.4, UP, -6.4], opacity: 1 });
    await fadeIn(2.2);
    await say('c5_true_intro');
    useGame.getState().setCutscene(false);
    setDoor('eroom', true);
    noahWalkTo(2.4, -7, 2.6);
    await guide();
  };

  /** Noah leads the way and waits for Elias. */
  const guide = async () => {
    const waitFor = (x: number, z: number, d = 2.4) => until(() => distTo(x, z) < d);
    await waitFor(2.4, -7);
    noahWalkTo(5.2, -7, 2.6);
    await say('c5_follow_1');
    await waitFor(5.2, -7);
    setDoor('upstairs', true);
    noahWalkTo(6.8, -7.2, 2.6);
    await wait(0.7);
    noahWalkTo(6.8, -4.6, 2.6);
    await waitFor(6.8, -5.2, 2.0);
    completeObjective('follow');
    noahWalkTo(7.6, -3.4, 2.2);
    await say('c5_follow_2');
    stage.current = 'stairs';
    // Noah follows behind from here on — Elias never sees him again
    await until(() => rig.pos.y < 1.5);
    noah.visible = false;
    setDoor('front', true);
    soundBehind('kuya', 0.5, 1.4);
    await say('c5_follow_3');
    stage.current = 'escape';
  };

  const reachOutside = async () => {
    if (stage.current !== 'escape') return;
    stage.current = 'outside';
    setOutside(true);
    completeObjective('escape');
    setAmbience({ rain: 0.75, fire: 0.5, wind: 0.3, heartbeat: 0.35 }, 1.5);
    await say('c5_outside');
    stage.current = 'back';
  };

  const backInside = async () => {
    if (stage.current !== 'back') return;
    stage.current = 'done';
    completeObjective('find');
    setAmbience({ fire: 0.9, heartbeat: 0.45, drone_low: 0.3 }, 1);
    await say('c5_back_inside');
    // Noah followed him back in. He is behind him.
    setNoah({ visible: true, style: 'warm', pos: [2.25, 0, 3.4], opacity: 1 });
    noah.target = null;
    soundBehind('kuya', 0.8, 1.2);
    useGame.getState().setHint('Turn around');
    const t0 = performance.now();
    await until(() => isLookingAt(new THREE.Vector3(noah.pos.x, 1.4, noah.pos.z), 0.75) || performance.now() - t0 > 15000);
    useGame.getState().setHint(null);
    const g = useGame.getState();
    g.setCutscene(true);
    await lookAt([noah.pos.x, 1.3, noah.pos.z], 0.6);
    noahWalkTo(rig.pos.x, rig.pos.z + 0.9, 3.2);
    await say('c5_push');
    // he gets behind Elias and shoves him toward the door
    await lookAt([2.25, 1.5, 6], 0.5);
    setNoah({ pos: [rig.pos.x, rig.pos.y, rig.pos.z - 0.7], arms: 1 });
    noah.faceTarget = new THREE.Vector3(2.25, 0, 8);
    shake(0.9);
    play('impact', { vol: 0.6 });
    await moveTo(2.25, 6.8, 0.9);
    setCollapsed(true);
    play('collapse', { vol: 0.9 });
    shake(1);
    distort(0.8);
    await wait(0.5);
    setNoah({ pos: [2.25, 0, 1.6], arms: 0 });
    noah.faceTarget = null;
    await lookAt([2.25, 1.3, 1.6], 1.2);
    await say('c5_collapse');
    completeObjective('truth');
    await fadeOut(3, '#f4e6cc');
    noah.visible = false;
    await say('c5_after');
    useGame.getState().setFlag('saw_truth');
    await completeChapter(6);
  };

  const fire = pass === 2;
  const glass = fire ? '#c8501a' : '#0b1220';

  return (
    <>
      <color attach="background" args={[fire ? '#0d0603' : '#03050a']} />
      <fog attach="fog" args={fire ? ['#2a140a', 2, 20] : ['#0a1220', 3, 26]} />
      <hemisphereLight args={fire ? ['#6a3a1a', '#1a0a04', 0.55] : ['#3a4a66', '#0a0c12', 0.6]} />
      <ambientLight color={fire ? '#2a1408' : '#141a26'} intensity={0.5} />

      <Yard car={false} streetlight />
      <HouseShell glassColor={glass} />
      <HouseGround glass={glass} />
      <Upstairs />
      <Rain bounds={{ minX: -30, maxX: 30, minZ: 4.4, maxZ: 30 }} count={3000} />

      {/* lights */}
      {fire ? (
        <>
          <HouseLight id="f1" group="fire" pos={[-4.5, 1.0, -5.5]} color="#ff7a2a" intensity={9} distance={10} unstable={0.6} fixture="none" />
          <HouseLight id="f2" group="fire" pos={[2.25, 1.5, -4]} color="#ff8a3a" intensity={6} distance={8} unstable={0.5} fixture="none" />
          <HouseLight id="f3" group="fire" pos={[-3.5, 1.2, 1]} color="#ff7a2a" intensity={6} distance={9} unstable={0.6} fixture="none" />
          <HouseLight id="f4" group="fire" pos={[3.5, UP + 1.2, -7]} color="#ff6a1a" intensity={5} distance={8} unstable={0.7} fixture="none" />
          <HouseLight id="f5" group="fire" pos={[6, 2.5, 0]} color="#ff8a3a" intensity={5} distance={10} unstable={0.5} fixture="none" />
          <HouseLight id="f6" group="fire" pos={[-1, UP + 1.5, -5.5]} color="#ff7a2a" intensity={3} distance={6} unstable={0.5} fixture="none" />
        </>
      ) : (
        <>
          <HouseLight id="m1" group="mem" pos={[-1, UP + 2.3, -5.5]} color="#9ab0d8" intensity={2.4} distance={7} fixture="bulb" />
          <HouseLight id="m2" group="mem" pos={[4.5, UP + 2.3, -7]} color="#9ab0d8" intensity={2} distance={7} fixture="bulb" unstable={0.3} />
          <HouseLight id="m3" group="mem" pos={[2.25, 2.45, -2]} color="#9ab0d8" intensity={2.4} distance={8} />
          <HouseLight id="m4" group="mem" pos={[5, 5.3, -0.5]} color="#9ab0d8" intensity={3} distance={10} />
          <HouseLight id="m5" group="mem" pos={[-3.5, 2.45, 0.5]} color="#9ab0d8" intensity={2} distance={8} />
        </>
      )}

      {fire && (
        <>
          <FireSprite pos={[-4.6, 0.75, -4.6]} scale={1.2} />
          <FireSprite pos={[-2.9, 0.9, -7.6]} scale={1.4} />
          <FireSprite pos={[-6.2, 0, -6.2]} scale={1.6} />
          <FireSprite pos={[-1.5, 0, -2.2]} scale={1.0} />
          <FireSprite pos={[-6.5, 0, 0.5]} scale={1.3} />
          <FireSprite pos={[1.3, 0, -6.5]} scale={0.9} />
          <FireSprite pos={[4.2, UP, -7.6]} scale={1.0} />
          <FireSprite pos={[2.6, UP, -6.4]} scale={0.8} />
          <FireSprite pos={[7.6, 0, 3]} scale={0.9} />
          <SmokeLayer center={[0, 0, -2]} y={2.45} size={20} opacity={0.5} />
          <SmokeLayer center={[2, 0, -6]} y={UP + 2.3} size={16} opacity={0.55} />
          <Embers center={[-2, 0, -3]} spread={12} count={220} />
        </>
      )}
      {!fire && <SmokeLayer center={[0, 0, -2]} y={2.4} size={20} color="#6a7a90" opacity={0.25} />}

      {/* collapse */}
      {collapsed && (
        <>
          <B p={[2.25, 1.2, 3.2]} s={[2.4, 0.3, 0.3]} r={[0, 0, 0.5]} m="burnt" />
          <B p={[2.0, 0.6, 3.0]} s={[2.4, 0.3, 0.3]} r={[0.3, 0.2, -0.4]} m="burnt" />
          <B p={[2.25, 0.25, 3.3]} s={[2.2, 0.5, 0.6]} m="burnt" />
          <FireSprite pos={[2.25, 0.3, 3.1]} scale={1.6} />
          <FireSprite pos={[1.6, 0.3, 2.8]} scale={1.2} />
          <FireSprite pos={[2.9, 0.3, 2.9]} scale={1.2} />
          <HouseLight id="c1" group="fire" pos={[2.25, 1.2, 3.2]} color="#ff7a2a" intensity={8} distance={10} unstable={0.7} fixture="none" />
        </>
      )}

      {/* doors */}
      <Door id="front" pos={[2.25, 0, 4]} axis="x" width={1.0} swing={-1} startOpen noClose />
      <Door id="kitchen" pos={[1, 0, -5.5]} axis="z" swing={1} startOpen />
      <Door id="closet" pos={[3.5, 0, -7]} axis="z" width={0.9} swing={-1} canOpen={() => 'There\'s no time.'} />
      <Door id="upstairs" pos={[6.8, UP, -6]} axis="x" width={1.0} startOpen={pass === 1} noClose />
      <Door id="eroom" pos={[1, UP, -7]} axis="z" swing={1} startOpen={pass === 1} noClose />
      <Door id="noahroom" pos={[2.25, UP, -6]} axis="x" width={0.95} canOpen={() => (pass === 1 ? '(I don\'t open it. I never open it.)' : 'He isn\'t in there. He\'s right here.')} />

      {/* Elias's room */}
      <Bed pos={[-2.2, UP, -5.2]} rot={-Math.PI / 2} />
      <Desk pos={[-1.2, UP, -7.6]} />
      <Wardrobe pos={[0.3, UP, -3.85]} rot={Math.PI} />
      <B p={[-1.3, UP + 0.9, -7.6]} s={[0.35, 0.25, 0.25]} m="black" />
      <Rug pos={[-1, UP, -5.5]} w={1.6} d={1.2} color="#3a3020" />
      <Recorder pos={[0.7, UP, -6.8]} rot={1.2} />

      {/* ground floor, as it was */}
      <Rug pos={[-3.5, 0, 0.6]} w={3.2} d={2.2} />
      <Sofa pos={[-3.5, 0, 2.6]} rot={Math.PI} />
      <Table pos={[-3.5, 0, 0.8]} w={1.1} d={0.6} h={0.42} />
      <CRT pos={[-3.5, 0, -2.45]} on={!fire} />
      <Bookshelf pos={[-7.75, 0, -0.6]} rot={Math.PI / 2} />
      <Frame pos={[-6, 1.6, -2.88]} tint="#8a7356" />
      <Counter pos={[-5.6, 0, -7.65]} w={3.6} sink />
      <Stove pos={[-2.9, 0, -7.65]} />
      <Fridge pos={[-1.2, 0, -7.6]} />
      <Table pos={[-4.5, 0, -4.6]} w={1.3} d={0.9} />
      <Chair pos={[-5.3, 0, -4.6]} rot={-Math.PI / 2} />
      <Chair pos={[-3.7, 0, -4.6]} rot={Math.PI / 2} />
      <Candle pos={[-4.6, 0.78, -4.5]} lit />
      <Table pos={[3.1, 0, -3]} w={0.45} d={0.9} h={0.8} />

      {/* pass 1: Noah's voice behind his door */}
      <Interactable id="noahdoor_listen" at={[2.25, UP + 1.2, -6.1]} prompt={() => (pass === 1 ? 'Listen' : null)} onInteract={() => say('c5_false_door', { interrupt: true })} />
      <Trigger
        x0={1.2}
        z0={-8}
        x1={4}
        z1={-6}
        minY={2}
        enabled={pass === 1}
        onEnter={async () => {
          soundAt('knock', [2.25, UP + 1.2, -5.6], 0.7);
          await say('c5_false_calls');
        }}
      />
      <Trigger x0={-1} z0={4.6} x1={6} z1={12} enabled={pass === 1} onEnter={falseExit} />
      <Trigger x0={-1} z0={5.2} x1={6} z1={14} enabled={pass === 2} once={false} onEnter={reachOutside} />
      <Trigger x0={1.1} z0={0} x1={3.4} z1={3.6} enabled={pass === 2 && outside} once={false} onEnter={backInside} />
    </>
  );
}
