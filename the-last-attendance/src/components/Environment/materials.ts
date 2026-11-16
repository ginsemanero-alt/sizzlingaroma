import * as THREE from 'three';
import { Textures } from './textures';

export type MatKey =
  | 'plaster' | 'paintLower' | 'tile' | 'wood' | 'darkwood' | 'floorWood' | 'concrete' | 'ceiling' | 'metal'
  | 'locker' | 'rust' | 'chalkboard' | 'grass' | 'glass' | 'black' | 'paper' | 'books' | 'fabric' | 'whiteboard'
  | 'red' | 'ash' | 'charred' | 'trim' | 'emissive' | 'sky';

/**
 * World-space (triplanar) texture mapping so that instanced, non-uniformly scaled boxes never
 * stretch their textures. Works with InstancedMesh.
 */
function worldUV(mat: THREE.MeshStandardMaterial, scale: number): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.triScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 triW = vec4(transformed, 1.0);
        vec3 triN = objectNormal;
        #ifdef USE_INSTANCING
          triW = instanceMatrix * triW;
          triN = mat3(instanceMatrix) * triN;
        #endif
        triW = modelMatrix * triW;
        vTriPos = triW.xyz;
        vTriNormal = normalize(mat3(modelMatrix) * triN);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;\nuniform float triScale;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec3 tn = abs(normalize(vTriNormal));
          vec2 tuv;
          if (tn.y > tn.x && tn.y > tn.z) tuv = vTriPos.xz;
          else if (tn.x > tn.z) tuv = vec2(vTriPos.z, vTriPos.y);
          else tuv = vTriPos.xy;
          vec4 sampledDiffuseColor = texture2D(map, tuv * triScale);
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => `worldUV_${scale}`;
  return mat;
}

const cache = new Map<string, THREE.Material>();

function std(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(params);
}

export function getMaterial(key: MatKey): THREE.Material {
  let m = cache.get(key);
  if (m) return m;
  switch (key) {
    case 'plaster': m = worldUV(std({ map: Textures.plaster(), roughness: 0.95 }), 0.35); break;
    case 'paintLower': m = worldUV(std({ map: Textures.paintLower(), roughness: 0.8 }), 0.4); break;
    case 'tile': m = worldUV(std({ map: Textures.tile(), roughness: 0.55, metalness: 0.05 }), 0.25); break;
    case 'wood': m = worldUV(std({ map: Textures.wood(), roughness: 0.75 }), 1.2); break;
    case 'darkwood': m = worldUV(std({ map: Textures.wood(), roughness: 0.7, color: '#6b5a4e' }), 1.0); break;
    case 'floorWood': m = worldUV(std({ map: Textures.floorWood(), roughness: 0.7 }), 0.3); break;
    case 'concrete': m = worldUV(std({ map: Textures.concrete(), roughness: 0.9 }), 0.2); break;
    case 'ceiling': m = worldUV(std({ map: Textures.ceiling(), roughness: 1 }), 0.8); break;
    case 'metal': m = worldUV(std({ map: Textures.metal(), roughness: 0.55, metalness: 0.5 }), 0.8); break;
    case 'locker': m = worldUV(std({ map: Textures.locker(), roughness: 0.5, metalness: 0.4 }), 1.1); break;
    case 'rust': m = worldUV(std({ map: Textures.rust(), roughness: 0.8, metalness: 0.5 }), 0.8); break;
    case 'chalkboard': m = worldUV(std({ map: Textures.chalkboard(), roughness: 0.95 }), 0.4); break;
    case 'grass': m = worldUV(std({ map: Textures.grass(), roughness: 1 }), 0.4); break;
    case 'fabric': m = std({ color: '#5a1f22', roughness: 1 }); break;
    case 'glass': m = new THREE.MeshPhysicalMaterial({ color: '#1b2b3d', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }); break;
    case 'black': m = std({ color: '#0a0a0c', roughness: 1 }); break;
    case 'paper': m = std({ color: '#d8d0b8', roughness: 0.9 }); break;
    case 'books': m = std({ color: '#ffffff', roughness: 0.85 }); break;
    case 'whiteboard': m = std({ color: '#cfd2cc', roughness: 0.4 }); break;
    case 'red': m = std({ color: '#7a1414', roughness: 0.6 }); break;
    case 'ash': m = std({ color: '#2a2725', roughness: 1 }); break;
    case 'charred': m = worldUV(std({ map: Textures.wood(), color: '#2a1f18', roughness: 1 }), 1.0); break;
    case 'trim': m = std({ color: '#3b2f25', roughness: 0.7 }); break;
    case 'emissive': m = std({ color: '#ffffff', emissive: '#e8f0ff', emissiveIntensity: 2, roughness: 0.5 }); break;
    case 'sky': m = new THREE.MeshBasicMaterial({ color: '#05070d', side: THREE.BackSide, fog: false }); break;
    default: m = std({ color: '#888' });
  }
  cache.set(key, m);
  return m;
}

export function disposeMaterials(): void {
  // Materials are shared across chapters and intentionally kept; textures are cached too.
}
