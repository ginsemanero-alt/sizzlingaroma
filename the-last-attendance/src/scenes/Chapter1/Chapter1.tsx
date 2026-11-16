import { Suspense, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { PropModel } from '@/components/Environment/PropModel';
import { GlbCabinet } from '@/scenes/shared/props';
import { Atmosphere, ChalkText, Clock, Dust, EmergencyLight, FluoroLight, Rain, Sign, Sky } from '@/components/Environment/Props';
import { BatteryPickup, Door, Pickup, Trigger } from '@/components/Interactions/WorldObjects';
import { Hotspot } from '@/components/Interactions/Interactable';
import { Teacher } from '@/components/Enemies/Teacher';
import { GhostGirl } from '@/components/Characters/Ghosts';
import { ChapterBase, useFlag, useFlagEffect, useScript } from '@/scenes/ChapterBase';
import { addClassroom } from '@/scenes/shared/schoolParts';
import { ROOM_ABANDONED, Room13Model, roomAt } from '@/scenes/shared/room13Sets';
import { DIALOGUE } from '@/data/dialogue';
import { ROLL_CALL } from '@/data/characters';
import { game, useGame } from '@/store/gameStore';
import { bus, runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Horror } from '@/systems/HorrorEventSystem/HorrorEventSystem';
import { teacherControl, type TeacherConfig } from '@/systems/EnemyAISystem/TeacherBrain';
import type { ScriptContext } from '@/systems/DialogueSystem/DialogueSystem';

const D = DIALOGUE.c1;
/** Room 13 is the abandoned-classroom model, north of the hallway; its door opens onto z = -3.5. */
const R = roomAt(ROOM_ABANDONED, 9.42, -3.5 - ROOM_ABANDONED.half[0]);
const RS = ROOM_ABANDONED;
/** Hallway-side face of the wall in front of Room 13. */
const H13 = -3.22;
const R13_CLEAR: [number, number, number, number][] = [[4.9, -5.45, 6.7, -3.4]];

const TEACHER_CFG: TeacherConfig = { bounds: [-22, -14, 22, 8], waypoints: [[9, -9], [0, -1.7]] };

function buildLevel(): LevelBuilder {
  const b = new LevelBuilder();
  // ── exterior ──
  b.floor(-24, 6, 24, 46, 'concrete');
  b.box(0, -0.05, 41, 48, 0.1, 6, 'ash');
  b.wall(-22, 6.2, -22, 36, { h: 2.4, lower: null, upper: 'concrete', t: 0.3 });
  b.wall(22, 6.2, 22, 36, { h: 2.4, lower: null, upper: 'concrete', t: 0.3 });
  b.wall(-22, 36, 22, 36, { h: 2.4, lower: null, upper: 'concrete', t: 0.3, openings: [{ at: 22, w: 3.2, h: 2.4 }] });
  b.block(-24, 44, 24, 45); b.block(-24, 36, -23, 45); b.block(23, 36, 24, 45); // street limits
  b.box(-1.75, 1.4, 36, 0.3, 2.8, 0.4, 'concrete'); b.box(1.75, 1.4, 36, 0.3, 2.8, 0.4, 'concrete');
  b.box(0, 2.9, 36, 3.8, 0.25, 0.3, 'rust');
  // facade (two storeys) with the main entrance
  b.wall(-22, 6, 22, 6, { h: 7, t: 0.3, openings: [{ at: 22, w: 2.4, h: 2.6 }, { at: 8, w: 1.8, h: 1.3, y: 1.1 }, { at: 14, w: 1.8, h: 1.3, y: 1.1 }, { at: 30, w: 1.8, h: 1.3, y: 1.1 }, { at: 36, w: 1.8, h: 1.3, y: 1.1 }] });
  for (let i = 0; i < 8; i++) { const x = -18 + i * 5.2; b.box(x, 4.6, 6.17, 1.8, 1.3, 0.05, 'glass'); b.box(x, 3.9, 6.25, 2.0, 0.08, 0.2, 'trim'); }
  b.box(0, 7.1, 0, 44.6, 0.3, 12.6, 'concrete'); // roof slab
  b.box(0, 3.4, 6.35, 44, 0.15, 0.4, 'concrete'); // ledge
  b.box(-22.05, 3.6, 0, 0.3, 7.2, 12, 'plaster'); b.box(22.05, 3.6, 0, 0.3, 7.2, 12, 'plaster');
  // courtyard props
  b.block(-8.1, 19.9, -7.9, 20.1); // flagpole (model)
  b.solid(-8, 0.25, 20, 1.2, 0.5, 1.2, 'concrete');
  b.solid(10, 1.6, 22, 0.5, 3.2, 0.5, 'darkwood'); // tree trunk
  [[10, 4.2, 22, 2.6], [9, 3.6, 21, 1.8], [11.2, 3.8, 23, 2]].forEach(([x, y, z, s]) => b.box(x, y, z, s, s * 0.8, s, 'grass'));
  b.solid(-14, 0.3, 14, 2.4, 0.08, 0.5, 'wood'); b.box(-15, 0.15, 14, 0.1, 0.3, 0.4, 'metal'); b.box(-13, 0.15, 14, 0.1, 0.3, 0.4, 'metal');
  b.solid(14, 0.3, 12, 2.4, 0.08, 0.5, 'wood');
  b.solid(-4, 0.35, 10, 4, 0.7, 1, 'concrete'); b.box(-4, 0.72, 10, 3.8, 0.05, 0.8, 'grass');
  b.solid(4, 0.35, 10, 4, 0.7, 1, 'concrete'); b.box(4, 0.72, 10, 3.8, 0.05, 0.8, 'grass');
  b.debris(3, 26, 6, 18, 'ash');

  // ── interior ──
  // lobby
  b.floor(-4, 0, 4, 6, 'tile');
  b.ceil(-4, 0, 4, 6);
  b.wall(-4, 0, -4, 6, {});
  b.wall(4, 0, 4, 6, {});
  // main hallway
  b.floor(-20, -3.5, 20, 0, 'tile');
  b.ceil(-20, -3.5, 20, 0);
  b.wall(-20, 0, -4, 0, { openings: [{ at: 6, w: 1.1, h: 2.2 }] });
  b.wall(4, 0, 20, 0, { openings: [{ at: 7, w: 1.1, h: 2.2 }] });
  b.wall(-20, -3.5, -20, 0, {});
  b.wall(20, -3.5, 20, 0, { openings: [{ at: 1.75, w: 2.4, h: 2.4 }] });
  // north side of the hallway: guard station, Room 12, utility, Room 13
  // north hallway wall; the stretch in front of Room 13 sits just outside the model's own wall
  b.wall(-20, -3.5, R.min[0], -3.5, { openings: [{ at: 5, w: 1.1, h: 2.2 }, { at: 17, w: 1.1, h: 2.2 }] });
  b.wall(R.min[0], H13, R.max[0], H13, { openings: [{ at: R.doorX - R.min[0], w: RS.door.width, h: 2.2 }] });
  b.wall(R.max[0], -3.5, 20, -3.5, {});
  b.box((R.min[0] + R.max[0]) / 2, 1.6, (H13 - 3.5) / 2 - 0.1, R.max[0] - R.min[0], 3.2, 0.05, 'black'); // hides the gap behind the model
  b.room(-20, -10, -12, -3.5, { skip: ['s'], floor: 'concrete' });
  addClassroom(b, -12, -12, -1, -3.5, { skip: ['s'], toppled: [5, 9] });
  b.solid(1.5, 1.6, -7.75, 5, 3.2, 8.5, 'plaster'); // sealed utility block
  b.solid(17.5, 1.6, -7.75, 5, 3.2, 8.5, 'plaster');
  // west stairs going up (sealed)
  b.block(-19.75, -3.4, -18.05, -0.15, 0, 3, false); // west stairs (model)
  // guard station furniture
  b.table(-17.5, -8.6, 1.6, 0.8);
  b.chair(-17.5, -7.9, 2);
  b.cabinet(-13, -9.4, 2, 0.9, 1.9, 0.5, 'metal', false);
  b.lockers(-13, -5.5, 3, 3);
  // hallway dressing
  b.lockers(-9, -0.25, 0, 6);
  b.lockers(9, -0.25, 0, 5);
  b.debris(-6, -1.8, 6, 12);
  b.debris(12, -1.5, 6, 10);
  b.desk(16, -2.6, 0, true);
  b.chair(-14, -1.2, 1);
  return b;
}

export default function Chapter1() {
  const ctx = useScript();
  const builder = useMemo(buildLevel, []);
  const graphics = useGame((st) => st.settings.graphics);
  const power = useFlag('c1_power');
  const rollDone = useFlag('c1_rollcall');
  const idFound = useFlag('c1_id');
  const [rollActive, setRollActive] = useState(false);
  const [shadow, setShadow] = useState(false);

  useFlagEffect('puzzle_fusebox', () => {
    game().setFlag('c1_power', true);
    AudioSystem.play('power_on');
    Horror.flicker(2.2, 0.9);
    AudioSystem.loop('buzz', 0.6, 2000, [0, 3, -1.7]);
    ctx.run('power', async (c) => {
      await c.wait(1600);
      await c.say(D.power);
      await c.wait(2500);
      AudioSystem.play('switch', { pos: R.p([0, -2], 2.8) });
      bus.emit('door:r13', 'creak');
      await c.say(D.room13Light);
      game().saveCheckpoint('power');
    });
  });

  useEffect(() => { if (power) AudioSystem.loop('buzz', 0.6, 2000, [0, 3, -1.7]); }, [power]);

  const rollCall = (c: ScriptContext) => c.run('rollcall', async (s) => {
    setRollActive(true);
    s.lock(true);
    await s.wait(600);
    bus.emit('door:r13', 'slam');
    Horror.flicker(1.2, 0.95);
    await s.wait(900);
    teacherControl.brain?.place(R.xz(RS.teacher)[0], R.xz(RS.teacher)[1], R.teacherYaw);
    AudioSystem.play('bass_hit', { volume: 0.6 });
    s.lookAt(R.xz(RS.teacher)[0], 1.5, R.xz(RS.teacher)[1]);
    await s.wait(1600);
    await s.say(D.rollIntro);
    for (const r of ROLL_CALL) {
      s.sfx('paper', R.p(RS.desk, 1.0), 0.3);
      await s.line('reyes', `${r.surname}, ${r.first}.`, undefined, undefined, 2000);
      AudioSystem.play('whisper', { pos: R.p(RS.seats[Math.floor(Math.random() * RS.seats.length)], 1.1), volume: 0.35 });
      await s.wait(500);
    }
    await s.wait(1200);
    s.sfx('paper', R.p(RS.desk, 1.0), 0.6);
    await s.say(D.rollOneMore);
    await s.wait(800);
    await s.say(D.rollMissing);
    AudioSystem.play('stinger');
    Horror.blackout(1800);
    runtime.shake = 0.8;
    await s.wait(300);
    teacherControl.brain?.place(999, 999, 0, false);
    await s.wait(1500);
    game().setFlag('c1_rollcall', true);
    setRollActive(false);
    s.lock(false);
    await s.say(D.afterRoll);
    game().saveCheckpoint('rollcall', R.p(RS.entry), R.studentYaw);
  });

  return (
    <ChapterBase
      chapter={1}
      ctx={ctx}
      spawn={[0, 40]}
      yaw={0}
      ambience={[{ name: 'rain', volume: 1 }, { name: 'wind', volume: 0.8 }, { name: 'insects', volume: 0.6 }, { name: 'roomtone', volume: 0.5 }]}
      events={['footsteps', 'whisper', 'knock', 'creak', 'thunder', 'flicker']}
      intro={async (c) => {
        await c.wait(600);
        await c.say(D.intro);
        game().collect('flashlight', { silent: true });
        game().collect('anonymous_message', { silent: true });
        game().notify('Item: Old Flashlight — press F', 'item');
        game().notify('Evidence: Anonymous Message', 'evidence');
        Horror.lightning();
      }}
    >
      <Atmosphere fog="#0a1020" density={0.045} ambient="#5868a0" ambientIntensity={0.42} hemiIntensity={0.4} />
      <Sky />
      <Rain bounds={{ minX: -30, maxX: 30, minZ: 6.3, maxZ: 50 }} />
      <StaticLevel builder={builder} />
      <Suspense fallback={null}>
        <PropModel model="prop_flag" position={[-8, 0.5, 20]} height={6} rotationY={-Math.PI / 2} animate />
        {graphics !== 'low' && (
          <>
            {/* the rest of the campus, seen over the fence through the rain */}
            <PropModel model="env_construction_school" position={[-50, 0, 22]} width={44} rotationY={Math.PI / 2} tint="#59606e" shadows={false} />
            <PropModel model="env_library" position={[36, 0, 24]} height={11} rotationY={-Math.PI / 2} tint="#5a5a66" shadows={false} />
          </>
        )}
        <PropModel model="env_staircase" position={[-18.9, 0, -1.8]} height={2.9} rotationY={Math.PI} tint="#9a948a" />
        <PropModel model="prop_fuse_box" position={[-15.5, 1.0, -9.7]} height={0.8} tint="#b0aaa0" />
      </Suspense>
      <GlbCabinet x={-13} z={-9.4} r={2} />
      <Dust count={120} />

      {/* exterior lights */}
      <pointLight position={[4, 4.2, 40]} color="#ff9d4a" intensity={9} distance={18} decay={1.5} />
      <mesh position={[4, 4.3, 40]}><boxGeometry args={[0.4, 0.15, 0.25]} /><meshStandardMaterial color="#ffc27a" emissive="#ffa040" emissiveIntensity={3} /></mesh>
      <mesh position={[4, 2.1, 40.2]}><cylinderGeometry args={[0.06, 0.08, 4.3, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <pointLight position={[0, 3.2, 7]} color="#ffb070" intensity={2} distance={7} decay={1.6} />
      <Sign position={[0, 5.4, 6.2]} size={[6, 0.8]} lines={['BUBOG NATIONAL HIGH SCHOOL']} bg="#cfc6a8" color="#2a2a2a" />
      <Sign position={[0, 1.4, 36.25]} rotation={[0, Math.PI, 0]} size={[1.4, 0.5]} lines={['CLOSED BY ORDER', 'OF THE DIVISION']} bg="#b9a77a" />
      {shadow && (
        <mesh position={[-7.6, 4.5, 6.1]}>
          <planeGeometry args={[0.7, 1.2]} />
          <meshBasicMaterial color="#000" transparent opacity={0.85} />
        </mesh>
      )}

      {/* doors */}
      <Door id="gate" position={[0, 0, 36]} axis="x" width={3.2} height={2.4} double metal color="#5a3a26" lockedText="" onOpen={() => { AudioSystem.play('gate', { pos: [0, 1.2, 36] }); ctx.run('gate', (c) => c.say(D.gate)); }} />
      <Door id="entrance" position={[0, 0, 6]} axis="x" width={2.4} height={2.6} double color="#4b3423" onOpen={() => Horror.around('creak', 3)} />
      <Door id="guard" position={[-15, 0, -3.5]} axis="x" color="#5b4a3a" />
      <Door id="r12" position={[-3, 0, -3.5]} axis="x" startOpen />
      <Door id="r13" position={[R.doorX, 0, H13]} axis="x" width={RS.door.width} locked={!power || (rollDone && !idFound) || rollActive} lockedText={power ? 'The door won\'t move' : 'Locked. It won\'t budge.'} />
      <Door id="faculty_closed" position={[-14, 0, 0]} axis="x" locked lockedText="Locked" />
      <Door id="office_closed" position={[11, 0, 0]} axis="x" locked lockedText="Locked" />
      <Door
        id="wingb" position={[20, 0, -1.75]} axis="z" width={2.4} height={2.4} metal color="#4d5a5e" double
        locked lockedText={idFound ? 'Unlock Wing B with the key' : 'Wing B — locked'}
        onLockedTry={() => {
          if (game().has('wing_key')) {
            AudioSystem.play('chain');
            game().setFlag('c1_done', true);
            ctx.run('end', async (c) => {
              await c.wait(800);
              AudioSystem.play('door_open', { pos: [20, 1, -1.75] });
              game().completeChapter();
            });
          } else ctx.run('wing', (c) => c.say(D.wingLocked));
        }}
      />

      {/* interior lights */}
      <EmergencyLight position={[-15.5, 2.9, -3.7]} color="#ffb060" intensity={1.6} distance={7} pulse={false} />
      <EmergencyLight position={[19.8, 2.6, -1.75]} color="#ff3a2a" intensity={1.2} distance={6} />
      <FluoroLight position={[0, 3.18, 3]} on={power} flicker="subtle" />
      <FluoroLight position={[-10, 3.18, -1.75]} on={power} flicker="broken" />
      <FluoroLight position={[0, 3.18, -1.75]} on={power} flicker="subtle" />
      <FluoroLight position={[11, 3.18, -1.75]} on={power} flicker="subtle" />
      <Room13Model room={R} lift={0.04} clearExtra={R13_CLEAR} />
      <FluoroLight position={R.p([0, -2.5], 2.82)} rotY={R.studentYaw} on={power} flicker="subtle" distance={8} />
      <FluoroLight position={R.p([0, 2.5], 2.82)} rotY={R.studentYaw} on={power} flicker="broken" distance={8} />
      <FluoroLight position={[-6.5, 3.18, -8]} on={power && rollDone} flicker="broken" />
      <FluoroLight position={[-16, 3.18, -6.5]} on={false} light={false} />

      {/* signage & dressing */}
      <Sign position={[-3.88, 1.6, 3]} rotation={[0, Math.PI / 2, 0]} size={[1.6, 1.1]} lines={['BULLETIN BOARD']} bg="#5b3d26" color="#e9dcc0" />
      <Clock position={[3.88, 2.5, 3]} rotation={[0, -Math.PI / 2, 0]} />
      <Sign position={[-15, 2.45, -3.38]} size={[0.8, 0.2]} lines={['GUARD']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[-6.5, 2.45, -3.38]} size={[0.8, 0.2]} lines={['ROOM 12']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[R.doorX, 2.45, H13 + 0.12]} size={[0.8, 0.2]} lines={['ROOM 13']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[19.85, 2.65, -1.75]} rotation={[0, -Math.PI / 2, 0]} size={[1.4, 0.25]} lines={['WING B — CLASSROOMS']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[-8, 1.7, -0.13]} rotation={[0, Math.PI, 0]} size={[0.9, 0.6]} lines={['CLEAN AS', 'YOU GO']} bg="#cbbf98" />
      <Sign position={[6, 1.7, -0.13]} rotation={[0, Math.PI, 0]} size={[1.2, 0.7]} lines={['MABUHAY ANG', 'KABATAANG', 'BUBOG']} bg="#b9c3a0" />
      <ChalkText position={[-6.5, 1.65, -11.83]} lines={['REVIEW: MARCH 9', 'GOD BLESS, SAMPAGUITA!']} />
      <ChalkText position={R.boardFront(1.6)} rotation={[0, R.boardRotY, 0]} size={[RS.boardWidth, 0.9]} lines={rollDone ? ['MONITOR: ________', 'PRESENT 11 / ABSENT 1'] : ['EVENING REVIEW', '6:00 — 9:00 PM']} glow={rollDone ? 0.15 : 0} />

      {/* pickups & interactions */}
      <Pickup item="bulletin_notice" position={[-3.55, 0.01, 3.3]} verb="Take" />
      <Pickup item="guard_note" position={[-17.8, 0.79, -8.6]} verb="Read" />
      <Hotspot
        id="fusebox" position={[-15.5, 1.5, -9.65]} size={[0.8, 1, 0.3]}
        prompt={power ? null : 'Use breaker panel'}
        onInteract={() => game().openPuzzle('fusebox')}
      />
      <BatteryPickup id="c1_guard" position={[-17.3, 0.8, -8.5]} />
      <BatteryPickup id="c1_lobby" position={[3.2, 0.03, 5.2]} />
      <Hotspot
        id="r13_drawer" position={R.deskFront(0.7)} size={[1.2, 0.5, 0.4]}
        prompt={rollDone && !idFound ? 'Open the drawer' : null}
        onInteract={() => {
          AudioSystem.play('locker', { volume: 0.5 });
          game().collect('student_id', { open: true });
          game().collect('wing_key', { silent: true });
          game().setFlag('c1_id', true);
          bus.emit('door:r13', 'open');
          ctx.run('foundId', async (c) => {
            await c.wait(400);
            await c.say(D.foundId);
            game().notify('Item: Classroom Wing Key', 'item');
            game().saveCheckpoint('id');
          });
        }}
      />
      <Pickup item="mara_clip" position={[-19.3, 0.01, -0.6]} hidden={!power} />
      <GhostGirl id="c1" position={[-16.5, 0, -1.4]} rotationY={Math.PI / 2 + 0.5} enabled={power} />

      {/* triggers */}
      <Trigger id="c1_bell" min={[-22, 24]} max={[22, 31]} onEnter={() => ctx.run('bell', async (c) => {
        AudioSystem.play('bell', { pos: [0, 5, 6], volume: 0.9 });
        await c.wait(2400);
        await c.say(D.bell);
      })} />
      <Trigger id="c1_shadow" min={[-22, 14]} max={[22, 20]} onEnter={() => ctx.run('shadow', async (c) => {
        Horror.lightning();
        setShadow(true);
        await c.wait(1300);
        setShadow(false);
        await c.say(D.shadow);
      })} />
      <Trigger id="c1_lobby" min={[-4, 0.2]} max={[4, 5.6]} onEnter={() => {
        game().setFlag('c1_entered', true);
        ctx.run('inside', (c) => c.say(D.inside));
      }} />
      <Trigger id="c1_upstairs" min={[-17, -3.5]} max={[-10, 0]} onEnter={() => ctx.run('upstairs', async (c) => {
        AudioSystem.play('footsteps_far', { pos: [-18, 4.5, -2], volume: 1 });
        await c.wait(2600);
        await c.say(D.upstairs);
      })} />
      <Trigger id="c1_girl" min={[-19.5, -3.5]} max={[-13, 0]} enabled={power} onEnter={() => ctx.run('girl', async (c) => { await c.wait(2500); await c.say(D.girl); })} />
      <Trigger id="c1_room13" min={[R.min[0], R.min[1]]} max={[R.max[0], R.southZ - 1.0]} enabled={power} onEnter={() => {
        game().setFlag('c1_room13', true);
        rollCall(ctx);
      }} />
      <RollCallGuard active={power && !rollDone} onRestart={() => rollCall(ctx)} />

      <Teacher config={TEACHER_CFG} mode="stalker" />
    </ChapterBase>
  );
}

/** If the game was saved after entering Room 13 but before the roll call finished, replay it on reload. */
function RollCallGuard({ active, onRestart }: { active: boolean; onRestart: () => void }) {
  const done = useFlag('c1_room13');
  useFrame(() => {
    if (!active || !done) return;
    const p = runtime.player.pos;
    if (p.x > R.min[0] && p.x < R.max[0] && p.z < R.southZ - 1.0 && p.z > R.min[1] && !runtime.player.locked) onRestart();
  });
  return null;
}
