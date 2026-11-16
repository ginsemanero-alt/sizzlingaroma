import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '@/systems/runtime';
import { game, useGame } from '@/store/gameStore';

const DRAIN_PER_SEC = 100 / 540; // ~9 minutes of continuous light

/** Hand-held flashlight: spot light following the camera with battery, flicker and malfunctions. */
export function Flashlight() {
  const { camera, scene } = useThree();
  const spot = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const on = useGame((s) => s.flashlightOn);
  const graphics = useGame((s) => s.settings.graphics);
  const target = useRef(new THREE.Object3D());

  useEffect(() => {
    const t = target.current;
    scene.add(t);
    return () => { scene.remove(t); };
  }, [scene]);

  useEffect(() => {
    if (spot.current) spot.current.target = target.current;
  }, []);

  useFrame((_, dt) => {
    const s = spot.current;
    if (!s) return;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    s.position.copy(camera.position).addScaledVector(right, 0.18).add(new THREE.Vector3(0, -0.15, 0));
    target.current.position.copy(camera.position).addScaledVector(fwd, 6);
    target.current.updateMatrixWorld();
    if (fill.current) fill.current.position.copy(camera.position);

    if (on && !runtime.paused) {
      runtime.battery = Math.max(0, runtime.battery - DRAIN_PER_SEC * dt);
      if (runtime.battery <= 0) {
        game().setFlashlight(false);
        game().notify('The flashlight battery is dead. Find batteries.', 'info');
      }
    }
    runtime.flashlightGlitch = Math.max(0, runtime.flashlightGlitch - dt);
    let k = on ? 1 : 0;
    if (on) {
      if (runtime.battery < 15) k *= Math.sin(runtime.time * 23) * Math.sin(runtime.time * 7) > 0.6 ? 0.25 : 0.75;
      if (runtime.flashlightGlitch > 0) k *= Math.random() > 0.5 ? 0.05 : 0.6;
    }
    s.intensity = 16 * k;
    if (fill.current) fill.current.intensity = 0.5 * k;
  });

  return (
    <>
      <spotLight
        ref={spot}
        color="#fff1d6"
        intensity={0}
        distance={22}
        angle={0.5}
        penumbra={0.55}
        decay={1.6}
        castShadow={graphics !== 'low'}
        shadow-mapSize-width={graphics === 'high' ? 1024 : 512}
        shadow-mapSize-height={graphics === 'high' ? 1024 : 512}
        shadow-bias={-0.0004}
        shadow-camera-near={0.2}
        shadow-camera-far={22}
      />
      <pointLight ref={fill} color="#ffe9c9" intensity={0} distance={3.5} decay={2} />
    </>
  );
}
