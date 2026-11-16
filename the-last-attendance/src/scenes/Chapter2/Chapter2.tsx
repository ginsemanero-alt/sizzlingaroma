import { Suspense, useMemo, useState } from 'react';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { PropModel } from '@/components/Environment/PropModel';
import { GlbCabinet, GlbLockers } from '@/scenes/shared/props';
import { Atmosphere, ChalkText, Clock, Dust, EmergencyLight, FluoroLight, Sign } from '@/components/Environment/Props';
import { BatteryPickup, Door, HidingSpot, MovingChair, Pickup, Trigger } from '@/components/Interactions/WorldObjects';
import { Hotspot, Interactable } from '@/components/Interactions/Interactable';
import { Teacher } from '@/components/Enemies/Teacher';
import { GhostGirl, GhostStudent } from '@/components/Characters/Ghosts';
import { STUDENT_LOOKS } from '@/components/Characters/Humanoid';
import { ChapterBase, useFlag, useFlagEffect, useHas, useScript } from '@/scenes/ChapterBase';
import { addClassroom } from '@/scenes/shared/schoolParts';
import { DIALOGUE } from '@/data/dialogue';
import { game, useGame } from '@/store/gameStore';
import { bus } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Horror } from '@/systems/HorrorEventSystem/HorrorEventSystem';
import { teacherControl, type TeacherConfig } from '@/systems/EnemyAISystem/TeacherBrain';

const D = DIALOGUE.c2;
const BELONGINGS = ['hannah_ribbon', 'carlo_jersey', 'katrina_glasses', 'joshua_pick'];

/** One long table with its seats, cut out of the cafeteria model (metres from the model's centre). */
const CANTEEN_TABLE: [number, number, number, number] = [0.8, -4.6, 3.0, 1.4];
const TABLE_TOP = 0.76;

const TEACHER_CFG: TeacherConfig = {
  bounds: [-1, -12, 41, 13],
  waypoints: [[36, 0], [24, 7], [9, 5], [6, 0], [26, -6], [20, 0], [27, 9]],
  patrolSpeed: 1.25,
  chaseSpeed: 3.1,
  sight: 12,
};

/** Locker number → item it contains (null = empty/stuck). */
const LOCKERS: { n: number; x: number; z: number; item: string | null; name: string }[] = [
  { n: 1, x: 7.3, z: 7.75, item: null, name: 'AQUINO, M.' },
  { n: 2, x: 7.75, z: 7.75, item: null, name: 'BAUTISTA, A.' },
  { n: 3, x: 8.2, z: 7.75, item: null, name: 'CRUZ, D.' },
  { n: 4, x: 8.65, z: 7.75, item: 'katrina_glasses', name: 'FLORES, K.' },
  { n: 5, x: 9.1, z: 7.75, item: null, name: 'GARCIA, N.' },
  { n: 6, x: 9.55, z: 7.75, item: null, name: 'ILAGAN, R.' },
  { n: 7, x: 10.0, z: 7.75, item: 'hannah_ribbon', name: 'LIM, H.' },
  { n: 8, x: 10.45, z: 7.75, item: null, name: 'SEMANERO, J.' },
  { n: 9, x: 10.9, z: 7.75, item: 'joshua_pick', name: 'RAMOS, J.' },
  { n: 10, x: 5.95, z: 2.25, item: null, name: 'NAVARRO, P.' },
  { n: 11, x: 6.4, z: 2.25, item: 'carlo_jersey', name: 'MENDOZA, C.' },
  { n: 12, x: 6.85, z: 2.25, item: null, name: 'SANTOS, E.' },
];

function buildLevel(): LevelBuilder {
  const b = new LevelBuilder();
  // corridor
  b.floor(0, -2, 40, 2, 'tile');
  b.ceil(0, -2, 40, 2);
  b.wall(0, -2, 0, 2, { openings: [{ at: 2, w: 2.4, h: 2.4 }] });
  b.wall(40, -2, 40, 2, { openings: [{ at: 2, w: 1.4, h: 2.2 }] });
  b.wall(0, -2, 40, -2, { openings: [{ at: 9, w: 1.1, h: 2.2 }, { at: 26, w: 1.1, h: 2.2 }] });
  b.wall(0, 2, 40, 2, { openings: [{ at: 9, w: 6, h: 2.6 }, { at: 24, w: 4, h: 2.6 }] });
  // locker hall (south, open to the corridor)
  b.room(4, 2, 14, 8, { skip: ['n'] });
  b.lockers(9.1, 7.75, 0, 9, false);
  b.lockers(6.4, 2.25, 2, 3, false);
  b.lockers(12.6, 2.25, 2, 3, false);
  b.cabinet(13.6, 5, 1, 1.2, 2.0, 0.6, 'locker');
  b.debris(9, 5, 5, 16);
  b.bench(9, 5);
  // canteen (south)
  b.room(18, 2, 32, 13, { skip: ['n'], floor: 'tile' });
  b.solid(30.6, 0.55, 7.5, 0.6, 1.1, 8, 'wood', false); // counter
  b.box(31.6, 1.1, 7.5, 0.6, 2.2, 8, 'metal');
  // canteen tables: two table sets taken from the cafeteria model (see CANTEEN_TABLE)
  b.desk(27.5, 11.5, 1, true);
  // faculty room (north)
  b.room(4, -10, 14, -2, { skip: ['s'], floor: 'floorWood', w: [{ at: 4, w: 1.6, h: 1.3, y: 1.0 }] });
  b.table(7, -5, 2.4, 1.1, 0.75, 'darkwood');
  b.table(11, -5, 2.4, 1.1, 0.75, 'darkwood');
  b.chair(7, -4.2, 2); b.chair(11, -4.2, 2); b.chair(6.4, -5.8, 0);
  b.cabinet(13.6, -8, 1, 0.9, 1.9, 0.5, 'metal', false);
  b.cabinet(4.4, -8.6, 3, 0.9, 1.9, 0.5, 'metal', false);
  b.cabinet(12.5, -9.6, 2, 0.9, 1.4, 0.5, 'metal', false);
  b.box(9, 1.6, -9.88, 3, 1.4, 0.06, 'darkwood'); // photo cork board
  // Room 9 — Sampaguita homeroom (north)
  addClassroom(b, 20, -11, 32, -2, { skip: ['s'], cols: 3, rows: 2, e: [{ at: 2.5, w: 1.6, h: 1.4, y: 1.0 }, { at: 6, w: 1.6, h: 1.4, y: 1.0 }] });
  b.box(20.15, 1.6, -5, 0.05, 1.2, 2.2, 'darkwood'); // seating chart board
  b.cabinet(20.45, -3.0, 3, 0.9, 1.9, 0.5);
  // corridor dressing
  b.lockers(16, -1.75, 2, 4, false);
  b.lockers(34, -1.75, 2, 4, false);
  b.debris(20, 0, 10, 14);
  b.desk(36.5, 1.2, 0, true);
  return b;
}

export default function Chapter2() {
  const ctx = useScript();
  const builder = useMemo(buildLevel, []);
  const collected = useGame((s) => s.collected);
  const photos = useFlag('c2_photos');
  const identified = useFlag('c2_identified');
  const seating = useFlag('c2_seating');
  const hunting = useFlag('c2_hunt');
  const hasNotes = useHas('seating_notes');
  const [ghosts, setGhosts] = useState(false);
  const belongings = BELONGINGS.filter((i) => collected.includes(i)).length;

  const onBelonging = () => {
    const n = BELONGINGS.filter((i) => game().has(i)).length;
    if (n === BELONGINGS.length && !game().flags.c2_belongings) {
      game().setFlag('c2_belongings', true);
      ctx.run('lockers', async (c) => { await c.wait(1200); await c.say(D.lockers); game().saveCheckpoint('belongings'); });
    }
  };

  useFlagEffect('puzzle_photo_match', () => {
    game().setFlag('c2_identified', true);
    game().collect('class_photo', { open: true });
    ctx.run('identified', async (c) => {
      await c.wait(600);
      await c.say(D.identified);
      // Ms. Reyes at the end of the hallway
      teacherControl.brain?.appear(38.6, 0, 9);
      AudioSystem.play('bass_hit', { volume: 0.5 });
      Horror.flicker(1.5, 0.8);
      await c.wait(1500);
      await c.say(D.teacherHall);
      await c.wait(5000);
      teacherControl.brain?.vanish();
      game().setFlag('c2_hunt', true);
      await c.say(D.teacherWarn);
      game().saveCheckpoint('identified');
    });
  });

  useFlagEffect('puzzle_seating', () => {
    game().setFlag('c2_seating', true);
    AudioSystem.play('locker', { pos: [29, 0.6, -6.35] });
    ctx.run('seating', async (c) => {
      await c.say(D.seatingSolved);
      game().saveCheckpoint('seating');
    });
  });

  return (
    <ChapterBase
      chapter={2}
      ctx={ctx}
      spawn={[1.5, 0]}
      yaw={-Math.PI / 2}
      ambience={[{ name: 'roomtone', volume: 1 }, { name: 'rain', volume: 0.35 }, { name: 'buzz', volume: 0.4, pos: [20, 3, 0] }]}
      events={['footsteps', 'whisper', 'knock', 'creak', 'flicker', 'cry', 'run', 'thunder']}
      intro={async (c) => { await c.wait(500); await c.say(D.intro); }}
    >
      <Atmosphere fog="#0a0f1a" density={0.06} ambientIntensity={0.3} hemiIntensity={0.3} />
      <StaticLevel builder={builder} />
      <Suspense fallback={null}>
        {[5.2, 9.6].map((z) => (
          <PropModel key={z} model="env_cafeteria" onlyBox={CANTEEN_TABLE} position={[23.4, 0, z]} rotationY={Math.PI / 2} tint="#8a8070" collide="low" />
        ))}
      </Suspense>
      <GlbLockers x={9.1} z={7.75} r={0} count={9} />
      <GlbLockers x={6.4} z={2.25} r={2} count={3} />
      <GlbLockers x={12.6} z={2.25} r={2} count={3} />
      <GlbLockers x={16} z={-1.75} r={2} count={4} />
      <GlbLockers x={34} z={-1.75} r={2} count={4} />
      <GlbCabinet x={13.6} z={-8} r={1} />
      <GlbCabinet x={4.4} z={-8.6} r={3} />
      <GlbCabinet x={12.5} z={-9.6} r={2} h={1.4} />
      <Dust />

      {/* lights */}
      <FluoroLight position={[5, 3.18, 0]} flicker="subtle" />
      <FluoroLight position={[16, 3.18, 0]} flicker="broken" />
      <FluoroLight position={[30, 3.18, 0]} flicker="subtle" />
      <FluoroLight position={[9, 3.18, 5]} flicker="broken" />
      <FluoroLight position={[25, 3.18, 7]} flicker="subtle" color="#fff1d0" />
      <FluoroLight position={[9, 3.18, -6]} flicker="subtle" />
      <FluoroLight position={[26, 3.18, -6.5]} flicker="broken" intensity={5} />
      <EmergencyLight position={[39.8, 2.6, 0]} intensity={1.4} />

      {/* doors */}
      <Door id="faculty" position={[9, 0, -2]} axis="x" startOpen />
      <Door id="room9" position={[26, 0, -2]} axis="x" />
      <Door
        id="records" position={[40, 0, 0]} axis="z" width={1.4} metal color="#4d5a5e" locked
        lockedText={collected.includes('records_key') ? 'Unlock the records wing' : 'Records wing — locked'}
        onLockedTry={() => {
          if (!game().has('records_key')) return;
          AudioSystem.play('chain');
          game().setFlag('c2_done', true);
          ctx.run('exit', async (c) => { await c.say(D.exit); game().completeChapter(); });
        }}
      />

      {/* signs */}
      <Sign position={[9, 2.45, -1.88]} size={[1.2, 0.2]} lines={['FACULTY ROOM']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[26, 2.45, -1.88]} size={[1.6, 0.2]} lines={['ROOM 9 — SAMPAGUITA']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[24, 2.8, 1.88]} rotation={[0, Math.PI, 0]} size={[1.4, 0.3]} lines={['CANTEEN']} bg="#7a3a1a" color="#f2e2c0" />
      <Sign position={[39.88, 2.55, 0]} rotation={[0, -Math.PI / 2, 0]} size={[1.6, 0.25]} lines={['RECORDS WING']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[9, 1.6, -9.84]} size={[2.9, 1.3]} lines={photos ? (identified ? ['SAMPAGUITA 2018', 'LIM · MENDOZA · FLORES · RAMOS'] : ['?   ?   ?   ?']) : ['FACULTY & STUDENTS', '2017–2018']} bg="#8a6a46" color="#1e140c" />
      <Sign position={[20.2, 1.6, -5]} rotation={[0, Math.PI / 2, 0]} size={[2.1, 1.1]} lines={seating ? ['K  H  A', 'J  C  D'] : ['SEATING PLAN', '_  _  _', '_  _  _']} bg="#d8cfb2" />
      <Sign position={[31.25, 1.8, 7.5]} rotation={[0, -Math.PI / 2, 0]} size={[2.6, 0.5]} lines={['PANCIT · TUROn · JUICE']} bg="#d9c08a" />
      <ChalkText position={[26, 1.65, -10.83]} lines={['JASMINE = MONITOR', 'DON\'T FORGET: EVENING REVIEW FRI']} />
      <Clock position={[13.88, 2.5, -5]} rotation={[0, -Math.PI / 2, 0]} />
      <Clock position={[31.88, 2.5, -4]} rotation={[0, -Math.PI / 2, 0]} />

      {/* lockers */}
      {LOCKERS.map((l) => (
        <Locker key={l.n} {...l} onItem={onBelonging} />
      ))}

      {/* faculty room */}
      <Hotspot
        id="photo_board" position={[9, 1.6, -9.6]} size={[2.8, 1.3, 0.3]}
        prompt={identified ? null : photos ? 'Match the photographs' : 'Look at the photo board'}
        onInteract={() => {
          if (!photos) {
            game().setFlag('c2_photos', true);
            AudioSystem.play('paper');
            ctx.run('photos', (c) => c.say(D.photos));
            return;
          }
          game().openPuzzle('photo_match');
        }}
      />
      <Pickup item="seating_notes" position={[11.3, 0.78, -5.1]} verb="Read" />
      <Interactable id="memo_cabinet" position={[13.3, 1.0, -8]} radius={0.5} prompt={collected.includes('reyes_memo_1') ? null : 'Search the cabinet marked "UNANSWERED"'} onInteract={() => { AudioSystem.play('locker'); game().collect('reyes_memo_1', { open: true }); }}>
        <mesh><boxGeometry args={[0.1, 0.3, 0.6]} /><meshBasicMaterial visible={false} /></mesh>
      </Interactable>
      <BatteryPickup id="c2_fac" position={[6.6, 0.78, -5.2]} />
      <HidingSpot id="fac_desk" position={[7, 0.4, -5.6]} view={[7, 0.55, -5.0]} exit={[8.6, 0, -3.6]} yaw={0} label="Hide under the table" />

      {/* canteen */}
      <Pickup item="mara_canteen" position={[30.9, 0.35, 9.6]} verb="Take" />
      <BatteryPickup id="c2_cant" position={[25, TABLE_TOP, 9.6]} />
      <MusicBox />
      <HidingSpot id="counter" position={[30.0, 0.5, 4.5]} view={[31.1, 0.75, 4.6]} exit={[29.6, 0, 4.6]} yaw={Math.PI / 2} label="Hide behind the counter" />
      <GhostGirl id="c2" position={[28.8, 0, 11.3]} rotationY={-Math.PI / 2 - 0.6} enabled={belongings >= 2} />

      {/* Room 9 */}
      <Hotspot id="seating_chart" position={[20.4, 1.6, -5]} size={[0.3, 1.1, 2.1]} prompt={seating ? null : hasNotes ? 'Fill in the seating plan' : 'Look at the seating plan'} onInteract={() => game().openPuzzle('seating')} />
      <Pickup item="daniel_diary" position={[29.1, 0.74, -6.6]} hidden={!seating} verb="Take" />
      <Pickup item="records_key" position={[28.9, 0.45, -6.2]} hidden={!seating} verb="Take" onCollect={() => game().notify('The records wing door is at the east end of the corridor.', 'info')} />
      <HidingSpot id="r9_desk" position={[23, 0.4, -7.8]} view={[23, 0.55, -7.6]} exit={[23, 0, -8.8]} yaw={0} label="Hide under the desk" />
      <HidingSpot id="r9_cab" position={[20.75, 1.0, -3.0]} view={[20.45, 1.2, -3.0]} exit={[21.3, 0, -3.0]} yaw={-Math.PI / 2} label="Hide in the cabinet" />
      <MovingChair id="r9a" position={[24, 0, -3.2]} to={[23.2, 0, -3.8]} />
      <MovingChair id="r9b" position={[30.5, 0, -9.5]} to={[29.5, 0, -8.9]} rotY={1} />
      {[[23, -7.8], [26, -7.8], [29, -7.8], [23, -6.35], [26, -6.35], [29, -6.35]].map(([x, z], i) => (
        <GhostStudent key={i} position={[x, 0, z + 0.15]} look={i === 1 ? { ...STUDENT_LOOKS.girl, hairStyle: 'ribbon' } : i === 0 ? { ...STUDENT_LOOKS.girl, accessory: 'glasses' } : i === 4 ? { ...STUDENT_LOOKS.boy, accessory: 'jersey' } : STUDENT_LOOKS.boy} visible={ghosts && i !== 2} vanishDistance={2} />
      ))}

      {/* corridor hiding */}
      <HidingSpot id="locker_cab" position={[13.2, 1.0, 5]} view={[13.6, 1.2, 5]} exit={[12.5, 0, 5]} yaw={Math.PI / 2} label="Hide in the supply cabinet" />

      {/* triggers & events */}
      <Trigger id="c2_whisper" min={[4, 2]} max={[14, 8]} onEnter={() => ctx.run('whisper', async (c) => {
        await c.wait(1500);
        Horror.around('whisper', 1.5, 1);
        await c.say(D.whisper);
      })} />
      <Trigger id="c2_ghosts" min={[20.5, -10.5]} max={[31.5, -2.5]} onEnter={() => ctx.run('ghosts', async (c) => {
        setGhosts(true);
        AudioSystem.play('stinger', { volume: 0.5 });
        await c.wait(700);
        await c.say(D.ghosts);
        bus.emit('chair:r9a');
        await c.wait(2200);
        bus.emit('chair:r9b');
        await c.wait(3000);
        setGhosts(false);
      })} />

      <Teacher config={TEACHER_CFG} mode={hunting && !seating ? 'hunter' : 'stalker'} />
    </ChapterBase>
  );
}

function Locker({ n, x, z, item, name, onItem }: { n: number; x: number; z: number; item: string | null; name: string; onItem: () => void }) {
  const opened = useFlag(`locker_${n}`);
  const facing = z > 5 ? -1 : 1; // north bank faces -z, south bank faces +z
  return (
    <>
      <Sign position={[x, 1.75, z + facing * 0.27]} rotation={[0, facing > 0 ? 0 : Math.PI, 0]} size={[0.38, 0.12]} lines={[`${String(n).padStart(2, '0')} ${name}`]} bg="#c8c3b0" fontSize={44} />
      {opened && (
        <mesh position={[x - 0.1, 0.95, z + facing * 0.45]} rotation={[0, facing * 1.2, 0]}>
          <boxGeometry args={[0.42, 1.86, 0.03]} />
          <meshStandardMaterial color="#4d6e7a" metalness={0.4} roughness={0.5} />
        </mesh>
      )}
      <Interactable
        id={`locker_${n}`}
        position={[x, 1.1, z + facing * 0.3]}
        radius={0.25}
        prompt={opened ? null : `Open locker ${String(n).padStart(2, '0')}`}
        onInteract={() => {
          game().setFlag(`locker_${n}`, true);
          AudioSystem.play('locker', { pos: [x, 1, z] });
          if (item) { game().collect(item, { open: true }); onItem(); }
          else game().notify(n === 3 ? 'Empty — except "D.C. + A.M. = BEST FRIENDS" scratched into the metal.' : n === 8 ? 'Your locker. Empty. Masking tape over the name: "TRANSFERRED".' : 'Empty. Cleaned out years ago.', 'info');
        }}
      >
        <mesh userData={{ noHighlight: true }}><boxGeometry args={[0.3, 0.6, 0.1]} /><meshBasicMaterial visible={false} /></mesh>
      </Interactable>
    </>
  );
}

function MusicBox() {
  const played = useFlag('c2_musicbox');
  return (
    <>
      <mesh position={[21.6, TABLE_TOP + 0.06, 5.2]}><boxGeometry args={[0.22, 0.12, 0.16]} /><meshStandardMaterial color="#6a3a2a" /></mesh>
      <Trigger id="c2_musicbox" min={[18.5, 2.5]} max={[27, 12.5]} onEnter={() => {
        game().setFlag('c2_musicbox', true);
        AudioSystem.play('musicbox', { pos: [21.6, 0.9, 5.2], ref: 3 });
      }} />
      {played && null}
    </>
  );
}
