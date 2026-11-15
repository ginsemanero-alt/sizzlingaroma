import { useEffect, useState } from 'react';
import { useSettings, type Quality } from '../../store/settingsStore';
import { refreshVolumes, uiClick, play } from '../../systems/AudioSystem/audioManager';

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.05, fmt }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; fmt?: (v: number) => string }) {
  return (
    <label className="setting">
      <span className="s-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="s-val">{fmt ? fmt(value) : `${Math.round(value * 100)}%`}</span>
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="setting">
      <span className="s-label">{label}</span>
      <button className={`toggle ${value ? 'on' : ''}`} role="switch" aria-checked={value} onClick={() => (uiClick(), onChange(!value))}>
        {value ? 'On' : 'Off'}
      </button>
    </label>
  );
}

export function SettingsPanel() {
  const s = useSettings();
  const [fs, setFs] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const vol = (k: 'master' | 'music' | 'ambience' | 'sfx') => (v: number) => {
    s.set({ [k]: v });
    refreshVolumes();
  };
  return (
    <div className="settings">
      <section>
        <h4>Audio</h4>
        <Slider label="Master volume" value={s.master} onChange={vol('master')} />
        <Slider label="Music" value={s.music} onChange={vol('music')} />
        <Slider label="Ambience" value={s.ambience} onChange={vol('ambience')} />
        <Slider label="Sound effects & voices" value={s.sfx} onChange={(v) => (vol('sfx')(v), play('ui_click', { vol: 0.8 }))} />
      </section>
      <section>
        <h4>Controls</h4>
        <Slider label="Mouse sensitivity" value={s.sensitivity} min={0.2} max={3} step={0.1} onChange={(v) => s.set({ sensitivity: v })} fmt={(v) => v.toFixed(1)} />
        <Toggle label="Invert vertical look" value={s.invertY} onChange={(v) => s.set({ invertY: v })} />
      </section>
      <section>
        <h4>Display</h4>
        <label className="setting">
          <span className="s-label">Graphics quality</span>
          <span className="seg">
            {(['low', 'medium', 'high'] as Quality[]).map((q) => (
              <button key={q} className={s.quality === q ? 'active' : ''} onClick={() => (uiClick(), s.set({ quality: q }))}>
                {q}
              </button>
            ))}
          </span>
        </label>
        <Slider label="Brightness" value={s.brightness} min={0.5} max={2} step={0.05} onChange={(v) => s.set({ brightness: v })} fmt={(v) => v.toFixed(2)} />
        <Toggle label="Reduced camera shake" value={s.reducedShake} onChange={(v) => s.set({ reducedShake: v })} />
        <Toggle
          label="Fullscreen"
          value={fs}
          onChange={(v) => {
            if (v) document.documentElement.requestFullscreen?.().catch(() => {});
            else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          }}
        />
      </section>
      <section>
        <h4>Subtitles</h4>
        <Toggle label="Subtitles" value={s.subtitles} onChange={(v) => s.set({ subtitles: v })} />
        <label className="setting">
          <span className="s-label">Subtitle size</span>
          <span className="seg">
            {(['small', 'medium', 'large'] as const).map((q) => (
              <button key={q} className={s.subtitleSize === q ? 'active' : ''} onClick={() => (uiClick(), s.set({ subtitleSize: q }))}>
                {q}
              </button>
            ))}
          </span>
        </label>
      </section>
      <div className="settings-foot">
        <button className="btn" onClick={() => (s.reset(), refreshVolumes())}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

export function ControlsList() {
  const rows: [string, string][] = [
    ['W A S D', 'Move'],
    ['Mouse / Arrow keys', 'Look around'],
    ['Shift', 'Run'],
    ['Ctrl or C', 'Crouch'],
    ['E', 'Interact'],
    ['F', 'Toggle flashlight'],
    ['Tab', 'Inventory'],
    ['Esc or P', 'Pause / release mouse'],
    ['1–9 / Enter', 'Pick a dialogue choice'],
  ];
  return (
    <table className="controls">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="k">{k}</td>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
