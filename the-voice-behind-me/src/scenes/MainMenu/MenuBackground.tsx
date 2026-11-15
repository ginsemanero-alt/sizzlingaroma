import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HouseShell, Yard } from '../shared/house';
import { Rain, Lightning } from '../../components/Environment/Atmosphere';
import { Humanoid } from '../../components/Enemies/Humanoid';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { rig } from '../../components/Player/playerRig';
import { clock } from '../../systems/ChapterSystem/clock';

const shadowMat = new THREE.MeshBasicMaterial({ color: '#040405', transparent: true, opacity: 0 });

/** Slow push-in on the house in the rain, with a silhouette that sometimes appears upstairs. */
function Rig() {
  const sil = useRef<THREE.Group>(null);
  const st = useRef({ next: 5, visibleUntil: 0 });
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    clock.tick(dt);
    const cam = s.camera;
    cam.position.set(-2.5 + Math.sin(t * 0.05) * 0.8, 1.7 + Math.sin(t * 0.13) * 0.05, 19 - Math.min(t * 0.06, 3));
    cam.lookAt(-10, 3.4, 0);
    rig.pos.copy(cam.position);
    if (t > st.current.next) {
      st.current.next = t + 11 + Math.random() * 10;
      st.current.visibleUntil = t + 1.6;
    }
    const target = t < st.current.visibleUntil ? 0.92 : 0;
    shadowMat.opacity += (target - shadowMat.opacity) * Math.min(1, dt * (target > 0 ? 1.5 : 4));
    if (sil.current) sil.current.visible = shadowMat.opacity > 0.01;
  });
  return (
    <group ref={sil} position={[-4, 2.95, 3.55]}>
      <Humanoid look={{ height: 2.0, limb: 1.2, shoulders: 1.15, head: 1, materials: { skin: shadowMat, top: shadowMat, legs: shadowMat } }} />
    </group>
  );
}

export function MenuBackground() {
  return (
    <div className="menu-bg">
      <Canvas dpr={[1, 1.25]} camera={{ fov: 50, position: [2, 1.7, 19], near: 0.1, far: 120 }} gl={{ antialias: false }} onCreated={({ gl }) => (gl.toneMapping = THREE.ACESFilmicToneMapping)}>
        <color attach="background" args={['#04060a']} />
        <fog attach="fog" args={['#060910', 8, 46]} />
        <hemisphereLight args={['#4a5a78', '#1a140e', 0.8]} />
        <directionalLight position={[-12, 18, 10]} color="#5a6a8a" intensity={0.3} />
        <Lightning minGap={9} maxGap={20} />
        <pointLight position={[-4, 4.1, 3.0]} color="#ffb060" intensity={6} distance={6} decay={1.6} />
        <Yard car />
        <HouseShell litWindow />
        <Rain count={3000} />
        <Rig />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.6} luminanceThreshold={0.6} mipmapBlur />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.2} />
          <Vignette offset={0.2} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
