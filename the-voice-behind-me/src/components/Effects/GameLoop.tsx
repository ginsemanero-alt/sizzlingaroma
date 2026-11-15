import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { clock, timeScale } from '../../systems/ChapterSystem/clock';
import { tickAmbient } from '../../systems/HorrorEventSystem/horror';
import { useGame } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';

/** Advances the game clock (paused with the pause menu) and the ambient horror scheduler. */
export function GameLoop() {
  const { gl } = useThree();
  const brightness = useSettings((s) => s.brightness);
  useEffect(() => {
    gl.toneMappingExposure = 0.85 * brightness;
  }, [gl, brightness]);

  useFrame((_, dt) => {
    const g = useGame.getState();
    if (!g.active || g.paused) return;
    clock.tick(Math.min(dt, 0.1) * timeScale.value);
    tickAmbient();
  });
  return null;
}
