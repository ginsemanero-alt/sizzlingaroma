import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { Atmosphere, ChalkText, Dust, EmergencyLight, Fire, Sign, Smoke } from '@/components/Environment/Props';
import { Door, Pickup, Trigger } from '@/components/Interactions/WorldObjects';
import { Hotspot, Interactable } from '@/components/Interactions/Interactable';
import { GhostStudent, MemoryFigure } from '@/components/Characters/Ghosts';
import { STUDENT_LOOKS } from '@/components/Characters/Humanoid';
import { ChapterBase, useFlag, useFlagEffect, useHas, useScript } from '@/scenes/ChapterBase';
import { ROOM_2018, Room13Model, roomAt } from '@/scenes/shared/room13Sets';
import { DIALOGUE } from '@/data/dialogue';
import { ITEMS } from '@/data/items';
import { game } from '@/store/gameStore';
import { runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Horror } from '@/systems/HorrorEventSystem/HorrorEventSystem';
import { playRecording, type ScriptContext } from '@/systems/DialogueSystem/DialogueSystem';
import type { DialogueLine } from '@/types';

const D = DIALOGUE.c4;
/** Room 13 as it was in 2018 (classroom model), north of the hallway. */
const RS = ROOM_2018;
const R = roomAt(RS, 29, 2 - RS.half[1]);
/** Hallway-side face of the wall in front of Room 13. */
const H13 = 2.28;
const R13_CLEAR: [number, number, number, number][] = [[R.doorX - 0.9, R.southZ - 1.6, R.doorX + 0.9, R.southZ]];

interface SmokeZone { min: [number, number]; max: [number, number]; rate: number }
const SMOKE: SmokeZone[] = [
  { min: [2, -8], max: [12, -3.5], rate: 16 },
  { min: [16, 6], max: [22, 12], rate: 22 },
  { min: [12.5, 2], max: [23, 6], rate: 6 },
];

const FRAGMENTS: { id: string; pos: [number, number, number]; figure: [number, number, number]; yaw: number; lines: DialogueLine[] }[] = [
  {
    id: 'f1', pos: [9.5, 1.0, -2.8], figure: [9.5, 0, -3.4], yaw: 0,
    lines: [
      { s: 'daniel', en: 'Got it! My reviewer. Ma\'am Reyes will kill me if I fail chem.', fil: 'Nakuha ko na! Yung reviewer ko. Papatayin ako ni Ma\'am Reyes pag bumagsak ako sa chem.', lang: 'fil' },
      { s: 'alex', en: 'You\'ve been gone twenty minutes. I\'m the monitor — I have to bring you back.' },
    ],
  },
  {
    id: 'f2', pos: [13.5, 1.2, 4], figure: [13.5, 0, 4.6], yaw: Math.PI / 2,
    lines: [
      { s: 'daniel', en: 'Alex... the lab. Something\'s burning. Smell that?', fil: 'Alex... yung lab. May nasusunog. Naaamoy mo?', lang: 'fil' },
      { s: 'alex', en: 'The bell — why is the guard ringing the bell by hand?' },
    ],
  },
  {
    id: 'f3', pos: [19, 1.2, 5.2], figure: [19, 0, 5.6], yaw: Math.PI,
    lines: [
      { s: 'daniel', en: 'I can hear them! They\'re going east — to the emergency exit!', fil: 'Naririnig ko sila! Papunta sila sa silangan — sa emergency exit!', lang: 'fil' },
      { s: 'alex', en: 'Daniel, the stairs! Come with me, we can get out through the faculty window!' },
      { s: 'daniel', en: 'Go! I\'ll find them. Ma\'am needs to count everyone. GO!', fil: 'Sige na! Hahanapin ko sila. Kailangan ni Ma\'am bilangin lahat. SIGE NA!', lang: 'fil' },
    ],
  },
  {
    id: 'f4', pos: [28.9, 1.2, -5.2], figure: [28.93, 0, -7.2], yaw: Math.PI,
    lines: [
      { s: 'reyes', en: 'Aquino. Bautista. Flores. Garcia... where are Cruz and Mercado?', fil: 'Aquino. Bautista. Flores. Garcia... nasaan sina Cruz at Mercado?', lang: 'fil' },
      { s: 'reyes', en: 'Everyone, hold hands. We are not leaving anyone behind.', fil: 'Lahat, maghawak-kamay. Walang maiiwan.', lang: 'fil' },
    ],
  },
];

function buildLevel(): LevelBuilder {
  const b = new LevelBuilder();
  // hallway
  b.floor(0, 2, 44, 6, 'tile');
  b.ceil(0, 2, 44, 6);
  b.wall(0, 2, 0, 6, {});
  b.wall(44, 2, 44, 6, { openings: [{ at: 2, w: 1.6, h: 2.3 }] });
  b.wall(0, 2, R.min[0], 2, { openings: [{ at: 7, w: 1.1, h: 2.2 }, { at: 18, w: 1.1, h: 2.2 }] });
  b.wall(R.min[0], H13, R.max[0], H13, { openings: [{ at: R.doorX - R.min[0], w: RS.door.width, h: 2.2 }] });
  b.box((R.min[0] + R.max[0]) / 2, 1.6, 2.13, R.max[0] - R.min[0], 3.2, 0.05, 'black');
  b.wall(R.max[0], 2, 44, 2, {});
  b.wall(0, 6, 44, 6, { openings: [{ at: 19, w: 4, h: 2.8 }] });
  // science lab
  b.room(2, -8, 12, 2, { skip: ['s'], floor: 'tile', w: [{ at: 3, w: 1.6, h: 1.4, y: 1 }] });
  [[5, -1], [9, -1], [5, -4.5], [9, -4.5]].forEach(([x, z]) => { b.table(x, z, 2.4, 1.1, 0.9, 'charred'); b.chair(x - 0.6, z + 0.8, 0); });
  b.solid(6, 1.2, -7.6, 2.4, 2.4, 0.8, 'metal'); // fume hood
  b.box(6, 0.9, -7.15, 2.2, 0.05, 0.1, 'black');
  b.cabinet(11.5, -6.5, 1, 0.9, 1.9, 0.5);
  b.debris(7, -3, 6, 24, 'ash');
  // room 12
  b.room(14, -6.5, 22, 2, { skip: ['s'], floor: 'floorWood' });
  for (let i = 0; i < 6; i++) b.desk(15.8 + (i % 3) * 2.2, -3.4 + Math.floor(i / 3) * 1.6, 0, i % 2 === 0);
  b.blackboard(18, -6.37, 0, 3);
  // room 13
  // main stairs (blocked)
  b.room(16, 6, 22, 12, { skip: ['n'], floor: 'concrete' });
  b.stairs(19, 11.6, 0, 3, 8);
  b.solid(19, 0.6, 9.4, 3.5, 1.2, 0.9, 'charred');
  b.box(18.2, 1.4, 9.4, 2.6, 0.2, 0.3, 'charred', undefined, 0.4);
  b.table(17, 7.2, 1.0, 0.6, 0.78, 'darkwood'); // stair landing desk (guard log)
  // east hallway end + emergency exit
  b.lockers(39, 5.75, 0, 6);
  b.debris(30, 4, 12, 30, 'ash');
  b.debris(10, 4, 10, 20, 'ash');
  return b;
}

function SmokeBreath({ onFaint }: { onFaint: () => void }) {
  const coughTimer = useRef(0);
  const fainted = useRef(false);
  useFrame((_, dt) => {
    if (runtime.paused) return;
    const p = runtime.player;
    let rate = 0;
    for (const z of SMOKE) if (p.pos.x > z.min[0] && p.pos.x < z.max[0] && p.pos.z > z.min[1] && p.pos.z < z.max[1]) rate = Math.max(rate, z.rate);
    p.inSmoke = rate > 0;
    if (rate > 0) {
      p.breath -= (p.crouching ? rate * 0.22 : rate) * dt;
      coughTimer.current -= dt;
      if (coughTimer.current <= 0 && !p.crouching) { coughTimer.current = 2.5 + Math.random() * 2; AudioSystem.play('cough', { volume: 0.7 }); }
    } else p.breath += 14 * dt;
    p.breath = Math.max(0, Math.min(100, p.breath));
    if (p.breath <= 0 && !fainted.current) { fainted.current = true; onFaint(); }
  });
  return null;
}

export default function Chapter4() {
  const ctx = useScript();
  const builder = useMemo(buildLevel, []);
  const evac = useFlag('c4_evac');
  const maraHeard = useHas('mara_voice');
  const done = useFlag('c4_done');

  useEffect(() => {
    const t = window.setInterval(() => { if (!runtime.paused && !done) AudioSystem.play('bell', { volume: 0.35, pos: [19, 4, 14] }); }, 14000);
    return () => window.clearInterval(t);
  }, [done]);

  useFlagEffect('puzzle_evacuation', () => {
    game().setFlag('c4_evac', true);
    game().collect('evac_sequence', { open: true });
    ctx.run('evac', async (c) => { await c.wait(400); await c.say(D.evacSolved); game().saveCheckpoint('evac'); });
  });

  const remember = (f: (typeof FRAGMENTS)[number]) => {
    const key = `c4_${f.id}`;
    if (game().flags[key]) return;
    game().setFlag(key, true);
    const n = game().incFlag('c4_frag_count');
    AudioSystem.play('bass_hit', { volume: 0.4 });
    ctx.run(`frag_${f.id}`, async (c: ScriptContext) => {
      await c.say(f.lines);
      if (n >= 4) {
        game().setFlag('c4_fragments', true);
        game().collect('daniel_memory');
      }
      game().saveCheckpoint(`frag${n}`);
    });
  };

  return (
    <ChapterBase
      chapter={4}
      ctx={ctx}
      spawn={[1.6, 4]}
      yaw={-Math.PI / 2}
      ambience={[{ name: 'fire', volume: 1, pos: [6, 1, -6] }, { name: 'alarm', volume: 0.5 }, { name: 'tension', volume: 0.35 }, { name: 'roomtone', volume: 0.6 }]}
      events={['run', 'cry', 'knock', 'whisper', 'flicker']}
      eventsEnabled={!done}
      intro={async (c) => { await c.wait(400); await c.say(D.intro); }}
    >
      <Atmosphere fog="#24130c" density={0.07} ambient="#a0603a" ambientIntensity={0.3} hemi={['#6a3a20', '#120806']} hemiIntensity={0.35} moon={false} />
      <StaticLevel builder={builder} />
      <Dust color="#ffb070" count={260} size={0.03} />
      <SmokeBreath onFaint={() => game().caught('You collapsed in the smoke.')} />

      {/* fire & emergency lighting */}
      <Fire position={[6, 0.9, -7.0]} scale={1.4} />
      <Fire position={[4, 0.1, -6.2]} scale={0.7} light={false} />
      <Fire position={[11, 0.1, -2]} scale={0.6} />
      <Fire position={[19, 0.4, 9.0]} scale={1.2} />
      <Fire position={[14.5, 0.1, 3.0]} scale={0.5} light={false} />
      <EmergencyLight position={[3, 2.9, 2.2]} />
      <EmergencyLight position={[17, 2.9, 5.8]} />
      <EmergencyLight position={[30, 2.9, 2.2]} />
      <EmergencyLight position={[43.8, 2.7, 4]} intensity={4} />
      <Smoke center={[7, 0, -5.5]} size={[9, 3, 5]} density={30} color="#2b2522" opacity={0.6} />
      <Smoke center={[19, 0, 9]} size={[6, 3, 6]} density={30} color="#2b2522" opacity={0.7} />
      <Smoke center={[18, 1.4, 4]} size={[10, 1.8, 3.5]} density={22} color="#3a302a" opacity={0.35} />
      <Smoke center={[34, 2, 4]} size={[18, 1.2, 3.5]} density={16} color="#3a302a" opacity={0.3} />

      <Door id="lab" position={[7, 0, 2]} axis="x" startOpen />
      <Door id="r12" position={[18, 0, 2]} axis="x" startOpen />
      <Door id="r13" position={[R.doorX, 0, H13]} axis="x" width={RS.door.width} startOpen />
      <Room13Model room={R} tint="#c09070" hideExtra={/godray/} clearExtra={R13_CLEAR} />
      <pointLight position={R.p([0, 0], 2.6)} color="#ff7a3a" intensity={3} distance={10} />
      <Door id="exit" position={[44, 0, 4]} axis="z" width={1.6} height={2.3} metal double color="#7a1e1a" locked lockedText="" noInteract />

      <Sign position={[7, 2.45, 2.12]} rotation={[0, Math.PI, 0]} size={[1.3, 0.2]} lines={['SCIENCE LAB']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[R.doorX, 2.45, H13 + 0.12]} rotation={[0, 0, 0]} size={[0.8, 0.2]} lines={['ROOM 13']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[43.88, 2.6, 4]} rotation={[0, -Math.PI / 2, 0]} size={[1.8, 0.3]} lines={['EMERGENCY EXIT']} bg="#1d6a2a" color="#e8ffe8" emissive={0.6} />
      <Sign position={[19, 2.5, 5.88]} rotation={[0, Math.PI, 0]} size={[2.2, 0.3]} lines={['MAIN STAIRS ↓']} bg="#2b3a2b" color="#ddd" />
      <ChalkText position={R.boardFront(1.55)} rotation={[0, R.boardRotY, 0]} size={[RS.boardWidth, 1.0]} lines={evac ? ['13 → STAIRS ✗ → EAST HALL → EXIT'] : ['EVACUATION: ?', 'BILANGIN ANG LAHAT (COUNT EVERYONE)']} />

      {/* memory fragments */}
      {FRAGMENTS.map((f) => (
        <Fragment key={f.id} f={f} onRemember={() => remember(f)} />
      ))}

      {/* fire source */}
      <Pickup item="extension_cord" position={[6.6, 0.02, -6.9]} verb="Examine" onCollect={() => {
        game().setFlag('c4_source', true);
        ctx.run('source', async (c) => { await c.wait(300); await c.say(D.source); game().saveCheckpoint('source'); });
      }} />

      {/* stair landing */}
      <Pickup item="guard_log" position={[17, 0.8, 7.2]} verb="Read" />
      <Trigger id="c4_stairs" min={[16, 6]} max={[22, 8]} onEnter={() => ctx.run('stairs', (c) => c.say(D.stairsBlocked))} />

      {/* Room 12: the unrecorded voice */}
      <Interactable id="mara_voice" position={[20.6, 1.0, -5.0]} radius={0.4} prompt={maraHeard ? null : 'Listen... someone is crying'} onInteract={() => {
        game().collect('mara_voice');
        ctx.run('mara', (c) => playRecording(c, ITEMS.mara_voice.recording!));
      }}>
        <mesh><sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color="#8fa6ff" emissive="#6f86ff" emissiveIntensity={0.8} transparent opacity={0.5} /></mesh>
      </Interactable>

      {/* Room 13 evacuation board */}
      <Hotspot id="evac_board" position={R.boardFront(1.5)} size={[3.5, 1.2, 0.4]} prompt={evac ? null : 'Reconstruct the evacuation'} onInteract={() => game().openPuzzle('evacuation')} />
      <Trigger id="c4_voices" min={R.min} max={[R.max[0], R.southZ - 1.0]} onEnter={() => ctx.run('voices', async (c) => {
        AudioSystem.play('whisper', { pos: [40, 1.5, 4], volume: 1 });
        await c.say(D.voices);
      })} />

      {/* the class at the exit after the evacuation is reconstructed */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <GhostStudent key={i} position={[38 + (i % 6) * 0.9, 0, 3.2 + Math.floor(i / 6) * 1.4]} rotationY={-Math.PI / 2} pose="stand" look={i % 2 ? STUDENT_LOOKS.girl : STUDENT_LOOKS.boy} visible={evac && !done} vanishDistance={2.5} color="#ffb98a" />
      ))}
      <MemoryFigure position={[43, 0, 4]} rotationY={Math.PI / 2} visible={evac && !done} pose="book" color="#ffcf9a" model="teacher" />

      {/* the chained exit */}
      <Interactable id="chain" position={[43.75, 1.1, 4]} radius={0.5} prompt={done ? null : 'Examine the chained exit'} onInteract={() => {
        if (!game().flags.c4_evac || !game().flags.c4_source || !game().flags.c4_fragments) {
          ctx.run('notyet', (c) => c.line('alex', 'Not yet. I don\'t remember enough of that night... the lab, the fragments, the blackboard.'));
          return;
        }
        AudioSystem.play('chain', { pos: [43.8, 1.1, 4] });
        game().collect('chained_exit', { open: true });
        ctx.run('chained', async (c) => {
          await c.wait(500);
          await c.say(D.chained);
          Horror.flicker(2, 0.9);
          AudioSystem.play('stinger');
          await c.wait(1200);
          await c.fade(1, 2500);
          game().setFlag('c4_done', true);
          game().completeChapter();
        });
      }}>
        <group rotation={[0, 0, 0]}>
          {[0.3, 0.55, 0.8].map((y) => (
            <mesh key={y} position={[0, y - 0.55, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.25, 0.015, 6, 20]} /><meshStandardMaterial color="#6a6560" metalness={0.8} roughness={0.5} /></mesh>
          ))}
          <mesh position={[-0.05, -0.2, 0.1]}><boxGeometry args={[0.06, 0.09, 0.07]} /><meshStandardMaterial color="#b8923a" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      </Interactable>
    </ChapterBase>
  );
}

function Fragment({ f, onRemember }: { f: (typeof FRAGMENTS)[number]; onRemember: () => void }) {
  const seen = useFlag(`c4_${f.id}`);
  const ref = useRef<import('three').Mesh>(null);
  useFrame(() => {
    if (ref.current) { ref.current.position.y = f.pos[1] + Math.sin(runtime.time * 2 + f.pos[0]) * 0.08; ref.current.rotation.y += 0.02; }
  });
  return (
    <>
      {!seen && (
        <Interactable id={`frag_${f.id}`} position={[f.pos[0], 0, f.pos[2]]} radius={0.4} range={2.6} prompt="Remember" onInteract={onRemember}>
          <mesh ref={ref} position={[0, f.pos[1], 0]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffb060" emissiveIntensity={2.5} />
          </mesh>
          <pointLight position={[0, f.pos[1], 0]} intensity={1.6} distance={3} color="#ffc070" />
        </Interactable>
      )}
      <MemoryFigure position={f.figure} rotationY={f.yaw} visible={!seen} pose={f.id === 'f1' ? 'reach' : f.id === 'f3' ? 'point' : f.id === 'f4' ? 'book' : 'stand'} color={f.id === 'f4' ? '#ff9f9f' : '#ffd29a'} model={f.id === 'f4' ? 'teacher' : 'boy_rigged'} />
    </>
  );
}
