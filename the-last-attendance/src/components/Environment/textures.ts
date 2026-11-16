import * as THREE from 'three';

/**
 * Procedural canvas textures. Replace with authored textures by dropping files into
 * src/assets/textures and loading them in materials.ts — the rest of the game is unchanged.
 */
let rs = 42;
const r = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };

function canvas(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grime(g: CanvasRenderingContext2D, s: number, n: number, color: string, maxR: number, alpha = 0.08): void {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rad = 2 + r() * maxR;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, color.replace('A', String(alpha * (0.5 + r()))));
    grd.addColorStop(1, color.replace('A', '0'));
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

function speckle(g: CanvasRenderingContext2D, s: number, n: number, light: number, dark: number): void {
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? light : dark;
    g.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.08})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
  }
}

const cache = new Map<string, THREE.Texture>();
function cached(key: string, f: () => THREE.Texture): THREE.Texture {
  let t = cache.get(key);
  if (!t) { t = f(); cache.set(key, t); }
  return t;
}

export const Textures = {
  plaster: () => cached('plaster', () => canvas(512, (g, s) => {
    g.fillStyle = '#d9cfa9'; g.fillRect(0, 0, s, s);
    speckle(g, s, 9000, 255, 60);
    grime(g, s, 60, 'rgba(70,60,30,A)', 80, 0.12);
    grime(g, s, 30, 'rgba(40,50,40,A)', 50, 0.1);
    // water stains running down
    for (let i = 0; i < 9; i++) {
      const x = r() * s, w = 6 + r() * 20, h = 60 + r() * 250;
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, 'rgba(90,75,40,0.18)'); grd.addColorStop(1, 'rgba(90,75,40,0)');
      g.fillStyle = grd; g.fillRect(x, 0, w, h);
    }
    // cracks
    g.strokeStyle = 'rgba(40,35,25,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 30; y += r() * 20; g.lineTo(x, y); }
      g.stroke();
    }
  })),
  paintLower: () => cached('paintLower', () => canvas(512, (g, s) => {
    g.fillStyle = '#5e7c6f'; g.fillRect(0, 0, s, s);
    speckle(g, s, 7000, 220, 30);
    grime(g, s, 70, 'rgba(30,25,15,A)', 70, 0.18);
    for (let i = 0; i < 40; i++) { // scuffs and peeling paint
      g.fillStyle = `rgba(200,195,170,${0.1 + r() * 0.25})`;
      g.fillRect(r() * s, r() * s, 4 + r() * 22, 2 + r() * 8);
    }
  })),
  tile: () => cached('tile', () => canvas(512, (g, s) => {
    const n = 8, t = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const dark = (i + j) % 2 === 0;
      const base = dark ? 70 + r() * 15 : 150 + r() * 20;
      g.fillStyle = dark ? `rgb(${base + 20},${base},${base - 10})` : `rgb(${base},${base - 5},${base - 15})`;
      g.fillRect(i * t, j * t, t, t);
    }
    speckle(g, s, 14000, 230, 20);
    g.strokeStyle = 'rgba(20,20,15,0.6)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, s); g.stroke(); g.beginPath(); g.moveTo(0, i * t); g.lineTo(s, i * t); g.stroke(); }
    grime(g, s, 80, 'rgba(30,25,15,A)', 60, 0.2);
  })),
  wood: () => cached('wood', () => canvas(256, (g, s) => {
    g.fillStyle = '#7a5134'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 1) {
      const v = Math.sin(y * 0.15 + Math.sin(y * 0.03) * 4) * 18 + (r() - 0.5) * 10;
      g.fillStyle = `rgba(${v > 0 ? 160 : 40},${v > 0 ? 110 : 25},${v > 0 ? 70 : 10},${Math.abs(v) / 90})`;
      g.fillRect(0, y, s, 1);
    }
    grime(g, s, 30, 'rgba(20,10,5,A)', 30, 0.2);
    g.strokeStyle = 'rgba(30,20,10,0.4)';
    for (let i = 0; i < 12; i++) { g.beginPath(); const x = r() * s, y = r() * s; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 6); g.stroke(); } // carvings
  })),
  floorWood: () => cached('floorWood', () => canvas(512, (g, s) => {
    const plank = s / 8;
    for (let i = 0; i < 8; i++) {
      const c = 90 + r() * 30;
      g.fillStyle = `rgb(${c},${c * 0.68},${c * 0.45})`; g.fillRect(0, i * plank, s, plank);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(40,25,10,${r() * 0.15})`; g.fillRect(r() * s, i * plank + r() * plank, 20 + r() * 80, 1); }
      g.fillStyle = 'rgba(20,12,5,0.7)'; g.fillRect(0, i * plank, s, 2);
      const off = r() * s; g.fillRect(off, i * plank, 2, plank);
    }
    grime(g, s, 50, 'rgba(15,10,5,A)', 70, 0.25);
  })),
  concrete: () => cached('concrete', () => canvas(512, (g, s) => {
    g.fillStyle = '#6b6a66'; g.fillRect(0, 0, s, s);
    speckle(g, s, 20000, 200, 20);
    grime(g, s, 90, 'rgba(20,25,20,A)', 90, 0.22);
    grime(g, s, 30, 'rgba(40,60,30,A)', 40, 0.18); // moss
    g.strokeStyle = 'rgba(20,20,20,0.5)';
    for (let i = 0; i < 10; i++) { let x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  })),
  ceiling: () => cached('ceiling', () => canvas(256, (g, s) => {
    g.fillStyle = '#bdb8a6'; g.fillRect(0, 0, s, s);
    speckle(g, s, 6000, 240, 80);
    g.strokeStyle = 'rgba(60,55,45,0.6)'; g.lineWidth = 2;
    g.strokeRect(1, 1, s / 2 - 2, s / 2 - 2); g.strokeRect(s / 2 + 1, 1, s / 2 - 2, s / 2 - 2);
    g.strokeRect(1, s / 2 + 1, s / 2 - 2, s / 2 - 2); g.strokeRect(s / 2 + 1, s / 2 + 1, s / 2 - 2, s / 2 - 2);
    grime(g, s, 25, 'rgba(90,70,30,A)', 50, 0.3);
  })),
  metal: () => cached('metal', () => canvas(256, (g, s) => {
    g.fillStyle = '#7d8a8c'; g.fillRect(0, 0, s, s);
    speckle(g, s, 4000, 220, 40);
    grime(g, s, 40, 'rgba(110,50,20,A)', 30, 0.35); // rust
  })),
  locker: () => cached('locker', () => canvas(256, (g, s) => {
    g.fillStyle = '#4d6e7a'; g.fillRect(0, 0, s, s);
    speckle(g, s, 3000, 200, 30);
    g.fillStyle = 'rgba(15,20,25,0.7)';
    for (let i = 0; i < 6; i++) g.fillRect(s * 0.3, 20 + i * 10, s * 0.4, 4);
    g.fillRect(0, 0, 3, s);
    grime(g, s, 30, 'rgba(110,50,20,A)', 25, 0.35);
  })),
  rust: () => cached('rust', () => canvas(256, (g, s) => {
    g.fillStyle = '#5a3a26'; g.fillRect(0, 0, s, s);
    speckle(g, s, 6000, 180, 20);
    grime(g, s, 60, 'rgba(150,70,20,A)', 30, 0.4);
  })),
  chalkboard: () => cached('chalkboard', () => canvas(256, (g, s) => {
    g.fillStyle = '#23352b'; g.fillRect(0, 0, s, s);
    grime(g, s, 50, 'rgba(200,210,200,A)', 60, 0.05);
  })),
  grass: () => cached('grass', () => canvas(256, (g, s) => {
    g.fillStyle = '#2a3a22'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${40 + r() * 50},${70 + r() * 60},${30 + r() * 20},0.5)`; g.fillRect(r() * s, r() * s, 1, 3 + r() * 4); }
  })),
  fabric: () => cached('fabric', () => canvas(128, (g, s) => {
    g.fillStyle = '#ddd'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); }
  })),
  smoke: () => cached('smoke', () => canvas(128, (g, s) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 18; i++) {
      const x = s / 2 + (r() - 0.5) * s * 0.4, y = s / 2 + (r() - 0.5) * s * 0.4, rad = s * (0.15 + r() * 0.25);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    }
  })),
  glow: () => cached('glow', () => canvas(64, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  })),
};

/** Canvas texture with text (signs, posters, blackboard writing, labels). */
export function textTexture(
  lines: string[],
  opts: { w?: number; h?: number; bg?: string; color?: string; font?: string; size?: number; align?: CanvasTextAlign; chalk?: boolean; border?: string; padding?: number } = {},
): THREE.CanvasTexture {
  const w = opts.w ?? 512, h = opts.h ?? 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
  if (opts.border) { g.strokeStyle = opts.border; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); }
  const size = opts.size ?? 40;
  g.font = `${size}px ${opts.font ?? "'Special Elite', 'Courier New', monospace"}`;
  g.fillStyle = opts.color ?? '#111';
  g.textAlign = opts.align ?? 'center';
  g.textBaseline = 'middle';
  const pad = opts.padding ?? 20;
  const x = g.textAlign === 'left' ? pad : g.textAlign === 'right' ? w - pad : w / 2;
  const lh = size * 1.25;
  const y0 = h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => {
    if (opts.chalk) {
      g.globalAlpha = 0.85;
      for (let k = 0; k < 3; k++) g.fillText(l, x + (Math.random() - 0.5) * 1.5, y0 + i * lh + (Math.random() - 0.5) * 1.5);
      g.globalAlpha = 1;
    } else g.fillText(l, x, y0 + i * lh);
  });
  if (opts.bg && !opts.chalk) { // age the paper
    for (let i = 0; i < 40; i++) {
      const xx = Math.random() * w, yy = Math.random() * h, rr = 10 + Math.random() * 60;
      const grd = g.createRadialGradient(xx, yy, 0, xx, yy, rr);
      grd.addColorStop(0, 'rgba(90,70,30,0.12)'); grd.addColorStop(1, 'rgba(90,70,30,0)');
      g.fillStyle = grd; g.fillRect(xx - rr, yy - rr, rr * 2, rr * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
