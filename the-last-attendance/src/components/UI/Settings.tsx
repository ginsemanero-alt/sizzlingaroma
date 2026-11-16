import { Fragment } from 'react';
import { useGame } from '@/store/gameStore';
import type { Settings } from '@/types';

function Slider({ label, k, min = 0, max = 1, step = 0.05, fmt }: { label: string; k: keyof Settings; min?: number; max?: number; step?: number; fmt?: (v: number) => string }) {
  const v = useGame((s) => s.settings[k]) as number;
  const update = useGame((s) => s.updateSettings);
  return (
    <label className="setting">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => update({ [k]: Number(e.target.value) } as Partial<Settings>)} />
      <span className="val">{fmt ? fmt(v) : `${Math.round(v * 100)}%`}</span>
    </label>
  );
}

function Toggle({ label, k }: { label: string; k: keyof Settings }) {
  const v = useGame((s) => s.settings[k]) as boolean;
  const update = useGame((s) => s.updateSettings);
  return (
    <div className="setting">
      <span>{label}</span>
      <div className="seg">
        <button className={v ? 'on' : ''} onClick={() => update({ [k]: true } as Partial<Settings>)}>On</button>
        <button className={!v ? 'on' : ''} onClick={() => update({ [k]: false } as Partial<Settings>)}>Off</button>
      </div>
      <span />
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useGame((st) => st.settings);
  const update = useGame((st) => st.updateSettings);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  return (
    <div className="panel interactive" onClick={(e) => e.stopPropagation()}>
      <h2>SETTINGS</h2>
      <h3>AUDIO</h3>
      <Slider label="Master volume" k="masterVolume" />
      <Slider label="Music volume" k="musicVolume" />
      <Slider label="Ambient volume" k="ambientVolume" />
      <Slider label="Effects volume" k="sfxVolume" />
      <Toggle label="Synthesized voices" k="voices" />
      <h3>CONTROLS</h3>
      <Slider label="Mouse sensitivity" k="mouseSensitivity" min={0.2} max={3} step={0.1} fmt={(v) => v.toFixed(1)} />
      <Toggle label="Invert Y axis" k="invertY" />
      <h3>GRAPHICS</h3>
      <div className="setting">
        <span>Quality</span>
        <div className="seg">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button key={q} className={s.graphics === q ? 'on' : ''} onClick={() => update({ graphics: q })}>{q}</button>
          ))}
        </div>
        <span />
      </div>
      <Slider label="Brightness" k="brightness" min={0.5} max={1.8} step={0.05} fmt={(v) => v.toFixed(2)} />
      <Slider label="Field of view" k="fov" min={55} max={95} step={1} fmt={(v) => `${v}°`} />
      <div className="setting">
        <span>Fullscreen</span>
        <div><button className="btn small" onClick={toggleFullscreen}>Toggle fullscreen</button></div>
        <span />
      </div>
      <h3>ACCESSIBILITY</h3>
      <Toggle label="Subtitles" k="subtitles" />
      <div className="setting">
        <span>Subtitle language</span>
        <div className="seg">
          <button className={s.subtitleLanguage === 'en' ? 'on' : ''} onClick={() => update({ subtitleLanguage: 'en' })}>English</button>
          <button className={s.subtitleLanguage === 'fil' ? 'on' : ''} onClick={() => update({ subtitleLanguage: 'fil' })}>Filipino</button>
        </div>
        <span />
      </div>
      <Toggle label="Reduced camera shake" k="reducedShake" />
      <Toggle label="Reduced flashing" k="reducedFlashing" />
      <div className="row" style={{ marginTop: 22 }}>
        <button className="btn primary" onClick={onClose}>Back</button>
      </div>
    </div>
  );
}

export function ControlsPanel({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['W A S D', 'Move'], ['Mouse', 'Look around'], ['Shift', 'Run (loud)'], ['Ctrl / C', 'Crouch (quiet, breathe under smoke)'],
    ['E', 'Interact / hide / leave hiding spot'], ['F', 'Flashlight'], ['Tab', 'Inventory & evidence'], ['Q', 'Inspect selected evidence'], ['Esc', 'Pause'],
  ];
  return (
    <div className="panel interactive" onClick={(e) => e.stopPropagation()}>
      <h2>CONTROLS</h2>
      <div className="keys">
        {rows.map(([k, d]) => (<Fragment key={k}><span><kbd>{k}</kbd></span><span>{d}</span></Fragment>))}
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.6, marginTop: 18 }}>
        Ms. Reyes hears running from far away and footsteps from closer. Crouching is nearly silent. When she is chasing you, break line of sight and hide —
        but she will find you if she sees where you hide. Your browser may close the tab on Ctrl+W: use C to crouch while moving forward.
      </p>
      <div className="row" style={{ marginTop: 18 }}><button className="btn primary" onClick={onClose}>Back</button></div>
    </div>
  );
}

export function ConfirmDialog({ text, confirmLabel = 'Confirm', onConfirm, onCancel }: { text: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="overlay" style={{ zIndex: 70 }} onClick={onCancel}>
      <div className="panel interactive" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ lineHeight: 1.6, marginTop: 0 }}>{text}</p>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
