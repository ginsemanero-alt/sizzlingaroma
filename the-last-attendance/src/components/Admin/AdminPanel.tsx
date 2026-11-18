import { useState } from 'react';
import { runtime } from '@/systems/runtime';
import { useGame } from '@/store/gameStore';
import { CHAPTER_IDS, CHAPTERS } from '@/data/chapters';
import { KEEPSAKES, KEY_EVIDENCE } from '@/data/items';
import type { ChapterId } from '@/types';
import { adminLogin, adminLogout, giveBelongings, giveChapterItems, setFly, setTop, teacherMode, teleportHere, toggle, useAdmin } from './admin';

/** F9 window: PIN login, then the admin controls. Opening it pauses the game and frees the mouse. */
export function AdminPanel() {
  useAdmin((s) => s.v);
  const close = useGame((s) => s.closeOverlay);
  const collected = useGame((s) => s.collected);
  const chapter = useGame((s) => s.chapter);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const a = runtime.admin;

  if (!a.active) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (await adminLogin(pin)) { setErr(''); setPin(''); useAdmin.setState((s) => ({ v: s.v + 1 })); }
      else setErr('Wrong PIN.');
    };
    return (
      <div className="overlay" onClick={close}>
        <form className="panel interactive admin-panel" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
          <h2>ADMIN</h2>
          <label htmlFor="admin-pin" style={{ color: 'var(--muted)', fontSize: 13 }}>Enter the admin PIN</label>
          <input id="admin-pin" type="password" autoFocus autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} className="admin-input" />
          {err && <p style={{ color: '#ff7a7a', fontSize: 13 }}>{err}</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" type="submit">Unlock</button>
            <button className="btn" type="button" onClick={close}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  const on = (b: boolean) => (b ? 'btn primary' : 'btn');
  const keys = KEY_EVIDENCE.filter((k) => collected.includes(k)).length;
  const bel = KEEPSAKES.filter((k) => collected.includes(k)).length;
  const p = runtime.player.pos;
  const go = (ch: ChapterId) => { setFly(false); close(); useGame.getState().beginChapter(ch); };
  return (
    <div className="overlay" onClick={close}>
      <div className="panel interactive admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>ADMIN · GOD'S EYE</h2>
          <button className="btn small" onClick={close}>Close [F9]</button>
        </div>
        <p className="admin-stats">
          Chapter {chapter} · Jasmine ({p.x.toFixed(1)}, {p.z.toFixed(1)}) · Ms. Reyes: {runtime.teacherState}
          <br />Key evidence {keys}/{KEY_EVIDENCE.length} · Belongings {bel}/{KEEPSAKES.length}
        </p>

        <h3>VIEW</h3>
        <div className="admin-grid">
          <button className={on(a.fly && !a.top)} onClick={() => { if (a.fly && !a.top) setFly(false); else { setFly(true); setTop(false); } }}>Fly through walls [G]</button>
          <button className={on(a.top)} onClick={() => setTop(!a.top)}>Overhead map [M]</button>
          <button className={on(a.labels)} onClick={() => toggle('labels')}>See everything [L]</button>
          <button className={on(a.fullbright)} onClick={() => toggle('fullbright')}>Full bright [B]</button>
        </div>

        <h3>JASMINE &amp; MS. REYES</h3>
        <div className="admin-grid">
          <button className={on(a.invisible)} onClick={() => toggle('invisible')}>Invisible to Ms. Reyes [I]</button>
          <button className="btn" disabled={!a.fly} onClick={() => { teleportHere(); close(); }}>Move Jasmine to camera [T]</button>
          <button className="btn" onClick={() => teacherMode('off')}>Teacher off</button>
          <button className="btn" onClick={() => teacherMode('stalker')}>Teacher stalker</button>
          <button className="btn" onClick={() => teacherMode('hunter')}>Teacher hunter</button>
        </div>

        <h3>ITEMS</h3>
        <div className="admin-grid">
          <button className="btn" onClick={giveChapterItems}>Give all items up to this chapter</button>
          <button className="btn" onClick={giveBelongings}>Give all 13 belongings</button>
          <button className="btn" onClick={() => { runtime.battery = 100; useGame.getState().notify('Flashlight battery 100%', 'info'); }}>Full battery</button>
        </div>

        <h3>GO TO CHAPTER</h3>
        <div className="admin-grid">
          {CHAPTER_IDS.map((id) => <button key={id} className="btn" onClick={() => go(id)}>{id}. {CHAPTERS[id].title}</button>)}
        </div>

        <p className="admin-help">
          In the game: <b>G</b> fly · <b>M</b> map · <b>L</b> labels · <b>B</b> bright · <b>I</b> invisible · <b>T</b> move Jasmine here · <b>F9</b> this panel
          <br />Flying: <b>WASD</b> move · <b>Space</b> up · <b>C</b> down · <b>Shift</b> fast · mouse to look. Map: <b>WASD</b> pan · <b>Space/C</b> zoom.
        </p>
        <button className="btn danger" onClick={() => { adminLogout(); close(); }}>Log out of admin</button>
      </div>
    </div>
  );
}

/** Small always-on badge while admin is logged in. */
export function AdminBadge() {
  useAdmin((s) => s.v);
  const a = runtime.admin;
  if (!a.active) return null;
  const tags = [a.top ? 'MAP' : a.fly ? 'FLY' : null, a.invisible ? 'INVISIBLE' : null, a.labels ? 'X-RAY' : null, a.fullbright ? 'BRIGHT' : null].filter(Boolean);
  return <div className="admin-badge">ADMIN{tags.length ? ' · ' + tags.join(' · ') : ''} · F9</div>;
}
