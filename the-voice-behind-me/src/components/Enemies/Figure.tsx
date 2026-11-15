import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Humanoid, type HumanoidLook } from './Humanoid';
import { figure } from './figureDirector';
import { rig, isLookingAt } from '../Player/playerRig';
import { world } from '../../systems/PhysicsSystem/world';
import { play } from '../../systems/AudioSystem/audioManager';
import { distort } from '../../systems/HorrorEventSystem/horror';
import { useGame } from '../../store/gameStore';
import { MIRROR_LAYER } from '../Environment/Mirror';

const smokeVert = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
  void main() {
    vec3 p = position;
    float wob = sin(p.y * 9.0 + uTime * 2.3) * 0.012 + sin(p.x * 13.0 - uTime * 3.1) * 0.01;
    p += normal * wob;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const smokeFrag = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uReveal;
  uniform vec3 uTint;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
  float noise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
  void main() {
    float fres = pow(1.0 - abs(dot(vNormal, vView)), 2.0);
    float n = noise(vWorld * 7.0 + vec3(0.0, -uTime * 1.2, 0.0));
    float n2 = noise(vWorld * 18.0 + vec3(uTime * 0.7, -uTime * 2.0, 0.0));
    float body = mix(0.92, 1.0, n);
    // wispy, dissolving edges
    float edge = smoothstep(0.25, 0.9, 1.0 - fres * (0.6 + n2 * 0.9));
    float a = uOpacity * mix(edge, 1.0, uReveal * 0.85);
    vec3 shadow = vec3(0.012, 0.011, 0.013) + fres * vec3(0.07, 0.07, 0.08) * (1.0 - uReveal);
    vec3 lit = uTint * (0.35 + 0.65 * max(dot(vNormal, normalize(vec3(0.3, 0.8, 0.4))), 0.0));
    vec3 col = mix(shadow, lit, uReveal) * body;
    gl_FragColor = vec4(col, a);
    #include <fog_fragment>
  }
`;

function smokeMaterial(tint: string) {
  return new THREE.ShaderMaterial({
    vertexShader: smokeVert,
    fragmentShader: smokeFrag,
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uTime: { value: 0 }, uOpacity: { value: 0 }, uReveal: { value: 0 }, uTint: { value: new THREE.Color(tint) } },
    ]),
  });
}

/**
 * The Figure Behind. A tall, smoky silhouette that appears behind the player,
 * at the ends of hallways and in mirrors. It is not a chaser by default:
 * scripts tell it what to do through figureDirector.
 */
export function Figure() {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({ skin: smokeMaterial('#8a6a58'), top: smokeMaterial('#3e4436'), legs: smokeMaterial('#2c3340'), hair: smokeMaterial('#141110') }),
    [],
  );
  const look: HumanoidLook = useMemo(
    () => ({ height: 2.05, limb: 1.22, shoulders: 1.15, head: 1.05, materials: mats }),
    [mats],
  );
  const particles = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 60;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 0.7;
      p[i * 3 + 1] = Math.random() * 2.1;
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  const pmat = useMemo(() => new THREE.PointsMaterial({ color: '#0a0a0b', size: 0.09, transparent: true, opacity: 0, depthWrite: false }), []);

  const st = useRef({
    serial: -1,
    opacity: 0,
    target: 0,
    lookedFor: 0,
    placed: false,
    vanishing: false,
    fleeBase: -1,
    fleeDone: false,
    age: 0,
    faced: false,
    stepTimer: 0,
    layerMirror: false,
  });

  const vanish = (sound = true) => {
    const s = st.current;
    if (s.vanishing) return;
    s.vanishing = true;
    s.target = 0;
    if (sound) {
      play('reversed', { pos: [figure.pos.x, 1.6, figure.pos.z], vol: 0.35, rate: 1.4 });
      distort(0.25);
    }
    const cb = figure.opts.onVanish;
    figure.mode = 'hidden';
    cb?.();
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const g = useGame.getState();
    if (g.paused) return;
    if (s.serial !== figure.serial) {
      s.serial = figure.serial;
      s.lookedFor = 0;
      s.placed = false;
      s.vanishing = false;
      s.fleeBase = -1;
      s.fleeDone = false;
      s.age = 0;
      s.faced = false;
      if (figure.mode === 'hidden') s.target = 0;
    }
    s.age += dt;
    const o = figure.opts;
    const avoidBoost = Math.min(0.3, g.avoidance * 0.06);
    const baseOpacity = o.opacity ?? 0.62 + avoidBoost;

    const mirrorOnly = !!o.mirrorOnly;
    if (group.current && mirrorOnly !== s.layerMirror) {
      s.layerMirror = mirrorOnly;
      group.current.traverse((obj) => obj.layers.set(mirrorOnly ? MIRROR_LAYER : 0));
    }

    const toPlayer = new THREE.Vector3(rig.pos.x - figure.pos.x, 0, rig.pos.z - figure.pos.z);
    const dist = toPlayer.length();
    const headPos = new THREE.Vector3(figure.pos.x, figure.pos.y + 1.6, figure.pos.z);

    switch (figure.mode) {
      case 'hidden':
        s.target = 0;
        break;
      case 'stand': {
        s.target = baseOpacity;
        const looking = isLookingAt(headPos, 0.9);
        if (looking) s.lookedFor += dt;
        if (o.vanishDist && dist < o.vanishDist) vanish();
        else if (o.vanishOnLook !== undefined && s.lookedFor > o.vanishOnLook) vanish();
        else if (o.duration && s.age > o.duration) vanish(false);
        if (o.fleeCheck && !s.fleeDone) {
          if (looking && s.fleeBase < 0) s.fleeBase = dist;
          if (s.fleeBase > 0 && dist > s.fleeBase + 3.2 && rig.speed > 1) {
            s.fleeDone = true;
            g.addFlee();
            o.onFlee?.();
            vanish(false);
          }
        }
        break;
      }
      case 'behind': {
        const d = o.behindDist ?? 2.6;
        const back = rig.forward.clone().setY(0).normalize().multiplyScalar(-1);
        const spot = rig.pos.clone().addScaledVector(back, d);
        const blocked = world.segmentBlocked(rig.pos.x, rig.pos.z, spot.x, spot.z, 1.2);
        const looking = isLookingAt(headPos, 0.72);
        if (!looking && !s.faced) {
          // drift into place behind the player while unobserved
          if (!s.placed || figure.pos.distanceTo(spot) > 1.2) {
            if (!blocked) {
              figure.pos.set(spot.x, rig.pos.y, spot.z);
              s.placed = true;
            }
          }
          s.target = blocked ? 0 : baseOpacity;
          s.lookedFor = 0;
        } else if (s.placed && s.opacity > 0.15) {
          s.lookedFor += dt;
          if (o.holdWhenFaced) {
            if (!s.faced) {
              s.faced = true;
              o.onFaced?.();
            }
          } else if (s.lookedFor > 0.18) {
            vanish();
          }
        }
        break;
      }
      case 'chase': {
        s.target = baseOpacity + 0.1;
        if (dist > 0.01) {
          const step = Math.min(dist, (o.speed ?? 2.2) * dt);
          figure.pos.addScaledVector(toPlayer.normalize(), step);
          figure.pos.y = rig.pos.y;
        }
        s.stepTimer += dt;
        if (s.stepTimer > 0.42) {
          s.stepTimer = 0;
          play('step_figure', { pos: [figure.pos.x, figure.pos.y + 0.1, figure.pos.z], vol: 0.9, ref: 2 });
        }
        if (dist < 0.95) {
          const cb = o.onCatch;
          figure.mode = 'hidden';
          s.target = 0;
          s.opacity = 0;
          cb?.();
        }
        break;
      }
    }

    s.opacity += (s.target - s.opacity) * Math.min(1, dt * (s.target > s.opacity ? 1.6 : 6));
    const reveal = o.reveal ?? 0;
    const t = state.clock.elapsedTime;
    for (const m of Object.values(mats)) {
      m.uniforms.uTime.value = t;
      m.uniforms.uOpacity.value = s.opacity;
      m.uniforms.uReveal.value += (reveal - m.uniforms.uReveal.value) * Math.min(1, dt * 0.8);
    }
    pmat.opacity = s.opacity * 0.6 * (1 - reveal * 0.7);
    if (group.current) {
      group.current.visible = s.opacity > 0.01;
      group.current.position.copy(figure.pos);
      group.current.rotation.y = Math.atan2(rig.pos.x - figure.pos.x, rig.pos.z - figure.pos.z);
    }
    if (body.current) {
      body.current.position.y = Math.sin(t * 0.9) * 0.015;
      body.current.rotation.z = Math.sin(t * 0.6) * 0.02;
    }
    const pa = particles.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      let y = pa.getY(i) + dt * 0.25;
      if (y > 2.4) y = 0.2;
      pa.setY(i, y);
    }
    pa.needsUpdate = true;
  });

  return (
    <group ref={group} visible={false}>
      <group ref={body}>
        <Humanoid look={look} />
      </group>
      <points geometry={particles} material={pmat} />
    </group>
  );
}
