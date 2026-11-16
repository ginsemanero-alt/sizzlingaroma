import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LevelBuilder } from '@/components/Environment/LevelBuilder';
import { StaticLevel } from '@/components/Environment/StaticLevel';
import { Atmosphere, Clock, Dust, FluoroLight, Sign } from '@/components/Environment/Props';
import type { HumanoidHandle } from '@/components/Characters/Humanoid';
import { ModelCharacter } from '@/components/Characters/ModelCharacter';
import { runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';

function buildHallway(): LevelBuilder {
  const b = new LevelBuilder();
  const L = 34;
  b.floor(-2.2, -L, 2.2, 2, 'tile');
  b.ceil(-2.2, -L, 2.2, 2, 3.2);
  b.wall(-2.2, 2, -2.2, -L, { openings: [{ at: 6, w: 1.1, h: 2.2 }, { at: 16, w: 1.1, h: 2.2 }, { at: 26, w: 1.1, h: 2.2 }] });
  b.wall(2.2, 2, 2.2, -L, { openings: [{ at: 4, w: 1.6, h: 1.3, y: 1.0 }, { at: 9, w: 1.6, h: 1.3, y: 1.0 }, { at: 14, w: 1.6, h: 1.3, y: 1.0 }, { at: 19, w: 1.6, h: 1.3, y: 1.0 }, { at: 24, w: 1.6, h: 1.3, y: 1.0 }] });
  b.wall(-2.2, -L, 2.2, -L, {});
  b.wall(-2.2, 2, 2.2, 2, {});
  b.lockers(-1.95, -10.5, 3, 6);
  b.lockers(-1.95, -20.5, 3, 5);
  b.desk(1.3, -28, 0, true);
  b.chair(-1.2, -30, 1);
  b.debris(0, -12, 3, 14);
  b.debris(0.5, -24, 3, 10);
  return b;
}

/** The cinematic main-menu hallway. The teacher vanishes after you look away. */
export function MenuBackground() {
  const builder = useMemo(buildHallway, []);
  const { camera, pointer } = useThree();
  const teacher = useRef<HumanoidHandle>(null);
  const state = useRef({ visible: true, outOfViewTime: 0, hiddenUntil: 0 });
  const drift = useRef(0);

  useFrame((_, dt) => {
    runtime.time += dt;
    drift.current += dt;
    const t = drift.current;
    // slow dolly + mouse parallax; occasionally the camera wanders to the windows
    const wander = Math.max(0, Math.sin(t * 0.09 - 1.2)) ** 3 * 1.1;
    camera.position.set(Math.sin(t * 0.13) * 0.25, 1.62 + Math.sin(t * 0.7) * 0.015, 0.5 - Math.sin(t * 0.05) * 1.2);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pointer.y * 0.08 + Math.sin(t * 0.2) * 0.01, -pointer.x * 0.5 - wander, 0);

    // Has the teacher left the view?
    const tp = new THREE.Vector3(0, 1.3, -30);
    const ndc = tp.clone().project(camera);
    const inView = Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1;
    const s = state.current;
    if (!inView) s.outOfViewTime += dt; else s.outOfViewTime = 0;
    // present → gone the moment you look away; she returns only while you are not looking
    if (s.visible && s.outOfViewTime > 0.9) { s.visible = false; s.hiddenUntil = t + 18 + Math.random() * 10; }
    else if (!s.visible && t > s.hiddenUntil && s.outOfViewTime > 1) s.visible = true;
    teacher.current?.setOpacity(s.visible ? 1 : 0);
    teacher.current?.headTilt(0.18);

    // rare flicker
    runtime.flicker = Math.sin(t * 0.6) > 0.985 ? (Math.random() > 0.5 ? 0.1 : 1) : 1;
  });

  return (
    <>
      <Atmosphere fog="#070a12" density={0.075} ambient="#4a5a80" ambientIntensity={0.25} hemiIntensity={0.25} moon={false} />
      <StaticLevel builder={builder} />
      <FluoroLight position={[0, 3.18, -4]} flicker="subtle" intensity={4} />
      <FluoroLight position={[0, 3.18, -13]} flicker="broken" intensity={4} />
      <FluoroLight position={[0, 3.18, -22]} flicker="none" on={false} light={false} />
      <FluoroLight position={[0, 3.18, -29]} flicker="broken" intensity={5} color="#e6eeff" />
      <directionalLight position={[8, 6, -10]} color="#6d82b8" intensity={0.5} />
      <Clock position={[-2.08, 2.5, -8]} rotation={[0, Math.PI / 2, 0]} />
      <Sign position={[-2.08, 1.6, -15]} rotation={[0, Math.PI / 2, 0]} size={[1.1, 0.7]} lines={['ANG PAGIGING TAPAT', 'AY PAGIGING MALAYA']} bg="#c9b98f" />
      <Sign position={[0, 2.6, -33.88]} size={[1.4, 0.4]} lines={['ROOM 13 →']} bg="#2b3a2b" color="#ddd" />
      <ModelCharacter ref={teacher} model="teacher" position={[0, 0, -30]} rotationY={0} tint="#d9d6d2" fallback={{ skin: '#d6cfc6', shirt: '#d9d3c4', bottom: '#2b2a35', hair: '#060505', hairStyle: 'long', skirt: true, eyes: 'dark' }} />
      <Dust count={160} />
      <AmbientMenuAudio />
    </>
  );
}

function AmbientMenuAudio() {
  useMemo(() => {
    AudioSystem.loop('roomtone', 0.8, 2500);
    AudioSystem.loop('rain', 0.5, 3000);
    AudioSystem.loop('buzz', 0.4, 3000, [0, 3, -13]);
    AudioSystem.loop('drone', 0.7, 4000);
  }, []);
  return null;
}
