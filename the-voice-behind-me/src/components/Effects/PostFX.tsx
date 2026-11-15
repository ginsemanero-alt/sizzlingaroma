import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, N8AO } from '@react-three/postprocessing';
import { BlendFunction, type ChromaticAberrationEffect, type NoiseEffect } from 'postprocessing';
import * as THREE from 'three';
import { useSettings } from '../../store/settingsStore';
import { fx } from '../../systems/HorrorEventSystem/horror';
import { useGame } from '../../store/gameStore';

/**
 * Post-processing: sparse bloom, film grain, vignette, ambient occlusion on
 * high, and chromatic aberration that only spikes during horror beats.
 */
export function PostFX() {
  const quality = useSettings((s) => s.quality);
  const ca = useRef<ChromaticAberrationEffect>(null);
  const noise = useRef<NoiseEffect>(null);
  const offset = useRef(new THREE.Vector2(0.0004, 0.0004));

  useFrame((_, dt) => {
    fx.distortionPulse = Math.max(0, fx.distortionPulse - dt * 0.9);
    const base = useGame.getState().distortion;
    const d = Math.min(1, fx.distortionPulse + base);
    offset.current.set(0.00008 + d * 0.006, 0.00006 + d * 0.004);
    if (ca.current) ca.current.offset = offset.current;
    if (noise.current) noise.current.blendMode.opacity.value = 0.12 + d * 0.25;
  });

  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={quality === 'high'}>
      <>{quality === 'high' && <N8AO aoRadius={0.8} intensity={1.6} distanceFalloff={0.6} quality="performance" halfRes />}</>
      <Bloom intensity={0.45} luminanceThreshold={0.75} luminanceSmoothing={0.2} mipmapBlur />
      <ChromaticAberration ref={ca as never} offset={offset.current} radialModulation={false} modulationOffset={0} />
      <Noise ref={noise as never} premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
      <Vignette eskil={false} offset={0.22} darkness={0.8} />
    </EffectComposer>
  );
}
