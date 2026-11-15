import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import { fx } from '../../systems/HorrorEventSystem/horror';
import { clock } from '../../systems/ChapterSystem/clock';

/** Battery drains from 100 to 0 in about seven minutes of continuous use. */
const DRAIN_PER_SEC = 100 / 420;

/** Hand-held flashlight attached to the camera. */
export function Flashlight() {
  const { camera, scene } = useThree();
  const light = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const quality = useSettings((s) => s.quality);
  const st = useRef({ level: 0, warned: false, batteryTick: 0 });

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    camera.add(l);
    camera.add(l.target);
    if (fill.current) camera.add(fill.current);
    l.position.set(0.18, -0.16, 0.05);
    l.target.position.set(0.05, -0.05, -5);
    scene.add(camera);
    return () => {
      camera.remove(l);
      camera.remove(l.target);
      if (fill.current) camera.remove(fill.current);
    };
  }, [camera, scene]);

  useFrame((s, dt) => {
    const g = useGame.getState();
    const l = light.current;
    if (!l) return;
    const on = g.flashlightOn && g.active;
    if (on && !g.paused) {
      st.current.batteryTick += dt;
      if (st.current.batteryTick > 0.5) {
        g.setBattery(g.battery - DRAIN_PER_SEC * st.current.batteryTick);
        st.current.batteryTick = 0;
        if (g.battery < 15 && !st.current.warned) {
          st.current.warned = true;
          g.pushToast('Flashlight battery low', 'info');
        }
        if (g.battery >= 15) st.current.warned = false;
      }
    }
    const batteryK = g.battery <= 0 ? 0.06 : g.battery < 15 ? 0.45 + 0.55 * (g.battery / 15) : 1;
    let target = on ? batteryK : 0;
    const t = s.clock.elapsedTime;
    if (on && (clock.time < fx.flashlightFlickerUntil || (g.battery < 15 && Math.sin(t * 2.3) > 0.97))) {
      const n = Math.sin(t * 41) * Math.sin(t * 13.3);
      target *= n > 0 ? 1 : 0.1;
    }
    st.current.level += (target - st.current.level) * Math.min(1, dt * 20);
    l.intensity = 26 * st.current.level;
    if (fill.current) fill.current.intensity = 0.6 * st.current.level;
  });

  return (
    <>
      <spotLight
        ref={light}
        color="#fff1d6"
        angle={0.5}
        penumbra={0.55}
        distance={22}
        decay={1.7}
        intensity={0}
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0015}
      />
      <pointLight ref={fill} color="#fff1d6" distance={3} intensity={0} decay={2} />
    </>
  );
}
