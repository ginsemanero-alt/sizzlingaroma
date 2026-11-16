import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useNavigate, useParams } from 'react-router-dom';
import { ENDINGS } from '@/data/endings';
import type { EndingId } from '@/types';
import { CHARACTERS, ROLL_CALL } from '@/data/characters';
import { useGame } from '@/store/gameStore';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { Atmosphere, ChalkText, Dust, Sign, Sky } from '@/components/Environment/Props';
import { addRoom13, room13Seats } from '@/scenes/shared/schoolParts';
import { GhostStudent } from '@/components/Characters/Ghosts';
import { Humanoid, STUDENT_LOOKS, type HumanoidHandle } from '@/components/Characters/Humanoid';
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

function Room13Scene({ morning, ghosts, teacherWalk }: { morning: boolean; ghosts: boolean; teacherWalk: boolean }) {
  const b = useMemo(() => { const lb = new LevelBuilder(); addRoom13(lb, 0, 0, { extraDesk: true }); return lb; }, []);
  const seats = room13Seats(0, 0);
  const teacher = useRef<HumanoidHandle>(null);
  const [ghostsOn, setGhostsOn] = useState(ghosts);
  const tz = useRef(-6.6);
  useEffect(() => { if (morning && ghosts) { const t = window.setTimeout(() => setGhostsOn(false), 9000); return () => window.clearTimeout(t); } }, [morning, ghosts]);
  useFrame((_, dt) => {
    if (!teacherWalk || !teacher.current?.group) return;
    tz.current = Math.min(-3.9, tz.current + dt * 0.35);
    teacher.current.group.position.set(8.9 - (tz.current + 6.6) * 0.05, 0, tz.current);
    teacher.current.walk(tz.current < -3.95 ? 0.5 : 0);
  });
  return (
    <>
      <StaticLevel builder={b} />
      {morning ? (
        <>
          <ambientLight intensity={0.9} color="#ffe6c4" />
          <directionalLight position={[20, 8, -4]} intensity={3.2} color="#ffd9a0" castShadow />
          <color attach="background" args={['#d9c7a4']} />
          <fogExp2 attach="fog" args={['#d9c7a4', 0.02]} />
          <Dust count={300} color="#fff2d0" size={0.03} />
        </>
      ) : (
        <Atmosphere fog="#05060a" density={0.08} ambientIntensity={0.18} hemiIntensity={0.2} />
      )}
      <ChalkText position={[5, 1.65, -8.33]} lines={morning ? ['PRESENT: 12', 'ABSENT: 0'] : ['WELCOME, NEW STUDENT']} />
      {ghostsOn && seats.slice(0, 11).map((s, i) => (
        <GhostStudent key={i} position={[s.x, 0, s.z + 0.15]} look={i % 2 ? STUDENT_LOOKS.girl : STUDENT_LOOKS.boy} visible={ghostsOn} color={morning ? '#ffe2b0' : '#7f9cff'} />
      ))}
      {!morning && (
        <Humanoid ref={teacher} position={[8.9, 0, -6.6]} rotationY={Math.PI} pose="book" skin="#d6cfc6" shirt="#d9d3c4" bottom="#2b2a35" hair="#060505" hairStyle="long" skirt eyes="dark" />
      )}
      {!morning && <pointLight position={[9, 2.2, -2.5]} intensity={3} distance={6} color="#9fb6ff" />}
      {!morning && <IdCard position={[9.15, 0.735, -1.0]} />}
    </>
  );
}

function IdCard({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => textTexture(['SAN AURELIO HIGH SCHOOL', 'MERCADO, ALEX R.', 'GRADE 12 – SAMPAGUITA', 'NEW STUDENT'], { w: 512, h: 320, bg: '#e8eef5', size: 34, color: '#1a2a3a' }), []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0.2]}>
      <planeGeometry args={[0.2, 0.125]} />
      <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} />
    </mesh>
  );
}

function GateScene() {
  const b = useMemo(() => {
    const lb = new LevelBuilder();
    lb.floor(-20, -20, 20, 20, 'concrete');
    lb.wall(-20, -10, 20, -10, { h: 7, lower: 'paintLower', openings: [{ at: 20, w: 2.4, h: 2.5 }] });
    for (let i = 0; i < 8; i++) lb.box(-14 + i * 4, 4.6, -10.12, 1.6, 1.3, 0.05, 'glass');
    lb.box(0, 1.5, 6, 0.15, 3, 0.15, 'rust');
    for (let i = -10; i <= 10; i++) if (Math.abs(i) > 1) lb.box(i * 0.5, 1.2, 6, 0.06, 2.4, 0.06, 'rust');
    return lb;
  }, []);
  return (
    <>
      <StaticLevel builder={b} />
      <Sky />
      <ambientLight intensity={0.45} color="#b8a7c9" />
      <directionalLight position={[-10, 4, 20]} intensity={1.4} color="#ffb98a" />
      <color attach="background" args={['#5b5468']} />
      <fogExp2 attach="fog" args={['#5b5468', 0.04]} />
      <Sign position={[0, 3.3, -9.88]} size={[5, 0.6]} lines={['SAN AURELIO HIGH SCHOOL']} bg="#cfc6a8" />
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
    <><Room13Scene morning ghosts teacherWalk={false} /><CameraRig from={[2, 1.6, -0.6]} to={[5, 1.7, -2]} look={[5, 1.4, -8]} /></>
  ) : ending.id === 'new_student' ? (
    <><Room13Scene morning={false} ghosts teacherWalk /><CameraRig from={[9.1, 1.15, -0.55]} to={[9.1, 1.1, -0.6]} look={[9.0, 0.7, -2.0]} duration={20} /></>
  ) : ending.id === 'absent' ? (
    <><GateScene /><CameraRig from={[0, 1.7, 14]} to={[0, 1.8, 24]} look={[0, 2.5, -10]} duration={40} /></>
  ) : (
    <><ArchiveScene /><CameraRig from={[0, 1.6, 1]} to={[0, 1.6, -11]} look={[0, 1.3, -14]} duration={45} /></>
  );

  return (
    <div className="screen">
      <Canvas dpr={graphics === 'high' ? [1, 2] : [1, 1.5]} camera={{ fov: 60, position: [0, 1.6, 0] }} shadows={graphics !== 'low'}>
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
        <span style={{ color: '#7a1414', animation: 'fadeIn 3s 3s both', display: 'inline-block' }}>{'Mercado, A. ......... ABSENT'}</span>
      </div>
    </div>
  );
}
