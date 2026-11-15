import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { LevelGeometry, room, type WallDef, type FloorDef } from '../../components/Environment/LevelGeometry';
import { Door, setDoor } from '../../components/Environment/Door';
import { HouseLight } from '../../components/Environment/HouseLight';
import { MovingProp } from '../../components/Environment/MovingProp';
import {
  Bed, Desk, Chair, Bookshelf, Wardrobe, Rug, Frame, Crates, ShelfUnit, Toilet, Bathtub, SinkStand,
  ToyBear, ToyCar, MusicBox, Corkboard, PaperNote, Table, B, Battery,
} from '../../components/Environment/Props';
import { Mirror } from '../../components/Environment/Mirror';
import { Interactable } from '../../components/Interactions/Interactable';
import { Trigger } from '../../components/Interactions/Trigger';
import { useChapterScript } from '../../systems/ChapterSystem/useChapterScript';
import { completeObjective, progressObjective, completeChapter, isObjectiveDone } from '../../systems/ChapterSystem/chapterRuntime';
import { say, choose } from '../../systems/DialogueSystem/dialogue';
import { giveItem, hasItem, inspectItem, countItems } from '../../systems/InventorySystem/inventory';
import { openPuzzle } from '../../systems/PuzzleSystem/puzzleSystem';
import { setAmbience, play, type SoundHandle } from '../../systems/AudioSystem/audioManager';
import { wait, until } from '../../systems/ChapterSystem/clock';
import { teleport, rig, distTo } from '../../components/Player/playerRig';
import { setAmbientEvents, flickerLights, soundBehind, sting, soundAt } from '../../systems/HorrorEventSystem/horror';
import { setNoah, noah } from '../../components/Enemies/Noah';
import { useGame } from '../../store/gameStore';

const PHOTOS = ['photo_beach', 'photo_bike', 'photo_graduation', 'photo_recorder'];

export default function Chapter2() {
  const g = useGame.getState();
  const [inv, setInv] = useState<string[]>(() => g.inventory);
  const refresh = () => setInv([...useGame.getState().inventory]);
  const [toysArmed, setToysArmed] = useState(false);
  const [musicBoxOpen, setMusicBoxOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [pinned, setPinned] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);
  const [battery, setBattery] = useState(false);
  const musicRef = useRef<SoundHandle | null>(null);

  useState(() => {
    teleport(0.2, 3.0, 0);
    rig.surface = 'wood';
    setAmbience({ rain_inside: 0.55, roomtone: 0.4, wind: 0.1, drone: 0.22 }, 2);
    return 0;
  });

  useChapterScript(async () => {
    await say('c2_intro');
    setAmbientEvents({ minGap: 20, maxGap: 40, pool: ['creak', 'whisper', 'flicker', 'laugh', 'knock'] });
  });

  const walls: WallDef[] = useMemo(
    () => [
      // hallway
      { a: [-1, -10], b: [-1, 4], gaps: [{ at: 2.5, w: 0.95 }, { at: 9, w: 0.95 }] },
      { a: [1.4, -10], b: [1.4, 4], gaps: [{ at: 3, w: 0.95 }, { at: 9, w: 0.95 }] },
      { a: [-1, -10], b: [1.4, -10], gaps: [{ at: 1.2, w: 1.0 }] },
      { a: [-1, 4], b: [1.4, 4] },
      // Noah's room
      ...room(1.4, -10, 6.4, -4, { mat: 'wallpaper_noah', skip: ['w'], e: [{ at: 3, w: 1.2, sill: 0.9 }] }),
      { a: [1.495, -10], b: [1.495, -4], mat: 'wallpaper_noah', t: 0.02, gaps: [{ at: 3, w: 0.95 }], noCollide: true },
      // storage
      ...room(-5, -10, -1, -5, { mat: 'plaster', skip: ['e'], n: [{ at: 2, w: 0.9, sill: 1.2 }] }),
      // bathroom
      ...room(-4, -3, -1, 1, { mat: 'tile', skip: ['e'] }),
      { a: [-1.095, -3], b: [-1.095, 1], mat: 'tile', t: 0.02, gaps: [{ at: 2, w: 0.95 }], noCollide: true },
      // vestibule beyond the north door
      { a: [-0.6, -10], b: [-0.6, -13], mat: 'wallpaper_dark' },
      { a: [1.0, -10], b: [1.0, -13], mat: 'wallpaper_dark' },
      { a: [-0.6, -13], b: [1.0, -13], mat: 'wallpaper_dark' },
    ],
    [],
  );
  const floors: FloorDef[] = useMemo(
    () => [
      { x0: -1, z0: -10, x1: 1.4, z1: 4, mat: 'wood_floor', ceil: 2.7 },
      { x0: 1.4, z0: -10, x1: 6.4, z1: -4, mat: 'wood_floor', ceil: 2.7 },
      { x0: -5, z0: -10, x1: -1, z1: -5, mat: 'wood_floor', ceil: 2.7 },
      { x0: -4, z0: -3, x1: -1, z1: 1, mat: 'tile', ceil: 2.7 },
      { x0: -0.6, z0: -13, x1: 1.0, z1: -10, mat: 'wood_floor', ceil: 2.7, ceilMat: 'burnt' },
    ],
    [],
  );

  const pickPhoto = (id: string) => {
    giveItem(id);
    refresh();
    progressObjective('photos');
    if (countItems(PHOTOS) === 1) say([{ who: 'Elias', text: 'Mom kept every photo. There should be more of these.', voice: 'elias' }]);
  };

  const findDiary = async () => {
    giveItem('diary');
    refresh();
    completeObjective('diary');
    await say('c2_diary');
    const ok = await openPuzzle('diary');
    if (ok) await diaryDone();
  };

  const diaryDone = async () => {
    giveItem('diary_page');
    refresh();
    completeObjective('diarypage');
    await say('c2_diary_done');
    // the music box starts by itself
    await wait(3);
    musicRef.current = play('music_box', { loop: true, pos: [5.9, 1.2, -9.6], vol: 0.8, ref: 1.2 });
    setMusicPlaying(true);
    say('c2_music_box');
  };

  const musicBox = async () => {
    if (!musicPlaying) return;
    const c = await choose('The music box is playing. The lid is closed, but the song comes through.', [
      { id: 'open', text: 'Open it and listen' },
      { id: 'close', text: 'Hold the lid shut until it stops' },
    ]);
    musicRef.current?.stop(1.5);
    setMusicPlaying(false);
    if (c === 'open') {
      setMusicBoxOpen(true);
      giveItem('tape_hidden_a');
      refresh();
      await say('c2_music_box_listen');
    } else {
      useGame.getState().addAvoidance();
      await say('c2_music_box_close');
      // it opens anyway, later — the tape is still findable
      await wait(8);
      setMusicBoxOpen(true);
      play('creak_0', { pos: [5.9, 1.2, -9.6], vol: 0.4 });
    }
  };

  const corkboard = async () => {
    if (countItems(PHOTOS) < 4) {
      say('c2_corkboard_need', { interrupt: true });
      return;
    }
    if (!isObjectiveDone('diarypage')) {
      say([{ who: 'Elias', text: 'The photos... I want to know what he wrote first. His diary must be somewhere.', voice: 'elias' }], { interrupt: true });
      return;
    }
    const ok = await openPuzzle('photos');
    if (!ok) return;
    setPinned(4);
    completeObjective('memory');
    await say('c2_memory_done');
    flickerLights('*', 1.5);
    await wait(0.5);
    setDoor('north', true, { slow: true });
    setExitOpen(true);
    soundAt('kuya', [0.2, 1.5, -11.5], 0.7);
  };

  return (
    <>
      <color attach="background" args={['#030406']} />
      <fog attach="fog" args={['#07080a', 4, 26]} />
      <hemisphereLight args={['#3a4250', '#14100c', 0.55]} />
      <ambientLight color="#1a1c22" intensity={0.5} />

      <LevelGeometry walls={walls} floors={floors} />

      {/* lights */}
      <HouseLight id="hall1" group="hall" pos={[0.2, 2.4, 1]} intensity={3.5} unstable={0.1} />
      <HouseLight id="hall2" group="hall" pos={[0.2, 2.4, -6]} intensity={3} unstable={0.25} />
      <HouseLight id="noah" group="noah" pos={[2.6, 1.25, -9.5]} intensity={2.6} fixture="shade" color="#ffb870" distance={7} />
      <HouseLight id="storage" group="storage" pos={[-3, 2.4, -7.5]} intensity={2.2} unstable={0.4} />
      <HouseLight id="bath" group="bath" pos={[-2.5, 2.5, -1]} intensity={2.4} color="#d8e8ff" unstable={0.5} fixture="bulb" />
      <pointLight position={[6.9, 1.6, -7]} color="#4a5a7a" intensity={1.5} distance={6} />

      {/* doors */}
      <Door
        id="noah"
        pos={[1.4, 0, -7]}
        axis="z"
        swing={1}
        canOpen={() => (hasItem('key_noah') ? true : 'Locked.')}
        onOpen={() => {
          play('lock', { pos: [1.4, 1, -7], vol: 0.6 });
          say('c2_door_open');
        }}
      />
      <Door id="elias" pos={[1.4, 0, -1]} axis="z" swing={1} canOpen={() => 'My room. Not now. I can\'t.'} />
      <Door id="storage" pos={[-1, 0, -7.5]} axis="z" swing={-1} />
      <Door id="bath" pos={[-1, 0, -1]} axis="z" swing={-1} startOpen />
      <Door
        id="north"
        pos={[0.2, 0, -10]}
        axis="x"
        width={1.0}
        canOpen={() => (exitOpen ? true : 'It won\'t open. Something is holding it from the other side.')}
      />

      {/* ── hallway ── */}
      <Table pos={[1.1, 0, 2.2]} w={0.4} d={0.8} h={0.8} />
      <Frame pos={[-0.92, 1.6, -3.5]} rot={Math.PI / 2} tint="#4a4a3a" />
      <Frame pos={[1.32, 1.6, -3.5]} rot={-Math.PI / 2} tint="#5a4a3a" w={0.3} h={0.4} />
      {!inv.includes('photo_bike') && <Frame pos={[1.1, 0.86, 2.2]} rot={-Math.PI / 2} tint="#7c8559" w={0.22} h={0.16} fallen />}
      <Interactable id="photo_bike" at={[1.1, 0.88, 2.2]} prompt="Take the photograph" enabled={!inv.includes('photo_bike')} glint onInteract={() => pickPhoto('photo_bike')} />

      {/* ── Noah's room ── */}
      <Rug pos={[3.8, 0, -7]} w={2} d={1.6} color="#2e3a4a" />
      <Bed pos={[5.8, 0, -6.4]} rot={Math.PI / 2} kid />
      <Desk pos={[2.7, 0, -9.6]} />
      <Chair pos={[2.6, 0, -8.9]} rot={Math.PI} />
      <Bookshelf pos={[6.2, 0, -9.5]} rot={-Math.PI / 2} w={0.8} h={1.2} />
      <Wardrobe pos={[4.5, 0, -4.35]} rot={Math.PI} />
      <Corkboard pos={[2.7, 1.55, -9.9]} pinned={pinned} />
      <Interactable id="corkboard" at={[2.7, 1.55, -9.85]} prompt={() => (isObjectiveDone('memory') ? null : 'Examine the corkboard')} glint={countItems(PHOTOS) === 4} onInteract={corkboard} />
      <PaperNote pos={[2.4, 0.765, -9.55]} flat rot={0.3} color="#e0dccc" />
      <Interactable id="noah_drawing" at={[2.4, 0.8, -9.55]} prompt="Look at the drawing" glint onInteract={() => (giveItem('clue_noah_drawing'), refresh(), inspectItem('clue_noah_drawing'))} />
      {!inv.includes('photo_recorder') && <Frame pos={[3.1, 0.77, -9.4]} tint="#a0574a" w={0.18} h={0.13} fallen />}
      <Interactable
        id="photo_recorder"
        at={[3.1, 0.8, -9.4]}
        prompt="Take the photograph"
        enabled={!inv.includes('photo_recorder')}
        glint
        onInteract={() => {
          pickPhoto('photo_recorder');
          setToysArmed(true);
        }}
      />
      <MusicBox pos={[5.9, 1.23, -9.55]} rot={-Math.PI / 2} open={musicBoxOpen} />
      <Interactable
        id="musicbox"
        at={[5.9, 1.3, -9.5]}
        prompt={() => (musicPlaying ? 'Touch the music box' : musicBoxOpen && !inv.includes('tape_hidden_a') ? 'Take what\'s inside' : null)}
        glint={musicPlaying}
        onInteract={async () => {
          if (musicPlaying) await musicBox();
          else if (musicBoxOpen) {
            giveItem('tape_hidden_a');
            refresh();
            await say('c2_music_box_listen');
          }
        }}
      />
      <MovingProp a={{ pos: [3.6, 0, -6.6], rot: 0.4 }} b={{ pos: [2.2, 0, -5.0], rot: Math.PI }} armed={toysArmed} onMoved={() => say('c2_toys')}>
        <ToyBear pos={[0, 0, 0]} />
      </MovingProp>
      <MovingProp a={{ pos: [4.4, 0, -7.7], rot: 1 }} b={{ pos: [2.0, 0, -7.0], rot: -Math.PI / 2 }} armed={toysArmed}>
        <ToyCar pos={[0, 0, 0]} />
      </MovingProp>
      {/* height marks on the inside of the doorframe */}
      {[0.9, 1.15, 1.4, 1.5, 1.62].map((y, i) => (
        <B key={i} p={[1.49, y, -6.4]} s={[0.005, 0.006, 0.09]} m="black" shadow={false} />
      ))}
      <Interactable id="heights" at={[1.5, 1.3, -6.4]} prompt="Look at the pencil marks" glint onInteract={() => (giveItem('clue_height_marks'), refresh(), inspectItem('clue_height_marks'))} />
      <Trigger
        x0={1.5}
        z0={-10}
        x1={6.4}
        z1={-4}
        onEnter={() => {
          completeObjective('search');
        }}
      />

      {/* ── storage ── */}
      <ShelfUnit pos={[-4.7, 0, -7.5]} rot={Math.PI / 2} w={2.4} />
      <Crates pos={[-2.2, 0, -9.5]} n={4} />
      <Crates pos={[-4.2, 0, -5.5]} rot={0} n={2} />
      <B p={[-2.0, 0.25, -6.0]} s={[0.8, 0.5, 0.5]} m="dark_wood" />
      <Interactable
        id="diary"
        at={[-2.0, 0.55, -6.0]}
        prompt={() => (inv.includes('diary') ? (isObjectiveDone('diarypage') ? null : 'Piece the torn page together') : 'Open the old trunk')}
        glint={!inv.includes('diary')}
        onInteract={async () => {
          if (!inv.includes('diary')) await findDiary();
          else if (!isObjectiveDone('diarypage')) {
            const ok = await openPuzzle('diary');
            if (ok) await diaryDone();
          }
        }}
      />
      {!inv.includes('photo_beach') && <Frame pos={[-4.7, 0.65, -8.2]} rot={Math.PI / 2} tint="#6f8a96" w={0.2} h={0.15} fallen />}
      <Interactable id="photo_beach" at={[-4.6, 0.68, -8.2]} prompt="Take the photograph" enabled={!inv.includes('photo_beach')} glint onInteract={() => pickPhoto('photo_beach')} />
      {!battery && <Battery pos={[-4.7, 1.22, -6.6]} />}
      <Interactable
        id="battery2"
        at={[-4.6, 1.22, -6.6]}
        prompt="Take batteries"
        enabled={!battery}
        onInteract={() => {
          setBattery(true);
          useGame.getState().setBattery(useGame.getState().battery + 45);
          useGame.getState().pushToast('Flashlight batteries +45%', 'item');
          play('click', { vol: 0.6 });
        }}
      />
      <Trigger
        x0={-1.2}
        z0={-9}
        x1={1.4}
        z1={-6}
        enabled={isObjectiveDone('diarypage') || inv.includes('diary_page')}
        onEnter={async () => {
          // the child's silhouette at the end of the corridor
          setNoah({ visible: true, style: 'shadow', pos: [0.2, 0, -9.5], opacity: 0.9 });
          sting('soft');
          await say('c2_silhouette');
          const t0 = performance.now();
          await until(() => distTo(0.2, -9.5) < 3 || performance.now() - t0 > 2500);
          noah.visible = false;
          play('child_laugh', { pos: [0.2, 1.4, -9.5], vol: 0.3 });
        }}
      />

      {/* ── bathroom ── */}
      <Bathtub pos={[-3.5, 0, -1.9]} />
      <Toilet pos={[-3.65, 0, 0.5]} rot={Math.PI / 2} />
      <SinkStand pos={[-2.2, 0, 0.75]} rot={Math.PI} />
      <Mirror pos={[-2.2, 1.6, 0.9]} rot={Math.PI} w={0.55} h={0.7} cracked />
      <B p={[-2.9, 1.6, 0.86]} s={[0.4, 0.5, 0.12]} m="white" />
      {!inv.includes('photo_graduation') && <Frame pos={[-2.9, 1.46, 0.78]} rot={Math.PI} tint="#8d7a6a" w={0.15} h={0.2} />}
      <Interactable id="photo_graduation" at={[-2.9, 1.5, 0.78]} prompt="Open the cabinet" enabled={!inv.includes('photo_graduation')} glint onInteract={() => pickPhoto('photo_graduation')} />
      <Trigger
        x0={-4}
        z0={-3}
        x1={-1.1}
        z1={1}
        onEnter={async () => {
          await wait(1.5);
          soundBehind('kuya', 0.6, 1.2);
          await say('c2_whisper');
        }}
      />

      {/* ── exit ── */}
      <Trigger
        x0={-0.6}
        z0={-13}
        x1={1.0}
        z1={-10.7}
        enabled={exitOpen}
        onEnter={async () => {
          completeObjective('hallway');
          await completeChapter(3);
        }}
      />
      <MemoryDust />
    </>
  );
}

/** Dust motes drifting in the lamplight of Noah's room. */
function MemoryDust() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 120;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = 1.6 + Math.random() * 4.6;
      p[i * 3 + 1] = Math.random() * 2.5;
      p[i * 3 + 2] = -9.8 + Math.random() * 5.6;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#c8b898" size={0.015} transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}
