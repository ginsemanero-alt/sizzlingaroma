import { useMemo, useState } from 'react';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { Atmosphere, ChalkText, Clock, Dust, EmergencyLight, FluoroLight, Sign } from '@/components/Environment/Props';
import { BatteryPickup, Door, HidingSpot, Trigger } from '@/components/Interactions/WorldObjects';
import { Interactable } from '@/components/Interactions/Interactable';
import { Teacher } from '@/components/Enemies/Teacher';
import { GhostStudent } from '@/components/Characters/Ghosts';
import { STUDENT_LOOKS } from '@/components/Characters/Humanoid';
import { ChapterBase, useFlag, useScript } from '@/scenes/ChapterBase';
import { addRoom13, room13Seats } from '@/scenes/shared/schoolParts';
import { DIALOGUE } from '@/data/dialogue';
import { ROLL_CALL } from '@/data/characters';
import { game } from '@/store/gameStore';
import { bus, runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Horror } from '@/systems/HorrorEventSystem/HorrorEventSystem';
import { teacherControl, type TeacherConfig } from '@/systems/EnemyAISystem/TeacherBrain';
import { resolveEnding, summarizeEvidence, type FinalDecision } from '@/systems/EndingSystem/EndingSystem';
import type { ScriptContext } from '@/systems/DialogueSystem/DialogueSystem';

const D = DIALOGUE.c6;
const R13X = 34, R13Z = -2.5;

const TEACHER_CFG: TeacherConfig = {
  bounds: [-1, -12, 45, 3],
  waypoints: [[10, 0], [24, 0], [36, 0], [30, -1.5], [17, 1.5]],
  patrolSpeed: 1.45,
  chaseSpeed: 3.3,
  sight: 14,
  leash: [5, -3, 45, 3],
};

function buildLevel(): LevelBuilder {
  const b = new LevelBuilder();
  b.floor(-4, -2.5, 44, 2.5, 'tile');
  b.ceil(-4, -2.5, 44, 2.5, 3.6);
  b.wall(-4, -2.5, -4, 2.5, { h: 3.6, openings: [{ at: 2.5, w: 3, h: 2.8 }] });
  b.wall(44, -2.5, 44, 2.5, { h: 3.6 });
  b.wall(-4, -2.5, 44, -2.5, { h: 3.6, openings: [{ at: R13X + 8.6 + 4, w: 1.1, h: 2.2 }, { at: 14, w: 1.1, h: 2.2 }, { at: 26, w: 1.1, h: 2.2 }] });
  b.wall(-4, 2.5, 44, 2.5, { h: 3.6, openings: [{ at: 20, w: 1.1, h: 2.2 }, { at: 32, w: 1.1, h: 2.2 }] });
  b.block(-8, -3, -7, 3); b.floor(-8, -2.5, -4, 2.5, 'concrete');
  addRoom13(b, R13X, R13Z, { skipSouth: true, extraDesk: true });
  // distorted corridor dressing: hiding alcoves, floating furniture, piles of desks
  b.cabinet(8, -2.2, 2, 0.9, 1.9, 0.5);
  b.lockers(15, 2.2, 0, 4);
  b.cabinet(21, 2.2, 0, 0.9, 1.9, 0.5);
  b.cabinet(29, -2.2, 2, 0.9, 1.9, 0.5);
  b.desk(12, -1.6, 1); b.desk(18, 1.6, 3); b.desk(33, 1.7, 3); b.desk(25, -1.7, 1, true);
  b.lockers(38, 2.2, 0, 5);
  for (let i = 0; i < 9; i++) b.box(4 + i * 4.3, 2.4 + (i % 3) * 0.3, (i % 2 ? 1 : -1) * 1.4, 0.55, 0.05, 0.45, 'wood', undefined, i * 0.7);
  b.debris(20, 0, 36, 60, 'paper');
  return b;
}

const SEAT_LOOKS = ROLL_CALL.map((_, i) => (['Bautista', 'Flores', 'Garcia', 'Lim', 'Santos'].includes(ROLL_CALL[i].surname) ? STUDENT_LOOKS.girl : STUDENT_LOOKS.boy));

export default function Chapter6() {
  const ctx = useScript();
  const builder = useMemo(buildLevel, []);
  const reached = useFlag('c6_reached');
  const bookTaken = useFlag('c6_book');
  const rollDone = useFlag('c6_roll');
  const [ghosts, setGhosts] = useState(0); // number of students visible
  const [final, setFinal] = useState(false);
  const seats = useMemo(() => room13Seats(R13X, R13Z), []);
  // seat index → student; seat 11 (back row, window) is Alex's
  const studentSeats = useMemo(() => seats.filter((_, i) => i !== 11).slice(0, 11), [seats]);

  const enterRoom = () => ctx.run('enter', async (c) => {
    game().setFlag('c6_reached', true);
    teacherControl.brain?.setMode('stalker');
    teacherControl.brain?.place(R13X + 5, R13Z - 7.4, Math.PI);
    runtime.fear = 0;
    AudioSystem.loop('tension', 0, 1500);
    bus.emit('door:r13', 'slam');
    c.lock(true);
    c.lookAt(R13X + 5, 1.5, R13Z - 7.4);
    await c.wait(1200);
    await c.say(D.enter);
    for (let i = 0; i < ROLL_CALL.length; i++) {
      const r = ROLL_CALL[i];
      await c.line('reyes', `${r.surname}, ${r.first}.`, undefined, undefined, 1700);
      setGhosts(i + 1);
      const s = studentSeats[i];
      AudioSystem.play('whisper', { pos: [s.x, 1.1, s.z], volume: 0.5 });
      await c.line('student', 'Present.', 'Present po.', undefined, 1000);
    }
    await c.wait(600);
    await c.say(D.roll);
    c.lock(false);
    game().setFlag('c6_roll', true);
    game().saveCheckpoint('room13', [R13X + 7.5, 0, R13Z - 1.4], Math.PI * 0.9);
  });

  const finalSequence = (c: ScriptContext) => c.run('final', async (s) => {
    s.lock(true);
    s.lookAt(R13X + 5, 1.5, R13Z - 7.4);
    const ev = summarizeEvidence(game().collected, game().flags);
    const canRestore = game().has('altered_attendance') && game().has('attendance_reconstructed');
    await s.line('reyes', 'This is the book they said was never recovered.', 'Ito ang librong sinabi nilang hindi na nakita.', 'fil');
    if (!ev.allKey) await s.line('reyes', 'You have not found everything, Alex. Some of us are still missing from your memory.', 'Hindi mo pa nahahanap ang lahat, Alex. May mga kulang pa sa alaala mo.', 'fil');
    else await s.line('reyes', 'You found all of it. Every page they tried to bury.', 'Nahanap mo lahat. Bawat pahinang ibinaon nila.', 'fil');

    const record = (await s.choose('The evening attendance of March 9, 2018 lies open. Under the correction fluid, every check mark is still there.', [
      { id: 'restore', label: 'Restore the original record — scrape away the white-out, rewrite every check mark and my own name.', disabled: !canRestore, hint: canRestore ? undefined : 'Requires the altered attendance book and your reconstructed attendance.' },
      { id: 'leave', label: 'Leave the record as it is. Close the book.' },
      { id: 'tear', label: 'Tear out the page. Nobody should have to read this.' },
    ])) as FinalDecision['record'];
    AudioSystem.play(record === 'tear' ? 'paper' : 'chalk');
    if (record === 'tear') { AudioSystem.play('paper', { rate: 0.6 }); Horror.flicker(1.5, 0.9); await s.line('reyes', 'Again? They erased us once already.', 'Na naman? Binura na nila kami minsan.', 'fil'); }
    if (record === 'restore') await s.line('reyes', 'Thank you. Now — answer me truthfully.', 'Salamat. Ngayon — sagutin mo ako nang tapat.', 'fil');

    let truthful = 0;
    if (record !== 'leave') {
      await s.say(D.q1);
      const a1 = await s.choose(D.q1.en, [
        { id: 'room', label: 'In Room 13, taking the attendance.' },
        { id: 'hall', label: 'In the hallway by the science lab. I was looking for Daniel.' },
        { id: 'gone', label: 'I wasn\'t here. I had already transferred.' },
      ], 'reyes');
      if (a1 === 'hall') truthful++;
      await s.say(D.q2);
      const a2 = await s.choose(D.q2.en, [
        { id: 'help', label: 'To call for help when I smelled smoke.' },
        { id: 'never', label: 'I didn\'t. I was never in Room 13.' },
        { id: 'daniel', label: 'Daniel went to the lab for his reviewer and didn\'t come back. I went to bring him back.' },
      ], 'reyes');
      if (a2 === 'daniel') truthful++;
      await s.say(D.q3);
      const a3 = await s.choose(D.q3.en, [
        { id: 'stairs', label: 'We were separated at the stairs. He went back to find all of you.' },
        { id: 'together', label: 'We got out together. He\'s fine. He moved away.' },
        { id: 'absent', label: 'Daniel wasn\'t in the building that night.' },
      ], 'reyes');
      if (a3 === 'stairs') truthful++;
    }

    // The most important moment.
    setFinal(true);
    AudioSystem.stopAllLoops(2500);
    await s.wait(1800);
    AudioSystem.play('paper', { volume: 0.8 });
    await s.wait(1600);
    await s.say(D.finalName);
    const answer = (await s.choose('Ms. Reyes is looking at you. The whole class is looking at you.', [
      { id: 'present', label: '"Present."' },
      { id: 'silent', label: '(Say nothing.)' },
      { id: 'never', label: '"I was never here."' },
    ], 'reyes')) as FinalDecision['answer'];
    game().setFlag('c6_answered', true);
    if (answer === 'present') await s.line('alex', 'Present.', undefined, undefined, 2200);
    await s.fade(1, 2600);
    AudioSystem.play('door_slam', { volume: 0.6, rate: 1.4 });
    runtime.shake = 0;
    await s.wait(1200);
    await s.center('THE LAST ATTENDANCE.', 3600);
    const ending = resolveEnding(game().collected, game().flags, { record, truthful, answer });
    game().setFlag('ending_decision', `${record}/${truthful}/${answer}`);
    game().triggerEnding(ending);
  });

  return (
    <ChapterBase
      chapter={6}
      ctx={ctx}
      spawn={[-1.5, 0]}
      yaw={-Math.PI / 2}
      ambience={[{ name: 'drone', volume: 1 }, { name: 'roomtone', volume: 1 }, { name: 'heartbeat', volume: 0.25 }, { name: 'wind', volume: 0.3 }]}
      events={['whisper', 'knock', 'breath', 'cry', 'static', 'run']}
      eventsEnabled={!reached}
      intro={async (c) => { await c.wait(400); await c.say(D.intro); }}
      onReady={() => { if (!reached) AudioSystem.loop('tension', 0.4, 3000); }}
    >
      <Atmosphere fog="#140508" density={0.07} ambient="#7a2a3a" ambientIntensity={0.28} hemi={['#4a1a2a', '#0a0204']} hemiIntensity={0.3} moon={false} />
      <StaticLevel builder={builder} />
      <Dust color="#ff9a9a" count={200} />

      {/* corridor lighting: red emergency, broken fluorescents */}
      {[2, 12, 22, 32, 42].map((x, i) => <EmergencyLight key={x} position={[x, 3.4, i % 2 ? 2.3 : -2.3]} intensity={2.2} distance={10} />)}
      <FluoroLight position={[7, 3.58, 0]} flicker="broken" intensity={3} />
      <FluoroLight position={[27, 3.58, 0]} flicker="broken" intensity={3} />
      <FluoroLight position={[R13X + 3, 3.18, R13Z - 4.5]} flicker={final ? 'none' : 'subtle'} on={reached} />
      <FluoroLight position={[R13X + 7, 3.18, R13Z - 4.5]} flicker="subtle" on={reached && !final} />
      <pointLight position={[-6, 3, 0]} intensity={4} distance={10} color="#9fb6ff" />

      {/* writing on the walls */}
      <ChalkText position={[6, 1.8, -2.38]} size={[3, 1]} lines={['ABSENT  ABSENT  ABSENT']} color="#ffd0d0" glow={0.4} />
      <ChalkText position={[16, 1.6, 2.38]} rotation={[0, Math.PI, 0]} size={[3.4, 1]} lines={['DID NOT ATTEND']} color="#ffd0d0" glow={0.4} />
      <ChalkText position={[24, 2.2, -2.38]} size={[3.4, 1]} lines={['WHO TOOK THE ATTENDANCE?']} color="#ffd0d0" glow={0.4} />
      <ChalkText position={[35, 1.7, 2.38]} rotation={[0, Math.PI, 0]} size={[3.4, 1.2]} lines={['TRANSFERRED', 'TRANSFERRED', 'TRANSFERRED']} color="#ffd0d0" glow={0.4} />
      <ChalkText position={[43.88, 1.8, 0]} rotation={[0, -Math.PI / 2, 0]} size={[3.6, 1.2]} lines={['ROOM 13 ←', 'KUMPLETO NA BA TAYO?']} color="#ffe0e0" glow={0.6} />
      <ChalkText position={[R13X + 5, 1.65, R13Z - 8.33]} lines={final ? ['MERCADO, ALEX', '?'] : ['THE LAST ATTENDANCE', 'MARCH 9']} glow={0.3} />
      <Sign position={[R13X + 8.6, 2.45, -2.38]} size={[0.8, 0.2]} lines={['ROOM 13']} bg="#3a0d0d" color="#ffd0d0" />
      <Clock position={[R13X + 5, 2.65, R13Z - 8.37]} />
      <Clock position={[20, 2.7, -2.38]} />

      {/* doors */}
      <Door id="r13" position={[R13X + 8.6, 0, -2.5]} axis="x" startOpen locked={reached} lockedText="It won't open" />
      <Door id="d1" position={[10, 0, -2.5]} axis="x" locked lockedText="Locked" />
      <Door id="d2" position={[22, 0, -2.5]} axis="x" locked lockedText="Locked" />
      <Door id="d3" position={[16, 0, 2.5]} axis="x" locked lockedText="Someone is holding it shut" />
      <Door id="d4" position={[28, 0, 2.5]} axis="x" locked lockedText="Locked" />

      {/* hiding spots */}
      <HidingSpot id="h1" position={[8, 1.0, -1.85]} view={[8, 1.2, -2.2]} exit={[8, 0, -1.0]} yaw={Math.PI} label="Hide in the cabinet" />
      <HidingSpot id="h2" position={[21, 1.0, 1.85]} view={[21, 1.2, 2.2]} exit={[21, 0, 1.0]} yaw={0} label="Hide in the cabinet" />
      <HidingSpot id="h3" position={[29, 1.0, -1.85]} view={[29, 1.2, -2.2]} exit={[29, 0, -1.0]} yaw={Math.PI} label="Hide in the cabinet" />
      <HidingSpot id="h4" position={[12, 0.4, -1.6]} view={[12, 0.5, -1.7]} exit={[12, 0, -0.6]} yaw={Math.PI} label="Hide under the desk" />
      <HidingSpot id="h5" position={[33, 0.4, 1.7]} view={[33, 0.5, 1.8]} exit={[33, 0, 0.6]} yaw={0} label="Hide under the desk" />
      <BatteryPickup id="c6_a" position={[18, 0.75, 1.6]} />

      {/* the way out */}
      <Interactable id="leave" position={[-4.2, 1.2, 0]} radius={0.8} prompt={reached ? null : 'Leave the school'} onInteract={() => ctx.run('leave', async (c) => {
        await c.say(D.leaveConfirm);
        const a = await c.choose('Walk away from Room 13 and never come back?', [
          { id: 'stay', label: 'No. Go back. Finish this.' },
          { id: 'leave', label: 'Leave. Some names are better left uncalled.' },
        ]);
        if (a === 'leave') {
          await c.fade(1, 2000);
          game().triggerEnding('absent');
        }
      })}>
        <mesh><boxGeometry args={[0.2, 0.2, 0.2]} /><meshBasicMaterial visible={false} /></mesh>
      </Interactable>
      <Sign position={[-3.9, 2.9, 0]} rotation={[0, Math.PI / 2, 0]} size={[1.8, 0.3]} lines={['EXIT — GATE']} bg="#1d6a2a" color="#e8ffe8" emissive={0.5} />

      {/* corridor ghosts (harmless) */}
      <GhostStudent position={[14, 0, 1.2]} rotationY={Math.PI / 2} pose="stand" look={STUDENT_LOOKS.girl} vanishDistance={3} />
      <GhostStudent position={[31, 0, -1.0]} rotationY={-Math.PI / 2} pose="stand" look={STUDENT_LOOKS.boy} vanishDistance={3} />

      {/* Room 13 */}
      <Trigger id="c6_enter" min={[R13X + 0.5, R13Z - 8]} max={[R13X + 9.5, R13Z - 1.2]} onEnter={enterRoom} />
      {studentSeats.map((s, i) => (
        <GhostStudent key={i} position={[s.x, 0, s.z + 0.15]} look={SEAT_LOOKS[i]} visible={reached && (ghosts > i || rollDone)} color="#9fb0ff" />
      ))}
      <GhostStudent position={[R13X + 9.1, 0, R13Z - 0.75]} look={{ ...STUDENT_LOOKS.girl, hairStyle: 'long' }} visible={final} color="#c0c8ff" />
      <Interactable id="attendance_book" position={[R13X + 5, 0.86, R13Z - 6.25]} radius={0.3} prompt={rollDone && !bookTaken ? 'Take the attendance book' : null} onInteract={() => {
        game().setFlag('c6_book', true);
        AudioSystem.play('paper');
        finalSequence(ctx);
      }}>
        <mesh><boxGeometry args={[0.36, 0.06, 0.26]} /><meshStandardMaterial color="#3b2418" /></mesh>
      </Interactable>

      <Teacher config={TEACHER_CFG} mode={reached ? 'stalker' : 'hunter'} distorted={!reached} />
    </ChapterBase>
  );
}
