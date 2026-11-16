import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, N8AO, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useGame } from '@/store/gameStore';
import { runtime } from '@/systems/runtime';

/** Exposure from the brightness setting (applies on every quality level). */
export function Exposure() {
  const { gl } = useThree();
  const brightness = useGame((s) => s.settings.brightness);
  useFrame(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = brightness * 1.15;
  });
  return null;
}

/** Bloom, film grain, vignette, fear-driven chromatic aberration and (high) ambient occlusion. */
export function PostFX() {
  const graphics = useGame((s) => s.settings.graphics);
  const offset = useRef(new THREE.Vector2(0.0004, 0.0004));
  useFrame(() => {
    const f = runtime.fear * 0.004 + runtime.shake * 0.004;
    offset.current.set(0.0004 + f, 0.0004 + f * 0.6);
  });
  if (graphics === 'low') return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={graphics === 'high'}>
      {graphics === 'high' ? <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={0.6} quality="performance" halfRes /> : <></>}
      <Bloom intensity={0.7} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
      <ChromaticAberration offset={offset.current} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
      <Noise opacity={0.07} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette eskil={false} offset={0.25} darkness={0.75} />
    </EffectComposer>
  );
}
