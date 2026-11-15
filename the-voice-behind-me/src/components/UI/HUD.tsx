import { useEffect, useState } from 'react';
import { useGame, controlsActive } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';

function Prompt() {
  const focus = useGame((s) => s.focus);
  const blocked = useGame((s) => s.cutscene || s.paused || s.inventoryOpen || !!s.puzzle || !!s.choice || !!s.viewItem);
  if (!focus || blocked) return null;
  return (
    <div className="hud-prompt">
      <span className="key">E</span>
      <span>{focus.prompt}</span>
    </div>
  );
}

function Crosshair() {
  const focus = useGame((s) => !!s.focus);
  const hidden = useGame((s) => s.cutscene || s.paused || s.inventoryOpen || !!s.puzzle || !!s.choice || !!s.viewItem);
  if (hidden) return null;
  return <div className={`crosshair ${focus ? 'on' : ''}`} />;
}

function Battery() {
  const battery = useGame((s) => Math.ceil(s.battery));
  const on = useGame((s) => s.flashlightOn);
  const low = battery < 15;
  return (
    <div className={`hud-battery ${on ? 'on' : ''} ${low ? 'low' : ''}`} aria-label={`Flashlight battery ${battery} percent`}>
      <div className="bat-icon">
        <div className="bat-fill" style={{ width: `${battery}%` }} />
      </div>
      <span className="bat-key">F</span>
    </div>
  );
}

function Objective() {
  const objectives = useGame((s) => s.objectives);
  const cutscene = useGame((s) => s.cutscene);
  const current = objectives.find((o) => !o.done && !o.optional);
  const [flash, setFlash] = useState(false);
  const key = current?.id + ':' + current?.count;
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 2600);
    return () => clearTimeout(t);
  }, [key]);
  if (!current) return null;
  return (
    <div className={`hud-objective ${flash ? 'flash' : ''} ${cutscene ? 'dim' : ''}`}>
      <span className="obj-mark">◇</span>
      {current.text}
      {current.total ? ` (${current.count}/${current.total})` : ''}
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="hud-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Subtitles() {
  const sub = useGame((s) => s.subtitle);
  const enabled = useSettings((s) => s.subtitles);
  const size = useSettings((s) => s.subtitleSize);
  if (!sub || !enabled) return null;
  return (
    <div className={`subtitles size-${size}`} key={sub.id}>
      <div className={`sub-line ${sub.faint ? 'faint' : ''}`}>
        {sub.who && <span className="who">{sub.who}: </span>}
        {sub.text}
      </div>
    </div>
  );
}

function Hint() {
  const hint = useGame((s) => s.hint);
  if (!hint) return null;
  return <div className="hud-hint">{hint}</div>;
}

function ClickToResume() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => {
      const locked = !!document.pointerLockElement;
      setShow(!locked && controlsActive());
    }, 300);
    return () => clearInterval(iv);
  }, []);
  if (!show) return null;
  return <div className="click-resume">Click to look around · Arrow keys also look</div>;
}

export function HUD() {
  return (
    <div className="hud">
      <Crosshair />
      <Prompt />
      <Battery />
      <Objective />
      <Toasts />
      <Hint />
      <ClickToResume />
    </div>
  );
}

export function FadeOverlay() {
  const fade = useGame((s) => s.fade);
  const color = useGame((s) => s.fadeColor);
  return <div className="fade" style={{ opacity: fade, background: color }} />;
}

export function ChapterCardOverlay() {
  const card = useGame((s) => s.chapterCard);
  if (!card) return null;
  return (
    <div className="chapter-card">
      <div className="cc-sub">{card.subtitle}</div>
      <div className="cc-title">{card.title}</div>
      <div className="cc-loc">{card.location}</div>
    </div>
  );
}

/** A soft vignette that pulses when the Figure is near or distortion is active. */
export function DistortionVeil() {
  const d = useGame((s) => s.distortion);
  return <div className="veil" style={{ opacity: d * 0.8 }} />;
}
