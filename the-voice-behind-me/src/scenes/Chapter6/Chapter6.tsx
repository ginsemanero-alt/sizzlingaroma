import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LevelGeometry, room, type WallDef, type FloorDef, type BlockDef } from '../../components/Environment/LevelGeometry';
import { Door, setDoor } from '../../components/Environment/Door';
import { HouseLight } from '../../components/Environment/HouseLight';
import { Mirror } from '../../components/Environment/Mirror';
import { Frame, Chair, Table, B, Cyl, Cassette, Recorder, Rug } from '../../components/Environment/Props';
import { Embers } from '../../components/Environment/Atmosphere';
import { Interactable } from '../../components/Interactions/Interactable';
import { Trigger } from '../../components/Interactions/Trigger';
import { useChapterScript } from '../../systems/ChapterSystem/useChapterScript';
import { completeObjective, triggerEnding, isObjectiveDone } from '../../systems/ChapterSystem/chapterRuntime';
import { say, choose } from '../../systems/DialogueSystem/dialogue';
import { giveItem } from '../../systems/InventorySystem/inventory';
import { openPuzzle, isSolved } from '../../systems/PuzzleSystem/puzzleSystem';
import { setAmbience, play } from '../../systems/AudioSystem/audioManager';
import { wait } from '../../systems/ChapterSystem/clock';
import { teleport, rig, lookAt, isLookingAt } from '../../components/Player/playerRig';
import { setAmbientEvents, flickerLights, sting, distort, soundBehind } from '../../systems/HorrorEventSystem/horror';
import { figure, figureBehind, hideFigure, showFigure } from '../../components/Enemies/figureDirector';
import { endingProgress, hallwayLoopLimit, acceptanceReady } from '../../systems/EndingSystem/endingSystem';
import { useGame } from '../../store/gameStore';
import type { ChoiceOption } from '../../store/gameStore';

const LOOP_FROM = -22;
const LOOP_SHIFT = 18;

/** Footsteps that match the player's, a few metres behind. */
function FollowerSteps({ active }: { active: boolean }) {
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!active || rig.speed < 0.6) return;
    t.current += dt;
    const interval = rig.running ? 0.3 : 0.45;
    if (t.current > interval) {
      t.current = 0;
      const b = rig.forward.clone().setY(0).normalize().multiplyScalar(-3);
      play('step_figure', { pos: [rig.pos.x + b.x, rig.pos.y + 0.05, rig.pos.z + b.z], vol: 0.55, ref: 2 });
    }
  });
  return null;
}

/** Slowly turning photographs and tape pieces hanging in the memory chamber. */
function MemoryFragments() {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        p: [Math.sin(i * 2.3) * 3.3, 1.2 + (i % 5) * 0.45, -41 + Math.cos(i * 1.7) * 3.6] as [number, number, number],
        tint: ['#6f8a96', '#7c8559', '#8d7a6a', '#a0574a', '#8a7356', '#c9b8a0'][i % 6],
        tape: i % 4 === 0,
        speed: 0.2 + (i % 3) * 0.1,
      })),
    [],
  );
  useFrame((s) => {
    group.current?.children.forEach((c, i) => {
      c.rotation.y = s.clock.elapsedTime * items[i].speed + i;
      c.position.y = items[i].p[1] + Math.sin(s.clock.elapsedTime * 0.6 + i) * 0.08;
    });
  });
  return (
    <group ref={group}>
      {items.map((it, i) =>
        it.tape ? (
          <group key={i} position={it.p}>
            <Cassette pos={[0, 0, 0]} color="#8d4a3c" />
          </group>
        ) : (
          <group key={i} position={it.p}>
            <Frame pos={[0, 0, 0]} w={0.22} h={0.28} tint={it.tint} />
          </group>
        ),
      )}
    </group>
  );
}

export default function Chapter6() {
  const [faced, setFaced] = useState(false);
  const [confronted, setConfronted] = useState(false);
  const [inv, setInv] = useState<string[]>(() => useGame.getState().inventory);
  const refresh = () => setInv([...useGame.getState().inventory]);
  const [timelineDone, setTimelineDone] = useState(() => isSolved('timeline'));
  const [secretDone, setSecretDone] = useState(() => isSolved('splice'));
  const loops = useRef(0);
  const facing = useRef(false);
  const deciding = useRef(false);

  useState(() => {
    teleport(0.2, -1.2, 0);
    rig.surface = 'wood';
    setAmbience({ drone_low: 0.4, roomtone: 0.3, heartbeat: 0.18, wind: 0.12 }, 2);
    useGame.getState().setDistortion(0.15);
    return 0;
  });

  const armFigure = () =>
    figureBehind({
      behindDist: 3.2,
      holdWhenFaced: true,
      opacity: 0.8,
      onFaced: onFaced,
    });

  useChapterScript(async () => {
    await say('c6_intro');
    armFigure();
    setAmbientEvents({ minGap: 16, maxGap: 30, pool: ['whisper', 'reversed', 'laugh', 'creak'] });
  });

  /** The player turned and looked at the thing following him. Now: does he stay? */
  const onFaced = async () => {
    if (facing.current || faced) return;
    facing.current = true;
    const t0 = performance.now();
    let still = 0;
    let last = performance.now();
    while (performance.now() - t0 < 6000) {
      await wait(0.1);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const looking = isLookingAt(new THREE.Vector3(figure.pos.x, 1.6, figure.pos.z), 0.6);
      if (rig.speed < 0.5 && looking) still += dt;
      else if (rig.speed > 1.5) break;
      if (still > 1.4) {
        await stoodStill();
        return;
      }
    }
    // he ran, or looked away — it slips back behind him
    facing.current = false;
    hideFigure();
    await wait(1.5);
    if (!faced) armFigure();
  };

  const stoodStill = async () => {
    setFaced(true);
    useGame.getState().setHint(null);
    completeObjective('hallway');
    await say('c6_faced');
    hideFigure();
    flickerLights('*', 1.2);
    setDoor('end', true, { slow: true });
    soundBehind('kuya', 0.5, 1.5);
  };

  const loop = async () => {
    if (faced) return;
    loops.current++;
    teleport(rig.pos.x, rig.pos.z + LOOP_SHIFT, rig.yaw);
    figure.pos.z += LOOP_SHIFT;
    useGame.getState().addFlee();
    distort(0.4);
    const limit = hallwayLoopLimit();
    if (loops.current >= limit) {
      useGame.getState().setCutscene(true);
      showFigure([rig.pos.x, rig.pos.y, rig.pos.z + 1.6], { opacity: 0.95, reveal: 0.6 });
      await say([{ who: 'Elias', text: 'There\'s no end to it.', voice: 'elias' }]);
      await triggerEnding('C');
      return;
    }
    if (loops.current === 1) await say('c6_loop1');
    else if (loops.current === 2) await say('c6_loop2');
    else {
      await say('c6_loop3');
      useGame.getState().setHint('Stop running. Turn around.');
      setTimeout(() => useGame.getState().setHint(null), 5000);
    }
  };

  const confront = async () => {
    if (confronted) return;
    setConfronted(true);
    const g = useGame.getState();
    g.setCutscene(true);
    hideFigure();
    await wait(0.2);
    showFigure([0.2, 0, -32.6], { opacity: 0.95, reveal: 1 });
    await lookAt([0.2, 1.6, -32.6], 1.4);
    sting('soft');
    await say('c6_confront_intro');
    const st = useGame.getState();
    const heard5 = st.inventory.includes('tape_5');
    const opts: ChoiceOption[] = [
      { id: 'tape5', text: 'He didn\'t call for help. He called for me to wake up.', locked: heard5 ? undefined : 'you never heard that tape' },
      { id: 'diary', text: '"Someone has to wake him up. That\'s my job." He wrote it.', locked: st.inventory.includes('diary_page') ? undefined : 'you never read his diary' },
      { id: 'letter', text: 'I had burns on my back. Like two small hands.', locked: st.inventory.includes('clue_mom_letter') ? undefined : 'you never found Mom\'s letter' },
      { id: 'agree', text: '...He called for help. And I walked away.' },
    ];
    const c = await choose('The Figure waits for you to say it.', opts);
    if (c === 'tape5') await say('c6_confront_tape5');
    else if (c === 'diary') await say('c6_confront_diary');
    else if (c === 'letter') await say('c6_confront_letter');
    else {
      useGame.getState().addAvoidance(2);
      await say('c6_confront_agree');
    }
    await say('c6_confront_end');
    completeObjective('confront');
    figure.opts = { ...figure.opts, reveal: 0 };
    await wait(1.5);
    hideFigure();
    useGame.getState().setCutscene(false);
    setDoor('chamber', true, { slow: true });
    setAmbience({ drone: 0.25, roomtone: 0.2, heartbeat: 0.05 }, 3);
    useGame.getState().setDistortion(0.05);
  };

  const pedestal = async () => {
    if (!inv.includes('final_tape')) {
      giveItem('final_tape');
      refresh();
      completeObjective('recording');
      await say('c6_chamber');
      return;
    }
    if (!timelineDone) {
      await say([{ who: 'Elias', text: 'Not yet. First I need to remember it right.', voice: 'elias' }], { interrupt: true });
      return;
    }
    await decide();
  };

  const timeline = async () => {
    if (timelineDone) return;
    if (!inv.includes('final_tape')) {
      await say([{ who: 'Elias', text: 'The tape first. On the pedestal.', voice: 'elias' }], { interrupt: true });
      return;
    }
    const ok = await openPuzzle('timeline');
    if (!ok) return;
    setTimelineDone(true);
    completeObjective('reconstruct');
    flickerLights('*', 0.8);
    await say('c6_timeline_done');
  };

  const secretDeck = async () => {
    const p = endingProgress();
    if (secretDone) return;
    if (!p.secretReady) {
      await say('c6_secret_missing', { interrupt: true });
      useGame.getState().pushToast(`Hidden recordings ${p.tapes}/${p.tapesTotal} · Hidden clues ${p.clues}/${p.cluesTotal}`, 'info');
      return;
    }
    await say('c6_secret_found');
    const ok = await openPuzzle('splice');
    if (!ok) return;
    setSecretDone(true);
    play('tape_click', { vol: 0.6 });
  };

  const decide = async () => {
    if (deciding.current) return;
    deciding.current = true;
    const g = useGame.getState();
    g.setCutscene(true);
    showFigure([0.2, 0, -37.4], { opacity: 0.7 });
    await say('c6_decide');
    const p = endingProgress();
    const opts: ChoiceOption[] = [
      {
        id: 'accept',
        text: 'Play the last recording. Let him say it.',
        locked: acceptanceReady() ? undefined : `you don't remember enough yet (evidence ${p.evidence}/${p.evidenceTotal})`,
      },
      { id: 'destroy', text: 'Pull the tape out of the shell. Destroy it.' },
      { id: 'turn', text: 'Turn away. Walk back into the hallway.' },
    ];
    if (secretDone) opts.unshift({ id: 'secret', text: 'Play the tape Noah made for you. All of it, in order.' });
    const c = await choose('The last recording. The Figure is standing in the doorway behind you.', opts);
    completeObjective('decide');
    if (c === 'accept') {
      hideFigure();
      await triggerEnding('A');
    } else if (c === 'secret') {
      hideFigure();
      await triggerEnding('D');
    } else if (c === 'destroy') {
      play('tape_click', { vol: 0.7, rate: 0.6 });
      distort(0.8);
      await triggerEnding('B');
    } else {
      useGame.getState().addAvoidance(3);
      await triggerEnding('C');
    }
  };

  const walls: WallDef[] = useMemo(
    () => [
      { a: [-1, 0], b: [-1, -28], mat: 'wallpaper_dark' },
      { a: [1.4, 0], b: [1.4, -28], mat: 'wallpaper_dark' },
      { a: [-1, 0], b: [1.4, 0], mat: 'wallpaper_dark' },
      { a: [-3, -28], b: [3.4, -28], mat: 'wallpaper_dark', gaps: [{ at: 3.2, w: 1.0 }] },
      ...room(-3, -36, 3.4, -28, { mat: 'wallpaper_dark', skip: ['s'], n: [{ at: 3.2, w: 1.0 }] }),
      ...room(-4, -46, 4.4, -36, { mat: 'memory', skip: ['s'] }),
      { a: [-4, -36], b: [-3, -36], mat: 'memory' },
      { a: [3.4, -36], b: [4.4, -36], mat: 'memory' },
    ],
    [],
  );
  const floors: FloorDef[] = useMemo(
    () => [
      { x0: -1, z0: -28, x1: 1.4, z1: 0, mat: 'wood_floor', ceil: 2.7, ceilMat: 'burnt' },
      { x0: -3, z0: -36, x1: 3.4, z1: -28, mat: 'wood_floor', ceil: 3.2, ceilMat: 'wallpaper_dark' },
      { x0: -4, z0: -46, x1: 4.4, z1: -36, mat: 'memory', ceil: 4.2, ceilMat: 'memory' },
    ],
    [],
  );
  const blocks: BlockDef[] = useMemo(
    () => [
      // the chamber's pedestal and timeline board
      { p: [0.2, 0.5, -41], s: [0.6, 1.0, 0.6], mat: 'memory', collide: true },
      { p: [0.2, 1.6, -45.88], s: [2.4, 1.4, 0.05], mat: 'paper' },
    ],
    [],
  );
  // hallway dressing repeats every LOOP_SHIFT metres so the loop reads as "the same hallway"
  const hallDeco = useMemo(() => {
    const out: { z: number; side: 1 | -1; kind: 'frame' | 'door' | 'tilt' }[] = [];
    for (let base = -2; base > -27; base -= LOOP_SHIFT) {
      out.push({ z: base - 1.5, side: -1, kind: 'frame' });
      out.push({ z: base - 4, side: 1, kind: 'door' });
      out.push({ z: base - 7, side: -1, kind: 'door' });
      out.push({ z: base - 9.5, side: 1, kind: 'tilt' });
      out.push({ z: base - 12, side: -1, kind: 'tilt' });
      out.push({ z: base - 15, side: 1, kind: 'frame' });
    }
    return out.filter((d) => d.z > -27.5);
  }, []);

  return (
    <>
      <color attach="background" args={['#050203']} />
      <fog attach="fog" args={['#0a0406', 2.5, 16]} />
      <hemisphereLight args={['#4a3036', '#100808', 0.5]} />
      <ambientLight color="#1a1012" intensity={0.5} />

      <LevelGeometry walls={walls} floors={floors} blocks={blocks} />
      <FollowerSteps active={!faced} />

      {/* hallway */}
      {[-3, -9, -15, -21, -26].map((z, i) => (
        <HouseLight key={z} id={`hl${i}`} group="hall" pos={[0.2, 2.4, z]} intensity={1.8} color="#ffb890" unstable={0.35} />
      ))}
      {hallDeco.map((d, i) =>
        d.kind === 'door' ? (
          <group key={i}>
            <B p={[d.side < 0 ? -0.93 : 1.33, 1.05, d.z]} s={[0.04, 2.1, 0.9]} m="dark_wood" />
            <B p={[d.side < 0 ? -0.9 : 1.3, 1.0, d.z + 0.33]} s={[0.04, 0.06, 0.06]} m="metal" />
          </group>
        ) : (
          <Frame key={i} pos={[d.side < 0 ? -0.92 : 1.32, 1.6, d.z]} rot={d.side < 0 ? Math.PI / 2 : -Math.PI / 2} tint={d.kind === 'tilt' ? '#2a2020' : '#4a3a38'} w={0.45} h={0.6} />
        ),
      )}
      <group position={[0.2, 2.68, -12]} rotation={[Math.PI, 0, 0]}>
        <Chair pos={[0, 0, 0]} rot={0.6} />
      </group>
      <group position={[0.5, 2.68, -19]} rotation={[Math.PI, 0, 0]}>
        <Table pos={[0, 0, 0]} w={0.8} d={0.5} h={0.7} />
      </group>
      <Door id="end" pos={[0.2, 0, -28]} axis="x" width={1.0} canOpen={() => (faced ? true : 'It won\'t open. Behind me — footsteps, matching mine.')} />
      <Trigger x0={-1} z0={-27.9} x1={1.4} z1={LOOP_FROM} once={false} enabled={!faced} onEnter={loop} />

      {/* mirror room */}
      <HouseLight id="mr" group="mirror" pos={[0.2, 2.9, -32]} intensity={2.4} color="#d8c0b0" fixture="bulb" unstable={0.2} />
      <Mirror pos={[-2.9, 1.4, -32]} rot={Math.PI / 2} w={1.1} h={2.0} />
      <Mirror pos={[3.3, 1.4, -30.5]} rot={-Math.PI / 2} w={1.0} h={2.0} cracked />
      <Mirror pos={[3.3, 1.4, -33.5]} rot={-Math.PI / 2} w={1.0} h={2.0} />
      <Mirror pos={[-1.6, 1.4, -35.9]} rot={0} w={1.0} h={2.0} cracked />
      <Rug pos={[0.2, 0, -32]} w={3} d={3} color="#2a1414" />
      <Trigger x0={-3} z0={-35} x1={3.4} z1={-29} enabled={faced} onEnter={confront} />
      <Door id="chamber" pos={[0.2, 0, -36]} axis="x" width={1.0} canOpen={() => (confronted ? true : 'Not yet.')} />

      {/* memory chamber */}
      <HouseLight id="mc1" group="chamber" pos={[0.2, 3.6, -41]} intensity={6} color="#ffe4c0" distance={14} fixture="none" />
      <HouseLight id="mc2" group="chamber" pos={[-3, 2.2, -44]} intensity={2} color="#ffd8a0" distance={8} fixture="none" />
      <MemoryFragments />
      <Embers center={[0.2, 0, -41]} spread={8} count={140} color="#ffe0b0" up={0.4} />
      {!inv.includes('final_tape') && <Cassette pos={[0.2, 1.01, -41]} color="#d6c39a" />}
      {inv.includes('final_tape') && <Recorder pos={[0.2, 1.0, -41]} />}
      <Interactable
        id="pedestal"
        at={[0.2, 1.1, -41]}
        prompt={() => (!inv.includes('final_tape') ? 'Take the last recording' : timelineDone ? 'Make the final decision' : null)}
        glint
        onInteract={pedestal}
      />
      <Interactable id="timeline" at={[0.2, 1.6, -45.8]} prompt={() => (timelineDone ? null : 'Remember the night, in order')} glint={inv.includes('final_tape') && !timelineDone} onInteract={timeline} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <B key={i} p={[-0.85 + i * 0.35, 1.6, -45.84]} s={[0.28, 0.4, 0.01]} m="paper" color={timelineDone ? '#e8dcc0' : '#9a9080'} shadow={false} />
      ))}
      <Table pos={[3.6, 0, -42]} w={0.6} d={0.9} h={0.8} m="memory" />
      <B p={[3.6, 0.88, -42]} s={[0.4, 0.14, 0.3]} m="metal" color="#3a3430" />
      <Interactable id="secret_deck" at={[3.6, 0.95, -42]} prompt={() => (secretDone ? null : 'A tape deck labelled "FOR KUYA"')} glint={endingProgress().secretReady && !secretDone} onInteract={secretDeck} />
      <Cyl p={[-3.4, 0.4, -44.6]} rt={0.2} rb={0.25} h={0.8} m="memory" />
      <Trigger
        x0={-4}
        z0={-46}
        x1={4.4}
        z1={-37}
        onEnter={async () => {
          if (!isObjectiveDone('confront')) return;
          play('hopeful', { vol: 0.25, cat: 'music', fadeIn: 4, loop: true });
        }}
      />
    </>
  );
}

