import { useMemo, useState } from 'react';
import { LevelGeometry, room, type WallDef, type FloorDef, type BlockDef } from '../../components/Environment/LevelGeometry';
import { Door } from '../../components/Environment/Door';
import { HouseLight } from '../../components/Environment/HouseLight';
import { Desk, Chair, ShelfUnit, Crates, Table, Calendar, PaperNote, Cassette, Recorder, Speaker, Stairs, Dresser, B, Cyl, Battery } from '../../components/Environment/Props';
import { Interactable } from '../../components/Interactions/Interactable';
import { Trigger } from '../../components/Interactions/Trigger';
import { useChapterScript } from '../../systems/ChapterSystem/useChapterScript';
import { completeObjective, progressObjective, completeChapter, isObjectiveDone } from '../../systems/ChapterSystem/chapterRuntime';
import { say, choose } from '../../systems/DialogueSystem/dialogue';
import { giveItem, hasItem, inspectItem, countItems, playTape } from '../../systems/InventorySystem/inventory';
import { openPuzzle } from '../../systems/PuzzleSystem/puzzleSystem';
import { setAmbience, play } from '../../systems/AudioSystem/audioManager';
import { wait } from '../../systems/ChapterSystem/clock';
import { teleport, rig } from '../../components/Player/playerRig';
import { setAmbientEvents, setLights, flickerLights, sting, flickerFlashlight, soundAt, distort } from '../../systems/HorrorEventSystem/horror';
import { figureBehind, hideFigure, showFigure } from '../../components/Enemies/figureDirector';
import { useGame } from '../../store/gameStore';
import { ITEMS } from '../../data/items';

const TAPES = ['tape_1', 'tape_2', 'tape_3', 'tape_4', 'tape_5'];

export default function Chapter4() {
  const [inv, setInv] = useState<string[]>(() => useGame.getState().inventory);
  const refresh = () => setInv([...useGame.getState().inventory]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [lightsOut, setLightsOut] = useState(false);
  const [solved, setSolved] = useState(false);
  const [battery, setBattery] = useState(false);

  useState(() => {
    teleport(0, 1.6, 0);
    rig.surface = 'concrete';
    setAmbience({ roomtone: 0.55, rain_inside: 0.2, drone_low: 0.3, buzz: 0.06 }, 2);
    return 0;
  });

  useChapterScript(async () => {
    await say('c4_intro');
    setAmbientEvents({ minGap: 18, maxGap: 34, pool: ['creak', 'knock', 'reversed', 'flicker', 'steps'] });
  });

  const walls: WallDef[] = useMemo(
    () => [
      // main room
      { a: [-5, 3], b: [5, 3], mat: 'concrete' },
      { a: [-5, -6], b: [5, -6], mat: 'concrete', gaps: [{ at: 5, w: 1.0 }] },
      { a: [-5, -6], b: [-5, 3], mat: 'concrete', gaps: [{ at: 5, w: 1.4, h: 2.2 }] },
      { a: [5, -6], b: [5, 3], mat: 'concrete', gaps: [{ at: 3, w: 0.95 }] },
      // storage
      ...room(-10, -6, -5, 3, { mat: 'concrete', skip: ['e'] }),
      // office
      ...room(5, -6, 10, 0, { mat: 'wallpaper', skip: ['w'] }),
      { a: [5.095, -6], b: [5.095, 0], mat: 'wallpaper', t: 0.02, gaps: [{ at: 3, w: 0.95 }], noCollide: true },
      { a: [5, 0], b: [5, 3], mat: 'concrete' },
      // archive
      ...room(-3, -11, 3, -6, { mat: 'plaster', skip: ['s'] }),
      // stairwell up (blocked)
      { a: [-0.6, 3], b: [-0.6, 7], mat: 'concrete', h: 4 },
      { a: [0.6, 3], b: [0.6, 7], mat: 'concrete', h: 4 },
    ],
    [],
  );
  const floors: FloorDef[] = useMemo(
    () => [
      { x0: -5, z0: -6, x1: 5, z1: 3, mat: 'concrete', ceil: 2.5 },
      { x0: -10, z0: -6, x1: -5, z1: 3, mat: 'concrete', ceil: 2.5 },
      { x0: 5, z0: -6, x1: 10, z1: 0, mat: 'wood_floor', ceil: 2.5 },
      { x0: -3, z0: -11, x1: 3, z1: -6, mat: 'concrete', ceil: 2.5 },
    ],
    [],
  );
  const blocks: BlockDef[] = useMemo(
    () => [
      // pipes along the ceiling
      { p: [0, 2.35, -5.6], s: [10, 0.12, 0.12], mat: 'metal' },
      { p: [-4.6, 2.3, -1.5], s: [0.1, 0.1, 9], mat: 'metal' },
      { p: [3, 2.38, -1.5], s: [0.15, 0.15, 9], mat: 'metal' },
      // block the stairs up
      { p: [0, 1.5, 6.5], s: [1.2, 3, 0.2], mat: 'concrete', collide: true },
    ],
    [],
  );

  const takeTape = async (id: string) => {
    giveItem(id);
    refresh();
    progressObjective('tapes');
    if (id === 'tape_3') {
      const c = await choose('The label is scratched out. Underneath: JULY 14 — 9:10 PM. You know this night.', [
        { id: 'listen', text: hasItem('cassette_player') ? 'Listen to it now' : 'Keep it — listen when you can', locked: undefined },
        { id: 'skip', text: 'Put it away. You know what\'s on it.' },
      ]);
      if (c === 'listen' && hasItem('cassette_player')) playTape('tape_3');
      else if (c === 'skip') {
        useGame.getState().addAvoidance();
        await say('c4_tape3_skip');
      }
    }
    if (countItems(TAPES) === 5) say([{ who: 'Elias', text: 'Five tapes. Dad\'s tape deck should be in the archive.', voice: 'elias' }]);
  };

  const takePlayer = async () => {
    giveItem('cassette_player');
    refresh();
    completeObjective('player');
    await say('c4_player');
    await wait(2.5);
    soundAt('whisper_1', [-4.6, 1.8, -5.2], 0.7, 2);
    await say('c4_speaker');
  };

  const openDrawer = async () => {
    setDrawerOpen(true);
    play('drawer', { pos: [7.5, 0.6, -5.3], vol: 0.7 });
    await wait(1.0);
    // the recorder speaks about what the player is doing
    play('tape_click', { pos: [7.5, 0.9, -5.3], vol: 0.5 });
    await say('c4_drawer_voice');
  };

  const archive = async () => {
    if (archiveOpen) return;
    const ok = await openPuzzle('basement_lock');
    if (!ok) return;
    setArchiveOpen(true);
    completeObjective('archive');
    play('door_creak', { pos: [0, 1.2, -6], vol: 0.6 });
  };

  const tapeDeck = async () => {
    if (solved) return;
    if (countItems(TAPES) < 5) {
      say([{ who: 'Elias', text: `Five numbered slots. I only have ${countItems(TAPES)} of the tapes.`, voice: 'elias' }], { interrupt: true });
      return;
    }
    // the Figure appears while the player is absorbed in the puzzle
    figureBehind({ behindDist: 2.2, opacity: 0.8 });
    const ok = await openPuzzle('cassettes');
    if (!ok) {
      hideFigure();
      return;
    }
    setSolved(true);
    completeObjective('timeline');
    flickerFlashlight(1.5);
    sting('soft');
    await say('c4_timeline_done');
    hideFigure();
    // the last tape
    useGame.getState().setCutscene(true);
    play('tape_click', { pos: [0, 0.9, -10.3], vol: 0.6 });
    await say(ITEMS.tape_5.tape!);
    useGame.getState().setFlag('heard_tape_5');
    distort(0.6);
    await say('c4_conflict');
    completeObjective('conflict');
    showFigure([0, 0, -6.6], { opacity: 0.9, duration: 4 });
    play('fire', { vol: 0.6, fadeIn: 3 });
    play('swell', { vol: 0.7 });
    useGame.getState().setDistortion(0.6);
    await wait(3);
    useGame.getState().setDistortion(0);
    await completeChapter(5);
  };

  return (
    <>
      <color attach="background" args={['#020203']} />
      <fog attach="fog" args={['#050506', 3, 22]} />
      <hemisphereLight args={['#30343a', '#0e0c0a', 0.45]} />
      <ambientLight color="#14161a" intensity={0.45} />

      <LevelGeometry walls={walls} floors={floors} blocks={blocks} />
      <Stairs from={[0, 0, 3]} dir="s" width={1.1} rise={2.6} run={3.4} steps={12} mat="concrete" />

      <HouseLight id="b1" group="basement" pos={[-1.5, 2.25, -1.5]} intensity={2.8} on={!lightsOut} unstable={0.2} />
      <HouseLight id="b2" group="basement" pos={[2.5, 2.25, 1.5]} intensity={1.8} on={!lightsOut} unstable={0.5} />
      <HouseLight id="st" group="basement" pos={[-7.5, 2.25, -1.5]} intensity={1.8} on={!lightsOut} unstable={0.3} />
      <HouseLight id="of" group="basement" pos={[7.3, 1.1, -5.3]} intensity={2.4} fixture="shade" color="#ffc070" on={!lightsOut} />
      <HouseLight id="ar" group="archive" pos={[0, 2.25, -8.5]} intensity={2.2} on={!lightsOut} />

      <Door id="up" pos={[0, 2.6, 6.35]} axis="x" width={1.0} canOpen={() => 'It won\'t open. Not until I\'ve heard them.'} />
      <Door id="office" pos={[5, 0, -3]} axis="z" swing={1} />
      <Door id="archive" pos={[0, 0, -6]} axis="x" width={1.0} startOpen={false} canOpen={() => (archiveOpen ? true : 'Padlocked. Four digits.')} />
      <Interactable id="padlock" at={[0, 1.1, -5.9]} prompt={() => (archiveOpen ? null : 'Try the padlock')} glint={!archiveOpen} onInteract={archive} />

      {/* main room */}
      <B p={[-4.2, 0.6, 2.2]} s={[1.1, 1.2, 0.9]} m="metal" color="#5a5a52" />
      <Cyl p={[3.8, 0.9, 2.2]} rt={0.4} rb={0.4} h={1.8} m="metal" color="#4a4038" />
      <ShelfUnit pos={[-3.6, 0, -5.6]} w={2.2} />
      <Speaker pos={[-4.6, 1.15, -5.3]} rot={0.3} />
      <B p={[-4.3, 1.8, -5.3]} s={[0.01, 0.6, 0.01]} m="black" />
      <Interactable id="speaker" at={[-4.6, 1.5, -5.2]} prompt="Look at the speaker" onInteract={() => say([{ who: 'Elias', text: 'The cable is cut clean through. It isn\'t connected to anything.', voice: 'elias' }], { interrupt: true })} />
      <Table pos={[2.5, 0, -2]} w={1.6} d={0.8} />
      {!inv.includes('tape_3') && <Cassette pos={[2.3, 0.79, -2]} rot={0.4} />}
      <Interactable id="tape_3" at={[2.3, 0.82, -2]} prompt="Take the tape" enabled={!inv.includes('tape_3')} glint onInteract={() => takeTape('tape_3')} />
      <Crates pos={[2.5, 0, -5.2]} n={3} />

      {/* storage */}
      <ShelfUnit pos={[-9.6, 0, -1.5]} rot={Math.PI / 2} w={3} />
      <ShelfUnit pos={[-7.5, 0, -5.6]} w={2.4} />
      <Crates pos={[-8, 0, 2.3]} n={4} />
      {!inv.includes('tape_2') && <Cassette pos={[-9.6, 1.18, -0.8]} rot={Math.PI / 2} />}
      <Interactable id="tape_2" at={[-9.5, 1.2, -0.8]} prompt="Take the tape" enabled={!inv.includes('tape_2')} glint onInteract={() => takeTape('tape_2')} />
      <Interactable
        id="tape_c"
        at={[-7.5, 0.4, -5.3]}
        prompt={() => (inv.includes('tape_hidden_c') ? null : 'Reach behind the bottom shelf')}
        onInteract={() => {
          giveItem('tape_hidden_c');
          refresh();
          play('paper', { vol: 0.5 });
        }}
      />
      {!battery && <Battery pos={[-9.6, 0.65, -2.3]} />}
      <Interactable
        id="battery4"
        at={[-9.5, 0.65, -2.3]}
        prompt="Take batteries"
        enabled={!battery}
        onInteract={() => {
          setBattery(true);
          useGame.getState().setBattery(useGame.getState().battery + 45);
          useGame.getState().pushToast('Flashlight batteries +45%', 'item');
          play('click', { vol: 0.6 });
        }}
      />

      {/* office */}
      <Desk pos={[7.5, 0, -5.5]} />
      <Chair pos={[7.5, 0, -4.8]} rot={Math.PI} />
      <Dresser pos={[9.65, 0, -2.5]} rot={-Math.PI / 2} w={1.0} h={1.3} d={0.55} />
      <Calendar pos={[5.6, 1.6, -5.9]} />
      <PaperNote pos={[7.1, 0.765, -5.45]} flat rot={0.2} color="#b6ad96" w={0.3} h={0.22} />
      <Interactable id="newspaper" at={[7.1, 0.8, -5.45]} prompt="Read the newspaper clipping" glint={!inv.includes('newspaper')} onInteract={() => (giveItem('newspaper'), refresh(), inspectItem('newspaper'))} />
      <PaperNote pos={[8.0, 0.98, -5.7]} color="#a59880" w={0.12} h={0.09} />
      <Interactable id="dadnote" at={[8.0, 0.98, -5.65]} prompt="Read the note on the lamp" glint={!inv.includes('office_calendar')} onInteract={() => (giveItem('office_calendar'), refresh(), inspectItem('office_calendar'))} />
      {inv.includes('cassette_player') ? null : <Recorder pos={[7.9, 0.76, -5.3]} rot={-0.3} />}
      <Interactable id="recorder" at={[7.9, 0.82, -5.3]} prompt="Take Noah's recorder" enabled={!inv.includes('cassette_player')} glint onInteract={takePlayer} />
      <Interactable
        id="drawer"
        at={[7.9, 0.55, -5.2]}
        prompt={() => (drawerOpen ? (inv.includes('tape_1') ? null : 'Take the tape') : 'Open the drawer')}
        onInteract={async () => {
          if (!drawerOpen) await openDrawer();
          else takeTape('tape_1');
        }}
      />
      <Interactable
        id="letter"
        at={[9.4, 1.0, -2.5]}
        prompt={() => (inv.includes('clue_mom_letter') ? null : 'Search the filing drawer')}
        onInteract={() => {
          play('drawer', { pos: [9.4, 0.8, -2.5], vol: 0.6 });
          giveItem('clue_mom_letter');
          refresh();
          inspectItem('clue_mom_letter');
        }}
      />

      {/* archive */}
      <ShelfUnit pos={[-2.6, 0, -8.5]} rot={Math.PI / 2} w={3.5} />
      <ShelfUnit pos={[2.6, 0, -8.5]} rot={-Math.PI / 2} w={3.5} />
      <Table pos={[0, 0, -10.3]} w={1.6} d={0.7} />
      <B p={[0, 0.88, -10.35]} s={[0.7, 0.18, 0.4]} m="metal" color="#2a2622" />
      {[0, 1, 2, 3, 4].map((i) => (
        <B key={i} p={[-0.24 + i * 0.12, 0.98, -10.25]} s={[0.1, 0.02, 0.06]} m="black" color={solved ? '#8d4a3c' : '#111'} />
      ))}
      <Interactable id="deck" at={[0, 1.0, -10.2]} prompt={() => (solved ? null : 'Use Dad\'s tape deck')} glint={!solved && countItems(TAPES) === 5} onInteract={tapeDeck} />
      {!inv.includes('tape_4') && <Cassette pos={[-2.6, 1.18, -9.2]} rot={Math.PI / 2} />}
      <Interactable id="tape_4" at={[-2.5, 1.2, -9.2]} prompt="Take the tape" enabled={archiveOpen && !inv.includes('tape_4')} glint onInteract={() => takeTape('tape_4')} />
      {!inv.includes('tape_5') && <Cassette pos={[2.6, 0.62, -7.6]} rot={-Math.PI / 2} color="#3a2a26" />}
      <Interactable id="tape_5" at={[2.5, 0.65, -7.6]} prompt="Take the blackened tape" enabled={archiveOpen && !inv.includes('tape_5')} glint onInteract={() => takeTape('tape_5')} />

      <Trigger
        x0={-3}
        z0={-11}
        x1={3}
        z1={-6.6}
        enabled={archiveOpen}
        onEnter={async () => {
          await wait(1.5);
          setLightsOut(true);
          setLights('*', false);
          play('bass', { vol: 0.5 });
          flickerFlashlight(1);
          await say('c4_lights_out');
          setAmbience({ roomtone: 0.3, drone_low: 0.4, heartbeat: 0.15 }, 2);
        }}
      />
      <Trigger
        x0={5.1}
        z0={-6}
        x1={10}
        z1={0}
        onEnter={() => {
          if (!isObjectiveDone('player')) flickerLights('basement', 1);
        }}
      />
    </>
  );
}
