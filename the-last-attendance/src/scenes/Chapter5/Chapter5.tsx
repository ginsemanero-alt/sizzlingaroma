import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { PropModel } from '@/components/Environment/PropModel';
import { GlbCabinet } from '@/scenes/shared/props';
import { Atmosphere, Clock, Dust, EmergencyLight, FluoroLight, Sign } from '@/components/Environment/Props';
import { BatteryPickup, Door, HidingSpot, Pickup, Trigger } from '@/components/Interactions/WorldObjects';
import { Hotspot, Interactable } from '@/components/Interactions/Interactable';
import { Teacher } from '@/components/Enemies/Teacher';
import { GhostGirl } from '@/components/Characters/Ghosts';
import { ChapterBase, useFlag, useFlagEffect, useHas, useScript } from '@/scenes/ChapterBase';
import { DIALOGUE } from '@/data/dialogue';
import { ITEMS } from '@/data/items';
import { game, useGame } from '@/store/gameStore';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Horror } from '@/systems/HorrorEventSystem/HorrorEventSystem';
import { CollisionSystem } from '@/systems/CollisionSystem/CollisionSystem';
import { teacherControl, type TeacherConfig } from '@/systems/EnemyAISystem/TeacherBrain';
import { playRecording } from '@/systems/DialogueSystem/DialogueSystem';
import { canAttemptSecretTimeline } from '@/systems/EndingSystem/EndingSystem';
import { HIDDEN_CLUES, SECRET_RECORDS } from '@/data/items';

const D = DIALOGUE.c5;

const TEACHER_CFG: TeacherConfig = {
  bounds: [-1, -11, 31, 13],
  waypoints: [[3, 0], [15, 0], [27, 0], [12, 5], [20, 9.5], [16, 4], [9, -6]],
  patrolSpeed: 1.3,
  chaseSpeed: 3.2,
  sight: 12,
};

function buildLevel(): LevelBuilder {
  const b = new LevelBuilder();
  // corridor
  b.floor(0, -2, 30, 2, 'tile');
  b.ceil(0, -2, 30, 2);
  b.wall(0, -2, 0, 2, {});
  b.wall(30, -2, 30, 2, {});
  b.wall(0, -2, 30, -2, { openings: [{ at: 9, w: 1.1, h: 2.2 }] });
  b.wall(0, 2, 30, 2, { openings: [{ at: 16, w: 2.2, h: 2.4 }] });
  // principal's office
  b.room(4, -10, 14, -2, { skip: ['s'], floor: 'floorWood', upper: 'plaster', w: [{ at: 4, w: 1.6, h: 1.3, y: 1.0 }], e: [{ at: 2.5, w: 1.2, h: 2.2 }] });
  b.teacherDesk(9, -7.2, 0);
  b.chair(9, -8, 2);
  b.chair(8.4, -5.8, 0); b.chair(9.6, -5.8, 0);
  b.cabinet(4.4, -4, 3, 0.9, 1.9, 0.5, 'darkwood', false);
  b.cabinet(12.5, -9.65, 2, 0.9, 1.6, 0.5, 'darkwood', false);
  b.box(9, 2.1, -9.88, 1.4, 0.9, 0.05, 'darkwood'); // diploma frame
  b.table(6, -9.2, 1.2, 0.6, 0.6, 'darkwood');
  // hidden storage (behind the bookshelf, east of the office)
  b.room(14, -10, 18, -5, { floor: 'concrete', lower: null, upper: 'concrete', skip: ['w'] });
  b.box(16, 0.3, -9.4, 1.0, 0.6, 0.6, 'paper', '#8a7552');
  b.box(17.4, 0.25, -6, 0.5, 0.5, 0.6, 'paper', '#8a7552');
  b.debris(16, -7.5, 3, 10);
  // records archive (south)
  b.room(8, 2, 24, 12, { skip: ['n'], floor: 'concrete', lower: null, upper: 'concrete' });
  for (let r = 0; r < 3; r++) {
    b.bookshelf(11.5, 5 + r * 2.6, 0, 3, 2.3, 0.35);
    b.bookshelf(20.5, 5 + r * 2.6, 0, 3, 2.3, 0.35);
  }
  b.table(16, 6.5, 1.8, 1.0, 0.78, 'darkwood'); // attendance book table
  b.table(16, 10.8, 1.6, 0.8, 0.75, 'wood'); // daniel's box
  b.box(16, 0.95, 10.8, 0.5, 0.35, 0.4, 'paper', '#9a8458');
  b.box(23.9, 1.6, 7, 0.06, 1.4, 2.6, 'darkwood'); // timeline cork board
  b.debris(16, 4, 8, 20);
  b.lockers(25, -1.75, 2, 5);
  return b;
}

/** The bookshelf that hides the storage room. Slides aside when pushed. */
function SecretShelf({ open, onPush }: { open: boolean; onPush: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(open ? 1 : 0);
  useEffect(() => {
    if (open) return;
    const id = CollisionSystem.add({ minX: 13.55, maxX: 14.0, minZ: -8.2, maxZ: -6.8, minY: 0, maxY: 2.2, opaque: true }, 'secret_shelf');
    return () => CollisionSystem.remove(id);
  }, [open]);
  useFrame((_, dt) => {
    if (open && t.current < 1) t.current = Math.min(1, t.current + dt * 0.5);
    if (ref.current) ref.current.position.z = -7.5 + t.current * 1.45;
  });
  const books = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ y: 0.25 + Math.floor(i / 6) * 0.42, z: -0.55 + (i % 6) * 0.2, c: ['#5a2a22', '#2c3f5c', '#4b5a2a', '#7a6a3a', '#3a2a40'][i % 5] })), []);
  return (
    <group ref={ref} position={[13.78, 0, -7.5]}>
      <mesh position={[0.1, 1.1, 0]} castShadow><boxGeometry args={[0.08, 2.2, 1.4]} /><meshStandardMaterial color="#3a2a1e" /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[0, 0.05 + i * 0.42, 0]}><boxGeometry args={[0.36, 0.03, 1.4]} /><meshStandardMaterial color="#3a2a1e" /></mesh>)}
      {books.map((bk, i) => <mesh key={i} position={[-0.02, bk.y + 0.12, bk.z]}><boxGeometry args={[0.24, 0.26, 0.05]} /><meshStandardMaterial color={bk.c} /></mesh>)}
      {!open && (
        <Interactable id="secret_shelf" position={[-0.25, 1.1, 0]} radius={0.6} prompt="Push the bookshelf" onInteract={onPush}>
          <mesh userData={{ noHighlight: true }}><boxGeometry args={[0.1, 0.5, 0.5]} /><meshBasicMaterial visible={false} /></mesh>
        </Interactable>
      )}
    </group>
  );
}

export default function Chapter5() {
  const ctx = useScript();
  const builder = useMemo(buildLevel, []);
  const collected = useGame((s) => s.collected);
  const shelfOpen = useFlag('c5_shelf');
  const confession = useFlag('c5_confession');
  const altered = useFlag('c5_altered');
  const danielMsg = useFlag('c5_daniel');
  const timeline = useFlag('c5_timeline');
  const secretSolved = useFlag('puzzle_secret_timeline');
  const letter = useHas('reyes_letter');
  const done = useFlag('c5_done');
  const docs = ['principal_memo', 'draft_report'].filter((i) => collected.includes(i)).length;

  const checkDocs = () => {
    if (['principal_memo', 'draft_report'].every((i) => game().has(i))) game().setFlag('c5_docs', true);
  };

  useFlagEffect('puzzle_timeline', () => {
    game().setFlag('c5_timeline', true);
    game().collect('timeline_reconstructed', { open: true });
    AudioSystem.play('paper', { pos: [16, 0.9, 6.5] });
    ctx.run('timeline', async (c) => {
      await c.wait(500);
      await c.line('alex', 'Something slipped out from the back of the attendance book. A page in her handwriting.');
      game().saveCheckpoint('timeline');
    });
  });

  useFlagEffect('puzzle_secret_timeline', () => {
    game().collect('secret_timeline', { open: true });
    ctx.run('secret', async (c) => { await c.wait(400); await c.line('alex', 'Twelve students. One teacher. And one name nobody ever wrote down.'); game().saveCheckpoint('secret'); });
  });

  const hunt = confession && !timeline;

  return (
    <ChapterBase
      chapter={5}
      ctx={ctx}
      spawn={[1.5, 0]}
      yaw={-Math.PI / 2}
      ambience={[{ name: 'roomtone', volume: 1 }, { name: 'rain', volume: 0.3 }, { name: 'drone', volume: 0.4 }]}
      events={['footsteps', 'whisper', 'knock', 'creak', 'flicker', 'cry', 'static', 'thunder']}
      intro={async (c) => { await c.wait(500); await c.say(D.intro); }}
    >
      <Atmosphere fog="#0b0b12" density={0.06} ambientIntensity={0.3} hemiIntensity={0.3} />
      <StaticLevel builder={builder} />
      <GlbCabinet x={4.4} z={-4} r={3} tint="#b08a6a" />
      <GlbCabinet x={12.5} z={-9.65} r={2} h={1.6} tint="#b08a6a" />
      <Dust />

      <FluoroLight position={[4, 3.18, 0]} flicker="subtle" />
      <FluoroLight position={[15, 3.18, 0]} flicker="broken" />
      <FluoroLight position={[26, 3.18, 0]} flicker="subtle" intensity={4} />
      <pointLight position={[9.6, 1.25, -7.4]} intensity={4} distance={7} color="#ffb860" />
      <mesh position={[9.6, 1.05, -7.4]}><coneGeometry args={[0.12, 0.16, 12, 1, true]} /><meshStandardMaterial color="#2a4a2a" emissive="#ffb860" emissiveIntensity={0.6} side={THREE.DoubleSide} /></mesh>
      <FluoroLight position={[16, 3.18, 5]} flicker="broken" intensity={4} />
      <FluoroLight position={[16, 3.18, 10]} flicker="subtle" intensity={3} color="#fff0d0" />
      <EmergencyLight position={[16, 2.8, -9.8]} color="#ff5a3a" intensity={shelfOpen ? 1.6 : 0} distance={5} />
      <pointLight position={[22.5, 2.4, 7]} intensity={2} distance={5} color="#ffd8a0" />

      <Door id="office" position={[9, 0, -2]} axis="x" color="#3b2a1e" />
      <Door id="archive" position={[16, 0, 2]} axis="x" width={2.2} double metal color="#4a4f52" />

      <Sign position={[9, 2.45, -1.88]} size={[1.6, 0.22]} lines={['OFFICE OF THE PRINCIPAL']} bg="#3b2a1e" color="#e8d9b0" />
      <Sign position={[16, 2.65, 1.88]} rotation={[0, Math.PI, 0]} size={[1.6, 0.25]} lines={['RECORDS ARCHIVE']} bg="#2b3a2b" color="#ddd" />
      <Sign position={[9, 2.1, -9.84]} size={[1.3, 0.8]} lines={['R. VILLANUEVA', 'PRINCIPAL IV', 'Outstanding School Head', '2017']} bg="#e9dfc5" />
      <Sign position={[23.85, 1.6, 7]} rotation={[0, -Math.PI / 2, 0]} size={[2.5, 1.3]} lines={timeline ? ['6:00 · 7:10 · 7:30 · 7:38', '7:44 · 7:49 · 8:05'] : ['MARCH 9, 2018', '?']} bg="#9a7a52" color="#1e140c" />
      <Clock position={[13.88, 2.5, -4]} rotation={[0, -Math.PI / 2, 0]} />
      <Clock position={[8.12, 2.5, 8]} rotation={[0, Math.PI / 2, 0]} />

      {/* principal's office */}
      <Pickup item="principal_memo" position={[8.6, 0.8, -7.3]} verb="Read" onCollect={checkDocs} />
      <Hotspot id="desk_drawer" position={[9, 0.6, -6.75]} size={[1.2, 0.4, 0.3]} prompt={collected.includes('draft_report') ? null : 'Search the desk drawers'} onInteract={() => {
        AudioSystem.play('locker', { volume: 0.5 });
        game().collect('draft_report', { open: true });
        checkDocs();
      }} />
      <Interactable id="tape_player" position={[9.9, 0.86, -7.4]} radius={0.2} prompt={confession ? 'Play side A again' : 'Play the cassette'} onInteract={() => {
        game().collect('confession_a');
        ctx.run('confession', async (c) => {
          await playRecording(c, ITEMS.confession_a.recording!);
          if (!game().flags.c5_confession) {
            game().setFlag('c5_confession', true);
            Horror.flicker(1.2, 0.8);
            AudioSystem.play('stinger', { volume: 0.5 });
            await c.line('alex', 'He kept the book. He hid it — and then he hid the rest of us.');
            game().saveCheckpoint('confession');
          }
        });
      }}>
        <Suspense fallback={<mesh><boxGeometry args={[0.3, 0.1, 0.18]} /><meshStandardMaterial color="#2a2a2a" /></mesh>}>
          <PropModel model="prop_cassette_deck" position={[0, -0.07, 0]} width={0.36} rotationY={Math.PI} lift={0.08} />
        </Suspense>
        <mesh userData={{ noHighlight: true }}><boxGeometry args={[0.36, 0.14, 0.26]} /><meshBasicMaterial visible={false} /></mesh>
      </Interactable>
      <Hotspot id="mirror" position={[4.15, 1.6, -7.5]} size={[0.1, 0.8, 0.6]} prompt={collected.includes('cracked_mirror') ? null : 'Look in the mirror'} onInteract={() => {
        game().collect('cracked_mirror');
        AudioSystem.play('glass', { volume: 0.4 });
        ctx.run('mirror', (c) => c.say(D.mirror));
      }} />
      <mesh position={[4.12, 1.6, -7.5]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.55, 0.75]} /><meshStandardMaterial color="#8d9aa6" metalness={1} roughness={0.12} /></mesh>
      <BatteryPickup id="c5_office" position={[6, 0.62, -9.2]} />
      <HidingSpot id="office_desk" position={[9, 0.4, -7.6]} view={[9, 0.55, -7.2]} exit={[10.4, 0, -6.2]} yaw={0} label="Hide under the desk" />
      <SecretShelf open={shelfOpen} onPush={() => {
        game().setFlag('c5_shelf', true);
        AudioSystem.play('chair', { pos: [13.8, 1, -7.5], rate: 0.6 });
        ctx.run('shelf', (c) => c.say(D.shelf));
      }} />
      <GhostGirl id="c5" position={[12.6, 0, -5.4]} rotationY={-Math.PI / 2 - 0.4} enabled={docs >= 1} />

      {/* hidden storage */}
      <Pickup item="confession_b" position={[16, 0.62, -9.4]} verb="Take" onCollect={() => ctx.run('sideB', (c) => playRecording(c, ITEMS.confession_b.recording!))} />
      <Hotspot id="secret_board" position={[17.85, 1.5, -7.5]} size={[0.2, 1, 1.6]} prompt={secretSolved ? null : 'Examine the pinned papers'} onInteract={() => {
        if (canAttemptSecretTimeline(game().collected)) game().openPuzzle('secret_timeline');
        else {
          const all = [...SECRET_RECORDS, ...HIDDEN_CLUES];
          const have = all.filter((k) => game().has(k)).length;
          ctx.run('secretNo', (c) => c.line('alex', `Dates, names, half a story. I don't have enough records to make sense of this. (${have}/${all.length} unrecorded clues found)`));
        }
      }} />
      <Sign position={[17.88, 1.5, -7.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.6, 1.0]} lines={secretSolved ? ['THE UNRECORDED', '12 + 1 + 1'] : ['11/20/17 · 1/22/18 · 2/26/18', '3/9 · 3/10 · 3/12']} bg="#8a7552" color="#1e140c" />

      {/* archive */}
      <Interactable id="attendance_book" position={[16, 0.85, 6.5]} radius={0.3} prompt={altered ? null : 'Open the attendance book'} onInteract={() => {
        game().collect('altered_attendance', { open: true });
        game().setFlag('c5_altered', true);
        AudioSystem.play('paper');
        ctx.run('altered', async (c) => { await c.wait(300); await c.say(D.altered); game().saveCheckpoint('altered'); });
      }}>
        <mesh><boxGeometry args={[0.36, 0.06, 0.26]} /><meshStandardMaterial color="#3b2418" /></mesh>
      </Interactable>
      <Interactable id="daniel_box" position={[16, 1.15, 10.8]} radius={0.3} prompt={danielMsg ? 'Play Daniel\'s tape again' : 'Open the box: "CRUZ, D. — UNCLAIMED"'} onInteract={() => {
        game().collect('daniel_final_message');
        ctx.run('daniel', async (c) => {
          Horror.flicker(0.6, 0.5);
          await playRecording(c, ITEMS.daniel_final_message.recording!);
          if (!game().flags.c5_daniel) { game().setFlag('c5_daniel', true); game().saveCheckpoint('daniel'); }
        });
      }}>
        <mesh><boxGeometry args={[0.16, 0.06, 0.1]} /><meshStandardMaterial color="#1d1d1f" /></mesh>
      </Interactable>
      <Hotspot id="timeline_board" position={[23.75, 1.6, 7]} size={[0.2, 1.3, 2.5]} prompt={timeline ? null : 'Pin the incident timeline'} onInteract={() => {
        const need = ['c5_docs', 'c5_confession', 'c5_altered', 'c5_daniel'].filter((f) => !game().flags[f]);
        if (need.length) { ctx.run('tlNo', (c) => c.line('alex', 'I don\'t have the whole story yet. The principal\'s papers, the tape, the attendance book, Daniel\'s things...')); return; }
        game().openPuzzle('timeline');
      }} />
      <Pickup item="reyes_letter" position={[16.4, 0.82, 6.6]} hidden={!timeline} verb="Read" onCollect={() => {
        ctx.run('purpose', async (c) => {
          await c.wait(600);
          c.lock(true);
          teacherControl.brain?.setMode('stalker');
          teacherControl.brain?.place(16, 9, 0);
          AudioSystem.play('bass_hit', { volume: 0.5 });
          c.lookAt(16, 1.5, 9);
          await c.wait(1200);
          await c.say(D.reyesPurpose);
          await c.fade(1, 2500);
          c.lock(false);
          game().setFlag('c5_done', true);
          game().completeChapter();
        });
      }} />
      <HidingSpot id="arch_table" position={[16, 0.4, 10.4]} view={[16, 0.55, 10.8]} exit={[16, 0, 9.6]} yaw={Math.PI} label="Hide under the table" />
      <BatteryPickup id="c5_arch" position={[22, 0.02, 11]} />
      <Trigger id="c5_archive_enter" min={[8.5, 2.5]} max={[23.5, 11.5]} onEnter={() => Horror.around('cry', 6, 0.6, false)} />

      <Teacher config={TEACHER_CFG} mode={done || letter ? 'stalker' : hunt ? 'hunter' : 'stalker'} />
    </ChapterBase>
  );
}
