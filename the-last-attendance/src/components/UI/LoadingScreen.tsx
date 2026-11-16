import { useEffect, useMemo, useState } from 'react';
import { ROLL_CALL } from '@/data/characters';
import { useGame } from '@/store/gameStore';

const WHISPERS = [
  'Present.', 'Absent.', 'Nandito po.', 'Who took the attendance?', 'Isa pa.', 'Do not leave the room.',
  'Bilangin ang lahat.', 'She is still calling the roll.', 'Why is my name not here?',
];

/**
 * Chapter loading screen: an old evening attendance sheet filling itself in while the chapter
 * loads. Names appear one by one and are stamped ABSENT; the last line waits for you.
 */
export function LoadingScreen({ title, subtitle, tip, progress }: { title: string; subtitle: string; tip?: string; progress: number }) {
  const reduced = useGame((s) => s.settings.reducedFlashing);
  const [shown, setShown] = useState(0);
  const [whisper, setWhisper] = useState<{ text: string; x: number; y: number; id: number } | null>(null);
  const [figure, setFigure] = useState(false);
  const names = useMemo(() => [...ROLL_CALL].sort(() => Math.random() - 0.5).slice(0, 7), []);

  // names written in, one by one
  useEffect(() => {
    const t = window.setInterval(() => setShown((n) => Math.min(names.length + 1, n + 1)), 380);
    return () => window.clearInterval(t);
  }, [names.length]);

  // faint whispers and a figure that is there for a moment
  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      setWhisper({ text: WHISPERS[Math.floor(Math.random() * WHISPERS.length)], x: 8 + Math.random() * 70, y: 10 + Math.random() * 75, id: Math.random() });
      if (Math.random() < 0.45) { setFigure(true); window.setTimeout(() => alive && setFigure(false), reduced ? 900 : 260); }
      window.setTimeout(loop, 1300 + Math.random() * 1400);
    };
    const first = window.setTimeout(loop, 700);
    return () => { alive = false; window.clearTimeout(first); };
  }, [reduced]);

  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className={`loadscreen ${reduced ? 'calm' : ''}`}>
      <div className="ls-grain" />
      <div className="ls-pulse" />

      <svg className={`ls-figure ${figure ? 'on' : ''}`} viewBox="0 0 120 300" aria-hidden>
        <defs>
          <filter id="lsblur"><feGaussianBlur stdDeviation="2.2" /></filter>
        </defs>
        <g filter="url(#lsblur)" fill="#000">
          <ellipse cx="60" cy="40" rx="20" ry="24" />
          <path d="M38 34 Q60 4 82 34 L90 120 Q60 132 30 120 Z" />
          <path d="M42 64 Q60 58 78 64 L92 170 L84 300 L36 300 L28 170 Z" />
          <path d="M40 72 L18 170 L26 172 L46 96 Z" /><path d="M80 72 L102 170 L94 172 L74 96 Z" />
        </g>
        <circle cx="53" cy="40" r="1.6" fill="#7a0a0a" /><circle cx="67" cy="40" r="1.6" fill="#7a0a0a" />
      </svg>

      {whisper && <div key={whisper.id} className="ls-whisper" style={{ left: `${whisper.x}%`, top: `${whisper.y}%` }}>{whisper.text}</div>}

      <div className="ls-content">
        <div className="ls-sub">{subtitle.toUpperCase()}</div>
        <h1 className="ls-title" data-text={title}>{title}</h1>

        <div className="ls-sheet">
          <div className="ls-sheet-head">
            <span>EVENING ATTENDANCE</span>
            <span>ROOM 13 · 12-SAMPAGUITA</span>
          </div>
          {names.map((n, i) => (
            <div key={n.surname} className={`ls-row ${i < shown ? 'in' : ''}`}>
              <span className="ls-name">{n.surname}, {n.first}</span>
              <span className="ls-dots" />
              <span className="ls-stamp">ABSENT</span>
            </div>
          ))}
          <div className={`ls-row last ${shown > names.length ? 'in' : ''}`}>
            <span className="ls-name">Semanero, Jasmine</span>
            <span className="ls-dots" />
            <span className="ls-q">?</span>
          </div>
          <div className="ls-stain" />
        </div>

        <div className="ls-progress">
          <div className="ls-progress-label">
            <span>Taking attendance</span>
            <span>{pct}%</span>
          </div>
          <div className="ls-bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
        {tip && <div className="ls-tip">{tip}</div>}
      </div>
    </div>
  );
}
