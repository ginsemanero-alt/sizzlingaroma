import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '@/store/gameStore';
import { ITEMS } from '@/data/items';
import { CHARACTERS } from '@/data/characters';
import type { ItemCategory, ItemDef } from '@/types';
import { PhotoView } from './PhotoView';
import { ItemModel, glbItemSize, isGlbItem } from './ItemModel';
import { playRecording, scriptHost } from '@/systems/DialogueSystem/DialogueSystem';
import { summarizeEvidence } from '@/systems/EndingSystem/EndingSystem';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';

type Tab = 'all' | ItemCategory | 'evidence';
const TABS: { id: Tab; label: string }[] = [
  { id: 'evidence', label: 'EVIDENCE' }, { id: 'item', label: 'ITEMS' }, { id: 'document', label: 'DOCUMENTS' },
  { id: 'photo', label: 'PHOTOS' }, { id: 'recording', label: 'AUDIO' }, { id: 'keepsake', label: 'BELONGINGS' }, { id: 'all', label: 'ALL' },
];

function matches(def: ItemDef, tab: Tab): boolean {
  if (tab === 'all') return true;
  if (tab === 'evidence') return !def.tool;
  return def.category === tab;
}

function listen(id: string): void {
  const def = ITEMS[id];
  const ctx = scriptHost.ctx;
  if (!def?.recording || !ctx) return;
  useGame.getState().setInventory(false);
  useGame.getState().closeOverlay();
  ctx.run(`rec_${id}`, (c) => playRecording(c, def.recording!));
}

/** TAB inventory: items, documents, photographs, recordings and evidence review. */
export function InventoryOverlay() {
  const collected = useGame((s) => s.collected);
  const flags = useGame((s) => s.flags);
  const selected = useGame((s) => s.selectedItem);
  const select = useGame((s) => s.selectItem);
  const openReader = useGame((s) => s.openReader);
  const openInspect = useGame((s) => s.openInspect);
  const setInventory = useGame((s) => s.setInventory);
  const [tab, setTab] = useState<Tab>('evidence');
  const list = useMemo(() => collected.map((id) => ITEMS[id]).filter((d): d is ItemDef => !!d && matches(d, tab)).reverse(), [collected, tab]);
  const cur = selected && ITEMS[selected] && collected.includes(selected) ? ITEMS[selected] : list[0];
  const ev = summarizeEvidence(collected, flags);

  return (
    <div className="overlay" onClick={() => setInventory(false)}>
      <div className="inv interactive" onClick={(e) => e.stopPropagation()}>
        <div className="inv-side">
          <div className="inv-tabs">
            {TABS.map((t) => (<button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>))}
          </div>
          <div className="inv-list">
            {list.length === 0 && <div style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Nothing here yet.</div>}
            {list.map((d) => (
              <button key={d.id} className={`inv-item ${cur?.id === d.id ? 'on' : ''}`} onClick={() => select(d.id)}>
                {d.name}
                <small>{d.tool ? 'ITEM' : d.category.toUpperCase()}{d.key ? ' · KEY' : ''}{d.secret ? ' · ◆' : ''} · CH.{d.chapter}</small>
              </button>
            ))}
          </div>
          <div className="inv-foot">
            Case file: {ev.keyFound}/{ev.keyTotal} key evidence{ev.secretFound > 0 ? ` · ◆ ${ev.secretFound}/${ev.secretTotal} unrecorded` : ''}
            <br />[TAB] close · [Q] inspect selected
          </div>
        </div>
        <div className="inv-detail">
          {cur ? (
            <>
              <h2>{cur.name}</h2>
              <p>{cur.description}</p>
              <div className="row">
                {(cur.content || cur.photo) && <button className="btn primary" onClick={() => openReader(cur.id)}>{cur.category === 'photo' ? 'View photograph' : 'Read'}</button>}
                {cur.recording && <button className="btn primary" onClick={() => listen(cur.id)}>Listen</button>}
                <button className="btn" onClick={() => openInspect(cur.id)}>Inspect [Q]</button>
              </div>
              {cur.photo && <PhotoView spec={cur.photo} width={520} />}
              {cur.content && !cur.photo && <div className="paper" style={{ fontSize: 13, maxHeight: 360, overflow: 'auto' }}>{cur.content}</div>}
              {cur.recording && (
                <div className="transcript">
                  {cur.recording.map((l, i) => (
                    <div key={i}><b style={{ color: CHARACTERS[l.s].color }}>{CHARACTERS[l.s].name || '—'}</b>{l.en}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p>Select an item.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Full-screen document/photo reader (opens automatically on pickup). */
export function ReaderOverlay() {
  const id = useGame((s) => s.readerItem);
  const close = useGame((s) => s.closeOverlay);
  const def = id ? ITEMS[id] : null;
  if (!def) return null;
  return (
    <div className="overlay" onClick={close}>
      <div className="reader interactive" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-type)', fontWeight: 400, margin: 0 }}>{def.name}</h2>
          <button className="btn small" onClick={close}>Close [E/Esc]</button>
        </div>
        {def.photo && <PhotoView spec={def.photo} width={720} />}
        {def.content && <div className="paper">{def.content}</div>}
        {def.recording && (
          <div className="row"><button className="btn primary" onClick={() => listen(def.id)}>Listen</button></div>
        )}
        {def.back && <p style={{ color: 'var(--muted)', fontSize: 12 }}>Tip: inspect it with [Q] in the inventory — there may be something on the back.</p>}
      </div>
    </div>
  );
}

function Spinner({ kind, flipped }: { kind: ItemDef['model']; flipped: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const drag = useRef({ x: 0, y: 0 });
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const targetX = flipped ? Math.PI : 0;
    g.rotation.x += (targetX + drag.current.y - g.rotation.x) * Math.min(1, dt * 6);
    g.rotation.y += (drag.current.x - g.rotation.y) * Math.min(1, dt * 6);
  });
  return (
    <group
      ref={ref}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        drag.current.x += e.movementX * 0.01;
        drag.current.y += e.movementY * 0.01;
      }}
    >
      {isGlbItem(kind) ? (
        <group scale={0.95 / glbItemSize(kind)}>
          <ItemModel kind={kind} centered />
        </group>
      ) : (
        <group rotation={[Math.PI / 2, 0, 0]} scale={['chain', 'mirror'].includes(kind) ? 2.2 : kind === 'card' || kind === 'pick' || kind === 'clip' ? 9 : 4.5}>
          <ItemModel kind={kind} />
        </group>
      )}
    </group>
  );
}

/** Q-inspect: rotate an item in 3D and turn it over to reveal hidden details. */
export function InspectOverlay() {
  const id = useGame((s) => s.inspectItem);
  const close = useGame((s) => s.closeOverlay);
  const collect = useGame((s) => s.collect);
  const [flipped, setFlipped] = useState(false);
  const def = id ? ITEMS[id] : null;
  if (!def) return null;
  const turn = () => {
    setFlipped((f) => !f);
    AudioSystem.play('paper');
    if (!flipped && def.back?.clue) collect(def.back.clue);
  };
  return (
    <div className="overlay" onClick={close}>
      <div className="panel interactive" style={{ maxWidth: 820 }} onClick={(e) => e.stopPropagation()}>
        <h2>{def.name}</h2>
        <div style={{ height: 340, background: 'radial-gradient(circle, #1a1c22, #050506)', cursor: 'grab' }}>
          <Canvas camera={{ position: [0, 0, 1.6], fov: 40 }} dpr={[1, 1.5]}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 3, 4]} intensity={1.6} />
            <pointLight position={[-2, -1, 2]} intensity={6} color="#ffd8a8" />
            <Suspense fallback={null}><Spinner kind={def.model} flipped={flipped} /></Suspense>
          </Canvas>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>Drag to rotate.</p>
        {flipped && def.back && <div className="paper" style={{ fontSize: 14 }}>{def.back.text}</div>}
        {flipped && !def.back && <p style={{ color: 'var(--muted)' }}>Nothing on the other side.</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={turn}>{flipped ? 'Turn back' : 'Turn over'}</button>
          <button className="btn" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}
