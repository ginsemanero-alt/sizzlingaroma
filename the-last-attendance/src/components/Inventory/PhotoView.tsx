import type { PhotoSpec } from '@/types';

/** Procedural photograph rendered as SVG (sepia, faded, slightly damaged). */
export function PhotoView({ spec, width = 560 }: { spec: PhotoSpec; width?: number }) {
  const figs = spec.figures ?? [];
  const W = 600, H = 380;
  const perRow = Math.ceil(figs.length / 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} style={{ maxWidth: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
      <defs>
        <filter id="sepia"><feColorMatrix type="matrix" values="0.45 0.6 0.2 0 0  0.38 0.55 0.18 0 0  0.28 0.42 0.15 0 0  0 0 0 1 0" /></filter>
        <radialGradient id="vig" cx="50%" cy="50%" r="70%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity="0.55" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="#efe6cf" />
      <g filter="url(#sepia)">
        <rect x="18" y="18" width={W - 36} height={H - 80} fill="#7d8c86" />
        <rect x="18" y="18" width={W - 36} height={90} fill="#c9c4b2" />
        <rect x="40" y="35" width={W - 80} height={50} fill="#2f4136" />
        {figs.map((f, i) => {
          const row = i < perRow ? 0 : 1;
          const col = row === 0 ? i : i - perRow;
          const n = row === 0 ? perRow : figs.length - perRow;
          const x = 50 + ((W - 100) / Math.max(1, n - 1 || 1)) * col + (n === 1 ? (W - 100) / 2 : 0);
          const y = row === 0 ? 150 : 205;
          const s = row === 0 ? 0.9 : 1;
          return (
            <g key={i} transform={`translate(${x},${y}) scale(${s})`} opacity={f.label ? 1 : 0.75}>
              {f.long && <rect x="-15" y="-12" width="30" height="40" rx="8" fill="#1d1612" />}
              <ellipse cx="0" cy="0" rx="14" ry="16" fill="#c8a789" />
              <path d="M-14,-4 Q0,-22 14,-4 L14,-8 Q0,-26 -14,-8Z" fill="#1d1612" />
              {f.glasses && (<g stroke="#3a2a1a" strokeWidth="2" fill="none"><circle cx="-5" cy="0" r="4.5" /><circle cx="5" cy="0" r="4.5" /></g>)}
              {f.ribbon && <rect x="6" y="-16" width="10" height="5" fill="#e0c040" />}
              <rect x="-20" y="16" width="40" height="70" rx="6" fill={f.accent ?? '#ece8dc'} />
              {f.jersey && (<g><rect x="-20" y="22" width="40" height="22" fill="#a52a2a" /><text x="0" y="39" fontSize="14" textAnchor="middle" fill="#fff">{f.jersey}</text></g>)}
              {f.label && <text x="0" y="104" fontSize="9" textAnchor="middle" fill="#222">{f.label}</text>}
            </g>
          );
        })}
      </g>
      <rect x="18" y="18" width={W - 36} height={H - 80} fill="url(#vig)" />
      <path d={`M${W - 120},18 L${W - 18},18 L${W - 18},90 Z`} fill="#e9dfc5" opacity="0.85" />
      <text x={W / 2} y={H - 34} fontSize="13" textAnchor="middle" fill="#3a3326" fontFamily="'Special Elite', monospace">{spec.caption}</text>
    </svg>
  );
}

/** Small portrait used in the photo matching puzzle. */
export function Portrait({ feature }: { feature: 'ribbon' | 'jersey' | 'glasses' | 'pick' }) {
  return (
    <svg viewBox="0 0 120 140" width="100%">
      <rect width="120" height="140" fill="#8d958c" />
      <g opacity="0.92">
        {feature === 'ribbon' || feature === 'glasses' ? <rect x="34" y="34" width="52" height="66" rx="16" fill="#1d1612" /> : null}
        <ellipse cx="60" cy="58" rx="24" ry="28" fill="#c8a789" />
        <path d="M36,52 Q60,20 84,52 L84,44 Q60,14 36,44Z" fill="#1d1612" />
        <circle cx="51" cy="60" r="2.5" fill="#222" /><circle cx="69" cy="60" r="2.5" fill="#222" />
        <path d="M52,74 Q60,80 68,74" stroke="#5a3a2a" strokeWidth="2" fill="none" />
        <rect x="26" y="88" width="68" height="60" rx="10" fill="#ece8dc" />
        {feature === 'ribbon' && <path d="M74,30 l14,-6 l-2,12 Z M74,30 l12,8 l-14,4Z" fill="#d6b43a" />}
        {feature === 'glasses' && (<g stroke="#3a2a1a" strokeWidth="3" fill="none"><circle cx="50" cy="60" r="9" /><circle cx="70" cy="60" r="9" /><path d="M59,60 h2" /></g>)}
        {feature === 'jersey' && (<g><rect x="34" y="96" width="52" height="30" fill="#a52a2a" /><text x="60" y="118" fontSize="18" textAnchor="middle" fill="#fff">7</text></g>)}
        {feature === 'pick' && (<g><path d="M48,88 L60,108 L72,88" stroke="#111" strokeWidth="1.5" fill="none" /><path d="M55,106 h10 l-5,9z" fill="#2a8a4a" /></g>)}
      </g>
    </svg>
  );
}
