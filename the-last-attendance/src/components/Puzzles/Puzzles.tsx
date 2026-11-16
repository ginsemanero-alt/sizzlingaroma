import { useMemo, useState } from 'react';
import { useGame } from '@/store/gameStore';
import type { PuzzleId } from '@/types';
import {
  ARCHIVE_CODE, ATTENDANCE_CANDIDATES, FUSE_BREAKERS, FUSE_SOLUTION, PC_PASSWORD, PHOTO_CARDS, PHOTO_NAMES, PUZZLE_TITLES,
  SEATING_NAMES, SEQUENCES, checkAttendance, checkSeating, checkSequence,
} from '@/data/puzzles';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { Portrait } from '@/components/Inventory/PhotoView';
import { ITEMS } from '@/data/items';

function useSolve(id: PuzzleId) {
  const solve = useGame((s) => s.solvePuzzle);
  return () => { AudioSystem.play('pickup'); AudioSystem.play('bass_hit', { volume: 0.3 }); solve(id); };
}

function Shell({ id, hint, children, status }: { id: PuzzleId; hint: string; children: React.ReactNode; status?: string }) {
  const close = useGame((s) => s.closeOverlay);
  const setInv = useGame((s) => s.setInventory);
  return (
    <div className="overlay">
      <div className="panel puzzle interactive" onClick={(e) => e.stopPropagation()}>
        <h2>{PUZZLE_TITLES[id]}</h2>
        <p className="hint">{hint}</p>
        {children}
        <div className="status">{status}</div>
        <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <button className="btn small" onClick={() => setInv(true)}>Review evidence [TAB]</button>
          <button className="btn small" onClick={close}>Step away [Esc]</button>
        </div>
      </div>
    </div>
  );
}

function FuseBox() {
  const [seq, setSeq] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const solved = useSolve('fusebox');
  const flip = (b: string) => {
    if (seq.includes(b)) return;
    const next = [...seq, b];
    AudioSystem.play('switch');
    if (FUSE_SOLUTION[next.length - 1] !== b) {
      AudioSystem.play('spark');
      setStatus(b === 'CANTEEN' ? 'Sparks burst from the CANTEEN breaker. Everything trips back down.' : 'The panel buzzes and everything trips back down. Wrong order.');
      setSeq([]);
      return;
    }
    setSeq(next);
    setStatus('');
    if (next.length === FUSE_SOLUTION.length) window.setTimeout(solved, 500);
  };
  return (
    <Shell id="fusebox" hint="A rusted breaker panel. A note is taped beside it (check your documents). Flip the breakers in the right order." status={status}>
      <div className="breakers">
        {FUSE_BREAKERS.map((b) => (
          <div className="breaker" key={b}>
            <button className={seq.includes(b) ? 'up' : ''} onClick={() => flip(b)} aria-label={b} />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function PhotoMatch() {
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const solved = useSolve('photo_match');
  const features: Record<string, 'ribbon' | 'jersey' | 'glasses' | 'pick'> = { p1: 'ribbon', p2: 'jersey', p3: 'glasses', p4: 'pick' };
  const check = () => {
    const correct = PHOTO_CARDS.filter((c) => assign[c.id] === c.answer).length;
    if (correct === PHOTO_CARDS.length) { solved(); return; }
    AudioSystem.play('error');
    setStatus(`${correct} of ${PHOTO_CARDS.length} names feel right. Look at what was left in the lockers.`);
  };
  return (
    <Shell id="photo_match" hint="Four photographs have fallen from the faculty board; their name labels are gone. Match each face to a name using the belongings you found in the lockers." status={status}>
      <div className="photo-cards">
        {PHOTO_CARDS.map((c) => (
          <div className="photo-card" key={c.id}>
            <Portrait feature={features[c.id]} />
            <span>{c.description}</span>
            <select value={assign[c.id] ?? ''} onChange={(e) => setAssign({ ...assign, [c.id]: e.target.value })}>
              <option value="">— name —</option>
              {PHOTO_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}><button className="btn primary" onClick={check}>Pin the names</button></div>
    </Shell>
  );
}

function Seating() {
  const [assign, setAssign] = useState<Record<number, string>>({});
  const [status, setStatus] = useState('');
  const hasNotes = useGame((s) => s.collected.includes('seating_notes'));
  const solved = useSolve('seating');
  const check = () => {
    const r = checkSeating(assign);
    if (r.solved) { solved(); return; }
    AudioSystem.play('error');
    setStatus(`${r.correct} of 6 seats are right.`);
  };
  const seat = (n: number) => (
    <div className="seat" key={n}>
      <small>SEAT {n}{n === 3 || n === 6 ? ' · WINDOW' : ''}</small>
      <select value={assign[n] ?? ''} onChange={(e) => setAssign({ ...assign, [n]: e.target.value })}>
        <option value="">—</option>
        {SEATING_NAMES.map((nm) => <option key={nm} value={nm}>{nm}</option>)}
      </select>
    </div>
  );
  return (
    <Shell id="seating" hint={hasNotes ? 'The seating chart on the wall is blank. Fill it in using Ms. Reyes\'s seating notes. The blackboard is at the front.' : 'The seating chart is blank. You need to know where everyone sat — Ms. Reyes kept seating notes somewhere in this wing.'} status={status}>
      <div className="board-label">— BLACKBOARD —</div>
      <div className="seat-grid">{[1, 2, 3].map(seat)}</div>
      <div className="board-label" style={{ margin: '6px 0' }}>back row</div>
      <div className="seat-grid">{[4, 5, 6].map(seat)}</div>
      <div className="row" style={{ marginTop: 14 }}><button className="btn primary" onClick={check}>Write the names</button></div>
    </Shell>
  );
}

function PcPassword() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const collect = useGame((s) => s.collect);
  const solved = useSolve('pc_password');
  const submit = () => {
    AudioSystem.play('keypress');
    if (value.trim().toUpperCase().replace(/\s|-/g, '') === PC_PASSWORD) {
      AudioSystem.play('beep');
      setUnlocked(true);
      setStatus('');
    } else {
      AudioSystem.play('error');
      setStatus('ACCESS DENIED');
    }
  };
  return (
    <Shell id="pc_password" hint="SAN AURELIO HS — Student Information System, 2018. A sticky note on the monitor may help." status={status}>
      <div className="terminal">
        {!unlocked ? (
          <>
            <div>SAN AURELIO HIGH SCHOOL — SIS v2.3</div>
            <div>USER: admin_er</div>
            <div style={{ marginTop: 10 }}>PASSWORD: <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') submit(); }} /></div>
          </>
        ) : (
          <>
            <div>WELCOME, admin_er.  LAST LOGIN: 03/09/2018 17:58</div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 10, maxHeight: 240, overflow: 'auto' }}>{ITEMS.roster_records.content}</div>
          </>
        )}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        {!unlocked ? <button className="btn primary" onClick={submit}>Log in</button> : (
          <button className="btn primary" onClick={() => { collect('roster_records'); solved(); }}>Print roster and log out</button>
        )}
      </div>
    </Shell>
  );
}

function Attendance() {
  const [sel, setSel] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const has = useGame((s) => s.collected);
  const ready = has.includes('printed_attendance') && has.includes('roster_records') && has.includes('official_report');
  const solved = useSolve('attendance');
  const toggle = (n: string) => setSel(sel.includes(n) ? sel.filter((x) => x !== n) : [...sel, n]);
  const submit = () => {
    const r = checkAttendance(sel);
    if (r.solved) { solved(); return; }
    AudioSystem.play('error');
    setStatus(`${r.count} names selected. ${r.wrong > 0 ? `${r.wrong} of them could not have signed in that night.` : 'Someone who signed in is missing.'} Compare the scan with the roster.`);
  };
  return (
    <Shell id="attendance" hint={ready ? 'The official report says no one attended. The water-damaged scan disagrees. Mark every student from the roster who actually signed in at 6:00 PM on March 9, 2018. Use the roster to rule out anyone who could not have been there.' : 'You need the original attendance scan, the roster records and the official report before you can reconstruct the list.'} status={status}>
      <div className="att-list">
        {ATTENDANCE_CANDIDATES.map((n) => (
          <label key={n} className={sel.includes(n) ? 'on' : ''}>
            <input type="checkbox" checked={sel.includes(n)} onChange={() => toggle(n)} disabled={!ready} /> {n}
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}><button className="btn primary" disabled={!ready} onClick={submit}>Sign as reconstructed</button></div>
    </Shell>
  );
}

function ArchiveLock() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const solved = useSolve('archive_lock');
  const press = (d: string) => {
    AudioSystem.play('keypress');
    if (d === 'C') { setCode(''); return; }
    if (d === '⏎') {
      if (code === ARCHIVE_CODE) { AudioSystem.play('beep'); solved(); }
      else { AudioSystem.play('error'); setStatus('The keypad flashes red.'); setCode(''); }
      return;
    }
    if (code.length < 4) setCode(code + d);
  };
  return (
    <Shell id="archive_lock" hint="A four-digit keypad on the archive door." status={status}>
      <div className="keypad-display">{code.padEnd(4, '·')}</div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⏎'].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
      </div>
    </Shell>
  );
}

function Sequence({ id }: { id: 'evacuation' | 'timeline' | 'secret_timeline' }) {
  const def = SEQUENCES[id];
  const initial = useMemo(() => {
    // deterministic shuffle that is never already solved
    const arr = def.events.map((e) => e.id);
    const n = arr.length;
    const step = n % 3 === 0 ? 2 : 3;
    return arr.map((_, i) => arr[(i * step + 1) % n]);
  }, [def]);
  const [order, setOrder] = useState<string[]>(initial);
  const [status, setStatus] = useState('');
  const solved = useSolve(id);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const n = [...order];
    [n[i], n[j]] = [n[j], n[i]];
    setOrder(n);
    AudioSystem.play('paper', { volume: 0.5 });
  };
  const check = () => {
    const r = checkSequence(order, def);
    if (r.solved) { solved(); return; }
    AudioSystem.play('error');
    setStatus(`${r.correct} of ${def.events.length} are in the right place.`);
  };
  const label = (eid: string) => def.events.find((e) => e.id === eid)?.label ?? eid;
  return (
    <Shell id={id} hint={def.instructions} status={status}>
      <div className="seq">
        {order.map((eid, i) => (
          <div className="seq-item" key={eid}>
            <span className="n">{i + 1}</span>
            <span>{label(eid)}</span>
            <span className="row" style={{ gap: 4 }}>
              <button className="btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button className="btn small" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label="Move down">▼</button>
            </span>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 14 }}><button className="btn primary" onClick={check}>Confirm order</button></div>
    </Shell>
  );
}

export function PuzzleOverlay() {
  const id = useGame((s) => s.activePuzzle);
  switch (id) {
    case 'fusebox': return <FuseBox />;
    case 'photo_match': return <PhotoMatch />;
    case 'seating': return <Seating />;
    case 'pc_password': return <PcPassword />;
    case 'attendance': return <Attendance />;
    case 'archive_lock': return <ArchiveLock />;
    case 'evacuation': case 'timeline': case 'secret_timeline': return <Sequence key={id} id={id} />;
    default: return null;
  }
}
