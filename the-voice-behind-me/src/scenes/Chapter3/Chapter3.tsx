import { useMemo, useState } from 'react';
import { LevelGeometry, room, type WallDef, type FloorDef, type BlockDef } from '../../components/Environment/LevelGeometry';
import { Door, setDoor } from '../../components/Environment/Door';
import { HouseLight } from '../../components/Environment/HouseLight';
import { Mirror } from '../../components/Environment/Mirror';
import { ScratchMark } from '../../components/Environment/ScratchMark';
import { Dresser, Frame, Table, Chair, Rug, ShelfUnit, Stairs, Battery, B, Cassette } from '../../components/Environment/Props';
import { Interactable } from '../../components/Interactions/Interactable';
import { Trigger } from '../../components/Interactions/Trigger';
import { useChapterScript } from '../../systems/ChapterSystem/useChapterScript';
import { completeObjective, progressObjective, completeChapter, isObjectiveDone, fadeOut, fadeIn } from '../../systems/ChapterSystem/chapterRuntime';
import { say } from '../../systems/DialogueSystem/dialogue';
import { giveItem, inspectItem, countItems } from '../../systems/InventorySystem/inventory';
import { openPuzzle } from '../../systems/PuzzleSystem/puzzleSystem';
import { setAmbience, play } from '../../systems/AudioSystem/audioManager';
import { wait } from '../../systems/ChapterSystem/clock';
import { teleport, rig, lookAt } from '../../components/Player/playerRig';
import { setAmbientEvents, setLights, flickerLights, footstepTrail, footstepsBehind, sting, distort, flickerFlashlight } from '../../systems/HorrorEventSystem/horror';
import { showFigure, figureBehind, chaseFigure, hideFigure } from '../../components/Enemies/figureDirector';
import { reflection } from '../../components/Player/MirrorBody';
import { useGame } from '../../store/gameStore';

const MARKS = ['mark_1', 'mark_2', 'mark_3', 'mark_4', 'mark_5'];

export default function Chapter3() {
  const [inv, setInv] = useState<string[]>(() => useGame.getState().inventory);
  const refresh = () => setInv([...useGame.getState().inventory]);
  const [mirrors, setMirrors] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chasing, setChasing] = useState(false);
  const [battery, setBattery] = useState(false);
  const [standDone, setStandDone] = useState(false);

  useState(() => {
    teleport(0.2, -0.8, 0);
    rig.surface = 'wood';
    setAmbience({ rain_inside: 0.45, roomtone: 0.45, drone: 0.25 }, 2);
    return 0;
  });

  useChapterScript(async () => {
    footstepTrail([0.2, 0.05, -5], [0.2, 0.05, -12.6], 10, 0.6, 'step_figure', 0.9).then(() =>
      footstepTrail([0.8, 0.05, -13], [3.5, 0.05, -13], 4, 0.6, 'step_figure', 0.7),
    );
    await say('c3_intro');
    setAmbientEvents({ minGap: 18, maxGap: 36, pool: ['creak', 'whisper', 'flicker', 'reversed', 'knock'] });
  });

  const walls: WallDef[] = useMemo(
    () => [
      { a: [-1, 0], b: [-1, -24], gaps: [{ at: 5.4, w: 0.9 }] },
      { a: [1.4, 0], b: [1.4, -24], gaps: [{ at: 13, w: 0.95 }] },
      { a: [-1, 0], b: [1.4, 0], gaps: [{ at: 1.2, w: 1.0 }] },
      { a: [-1, -24], b: [1.4, -24], gaps: [{ at: 0.7, w: 1.0 }] },
      // mirror room
      ...room(1.4, -16, 7.4, -10, { mat: 'wallpaper_dark', skip: ['w'] }),
      { a: [1.495, -16], b: [1.495, -10], mat: 'wallpaper_dark', t: 0.02, gaps: [{ at: 3, w: 0.95 }], noCollide: true },
      // linen closet
      ...room(-2.4, -6, -1, -4.8, { mat: 'plaster', skip: ['e'] }),
      // stairwell (two flights down)
      { a: [-1, -24], b: [-1, -30], y: -3, h: 5.7, mat: 'plaster' },
      { a: [3, -24], b: [3, -30], y: -3, h: 5.7, mat: 'plaster' },
      { a: [-1, -30], b: [3, -30], y: -3, h: 5.7, mat: 'plaster' },
      { a: [1.4, -24], b: [3, -24], y: -3, h: 5.7, mat: 'plaster' },
      { a: [-1, -24], b: [1.4, -24], y: -3, h: 3, mat: 'plaster' },
      { a: [0.85, -24], b: [0.85, -28.4], y: -3, h: 5.7, mat: 'plaster' },
    ],
    [],
  );
  const floors: FloorDef[] = useMemo(
    () => [
      { x0: -1, z0: -24, x1: 1.4, z1: 0, mat: 'wood_floor', ceil: 2.7 },
      { x0: 1.4, z0: -16, x1: 7.4, z1: -10, mat: 'wood_floor', ceil: 2.7 },
      { x0: -2.4, z0: -6, x1: -1, z1: -4.8, mat: 'wood_floor', ceil: 2.7 },
      { x0: -1, z0: -30, x1: 3, z1: -28.4, y: -1.45, mat: 'concrete' },
      { x0: 0.9, z0: -24.2, x1: 3, z1: -23.9, y: -2.9, mat: 'concrete' },
      { x0: -1, z0: -30, x1: 3, z1: -24, y: 2.7, mat: 'plaster', walk: false },
    ],
    [],
  );
  const blocks: BlockDef[] = useMemo(() => [{ p: [1.0, -1.4, -26.3], s: [0.2, 3.0, 4.2], mat: 'plaster', collide: false }], []);

  const examineMirror = async (id: string) => {
    if (mirrors.includes(id) || busy) return;
    setBusy(true);
    setMirrors((m) => [...m, id]);
    progressObjective('mirrors');
    if (id === 'east') {
      reflection.mode = 'lag';
      await say('c3_mirror1');
      await wait(5);
      reflection.mode = 'follow';
    } else if (id === 'north') {
      figureBehind({ mirrorOnly: true, behindDist: 1.5, opacity: 0.85 });
      play('breathing', { vol: 0.35 });
      await say('c3_mirror2');
      await wait(4);
      hideFigure();
    } else {
      reflection.mode = 'stare';
      sting('soft');
      setRevealed(true);
      await say('c3_mirror3');
      await say('c3_marking_hint');
      reflection.mode = 'follow';
    }
    setBusy(false);
    if (mirrors.length + 1 === 3) {
      await wait(6);
      footstepsBehind(6, 0.55);
      await say('c3_steps_behind');
    }
  };

  const takeMark = (id: string) => {
    giveItem(id);
    refresh();
    progressObjective('markings');
    inspectItem(id);
  };

  const startChase = async () => {
    setChasing(true);
    const g = useGame.getState();
    g.setCutscene(true);
    setDoor('stair', true, { slow: true });
    await say('c3_unlock');
    setLights('*', false);
    play('bass', { vol: 0.6 });
    flickerFlashlight(1.5);
    await wait(0.8);
    lookAt([0.2, 1.6, -15], 0.9);
    await wait(0.9);
    chaseFigure([0.2, 0, -15.5], {
      speed: 2.5,
      opacity: 0.85,
      onCatch: caught,
    });
    sting('hard');
    useGame.getState().setDistortion(0.35);
    await say('c3_chase');
    useGame.getState().setCutscene(false);
    useGame.getState().setHint('Run — hold Shift');
    setTimeout(() => useGame.getState().setHint(null), 3500);
  };

  const caught = async () => {
    const g = useGame.getState();
    g.setCutscene(true);
    play('scream', { vol: 0.45 });
    distort(1);
    await fadeOut(0.8);
    await say('c3_caught');
    teleport(-0.3, -22.8, 0);
    hideFigure();
    await fadeIn(0.8);
    chaseFigure([0.2, 0, -16], { speed: 2.4, opacity: 0.85, onCatch: caught });
    useGame.getState().setCutscene(false);
  };

  const stairDoor = async () => {
    if (isObjectiveDone('lock')) return;
    const n = countItems(MARKS);
    if (n < 5) await say([{ who: 'Elias', text: `Five letters. I've only found ${n} of Noah's markings.`, voice: 'elias' }], { interrupt: true });
    const ok = await openPuzzle('mirror_lock');
    if (!ok) return;
    completeObjective('lock');
    MARKS.forEach((m) => giveItem(m, { silent: true }));
    useGame.getState().setObjectiveDone('markings');
    await startChase();
  };

  const mirrorPrompt = (id: string) => () => (mirrors.includes(id) || busy ? null : 'Look into the mirror');

  return (
    <>
      <color attach="background" args={['#030305']} />
      <fog attach="fog" args={['#060608', 3, 24]} />
      <hemisphereLight args={['#363a44', '#100c0a', 0.5]} />
      <ambientLight color="#16181c" intensity={0.45} />

      <LevelGeometry walls={walls} floors={floors} blocks={blocks} />
      <Stairs from={[-0.3, -1.45, -28.4]} dir="s" width={1.1} rise={1.45} run={4.2} steps={9} mat="concrete" />
      <Stairs from={[2.0, -2.9, -24.2]} dir="n" width={1.1} rise={1.45} run={4.2} steps={9} mat="concrete" />

      {/* lights */}
      <HouseLight id="h1" group="hall" pos={[0.2, 2.4, -3]} intensity={2.6} />
      <HouseLight id="h2" group="hall" pos={[0.2, 2.4, -10]} intensity={2.4} unstable={0.3} />
      <HouseLight id="h3" group="hall" pos={[0.2, 2.4, -18]} intensity={2.2} unstable={0.15} />
      <HouseLight id="mr" group="mirror" pos={[4.4, 2.4, -13]} intensity={3} color="#ffd9a0" fixture="shade" />
      <HouseLight id="sw" group="stair" pos={[1, 0.8, -29]} intensity={1.2} color="#a0b0c0" unstable={0.6} />

      {/* doors */}
      <Door id="back" pos={[0.2, 0, 0]} axis="x" width={1.0} canOpen={() => 'It\'s locked from the other side now.'} />
      <Door id="mirror" pos={[1.4, 0, -13]} axis="z" swing={1} startOpen />
      <Door id="linen" pos={[-1, 0, -5.4]} axis="z" width={0.9} swing={-1} />
      <Door id="stair" pos={[-0.3, 0, -24]} axis="x" width={1.0} scripted />
      <Interactable id="stair_lock" at={[-0.3, 1.1, -23.9]} prompt={() => (isObjectiveDone('lock') ? null : 'Try the letter lock')} glint={countItems(MARKS) >= 5} onInteract={stairDoor} />

      {/* hallway dressing */}
      <Rug pos={[0.2, 0, -12]} w={1.4} d={18} color="#3a2420" />
      {[-3, -9, -15, -20].map((z, i) => (
        <Frame key={z} pos={[i % 2 ? 1.32 : -0.92, 1.6, z]} rot={i % 2 ? -Math.PI / 2 : Math.PI / 2} tint={['#4a4038', '#3a4048', '#4a3a38', '#3a3a30'][i]} w={0.4} h={0.5} />
      ))}
      <Dresser pos={[-0.72, 0, -18]} rot={Math.PI / 2} w={1.1} h={0.85} d={0.5} />
      <Interactable id="scratches" at={[-0.85, 0.3, -17.3]} prompt="Look behind the dresser" glint onInteract={() => (giveItem('clue_wall_scratches'), refresh(), inspectItem('clue_wall_scratches'))} />
      {!battery && <Battery pos={[-0.72, 0.88, -18.3]} />}
      <Interactable
        id="battery3"
        at={[-0.72, 0.9, -18.3]}
        prompt="Take batteries"
        enabled={!battery}
        onInteract={() => {
          setBattery(true);
          useGame.getState().setBattery(useGame.getState().battery + 45);
          useGame.getState().pushToast('Flashlight batteries +45%', 'item');
          play('click', { vol: 0.6 });
        }}
      />

      {/* markings in the hallway */}
      <ScratchMark pos={[-0.91, 1.25, -4]} rot={Math.PI / 2} text="L" tally={1} mirrored size={0.42} />
      <Interactable id="mark_1" at={[-0.88, 1.25, -4]} prompt="Examine the scratches" enabled={!inv.includes('mark_1')} glint onInteract={() => takeMark('mark_1')} />
      <ScratchMark pos={[1.31, 0.9, -8]} rot={-Math.PI / 2} text="I" tally={2} mirrored size={0.42} />
      <Interactable id="mark_2" at={[1.28, 0.9, -8]} prompt="Examine the scratches" enabled={!inv.includes('mark_2')} glint onInteract={() => takeMark('mark_2')} />

      {/* linen closet */}
      <ShelfUnit pos={[-2.15, 0, -5.4]} rot={Math.PI / 2} w={1.0} />
      {!inv.includes('tape_hidden_b') && <Cassette pos={[-2.15, 1.18, -5.3]} color="#b04848" />}
      <Interactable id="tape_b" at={[-2.1, 1.2, -5.3]} prompt="Unfold the bedsheet" enabled={!inv.includes('tape_hidden_b')} glint onInteract={() => (giveItem('tape_hidden_b'), refresh())} />

      {/* mirror room */}
      <Rug pos={[4.4, 0, -13]} w={2.6} d={2.6} color="#2a1e1e" />
      <Table pos={[3.0, 0, -11.0]} w={1.2} d={0.6} />
      <B p={[3.0, 0.92, -11.0]} s={[0.4, 0.28, 0.3]} m="metal" color="#2a2a2a" />
      <Chair pos={[3.0, 0, -11.7]} rot={0} />
      <B p={[6.6, 0.9, -11]} s={[0.35, 1.8, 0.35]} m="fabric" color="#4a3a32" />
      <Mirror pos={[7.3, 1.35, -13]} rot={-Math.PI / 2} w={1.0} h={1.9} />
      <Mirror pos={[4.4, 1.35, -15.9]} rot={0} w={0.9} h={1.8} cracked />
      <Mirror pos={[5.6, 1.35, -10.1]} rot={Math.PI} w={0.9} h={1.8} />
      <Interactable id="mirror_east" at={[7.2, 1.5, -13]} reach={2.4} prompt={mirrorPrompt('east')} glint={!mirrors.includes('east')} onInteract={() => examineMirror('east')} />
      <Interactable id="mirror_north" at={[4.4, 1.5, -15.8]} reach={2.4} prompt={mirrorPrompt('north')} glint={!mirrors.includes('north')} onInteract={() => examineMirror('north')} />
      <Interactable id="mirror_south" at={[5.6, 1.5, -10.2]} reach={2.4} prompt={mirrorPrompt('south')} glint={!mirrors.includes('south')} onInteract={() => examineMirror('south')} />
      {/* mirrored markings opposite the glass */}
      <ScratchMark pos={[1.51, 1.4, -14.4]} rot={Math.PI / 2} text="K" tally={3} mirrored size={0.42} opacity={revealed ? 0.8 : 0.25} />
      <Interactable id="mark_3" at={[1.55, 1.4, -14.4]} prompt="Examine the scratches" enabled={revealed && !inv.includes('mark_3')} glint onInteract={() => takeMark('mark_3')} />
      <ScratchMark pos={[2.6, 1.6, -10.11]} rot={Math.PI} text="O" tally={4} mirrored size={0.42} opacity={revealed ? 0.8 : 0.25} />
      <Interactable id="mark_4" at={[2.6, 1.6, -10.15]} prompt="Examine the scratches" enabled={revealed && !inv.includes('mark_4')} glint onInteract={() => takeMark('mark_4')} />
      <ScratchMark pos={[6.4, 0.8, -15.89]} rot={0} text="D" tally={5} mirrored size={0.42} opacity={revealed ? 0.8 : 0.25} />
      <Interactable id="mark_5" at={[6.4, 0.8, -15.85]} prompt="Examine the scratches" enabled={revealed && !inv.includes('mark_5')} glint onInteract={() => takeMark('mark_5')} />

      {/* story triggers */}
      <Trigger
        x0={1.6}
        z0={-16}
        x1={7.4}
        z1={-10}
        onEnter={async () => {
          completeObjective('footsteps');
          await say('c3_footsteps_end');
          await wait(1.2);
          setDoor('mirror', false, { slam: true });
          flickerLights('mirror', 1.4);
          sting('soft');
          await say('c3_door_slam');
        }}
      />
      <Trigger
        x0={-1}
        z0={-14}
        x1={1.4}
        z1={-8}
        enabled={countItems(MARKS) >= 3 && !standDone && !chasing}
        onEnter={async () => {
          setStandDone(true);
          showFigure([0.2, 0, -22.6], {
            vanishDist: 4.5,
            vanishOnLook: 5,
            fleeCheck: true,
            onFlee: () => say([{ who: 'Elias', text: '(No. No no no.)', voice: 'elias' }]),
          });
          play('breathing', { vol: 0.3, pos: [0.2, 1.6, -22.6] });
          await say('c3_figure_stand');
        }}
      />
      <Trigger
        x0={0.9}
        z0={-25.2}
        x1={3}
        z1={-23.8}
        minY={-3.2}
        maxY={-2.3}
        enabled={chasing}
        onEnter={async () => {
          hideFigure();
          useGame.getState().setDistortion(0);
          completeObjective('escape');
          await say('c3_escaped');
          await completeChapter(4);
        }}
      />
    </>
  );
}
