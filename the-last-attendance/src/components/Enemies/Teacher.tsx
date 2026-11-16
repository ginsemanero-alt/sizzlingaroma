import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HumanoidHandle } from '@/components/Characters/Humanoid';
import { ModelCharacter } from '@/components/Characters/ModelCharacter';
import { TeacherBrain, teacherControl, type TeacherConfig, type TeacherMode } from '@/systems/EnemyAISystem/TeacherBrain';
import { runtime } from '@/systems/runtime';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';

/**
 * Ms. Elena Reyes. Rendering + glue for TeacherBrain. Scripts command her via `teacherControl.brain`.
 */
export function Teacher({ config, mode, distorted = false }: { config: TeacherConfig; mode: TeacherMode; distorted?: boolean }) {
  const brain = useMemo(() => new TeacherBrain(config), [config]);
  const body = useRef<HumanoidHandle>(null);
  const root = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const breathTimer = useRef(4);

  useEffect(() => {
    teacherControl.brain = brain;
    return () => { if (teacherControl.brain === brain) teacherControl.brain = null; runtime.fear = 0; };
  }, [brain]);

  useEffect(() => { brain.setMode(mode); }, [brain, mode]);

  useFrame((_, dt) => {
    if (runtime.paused) return;
    brain.update(Math.min(dt, 0.05));
    const g = root.current;
    if (!g) return;
    g.position.copy(brain.pos);
    g.rotation.y = brain.yaw;
    if (distorted) {
      g.position.x += (Math.random() - 0.5) * 0.02 * brain.opacity;
      g.scale.setScalar(1.12 + Math.sin(runtime.time * 1.3) * 0.02);
    }
    body.current?.setOpacity(brain.opacity);
    body.current?.walk(brain.speed > 0.05 ? brain.speed / 2.2 : 0);
    body.current?.headTilt(brain.state === 'watching' || brain.state === 'searching' ? 0.25 : 0);
    if (light.current) light.current.intensity = brain.opacity * (distorted ? 1.6 : 0.9);
    // breathing when close
    breathTimer.current -= dt;
    const d = brain.pos.distanceTo(runtime.player.pos);
    if (brain.opacity > 0.5 && d < 8 && breathTimer.current <= 0) {
      breathTimer.current = 5 + Math.random() * 4;
      AudioSystem.play('breath', { pos: [brain.pos.x, 1.6, brain.pos.z], volume: 0.7 });
    }
  });

  return (
    <group ref={root}>
      <ModelCharacter
        ref={body}
        model="teacher"
        tint={distorted ? '#8f7f80' : '#d9d6d2'}
        glow={distorted ? '#ff2020' : undefined}
        glowIntensity={0.18}
        fallback={{ skin: '#d6cfc6', shirt: '#d9d3c4', bottom: '#2b2a35', hair: '#060505', hairStyle: 'long', skirt: true, eyes: 'dark' }}
      />
      <pointLight ref={light} position={[0, 1.7, -0.6]} color={distorted ? '#ff5a5a' : '#9fb6ff'} intensity={0} distance={3.2} decay={2} />
    </group>
  );
}
