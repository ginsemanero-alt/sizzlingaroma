import { useEffect, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { uiClick, uiHover } from '../../systems/AudioSystem/audioManager';

export function ChoiceBox() {
  const choice = useGame((s) => s.choice);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [choice]);
  useEffect(() => {
    if (!choice) return;
    const enabled = choice.options.map((o, i) => (o.locked ? -1 : i)).filter((i) => i >= 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIdx((i) => enabled[(enabled.indexOf(i) + 1) % enabled.length] ?? i);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setIdx((i) => enabled[(enabled.indexOf(i) - 1 + enabled.length) % enabled.length] ?? i);
      } else if (e.key === 'Enter' || e.key === ' ') {
        const o = choice.options[idx];
        if (o && !o.locked) {
          uiClick();
          choice.resolve(o.id);
        }
      } else if (/^[1-9]$/.test(e.key)) {
        const o = choice.options[Number(e.key) - 1];
        if (o && !o.locked) {
          uiClick();
          choice.resolve(o.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choice, idx]);
  if (!choice) return null;
  return (
    <div className="overlay choice" role="dialog" aria-label={choice.prompt}>
      <div className="choice-panel">
        <p className="choice-prompt">{choice.prompt}</p>
        <ul>
          {choice.options.map((o, i) => (
            <li key={o.id}>
              <button
                className={`choice-opt ${i === idx ? 'sel' : ''}`}
                disabled={!!o.locked}
                onMouseEnter={() => {
                  if (!o.locked) {
                    setIdx(i);
                    uiHover();
                  }
                }}
                onClick={() => {
                  uiClick();
                  choice.resolve(o.id);
                }}
              >
                <span className="n">{i + 1}</span>
                {o.text}
                {o.locked && <span className="locked"> — {o.locked}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
