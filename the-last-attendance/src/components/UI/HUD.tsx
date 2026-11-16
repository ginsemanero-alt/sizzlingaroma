import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { CHAPTERS } from '@/data/chapters';
import { CHARACTERS } from '@/data/characters';
import { runtime } from '@/systems/runtime';

function useObjective(): { text: string | null; index: number } {
  const chapter = useGame((s) => s.chapter);
  const flags = useGame((s) => s.flags);
  const collected = useGame((s) => s.collected);
  const objs = CHAPTERS[chapter].objectives;
  const idx = objs.findIndex((o) => !flags[o.flag]);
  if (idx < 0) return { text: null, index: objs.length };
  let text = objs[idx].text;
  // dynamic counters
  if (chapter === 2 && objs[idx].id === 'belongings') {
    const n = ['hannah_ribbon', 'carlo_jersey', 'katrina_glasses', 'joshua_pick'].filter((i) => collected.includes(i)).length;
    text = text.replace('(0/4)', `(${n}/4)`);
  }
  if (chapter === 4 && objs[idx].id === 'fragments') text = text.replace('(0/4)', `(${Number(flags.c4_frag_count ?? 0)}/4)`);
  if (chapter === 5 && objs[idx].id === 'docs') {
    const n = ['principal_memo', 'draft_report'].filter((i) => collected.includes(i)).length;
    text = text.replace('(0/2)', `(${n}/2)`);
  }
  return { text, index: idx };
}

export function Objective() {
  const { text, index } = useObjective();
  const [flash, setFlash] = useState(false);
  const prev = useRef(index);
  const notify = useGame((s) => s.notify);
  useEffect(() => {
    if (index !== prev.current) {
      if (index > prev.current) notify('Objective updated', 'objective');
      prev.current = index;
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 1700);
      return () => window.clearTimeout(t);
    }
  }, [index, notify]);
  if (!text) return null;
  return (
    <div className={`objective ${flash ? 'flash' : ''}`}>
      <small>OBJECTIVE</small>
      <div>{text}</div>
    </div>
  );
}

export function Meters() {
  const [bat, setBat] = useState(100);
  const [breath, setBreath] = useState(100);
  const hasLight = useGame((s) => s.collected.includes('flashlight'));
  const on = useGame((s) => s.flashlightOn);
  useEffect(() => {
    const t = window.setInterval(() => {
      setBat(Math.round(runtime.battery));
      setBreath(Math.round(runtime.player.breath));
    }, 250);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="meters">
      {hasLight && (
        <div>
          FLASHLIGHT {on ? '' : '· OFF'} · {bat}%
          <div className={`meter ${bat < 20 ? 'low' : ''}`}><div style={{ width: `${bat}%` }} /></div>
        </div>
      )}
      {breath < 99 && (
        <div>
          BREATH
          <div className={`meter ${breath < 35 ? 'low' : ''}`}><div style={{ width: `${breath}%` }} /></div>
        </div>
      )}
    </div>
  );
}

export function Prompt() {
  const prompt = useGame((s) => s.prompt);
  const overlay = useGame((s) => s.overlay);
  const inv = useGame((s) => s.inventoryOpen);
  return (
    <>
      <div className={`crosshair ${prompt ? 'active' : ''}`} />
      {prompt && overlay === 'none' && !inv && (
        <div className="prompt"><kbd>E</kbd>{prompt}</div>
      )}
    </>
  );
}

export function Subtitles() {
  const sub = useGame((s) => s.subtitle);
  const settings = useGame((s) => s.settings);
  if (!sub || !settings.subtitles) return null;
  const ch = CHARACTERS[sub.speaker];
  const text = settings.subtitleLanguage === 'fil' && sub.fil ? sub.fil : sub.en;
  return (
    <div className="subtitle bg" key={sub.id}>
      {ch.name && <span className="who" style={{ color: ch.color }}>{ch.name}</span>}
      <span style={{ fontStyle: sub.speaker === 'narrator' ? 'italic' : 'normal' }}>{text}</span>
    </div>
  );
}

export function Notifications() {
  const notes = useGame((s) => s.notifications);
  return (
    <div className="notes">
      {notes.map((n) => (
        <div key={n.id} className={`note note-${n.kind}`}>{n.text}{n.kind === 'evidence' ? '  ·  [TAB] review' : ''}</div>
      ))}
    </div>
  );
}

export function Fade() {
  const fade = useGame((s) => s.fade);
  const ms = useGame((s) => s.fadeMs);
  return <div className="fade" style={{ opacity: fade, transition: `opacity ${ms}ms ease` }} />;
}

export function CenterText() {
  const t = useGame((s) => s.centerText);
  if (!t) return null;
  return <div className="center-text" key={t}>{t}</div>;
}

export function ChapterCard() {
  const card = useGame((s) => s.chapterCard);
  if (!card) return null;
  return (
    <div className="chapter-card-overlay" key={card.title}>
      <div>
        <small>{card.subtitle.toUpperCase()}</small>
        <h1>{card.title}</h1>
        <p>{card.location}</p>
        <p>{card.time}</p>
      </div>
    </div>
  );
}

export function CaughtOverlay() {
  const msg = useGame((s) => s.caughtMessage);
  if (!msg) return null;
  return <div className="caught">{msg}</div>;
}

/** Fear vignette, hidden indicator. Polls runtime at low frequency to avoid re-renders. */
export function FearAndStatus() {
  const [fear, setFear] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [breathLow, setBreathLow] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => {
      setFear(Math.round(runtime.fear * 20) / 20);
      setHidden(!!runtime.player.hidden);
      setBreathLow(Math.max(0, 1 - runtime.player.breath / 100));
    }, 150);
    return () => window.clearInterval(t);
  }, []);
  return (
    <>
      <div className="vignette" style={{ opacity: 0.75 + breathLow * 0.25 }} />
      <div className="fearfx" style={{ opacity: Math.max(fear * 0.8, breathLow * 0.6) }} />
      {hidden && <div className="hidden-tag">HIDING · [E] LEAVE</div>}
    </>
  );
}
