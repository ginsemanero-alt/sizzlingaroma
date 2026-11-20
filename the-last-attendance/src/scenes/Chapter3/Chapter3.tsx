import { Suspense, useMemo, useState } from 'react';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { PropModel } from '@/components/Environment/PropModel';
import { EnvModel } from '@/components/Environment/EnvModel';
import { GlbCabinet } from '@/scenes/shared/props';
import { Atmosphere, Clock, Dust, EmergencyLight, FluoroLight, Sign } from '@/components/Environment/Props';
import { BatteryPickup, Door, FallingBooks, HidingSpot, Pickup, Trigger } from '@/components/Interactions/WorldObjects';
import { Hotspot } from '@/components/Interactions/Interactable';
import { Teacher } from '@/components/Enemies/Teacher';
import { GhostGirl } from '@/components/Characters/Ghosts';
import { ChapterBase, useFlag, useFlagEffect, useHas, useScript } from '@/scenes/ChapterBase';
import { DIALOGUE } from '@/data/dialogue';
import { game } from '@/store/gameStore';
import { bus } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Horror } from '@/systems/HorrorEventSystem/HorrorEventSystem';
import { teacherControl, type TeacherConfig } from '@/systems/EnemyAISystem/TeacherBrain';

const D = DIALOGUE.c3;

/** Registrar's desk height (office-cubicle model). */
const DESK_TOP = 0.76;
/** The lanyard file comes on a display bust: keep only the lanyard and its ID tag. */
const LANYARD_STAND = /SHIRLEY|lambert17|pPlane1/;
/** Archive room: the abandoned-office model, with a doorway cut where the keypad door is. */
const ARCHIVE: [number, number, number] = [38, 0, 0];
const ARCHIVE_DOOR: [number, number, number, number, number, number] = [33.9, -0.1, -0.75, 35.1, 2.2, 0.75];
const ARCHIVE_CLEAR: [number, number, number, number][] = [[33.8, -1.0, 35.8, 1.0]];

const TEACHER_CFG: TeacherConfig = {
  bounds: [-1, -11, 43, 15],
  waypoints: [[4, 0], [17, 0], [30, 0], [10, 7], [15.5, 12.5], [4.5, 12.5], [23, -6], [8, -6.5]],
  patrolSpeed: 1.3,
  chaseSpeed: 3.15,
  sight: 12,
};

function buildLevel(): LevelBuilder {
  const b = new LevelBuilder();
  // corridor
  b.floor(0, -2, 34, 2, 'tile');
  b.ceil(0, -2, 34, 2);
  b.wall(0, -2, 0, 2, {});
  b.wall(34, -2, 34, 2, { openings: [{ at: 2, w: 1.2, h: 2.2 }] });
  b.wall(0, -2, 34, -2, { openings: [{ at: 8, w: 1.1, h: 2.2 }, { at: 23, w: 1.1, h: 2.2 }] });
  b.wall(0, 2, 34, 2, { openings: [{ at: 10, w: 2.2, h: 2.4 }] });
  // library (south)
  b.room(3, 2, 17, 14, { skip: ['n'], floor: 'floorWood', e: [{ at: 3, w: 1.6, h: 1.4, y: 1 }, { at: 7, w: 1.6, h: 1.4, y: 1 }] });
  [5.6, 8.6, 11.6].forEach((z, r) => {
    b.bookshelf(6.2, z, 0, 3.2, 2.2, r === 1 ? 0.25 : 0.05);
    b.bookshelf(10.6, z, 0, 3.2, 2.2, 0.1);
    b.bookshelf(14.6, z, 0, 2.6, 2.2, r === 2 ? 0.3 : 0.05);
  });
  b.table(5.2, 3.4, 2, 0.8, 0.8, 'darkwood'); // librarian desk
  b.chair(5.2, 2.7, 0);
  b.table(14, 13, 2.2, 1, 0.75, 'wood');
  b.debris(9, 10, 4, 14);
  // computer room (north)
  b.room(3, -10, 13, -2, { skip: ['s'], floor: 'tile', w: [{ at: 4, w: 1.6, h: 1.3, y: 1.0 }] });
  [[5.5, -5], [8, -5], [10.5, -5], [5.5, -8], [8, -8]].forEach(([x, z]) => { b.computerDesk(x, z, 0); b.chair(x, z + 0.8, 0); });
  b.computerDesk(10.5, -8, 0, true);
  b.chair(10.5, -7.2, 0);
  b.table(12.2, -3.4, 0.9, 0.7, 0.8, 'darkwood'); // printer table
  b.box(12.2, 0.95, -3.4, 0.55, 0.28, 0.42, 'paper', '#bdb8a6');
  // records office (north)
  b.room(17, -10, 29, -2, { skip: ['s'], floor: 'tile' });
  for (let i = 0; i < 6; i++) b.cabinet(18.2 + i * 1.0, -9.65, 2, 0.95, 1.6, 0.6, 'metal', false);
  b.cabinet(28.6, -6.2, 1, 0.95, 1.6, 0.6, 'metal', false);
  b.cabinet(28.6, -8.6, 1, 0.95, 1.6, 0.6, 'metal', false);
  // registrar's L-shaped workstation (office-cubicle model); colliders for its two desk arms
  b.block(21.7, -8.9, 24.0, -3.7, 0, 0.9, false);
  b.block(17.7, -8.9, 21.7, -6.9, 0, 0.9, false);
  b.debris(23, -4, 4, 18);
  // archive (east, behind keypad door)
  b.room(34, -5, 42, 5, { skip: ['w'], floor: 'concrete', lower: null, upper: 'concrete' });
  b.wall(34, -5, 34, -0.6, {}); b.wall(34, 0.6, 34, 5, {});
  // archive interior: the abandoned-office model (see ARCHIVE)
  // corridor dressing
  b.lockers(26, 1.75, 0, 5);
  b.debris(16, 0, 10, 12);
  b.chair(31, 1.2, 3);
  return b;
}

export default function Chapter3() {
  const ctx = useScript();
  const builder = useMemo(buildLevel, []);
  const pcSolved = useFlag('puzzle_pc_password');
  const original = useHas('printed_attendance');
  const compared = useFlag('c3_compare');
  const file = useHas('alex_file');
  const archiveOpen = useFlag('puzzle_archive_lock');
  const pcOn = useFlag('c3_pc_on');
  const printed = useFlag('c3_printed');
  const [printing, setPrinting] = useState(false);

  useFlagEffect('puzzle_pc_password', () => {
    game().setFlag('c3_records', true);
    ctx.run('printer', async (c) => {
      await c.wait(1500);
      setPrinting(true);
      game().setFlag('c3_printed', true);
      AudioSystem.play('printer', { pos: [12.2, 1, -3.4] });
      await c.wait(2600);
      AudioSystem.play('stinger', { volume: 0.5 });
      Horror.flicker(1.2, 0.8);
      await c.say(D.printer);
      game().saveCheckpoint('pc');
    });
  });

  useFlagEffect('puzzle_attendance', () => {
    game().setFlag('c3_compare', true);
    game().collect('attendance_reconstructed', { open: true });
    ctx.run('reconstructed', async (c) => { await c.wait(400); await c.say(D.reconstructed); game().saveCheckpoint('compare'); });
  });

  useFlagEffect('puzzle_archive_lock', () => {
    bus.emit('door:archive', 'creak');
    ctx.run('archive', async (c) => {
      await c.say(D.archiveOpen);
      teacherControl.brain?.setMode('stalker');
      teacherControl.brain?.place(35.4, 0, Math.PI / 2);
      AudioSystem.play('bass_hit', { volume: 0.7 });
      c.lookAt(35.4, 1.5, 0);
      c.lock(true);
      await c.wait(900);
      await c.say(D.teacherDoor);
      Horror.blackout(900);
      await c.wait(300);
      teacherControl.brain?.place(999, 999, 0, false);
      await c.wait(700);
      c.lock(false);
      game().saveCheckpoint('archive');
    });
  });

  const hunt = original && !file;

  return (
    <ChapterBase
      chapter={3}
      ctx={ctx}
      spawn={[1.5, 0]}
      yaw={-Math.PI / 2}
      ambience={[{ name: 'roomtone', volume: 1 }, { name: 'buzz', volume: 0.35, pos: [16, 3, 0] }]}
      events={['footsteps', 'whisper', 'knock', 'creak', 'flicker', 'static', 'breath', 'thunder']}
      intro={async (c) => { await c.wait(500); await c.say(D.intro); }}
    >
      <Atmosphere fog="#0a0d16" density={0.06} ambientIntensity={0.3} hemiIntensity={0.3} />
      <StaticLevel builder={builder} />
      <Suspense fallback={null}>
        <PropModel model="env_office" maxPart={8} position={[20.85, 0, -6.3]} rotationY={Math.PI} tint="#8f8a80" />
        <PropModel model="env_lab" position={[4.65, 0.81, 3.4]} width={0.7} animate tint="#b0a898" />
        <EnvModel model="env_old_office" position={ARCHIVE} tint="#9a948c" hole={ARCHIVE_DOOR} collide clear={ARCHIVE_CLEAR} />
        <PropModel model="prop_books" position={[12.3, 0, 9.0]} fit={0.4} rotationY={0.7} tint="#a09080" shadows={false} />
        <PropModel model="prop_books" position={[6.2, 0.78, 12.9]} fit={0.32} rotationY={2.1} shadows={false} />
        <PropModel model="prop_lanyard" position={[21.6, DESK_TOP, -8.0]} fit={0.18} rotationY={0.5} hide={LANYARD_STAND} shadows={false} />
        <PropModel model="prop_photo_frame" position={[20.2, DESK_TOP, -8.15]} height={0.2} rotationY={Math.PI / 2 + 0.3} tint="#c8b8a8" shadows={false} />
        <PropModel model="prop_electric_fan" position={[3.7, 0, -9.2]} height={1.2} rotationY={0.6} animate shadows={false} />
      </Suspense>
      <Pickup item="andrea_sketchbook" position={[13.3, 0.78, 13.1]} verb="Pick up" />
      <Pickup item="paolo_rosary" position={[31.6, 0.01, -1.35]} verb="Pick up" />
      {[0, 1, 2, 3, 4, 5].map((i) => <GlbCabinet key={i} x={18.2 + i * 1.0} z={-9.65} r={2} w={0.95} h={1.6} d={0.6} />)}
      <GlbCabinet x={28.6} z={-6.2} r={1} w={0.95} h={1.6} d={0.6} />
      <GlbCabinet x={28.6} z={-8.6} r={1} w={0.95} h={1.6} d={0.6} />
      <Dust />

      <FluoroLight position={[5, 3.18, 0]} flicker="subtle" />
      <FluoroLight position={[20, 3.18, 0]} flicker="broken" />
      <FluoroLight position={[30, 3.18, 0]} flicker="subtle" intensity={4} />
      <FluoroLight position={[8, 3.18, 7]} flicker="subtle" color="#fff0d0" />
      <FluoroLight position={[12, 3.18, 12]} flicker="broken" light={false} />
      <FluoroLight position={[8, 3.18, -6]} flicker="subtle" />
      <FluoroLight position={[23, 3.18, -6]} flicker="subtle" />
      <EmergencyLight position={[33.8, 2.6, -1.2]} intensity={1.3} />
      <pointLight position={[38, 2.6, 0]} intensity={archiveOpen ? 3 : 0} distance={9} color="#ffcf8a" />

      <Door id="computer" position={[8, 0, -2]} axis="x" startOpen />
      <Door id="records" position={[23, 0, -2]} axis="x" />
      <Door id="library" position={[10, 0, 2]} axis="x" width={2.2} double startOpen />
      <Door id="archive" position={[34, 0, 0]} axis="z" width={1.2} metal color="#4a4f52" locked={!archiveOpen} lockedText="Archive — keypad lock" noInteract={!archiveOpen} />
      <Hotspot id="keypad" position={[33.85, 1.3, 1.0]} size={[0.15, 0.3, 0.3]} prompt={archiveOpen ? null : 'Use the keypad'} onInteract={() => game().openPuzzle('archive_lock')} />
      <mesh position={[33.88, 1.3, 1.0]}><boxGeometry args={[0.04, 0.22, 0.16]} /><meshStandardMaterial color="#1a1f1a" emissive={archiveOpen ? '#2a8a3a' : '#8a2a2a'} emissiveIntensity={1.5} /></mesh>

      <Sign position={[8, 2.45, -1.88]} size={[1.3, 0.2]} lines={['COMPUTER ROOM']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[23, 2.45, -1.88]} size={[1.3, 0.2]} lines={['REGISTRAR / RECORDS']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[10, 2.65, 1.88]} rotation={[0, Math.PI, 0]} size={[1.2, 0.25]} lines={['LIBRARY']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[33.88, 2.55, 0]} rotation={[0, -Math.PI / 2, 0]} size={[1.2, 0.25]} lines={['ARCHIVE']} bg="#5a1f1f" color="#ddd" />
      <Sign position={[6.5, 1.8, 13.88]} rotation={[0, Math.PI, 0]} size={[1.4, 0.8]} lines={['TAHIMIK', '(QUIET)']} bg="#c9bd98" />
      <Clock position={[16, 2.5, -1.88]} />
      <Clock position={[16.88, 2.5, 7]} rotation={[0, -Math.PI / 2, 0]} />
      <Clock position={[28.88, 2.5, -4]} rotation={[0, -Math.PI / 2, 0]} />
      <Clock position={[3.12, 2.5, -6]} rotation={[0, Math.PI / 2, 0]} />

      {/* library */}
      <Pickup item="library_log" position={[5.5, 0.82, 3.4]} verb="Read" />
      <FallingBooks id="lib" position={[10.6, 0, 8.4]} dir={[0, 0, -1]} />
      <BatteryPickup id="c3_lib" position={[14, 0.78, 13]} />
      <HidingSpot id="lib_table" position={[14, 0.4, 12.6]} view={[14, 0.55, 13]} exit={[14, 0, 11.9]} yaw={Math.PI} label="Hide under the table" />
      <Trigger id="c3_books" min={[8, 6.3]} max={[13, 10.5]} onEnter={() => ctx.run('books', async (c) => {
        bus.emit('books:lib');
        Horror.stinger();
        await c.wait(1200);
        await c.say(D.books);
      })} />

      {/* computer room */}
      <Trigger id="c3_pc" min={[3.2, -9.8]} max={[12.8, -2.4]} onEnter={() => ctx.run('pcOn', async (c) => {
        game().setFlag('c3_pc_on', true);
        AudioSystem.play('beep', { pos: [10.5, 1, -8] });
        AudioSystem.play('static', { pos: [10.5, 1, -8], volume: 0.5 });
        await c.wait(900);
        await c.say(D.pcOn);
      })} />
      <mesh position={[10.5, 1.0, -8.16]}><planeGeometry args={[0.34, 0.26]} /><meshStandardMaterial color="#000" emissive={pcOn ? '#6fd88a' : '#000'} emissiveIntensity={pcOn ? 0.9 : 0} /></mesh>
      <Pickup item="pc_hint" position={[10.85, 0.78, -8.25]} verb="Read" />
      <Hotspot id="records_pc" position={[10.5, 1.0, -8.0]} size={[0.5, 0.4, 0.4]} prompt={pcSolved ? null : 'Use the records computer'} onInteract={() => game().openPuzzle('pc_password')} />
      <Pickup item="printed_attendance" position={[12.2, 1.12, -3.35]} hidden={!printing && !printed} verb="Take" onCollect={() => game().setFlag('c3_original', true)} />
      <HidingSpot id="pc_desk" position={[5.5, 0.4, -8.4]} view={[5.5, 0.5, -8.1]} exit={[5.5, 0, -6.6]} yaw={0} label="Hide under the desk" />

      {/* records office */}
      <Pickup item="official_report" position={[19.5, DESK_TOP, -7.9]} verb="Read" />
      <Hotspot
        id="compare_table" position={[22.85, DESK_TOP + 0.1, -5.5]} size={[1.6, 0.3, 2.0]}
        prompt={compared ? null : 'Reconstruct the attendance'}
        onInteract={() => game().openPuzzle('attendance')}
      />
      <Hotspot
        id="transfers" position={[28.25, 1.0, -6.2]} size={[0.2, 0.5, 0.8]}
        prompt={file ? null : 'Open the drawer marked "TRANSFERS"'}
        onInteract={() => {
          AudioSystem.play('locker');
          game().collect('alex_file', { open: true });
          game().setFlag('c3_file', true);
          ctx.run('file', async (c) => { await c.wait(400); await c.say(D.file); game().saveCheckpoint('file'); });
        }}
      />
      <Pickup item="archive_note" position={[33.1, 0.01, 1.3]} verb="Read" />
      <Pickup item="mara_enrollment" position={[28.3, 0.02, -9.6]} verb="Pull out" />
      <GhostGirl id="c3" position={[26.8, 0, -8.6]} rotationY={-Math.PI / 2 - 0.3} enabled={compared} />
      <HidingSpot id="rec_cab" position={[18.2, 0.9, -9.25]} view={[18.2, 1.0, -9.6]} exit={[18.2, 0, -8.4]} yaw={Math.PI} label="Squeeze behind the cabinets" />
      <BatteryPickup id="c3_rec" position={[23.0, DESK_TOP, -4.3]} />

      {/* archive */}
      <Trigger id="c3_enter_archive" min={[35, -4.5]} max={[41.5, 4.5]} enabled={archiveOpen} onEnter={() => {
        game().setFlag('c3_done', true);
        game().completeChapter();
      }} />

      <Teacher config={TEACHER_CFG} mode={hunt ? 'hunter' : 'stalker'} />
    </ChapterBase>
  );
}
