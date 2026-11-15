import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { ENDINGS } from '../../data/endings';
import type { EndingId, Line } from '../../data/types';
import { HouseShell, Yard } from '../shared/house';
import { Rain } from '../../components/Environment/Atmosphere';
import { LevelGeometry } from '../../components/Environment/LevelGeometry';
import { Desk, Bed, Recorder, Frame, Rug, ToyBear, MusicBox } from '../../components/Environment/Props';
import { Humanoid } from '../../components/Enemies/Humanoid';
import { setAmbience, setMusic, speak, stopAll, play, uiClick } from '../../systems/AudioSystem/audioManager';
import { lineDuration } from '../../systems/DialogueSystem/dialogue';
import { newGameSnapshot, saveCheckpoint, loadSave } from '../../systems/SaveSystem/saveSystem';
import { useGame } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import { ITEMS } from '../../data/items';

// ───────────────────────── backgrounds ─────────────────────────

function SunriseCam() {
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    s.camera.position.set(2.25 + t * 0.05, 1.65, 9 + Math.min(t * 0.35, 9));
    s.camera.lookAt(12, 2.2 + Math.sin(t * 0.2) * 0.05, 40);
  });
  return null;
}

function SunriseScene() {
  return (
    <>
      <color attach="background" args={['#e9c9a0']} />
      <fog attach="fog" args={['#e8c8a4', 10, 70]} />
      <hemisphereLight args={['#ffe0b8', '#5a4a3a', 1.4]} />
      <directionalLight position={[30, 8, 60]} color="#ffc890" intensity={2.4} />
      <mesh position={[30, 4, 90]}>
        <sphereGeometry args={[6, 24, 16]} />
        <meshBasicMaterial color="#fff2d0" />
      </mesh>
      <Yard car streetlight={false} />
      <HouseShell glassColor="#2a2a30" />
      <SunriseCam />
    </>
  );
}

function RainRoadCam() {
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    s.camera.position.set(2.25, 1.65, 18.2 - Math.min(t * 0.08, 1.5));
    s.camera.lookAt(2.25, 2.4, 0);
  });
  return null;
}

function RainRoadScene() {
  return (
    <>
      <color attach="background" args={['#05070b']} />
      <fog attach="fog" args={['#070a10', 6, 42]} />
      <hemisphereLight args={['#4a5a78', '#1a140e', 0.8]} />
      <pointLight position={[-4, 4.1, 3.0]} color="#ffb060" intensity={5} distance={6} />
      <Yard />
      <HouseShell litWindow />
      <Rain count={3000} />
      <RainRoadCam />
    </>
  );
}

const shadowMat = new THREE.MeshBasicMaterial({ color: '#050505', transparent: true, opacity: 0 });
const eliasMats = {
  skin: new THREE.MeshStandardMaterial({ color: '#3a2c26', transparent: true, opacity: 0 }),
  top: new THREE.MeshStandardMaterial({ color: '#1c2018', transparent: true, opacity: 0 }),
  legs: new THREE.MeshStandardMaterial({ color: '#14181e', transparent: true, opacity: 0 }),
};

function HallwayCam() {
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    s.camera.position.set(0.2, 1.6, -4 - Math.min(t * 0.35, 6));
    // slowly turn around to find what stands behind
    const turn = Math.min(1, Math.max(0, (t - 9) / 6));
    const ease = turn * turn * (3 - 2 * turn);
    const yaw = ease * Math.PI;
    s.camera.rotation.set(0, yaw, 0, 'YXZ');
    const o = Math.min(0.95, Math.max(0, (t - 10) / 4));
    shadowMat.opacity = o * 0.4;
    Object.values(eliasMats).forEach((m) => (m.opacity = o));
  });
  return null;
}

function HallwayScene() {
  const walls = useMemo(
    () => [
      { a: [-1, 0], b: [-1, -40] as [number, number], mat: 'wallpaper_dark' as const },
      { a: [1.4, 0], b: [1.4, -40] as [number, number], mat: 'wallpaper_dark' as const },
    ].map((w) => ({ ...w, a: w.a as [number, number] })),
    [],
  );
  const floors = useMemo(() => [{ x0: -1, z0: -40, x1: 1.4, z1: 0, mat: 'wood_floor' as const, ceil: 2.7, ceilMat: 'burnt' as const }], []);
  const group = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (group.current) group.current.position.z = s.camera.position.z + 1.3;
  });
  return (
    <>
      <color attach="background" args={['#050203']} />
      <fog attach="fog" args={['#0a0406', 2, 14]} />
      <hemisphereLight args={['#4a3036', '#100808', 0.6]} />
      {[-3, -9, -15, -21].map((z) => (
        <pointLight key={z} position={[0.2, 2.4, z]} intensity={1.6} distance={7} color="#ffb890" />
      ))}
      <LevelGeometry walls={walls} floors={floors} />
      <group ref={group} position={[0.2, 0, 0]}>
        <Humanoid look={{ height: 1.85, limb: 1.05, shoulders: 1.05, head: 1, materials: eliasMats, face: true }} />
      </group>
      <HallwayCam />
    </>
  );
}

function RoomCam() {
  useFrame((s) => {
    const t = s.clock.elapsedTime * 0.05;
    s.camera.position.set(3.5 + Math.sin(t) * 1.6, 1.5, -6.5 + Math.cos(t) * 1.2);
    s.camera.lookAt(2.7, 0.9, -9.4);
  });
  return null;
}

function NoahRoomScene() {
  const walls = useMemo(
    () => [
      { a: [1.4, -10] as [number, number], b: [6.4, -10] as [number, number], mat: 'wallpaper_noah' as const },
      { a: [1.4, -4] as [number, number], b: [6.4, -4] as [number, number], mat: 'wallpaper_noah' as const },
      { a: [1.4, -10] as [number, number], b: [1.4, -4] as [number, number], mat: 'wallpaper_noah' as const },
      { a: [6.4, -10] as [number, number], b: [6.4, -4] as [number, number], mat: 'wallpaper_noah' as const, gaps: [{ at: 3, w: 1.2, sill: 0.9 }] },
    ],
    [],
  );
  const floors = useMemo(() => [{ x0: 1.4, z0: -10, x1: 6.4, z1: -4, mat: 'wood_floor' as const, ceil: 2.7 }], []);
  return (
    <>
      <color attach="background" args={['#0a0806']} />
      <fog attach="fog" args={['#1a120a', 4, 16]} />
      <hemisphereLight args={['#ffd8a8', '#2a1a10', 0.5]} />
      <pointLight position={[2.6, 1.3, -9.5]} color="#ffb870" intensity={4} distance={8} />
      <pointLight position={[6.8, 1.6, -7]} color="#ffd8b0" intensity={3} distance={6} />
      <LevelGeometry walls={walls} floors={floors} windowColor="#ffd8a0" />
      <Rug pos={[3.8, 0, -7]} w={2} d={1.6} color="#2e3a4a" />
      <Bed pos={[5.8, 0, -6.4]} rot={Math.PI / 2} kid />
      <Desk pos={[2.7, 0, -9.6]} />
      <Recorder pos={[2.6, 0.76, -9.5]} rot={0.4} />
      <MusicBox pos={[3.2, 0.76, -9.5]} open />
      <ToyBear pos={[5.5, 0.55, -7.3]} rot={-1} />
      <Frame pos={[3.6, 1.6, -9.9]} tint="#8a7356" />
      <RoomCam />
    </>
  );
}

// ───────────────────────── sequence ─────────────────────────

const AMBIENCE: Record<EndingId, () => void> = {
  A: () => {
    setAmbience({ wind: 0.15, insects: 0.25 }, 3);
    setMusic('hopeful', 0.6, 4);
  },
  B: () => {
    setAmbience({ rain: 0.75, wind: 0.35, drone_low: 0.3 }, 2);
    setMusic(null);
  },
  C: () => {
    setAmbience({ drone_low: 0.45, heartbeat: 0.25 }, 2);
    setMusic(null);
  },
  D: () => {
    setAmbience({ rain_inside: 0.35, tape_hiss: 0.25 }, 2);
    setMusic('music_box', 0.35, 4);
  },
};

export default function EndingScene() {
  const { id: raw } = useParams();
  const id = (['A', 'B', 'C', 'D'].includes(raw ?? '') ? raw : 'A') as EndingId;
  const ending = ENDINGS[id];
  const navigate = useNavigate();
  const [lineIdx, setLineIdx] = useState(-1);
  const [epi, setEpi] = useState(-1);
  const [card, setCard] = useState(false);
  const subs = useSettings((s) => s.subtitles);
  const quality = useSettings((s) => s.quality);

  const lines: Line[] = useMemo(() => {
    if (id === 'B') return [...ending.lines, ...(ITEMS.voicemail.tape ?? []).slice(2, 5)];
    return ending.lines;
  }, [id, ending]);

  useEffect(() => {
    useGame.getState().stop();
    stopAll(0.5);
    const timers: number[] = [];
    let t = 2500;
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    at(500, () => AMBIENCE[id]());
    if (id === 'B') at(1200, () => play('phone_buzz', { vol: 0.5 }));
    if (id === 'C') at(13000, () => play('bass', { vol: 0.6 }));
    lines.forEach((l, i) => {
      const d = lineDuration(l) * 1000 + 400;
      at(t, () => {
        setLineIdx(i);
        speak(l.voice, d / 1000 - 0.3, l.tape);
      });
      t += d;
    });
    at(t, () => setLineIdx(-1));
    t += 1200;
    ending.epilogue.forEach((_, i) => {
      at(t, () => setEpi(i));
      t += 3800;
    });
    at(t, () => setCard(true));
    return () => timers.forEach(clearTimeout);
  }, [id, lines, ending]);

  const light = id === 'A';
  const line = lineIdx >= 0 ? lines[lineIdx] : null;
  const save = loadSave();

  const toMenu = () => {
    uiClick();
    stopAll(0.8);
    navigate('/');
  };
  const replay = () => {
    uiClick();
    stopAll(0.8);
    const snap = newGameSnapshot();
    saveCheckpoint(snap);
    useGame.getState().startFromSnapshot(snap);
    navigate('/play');
  };

  const skip = () => {
    setLineIdx(-1);
    setEpi(-1);
    setCard(true);
  };

  return (
    <div className="ending-root">
      <Canvas dpr={quality === 'low' ? 0.75 : 1} camera={{ fov: 65, near: 0.05, far: 160 }} gl={{ antialias: false }} onCreated={({ gl }) => (gl.toneMapping = THREE.ACESFilmicToneMapping)}>
        {id === 'A' && <SunriseScene />}
        {id === 'B' && <RainRoadScene />}
        {id === 'C' && <HallwayScene />}
        {id === 'D' && <NoahRoomScene />}
        <EffectComposer multisampling={0}>
          <Bloom intensity={light ? 0.9 : 0.5} luminanceThreshold={0.6} mipmapBlur />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.15} />
          <Vignette offset={0.25} darkness={light ? 0.45 : 0.85} />
        </EffectComposer>
      </Canvas>
      {id === 'C' && card && <div className="fade" style={{ opacity: 1, background: '#000' }} />}
      <div className="ending-text">
        {line && subs && (
          <div key={`l${lineIdx}`} className={`ending-line ${light ? 'light' : ''}`} style={line.faint ? { opacity: 0.7, fontStyle: 'italic' } : undefined}>
            {line.who && <span style={{ color: light ? '#7a4a1a' : 'var(--accent)' }}>{line.who}: </span>}
            {line.text}
          </div>
        )}
        {!line && epi >= 0 && !card && (
          <div key={`e${epi}`} className={`ending-line ${light ? 'light' : ''}`}>
            {ending.epilogue[epi]}
          </div>
        )}
        {card && (
          <div className={`ending-card ${light ? 'light' : ''}`}>
            <div className="e-title">{ending.title}</div>
            <div className="e-name">{ending.name}</div>
            <div className="e-req">{ending.requirement}</div>
            <div className="muted small" style={{ marginBottom: '1em' }}>
              Endings found: {save.endings.sort().join(' · ') || '—'} of A · B · C · D
            </div>
            {id === 'B' ? (
              <>
                <button className="menu-btn" onClick={replay}>
                  Listen to the voicemail again
                </button>
                <button className="menu-btn" onClick={toMenu}>
                  Main menu
                </button>
              </>
            ) : (
              <>
                <button className="menu-btn" onClick={toMenu}>
                  Main menu
                </button>
                <button className="menu-btn" onClick={replay}>
                  New game
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {!card && (
        <button className="skip" onClick={skip}>
          Skip ▸
        </button>
      )}
    </div>
  );
}
