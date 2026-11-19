import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useNavigate, useParams } from 'react-router-dom';
import { ENDINGS } from '@/data/endings';
import type { EndingId } from '@/types';
import { CHARACTERS, ROLL_CALL } from '@/data/characters';
import { useGame } from '@/store/gameStore';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { Atmosphere, ChalkText, Dust, Sign, Sky } from '@/components/Environment/Props';
import { ROOM_2018, roomAt } from '@/scenes/shared/room13Sets';
import { EnvModel } from '@/components/Environment/EnvModel';
import { Memorial, Room13Clutter } from '@/scenes/shared/clutter';
import { SchoolFrontModels, SchoolFrontSigns, addSchoolFront } from '@/scenes/shared/schoolFront';
import { KEEPSAKES } from '@/data/items';
import { GhostStudent } from '@/components/Characters/Ghosts';
import { STUDENT_LOOKS, type HumanoidHandle } from '@/components/Characters/Humanoid';
import { ModelCharacter } from '@/components/Characters/ModelCharacter';
import { textTexture } from '@/components/Environment/textures';
import { AudioSystem, VoiceSystem } from '@/systems/AudioSystem/AudioSystem';
import { Exposure, PostFX } from '@/components/Effects/PostFX';
import { runtime } from '@/systems/runtime';

function CameraRig({ from, to, look, duration = 30 }: { from: [number, number, number]; to: [number, number, number]; look: [number, number, number]; duration?: number }) {
  const { camera } = useThree();
  const t = useRef(0);
  useFrame((_, dt) => {
    runtime.time += dt;
    t.current = Math.min(1, t.current + dt / duration);
    const k = t.current * t.current * (3 - 2 * t.current);
    camera.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k);
    camera.lookAt(...look);
  });
  return null;
}

/** PRESENT: the 2018 classroom model in morning light; the class fades away. */
const ROOM_MORNING = roomAt(ROOM_2018, 0, 0);
function MorningRoom() {
  const [ghostsOn, setGhostsOn] = useState(true);
  useEffect(() => { const t = window.setTimeout(() => setGhostsOn(false), 9000); return () => window.clearTimeout(t); }, []);
  return (
    <>
      <Suspense fallback={null}><EnvModel model="env_classroom" position={[0, 0, 0]} rotationY={ROOM_2018.rotationY} /><Room13Clutter room={ROOM_MORNING} fans /></Suspense>
      <ambientLight intensity={0.8} color="#ffe6c4" />
      <hemisphereLight args={['#fff2dc', '#6a5a40', 0.6]} />
      <directionalLight position={[-14, 7, -2]} intensity={3.2} color="#ffd9a0" castShadow />
      <color attach="background" args={['#e2d2b0']} />
      <fogExp2 attach="fog" args={['#e2d2b0', 0.015]} />
      <Dust count={300} color="#fff2d0" size={0.03} />
      <ChalkText position={ROOM_MORNING.boardFront(1.55)} rotation={[0, ROOM_MORNING.boardRotY, 0]} size={[3.4, 1.0]} lines={['PRESENT: 12', 'ABSENT: 0']} color="#f4f4ee" />
      {ROOM_2018.seats.slice(0, 11).map((l, i) => (
        <GhostStudent key={i} position={ROOM_MORNING.p(l)} rotationY={ROOM_MORNING.studentYaw} pose="stand" look={i % 2 ? STUDENT_LOOKS.girl : STUDENT_LOOKS.boy} visible={ghostsOn} color="#ffe2b0" />
      ))}
    </>
  );
}

/** THE NEW STUDENT: the crumbling classroom; Ms. Reyes walks to your desk and leaves an ID. */
function NewStudentRoom() {
  const teacher = useRef<HumanoidHandle>(null);
  const tz = useRef(-4.5);
  useFrame((_, dt) => {
    if (!teacher.current?.group) return;
    tz.current = Math.min(1.6, tz.current + dt * 0.4);
    teacher.current.group.position.set(0.15, 0, tz.current);
    teacher.current.walk(tz.current < 1.55 ? 0.6 : 0);
  });
  return (
    <>
      <Suspense fallback={null}><EnvModel model="env_old_classroom" position={[0, 0, 0]} tint="#7d8494" /></Suspense>
      <Atmosphere fog="#05060a" density={0.07} ambientIntensity={0.22} hemiIntensity={0.22} />
      <pointLight position={[0, 2.4, 0.5]} intensity={4} distance={8} color="#9fb6ff" />
      {[[-2.2, -1.2], [2.0, -1.4], [-2.4, 0.9], [2.3, 0.6], [-0.9, -2.6], [1.1, -2.9]].map(([x, z], i) => (
        <GhostStudent key={i} position={[x, 0, z]} rotationY={0} pose="stand" look={i % 2 ? STUDENT_LOOKS.girl : STUDENT_LOOKS.boy} color="#7f9cff" />
      ))}
      <ModelCharacter ref={teacher} model="teacher" position={[0.15, 0, -4.5]} rotationY={Math.PI} tint="#cfcac4" />
      {/* your desk */}
      <mesh position={[0, 0.72, 2.85]} castShadow><boxGeometry args={[0.6, 0.04, 0.45]} /><meshStandardMaterial color="#5a4030" /></mesh>
      {[[-0.26, 2.66], [0.26, 2.66], [-0.26, 3.04], [0.26, 3.04]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]}><boxGeometry args={[0.03, 0.72, 0.03]} /><meshStandardMaterial color="#333" /></mesh>
      ))}
      <IdCard position={[0.05, 0.745, 2.8]} />
    </>
  );
}

function IdCard({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => textTexture(['BUBOG NATIONAL HIGH SCHOOL', 'SEMANERO, JASMINE', 'GRADE 12 – SAMPAGUITA', 'NEW STUDENT'], { w: 512, h: 320, bg: '#e8eef5', size: 28, color: '#1a2a3a' }), []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0.2]}>
      <planeGeometry args={[0.2, 0.125]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} />
    </mesh>
  );
}

/** ABSENT: walking away from the gate of the same school front as Chapter 1, at dawn. */
function GateScene() {
  const b = useMemo(() => {
    const lb = new LevelBuilder();
    addSchoolFront(lb);
    lb.box(0, 3.5, 2.6, 43.6, 6.9, 6.6, 'black'); // the dark school behind the windows and the open door
    return lb;
  }, []);
  return (
    <>
      <StaticLevel builder={b} />
      <Suspense fallback={null}>
        <SchoolFrontModels tint="#8a8698" />
        {/* Mang Tonyo, the guard, and the candles people still leave at the gate */}
        <ModelCharacter model="guard" position={[2.7, 0, 37.4]} rotationY={Math.PI + 0.4} tint="#d0c8c0" />
        <Memorial position={[-1.4, 0, 36.6]} />
      </Suspense>
      <SchoolFrontSigns />
      <Sky />
      <ambientLight intensity={0.5} color="#b8a7c9" />
      <directionalLight position={[-10, 6, 60]} intensity={1.4} color="#ffb98a" />
      <color attach="background" args={['#5b5468']} />
      <fogExp2 attach="fog" args={['#5b5468', 0.014]} />
    </>
  );
}

function ArchiveScene() {
  const b = useMemo(() => {
    const lb = new LevelBuilder();
    lb.room(-6, -14, 6, 2, { floor: 'concrete', lower: null, upper: 'concrete' });
    for (let r = 0; r < 4; r++) {
      lb.bookshelf(-3.2, -2 - r * 3, 0, 3.2, 2.4, 0.4);
      lb.bookshelf(3.2, -2 - r * 3, 0, 3.2, 2.4, 0.4);
    }
    return lb;
  }, []);
  const names = [...ROLL_CALL.map((r) => `${r.surname.toUpperCase()}, ${r.first}`), 'REYES, Elena (adviser)', 'DIZON, Mara'];
  return (
    <>
      <StaticLevel builder={b} />
      <ambientLight intensity={0.35} color="#ffe2b8" />
      <pointLight position={[0, 2.8, -4]} intensity={8} distance={14} color="#ffd8a0" />
      <pointLight position={[0, 2.8, -10]} intensity={6} distance={12} color="#ffd8a0" />
      <color attach="background" args={['#0b0906']} />
      <fogExp2 attach="fog" args={['#0b0906', 0.05]} />
      {names.map((n, i) => (
        <Sign key={n} position={[i % 2 ? 1.55 : -1.55, 1.0 + (i % 3) * 0.45, -1.8 - Math.floor(i / 2) * 1.7]} rotation={[0, i % 2 ? -Math.PI / 2 : Math.PI / 2, 0]} size={[0.9, 0.26]} lines={[n]} bg={i === names.length - 1 ? '#e9d48a' : '#d8cfb4'} fontSize={26} />
      ))}
      <Dust count={250} color="#ffe8c0" />
    </>
  );
}

/** Cinematic ending: 3D scene, closing dialogue, epilogue text, then credits. */
export function EndingScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ending = ENDINGS[(id as EndingId) ?? 'present'] ?? ENDINGS.present;
  const subsOn = useGame((s) => s.settings.subtitles);
  const lang = useGame((s) => s.settings.subtitleLanguage);
  const graphics = useGame((s) => s.settings.graphics);
  const [lineIdx, setLineIdx] = useState(-1);
  const [phase, setPhase] = useState<'lines' | 'epilogue'>('lines');
  const returned = useGame((s) => KEEPSAKES.filter((k) => s.collected.includes(k)).length);

  useEffect(() => {
    useGame.getState().unlockEnding(ending.id);
    AudioSystem.stopAll();
    if (ending.id === 'present') AudioSystem.loop('morning', 0.9, 4000);
    else if (ending.id === 'unrecorded') { AudioSystem.loop('morning', 0.6, 4000); AudioSystem.loop('roomtone', 0.6, 3000); }
    else if (ending.id === 'absent') { AudioSystem.loop('wind', 0.7, 3000); AudioSystem.loop('insects', 0.5, 3000); }
    else { AudioSystem.loop('drone', 0.9, 3000); AudioSystem.loop('roomtone', 0.8, 3000); }
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 2500));
      for (let i = 0; i < ending.lines.length && !cancelled; i++) {
        const l = ending.lines[i];
        setLineIdx(i);
        const ch = CHARACTERS[l.s];
        if (l.s !== 'narrator' && l.s !== 'alex') VoiceSystem.speak(l.lang === 'fil' && l.fil ? l.fil : l.en, ch.voice.pitch, ch.voice.rate, ch.voice.preferFemale, l.lang ?? 'en');
        if (ending.id === 'absent' && l.s === 'reyes') AudioSystem.play('chalk', { volume: 0.6 });
        await new Promise((r) => setTimeout(r, l.d ?? Math.max(2600, 1000 + l.en.split(' ').length * 380)));
      }
      if (cancelled) return;
      setLineIdx(-1);
      if (ending.id === 'new_student') AudioSystem.play('door_slam');
      if (ending.id === 'absent') AudioSystem.play('bell', { volume: 0.4 });
      setPhase('epilogue');
    })();
    return () => { cancelled = true; AudioSystem.stopAllLoops(800); VoiceSystem.cancel(); };
  }, [ending]);

  const line = lineIdx >= 0 ? ending.lines[lineIdx] : null;
  const scene = ending.id === 'present' ? (
    <><MorningRoom /><CameraRig from={[0.5, 1.6, 4.4]} to={[0.2, 1.7, 2.2]} look={[0, 1.4, -5]} /></>
  ) : ending.id === 'new_student' ? (
    <><NewStudentRoom /><CameraRig from={[0, 1.15, 3.35]} to={[0, 1.1, 3.3]} look={[0, 0.75, 1.6]} duration={20} /></>
  ) : ending.id === 'absent' ? (
    <><GateScene /><CameraRig from={[0, 1.7, 40.5]} to={[0, 1.8, 52]} look={[0, 3.2, 6]} duration={40} /></>
  ) : (
    <><ArchiveScene /><CameraRig from={[0, 1.6, 1]} to={[0, 1.6, -11]} look={[0, 1.3, -14]} duration={45} /></>
  );

  return (
    <div className="screen">
      <Canvas dpr={graphics === 'high' ? [1, 2] : [1, 1.5]} camera={{ fov: 60, position: [0, 1.6, 0] }} shadows={graphics !== 'low'} onCreated={({ gl }) => { gl.localClippingEnabled = true; }}>
        <Exposure />
        {scene}
        <PostFX />
      </Canvas>
      {ending.id === 'absent' && phase === 'epilogue' && <AbsentBookPage />}
      <div className="ending-screen">
        {line && subsOn && (
          <div className="subtitle bg" style={{ bottom: '40vh' }} key={lineIdx}>
            {CHARACTERS[line.s].name && <span className="who" style={{ color: CHARACTERS[line.s].color }}>{CHARACTERS[line.s].name}</span>}
            {lang === 'fil' && line.fil ? line.fil : line.en}
          </div>
        )}
        {phase === 'epilogue' && (
          <>
            <div className="ending-type">ENDING {ending.number} · {ending.type.toUpperCase()}</div>
            <h1 className="ending-title">{ending.title}</h1>
            <div className="epilogue">
              {ending.epilogue.map((p, i) => <p key={i} style={{ animationDelay: `${1 + i * 2.2}s` }}>{p}</p>)}
              {returned > 0 && (
                <p style={{ animationDelay: `${1 + ending.epilogue.length * 2.2}s`, color: 'var(--muted)' }}>
                  {returned === KEEPSAKES.length
                    ? `Belongings returned: ${returned}/${KEEPSAKES.length}. Every one of them went home to their families: the things the school said were never found.`
                    : `Belongings returned: ${returned}/${KEEPSAKES.length}. Somewhere in Bubog National High School, the rest are still waiting.`}
                </p>
              )}
            </div>
            <div className="row interactive" style={{ marginTop: 22, pointerEvents: 'auto', animation: `fadeIn 1s ${2 + ending.epilogue.length * 2.2}s both` }}>
              <button className="btn primary" onClick={() => navigate('/credits')}>Credits</button>
              <button className="btn" onClick={() => navigate('/')}>Main menu</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AbsentBookPage() {
  return (
    <div style={{ position: 'fixed', right: '8vw', top: '12vh', zIndex: 21, width: 320, animation: 'fadeIn 2s both' }}>
      <div className="paper" style={{ fontSize: 14 }}>
        {'EVENING ATTENDANCE — ROOM 13\n\n'}
        {ROLL_CALL.map((r) => `${r.surname}, ${r.first[0]}. ........ ABSENT\n`).join('')}
        <span style={{ color: '#7a1414', animation: 'fadeIn 3s 3s both', display: 'inline-block' }}>{'Semanero, J. ......... ABSENT'}</span>
      </div>
    </div>
  );
}
