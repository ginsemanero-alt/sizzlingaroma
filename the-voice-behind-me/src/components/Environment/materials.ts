import * as THREE from 'three';

/**
 * Procedural textures painted on canvases at runtime. These are TEMPORARY
 * ASSETS standing in for photographic textures (see README). Each material
 * is created once and shared, and box UVs are scaled to world size so one
 * material tiles correctly on every wall.
 */
export type MatKey =
  | 'wallpaper'
  | 'wallpaper_noah'
  | 'wallpaper_dark'
  | 'plaster'
  | 'ceiling'
  | 'wood_floor'
  | 'dark_wood'
  | 'wood'
  | 'concrete'
  | 'tile'
  | 'brick'
  | 'siding'
  | 'grass'
  | 'road'
  | 'roof'
  | 'fabric'
  | 'fabric_blue'
  | 'burnt'
  | 'metal'
  | 'paper'
  | 'black'
  | 'white'
  | 'red'
  | 'flesh'
  | 'mattress'
  | 'memory';

let texSize = 512;
export function setTextureQuality(q: 'low' | 'medium' | 'high') {
  texSize = q === 'low' ? 256 : 512;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = texSize;
  return [c, c.getContext('2d')!];
}

function speckle(ctx: CanvasRenderingContext2D, r: () => number, n: number, color: string, maxSize = 2, alpha = 0.15) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = r() * alpha;
    const s = r() * maxSize + 0.5;
    ctx.fillRect(r() * texSize, r() * texSize, s, s);
  }
  ctx.globalAlpha = 1;
}

function stains(ctx: CanvasRenderingContext2D, r: () => number, n: number, color: string, alpha = 0.18) {
  for (let i = 0; i < n; i++) {
    const x = r() * texSize;
    const y = r() * texSize;
    const rad = (0.05 + r() * 0.25) * texSize;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.globalAlpha = alpha * r();
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.globalAlpha = 1;
}

function drips(ctx: CanvasRenderingContext2D, r: () => number, n: number, color: string) {
  ctx.strokeStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.08 + r() * 0.12;
    ctx.lineWidth = 1 + r() * 4;
    const x = r() * texSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (r() - 0.5) * 10, r() * texSize);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function base(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, texSize, texSize);
}

type Painter = (ctx: CanvasRenderingContext2D, r: () => number) => void;

const S = () => texSize;

const PAINTERS: Partial<Record<MatKey, Painter>> = {
  wallpaper: (ctx, r) => {
    base(ctx, '#7b7a70');
    const s = S();
    for (let x = 0; x < s; x += s / 8) {
      ctx.fillStyle = 'rgba(60,62,52,0.18)';
      ctx.fillRect(x, 0, s / 32, s);
    }
    ctx.fillStyle = 'rgba(70,64,52,0.22)';
    for (let y = s / 16; y < s; y += s / 8)
      for (let x = s / 16; x < s; x += s / 4) {
        const ox = (Math.round(y / (s / 8)) % 2) * (s / 8);
        ctx.beginPath();
        ctx.ellipse(x + ox, y, s / 40, s / 26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    stains(ctx, r, 10, '#4a3a22', 0.35);
    drips(ctx, r, 14, '#3c3426');
    speckle(ctx, r, 3000, '#222', 2, 0.2);
  },
  wallpaper_noah: (ctx, r) => {
    base(ctx, '#5f6f7c');
    const s = S();
    ctx.fillStyle = 'rgba(230,220,170,0.18)';
    for (let i = 0; i < 40; i++) {
      const x = r() * s, y = r() * s, k = 3 + r() * 5;
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * Math.PI * 2;
        const rad = j % 2 ? k * 0.45 : k;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.fill();
    }
    stains(ctx, r, 8, '#2a2a20', 0.35);
    drips(ctx, r, 8, '#2a2a22');
    speckle(ctx, r, 2500, '#111', 2, 0.2);
  },
  wallpaper_dark: (ctx, r) => {
    base(ctx, '#3d3a36');
    stains(ctx, r, 14, '#110d08', 0.5);
    drips(ctx, r, 20, '#0d0b08');
    speckle(ctx, r, 4000, '#000', 2, 0.3);
  },
  plaster: (ctx, r) => {
    base(ctx, '#8a857c');
    speckle(ctx, r, 6000, '#5a5650', 2, 0.25);
    stains(ctx, r, 12, '#4c4232', 0.3);
    ctx.strokeStyle = 'rgba(40,36,30,0.4)';
    for (let i = 0; i < 6; i++) {
      ctx.lineWidth = 1;
      let x = r() * S(), y = r() * S();
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (r() - 0.5) * 40;
        y += r() * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  ceiling: (ctx, r) => {
    base(ctx, '#7d7a72');
    speckle(ctx, r, 5000, '#55524a', 2, 0.2);
    stains(ctx, r, 6, '#5a4628', 0.45);
  },
  wood_floor: (ctx, r) => {
    const s = S();
    const rows = 8;
    const h = s / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * s * 0.5;
      while (x < s) {
        const w = s * (0.35 + r() * 0.4);
        const l = 22 + r() * 14;
        ctx.fillStyle = `hsl(24, ${28 + r() * 12}%, ${l}%)`;
        ctx.fillRect(x, i * h, w, h);
        ctx.strokeStyle = 'rgba(20,12,6,0.35)';
        for (let g = 0; g < 6; g++) {
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          const gy = i * h + r() * h;
          ctx.moveTo(x, gy);
          ctx.bezierCurveTo(x + w * 0.3, gy + (r() - 0.5) * 6, x + w * 0.6, gy + (r() - 0.5) * 6, x + w, gy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(10,6,3,0.8)';
        ctx.fillRect(x, i * h, 2, h);
        x += w;
      }
      ctx.fillStyle = 'rgba(10,6,3,0.85)';
      ctx.fillRect(0, i * h, s, 2);
    }
    stains(ctx, r, 8, '#120c06', 0.4);
    speckle(ctx, r, 2000, '#000', 2, 0.2);
  },
  dark_wood: (ctx, r) => {
    base(ctx, '#3b2a1d');
    ctx.strokeStyle = 'rgba(15,8,4,0.5)';
    for (let i = 0; i < 70; i++) {
      ctx.lineWidth = 0.5 + r() * 1.5;
      const y = r() * S();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S() * 0.3, y + (r() - 0.5) * 20, S() * 0.6, y + (r() - 0.5) * 20, S(), y);
      ctx.stroke();
    }
    speckle(ctx, r, 1500, '#000', 2, 0.25);
  },
  wood: (ctx, r) => {
    base(ctx, '#6a4c33');
    ctx.strokeStyle = 'rgba(30,18,8,0.45)';
    for (let i = 0; i < 60; i++) {
      ctx.lineWidth = 0.5 + r() * 1.5;
      const y = r() * S();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S() * 0.3, y + (r() - 0.5) * 18, S() * 0.6, y + (r() - 0.5) * 18, S(), y);
      ctx.stroke();
    }
    stains(ctx, r, 5, '#1a1008', 0.4);
  },
  concrete: (ctx, r) => {
    base(ctx, '#5d5b57');
    speckle(ctx, r, 9000, '#2e2c2a', 3, 0.3);
    speckle(ctx, r, 3000, '#8a8780', 2, 0.2);
    stains(ctx, r, 16, '#1d1a14', 0.5);
    drips(ctx, r, 10, '#2a241a');
  },
  tile: (ctx, r) => {
    const s = S();
    base(ctx, '#5c5e58');
    const n = 8;
    const t = s / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const l = 66 + r() * 8;
        ctx.fillStyle = `hsl(80, 6%, ${l}%)`;
        ctx.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
      }
    stains(ctx, r, 12, '#3a3020', 0.4);
    speckle(ctx, r, 2000, '#222', 2, 0.25);
  },
  brick: (ctx, r) => {
    const s = S();
    base(ctx, '#3c3530');
    const rows = 16;
    const h = s / rows;
    for (let i = 0; i < rows; i++) {
      const off = (i % 2) * (s / 8);
      for (let x = -off; x < s; x += s / 4) {
        ctx.fillStyle = `hsl(12, ${25 + r() * 15}%, ${22 + r() * 10}%)`;
        ctx.fillRect(x + 2, i * h + 2, s / 4 - 4, h - 4);
      }
    }
    stains(ctx, r, 10, '#000', 0.4);
  },
  siding: (ctx, r) => {
    const s = S();
    const rows = 10;
    for (let i = 0; i < rows; i++) {
      ctx.fillStyle = `hsl(40, 8%, ${44 + r() * 6}%)`;
      ctx.fillRect(0, (i * s) / rows, s, s / rows);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, ((i + 1) * s) / rows - 4, s, 4);
    }
    drips(ctx, r, 30, '#1a1610');
    stains(ctx, r, 10, '#1a1610', 0.5);
    speckle(ctx, r, 2000, '#000', 2, 0.25);
  },
  grass: (ctx, r) => {
    base(ctx, '#232b1c');
    speckle(ctx, r, 9000, '#3b4a28', 3, 0.5);
    speckle(ctx, r, 5000, '#14180f', 3, 0.5);
    stains(ctx, r, 10, '#2a2116', 0.6);
  },
  road: (ctx, r) => {
    base(ctx, '#222326');
    speckle(ctx, r, 9000, '#3a3b3e', 2, 0.4);
    stains(ctx, r, 10, '#0c0d0f', 0.6);
  },
  roof: (ctx, r) => {
    const s = S();
    base(ctx, '#2a2624');
    for (let i = 0; i < 12; i++) {
      const off = (i % 2) * 16;
      for (let x = -off; x < s; x += 32) {
        ctx.fillStyle = `hsl(10, 6%, ${12 + r() * 8}%)`;
        ctx.fillRect(x + 1, (i * s) / 12 + 1, 30, s / 12 - 2);
      }
    }
  },
  fabric: (ctx, r) => {
    base(ctx, '#5b4636');
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < S(); i += 3) {
      ctx.fillStyle = i % 6 ? '#000' : '#fff';
      ctx.fillRect(i, 0, 1, S());
      ctx.fillRect(0, i, S(), 1);
    }
    ctx.globalAlpha = 1;
    stains(ctx, r, 8, '#1c140c', 0.5);
  },
  fabric_blue: (ctx, r) => {
    base(ctx, '#3c4a5c');
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < S(); i += 16) {
      ctx.fillStyle = '#d0c090';
      ctx.fillRect(i, 0, 4, S());
      ctx.fillRect(0, i, S(), 4);
    }
    ctx.globalAlpha = 1;
    stains(ctx, r, 6, '#10141a', 0.5);
  },
  burnt: (ctx, r) => {
    base(ctx, '#1b1714');
    stains(ctx, r, 20, '#000', 0.7);
    speckle(ctx, r, 6000, '#4a3a30', 3, 0.4);
    speckle(ctx, r, 800, '#7a5030', 2, 0.4);
  },
  metal: (ctx, r) => {
    base(ctx, '#55585a');
    speckle(ctx, r, 4000, '#2a2c2e', 2, 0.3);
    stains(ctx, r, 10, '#3a2210', 0.5);
  },
  paper: (ctx, r) => {
    base(ctx, '#cbbf9f');
    stains(ctx, r, 8, '#806a40', 0.4);
  },
  mattress: (ctx, r) => {
    base(ctx, '#8a8070');
    stains(ctx, r, 10, '#4a3a20', 0.5);
  },
};

const FLAT: Partial<Record<MatKey, string>> = {
  black: '#0b0b0c',
  white: '#b7b2a6',
  red: '#7a2a24',
  flesh: '#8a6a58',
  memory: '#d8cdb8',
};

const ROUGH: Partial<Record<MatKey, number>> = {
  tile: 0.4,
  metal: 0.5,
  road: 0.55,
  wood_floor: 0.7,
  memory: 0.6,
};

const texCache = new Map<MatKey, THREE.Texture>();
const matCache = new Map<string, THREE.MeshStandardMaterial>();

export function getTexture(key: MatKey): THREE.Texture | null {
  const painter = PAINTERS[key];
  if (!painter) return null;
  let t = texCache.get(key);
  if (!t) {
    const [c, ctx] = canvas();
    painter(ctx, rng(key.length * 7919 + key.charCodeAt(0)));
    t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return t;
}

export function getMaterial(key: MatKey, variant?: { color?: string; emissive?: string; emissiveIntensity?: number }): THREE.MeshStandardMaterial {
  const id = variant ? `${key}|${variant.color ?? ''}|${variant.emissive ?? ''}|${variant.emissiveIntensity ?? ''}` : key;
  let m = matCache.get(id);
  if (!m) {
    const map = getTexture(key);
    m = new THREE.MeshStandardMaterial({
      ...(map ? { map } : {}),
      color: variant?.color ?? FLAT[key] ?? '#ffffff',
      roughness: ROUGH[key] ?? 0.88,
      metalness: key === 'metal' ? 0.4 : 0,
      emissive: variant?.emissive ?? '#000000',
      emissiveIntensity: variant?.emissiveIntensity ?? 1,
    });
    matCache.set(id, m);
  }
  return m;
}

/** World units per texture repeat for each material. */
export const TILE: Partial<Record<MatKey, number>> = {
  wallpaper: 1.6,
  wallpaper_noah: 1.4,
  wallpaper_dark: 2,
  plaster: 2,
  ceiling: 2.5,
  wood_floor: 2,
  concrete: 2.5,
  tile: 1.2,
  brick: 2,
  siding: 2,
  grass: 4,
  road: 4,
  roof: 2,
};

/** A box geometry whose UVs are scaled to world size so textures tile evenly. */
export function boxGeometry(w: number, h: number, d: number, tile = 1.5): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
    }
  }
  uv.needsUpdate = true;
  return g;
}

export function disposeMaterials() {
  for (const m of matCache.values()) m.dispose();
  matCache.clear();
  for (const t of texCache.values()) t.dispose();
  texCache.clear();
}
