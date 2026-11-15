import { useEffect, useState } from 'react';
import { useGame } from '../../../store/gameStore';
import { PUZZLES, type DialPuzzleDef, type OrderPuzzleDef } from '../../../data/puzzles';
import { play, uiClick } from '../../../systems/AudioSystem/audioManager';
import { ITEMS } from '../../../data/items';

function useFinish(resolve: (ok: boolean) => void) {
  const [solved, setSolved] = useState(false);
  const finish = () => {
    setSolved(true);
    play('lock', { vol: 0.7 });
    play('pickup', { vol: 0.5 });
    setTimeout(() => resolve(true), 2800);
  };
  return { solved, finish };
}

function OrderPuzzle({ def, resolve }: { def: OrderPuzzleDef; resolve: (ok: boolean) => void }) {
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(def.slots).fill(null));
  const [fails, setFails] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const { solved, finish } = useFinish(resolve);
  const used = new Set(slots.filter(Boolean) as string[]);
  const pool = def.cards.filter((c) => !used.has(c.id));
  const card = (id: string) => def.cards.find((c) => c.id === id)!;

  const place = (id: string) => {
    const i = slots.indexOf(null);
    if (i < 0) return;
    uiClick();
    const n = [...slots];
    n[i] = id;
    setSlots(n);
    setMsg(null);
  };
  const remove = (i: number) => {
    if (!slots[i]) return;
    uiClick();
    const n = [...slots];
    n[i] = null;
    setSlots(n);
  };
  const check = () => {
    if (slots.some((s) => !s)) {
      setMsg('Fill every slot first.');
      return;
    }
    if (def.check(slots as string[])) {
      finish();
    } else {
      setFails((f) => f + 1);
      setMsg(def.id === 'timeline' ? 'That isn\'t how it happened.' : 'Something is out of place.');
      setShake(true);
      play('bass', { vol: 0.35 });
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className={`puzzle-panel ${shake ? 'shake' : ''}`}>
      <h2>{def.title}</h2>
      <p className="instructions">{def.instructions}</p>
      <ol className={`slots n${def.slots}`}>
        {slots.map((s, i) => (
          <li key={i}>
            <button className={`slot ${s ? 'filled' : ''}`} onClick={() => remove(i)} disabled={solved} aria-label={s ? `Slot ${i + 1}: ${card(s).label}. Click to remove.` : `Slot ${i + 1}, empty`}>
              <span className="num">{i + 1}</span>
              {s ? (
                <>
                  {ITEMS[s]?.tint && <span className="swatch" style={{ background: ITEMS[s].tint }} />}
                  <span className="lbl">{card(s).label}</span>
                </>
              ) : (
                <span className="lbl muted">—</span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <div className="pool">
        {pool.map((c) => (
          <button key={c.id} className="card" onClick={() => place(c.id)} disabled={solved}>
            {ITEMS[c.id]?.tint && <span className="swatch" style={{ background: ITEMS[c.id].tint }} />}
            <span className="lbl">{c.label}</span>
            {c.detail && <span className="detail">{c.detail}</span>}
          </button>
        ))}
        {def.id === 'timeline' && pool.length > 0 && <div className="pool-note">Leave the lie in this pile.</div>}
      </div>
      {solved ? (
        <p className="solved">{def.solvedText}</p>
      ) : (
        <>
          {msg && <p className="msg">{msg}</p>}
          {fails >= 2 && <p className="hint">Hint: {def.hint}</p>}
          <div className="puzzle-actions">
            <button className="btn primary" onClick={check}>
              Confirm
            </button>
            <button className="btn" onClick={() => setSlots(Array(def.slots).fill(null))}>
              Clear
            </button>
            <button className="btn" onClick={() => resolve(false)}>
              Step away
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DialPuzzle({ def, resolve }: { def: DialPuzzleDef; resolve: (ok: boolean) => void }) {
  const [vals, setVals] = useState<number[]>(() => Array(def.length).fill(0));
  const [fails, setFails] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const { solved, finish } = useFinish(resolve);
  const n = def.symbols.length;
  const turn = (i: number, d: number) => {
    play('click', { vol: 0.35, rate: 1.4 });
    setVals((v) => v.map((x, j) => (j === i ? (x + d + n) % n : x)));
    setMsg(null);
  };
  const check = () => {
    const code = vals.map((v) => def.symbols[v]).join('');
    if (code === def.answer) finish();
    else {
      setFails((f) => f + 1);
      setMsg('It doesn\'t budge.');
      play('lock', { vol: 0.5 });
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (solved) return;
      const ch = e.key.toUpperCase();
      const idx = def.symbols.indexOf(ch);
      if (idx >= 0) {
        setVals((v) => v.map((x, j) => (j === focusIdx ? idx : x)));
        setFocusIdx((f) => Math.min(def.length - 1, f + 1));
        play('click', { vol: 0.35, rate: 1.4 });
      } else if (e.key === 'ArrowLeft') setFocusIdx((f) => Math.max(0, f - 1));
      else if (e.key === 'ArrowRight') setFocusIdx((f) => Math.min(def.length - 1, f + 1));
      else if (e.key === 'ArrowUp') turn(focusIdx, 1);
      else if (e.key === 'ArrowDown') turn(focusIdx, -1);
      else if (e.key === 'Enter') check();
      else if (e.key === 'Backspace') setFocusIdx((f) => Math.max(0, f - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="puzzle-panel dial-panel">
      <h2>{def.title}</h2>
      <p className="instructions">{def.instructions}</p>
      <div className="dials">
        {vals.map((v, i) => (
          <div key={i} className={`dial ${focusIdx === i ? 'focus' : ''}`} onClick={() => setFocusIdx(i)}>
            <button onClick={() => turn(i, 1)} aria-label="Up" disabled={solved}>
              ▲
            </button>
            <div className="dial-face">{def.symbols[v]}</div>
            <button onClick={() => turn(i, -1)} aria-label="Down" disabled={solved}>
              ▼
            </button>
          </div>
        ))}
      </div>
      <p className="muted small">Type to set dials · Enter to try</p>
      {solved ? (
        <p className="solved">{def.solvedText}</p>
      ) : (
        <>
          {msg && <p className="msg">{msg}</p>}
          {fails >= 2 && <p className="hint">Hint: {def.hint}</p>}
          <div className="puzzle-actions">
            <button className="btn primary" onClick={check}>
              Try it
            </button>
            <button className="btn" onClick={() => resolve(false)}>
              Step away
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PuzzleOverlay() {
  const req = useGame((s) => s.puzzle);
  if (!req) return null;
  const def = PUZZLES[req.id];
  return (
    <div className="overlay puzzle" role="dialog" aria-label={def.title}>
      {def.kind === 'order' ? <OrderPuzzle key={req.id} def={def} resolve={req.resolve} /> : <DialPuzzle key={req.id} def={def} resolve={req.resolve} />}
    </div>
  );
}
