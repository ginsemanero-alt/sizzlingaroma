import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Letters scratched into plaster, drawn on a canvas. `mirrored` writes them
 * backwards so they only read correctly in a mirror.
 */
export function ScratchMark({
  pos,
  rot = 0,
  text,
  tally = 0,
  mirrored = false,
  size = 0.5,
  color = '#d8d0c0',
  opacity = 0.75,
}: {
  pos: [number, number, number];
  rot?: number;
  text: string;
  tally?: number;
  mirrored?: boolean;
  size?: number;
  color?: string;
  opacity?: number;
}) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 256);
    if (mirrored) {
      ctx.translate(256, 0);
      ctx.scale(-1, 1);
    }
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.font = text.length > 2 ? 'bold 42px "Special Elite", monospace' : 'bold 150px "Special Elite", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // jittered multi-pass to look scratched
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.35;
      const lines = text.split('\n');
      lines.forEach((l, k) => ctx.fillText(l, 128 + (Math.random() - 0.5) * 4, (tally ? 100 : 128) + (k - (lines.length - 1) / 2) * 48 + (Math.random() - 0.5) * 4));
    }
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 5;
    for (let t = 0; t < tally; t++) {
      ctx.beginPath();
      ctx.moveTo(128 - (tally - 1) * 11 + t * 22, 200);
      ctx.lineTo(128 - (tally - 1) * 11 + t * 22 + (Math.random() - 0.5) * 6, 238);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, tally, mirrored, color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={pos} rotation={[0, rot, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={tex} transparent opacity={opacity} depthWrite={false} roughness={1} />
    </mesh>
  );
}
