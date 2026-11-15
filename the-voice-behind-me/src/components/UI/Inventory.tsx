import { useMemo, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { ITEMS, getItem } from '../../data/items';
import type { ItemDef, ItemType } from '../../data/types';
import { canPlay, playTape, inspectItem } from '../../systems/InventorySystem/inventory';
import { endingProgress } from '../../systems/EndingSystem/endingSystem';
import { uiClick } from '../../systems/AudioSystem/audioManager';

const TABS: { id: 'all' | ItemType | 'evidence'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'photo', label: 'Photos' },
  { id: 'tape', label: 'Recordings' },
  { id: 'note', label: 'Notes' },
  { id: 'clue', label: 'Clues' },
];

function Thumb({ item }: { item: ItemDef }) {
  const icon: Record<ItemType, string> = { key: '⚿', photo: '▣', note: '☰', tape: '◫', tool: '▤', clue: '✎', marking: '⋔' };
  return (
    <div className={`thumb t-${item.type}`} style={{ ['--tint' as string]: item.tint ?? '#666' }}>
      <span>{icon[item.type]}</span>
    </div>
  );
}

export function InventoryScreen() {
  const open = useGame((s) => s.inventoryOpen);
  const inventory = useGame((s) => s.inventory);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all');
  const [sel, setSel] = useState<string | null>(null);

  const items = useMemo(() => {
    const list = inventory.map((id) => ITEMS[id]).filter(Boolean);
    if (tab === 'all') return list;
    if (tab === 'evidence') return list.filter((i) => i.important || i.optionalClue || i.hiddenTape);
    if (tab === 'clue') return list.filter((i) => i.type === 'clue' || i.type === 'marking');
    return list.filter((i) => i.type === tab);
  }, [inventory, tab]);

  if (!open) return null;
  const selected = sel && inventory.includes(sel) ? getItem(sel) : items[0];
  const prog = endingProgress();
  const close = () => useGame.getState().setInventoryOpen(false);

  return (
    <div className="overlay inventory" role="dialog" aria-label="Inventory">
      <div className="inv-panel">
        <header className="inv-head">
          <h2>Belongings</h2>
          <div className="inv-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => (uiClick(), setTab(t.id))}>
                {t.label}
              </button>
            ))}
          </div>
          <button className="close" onClick={close} aria-label="Close inventory">
            ✕
          </button>
        </header>
        <div className="inv-body">
          <div className="inv-grid">
            {items.length === 0 && <div className="empty">Nothing here yet.</div>}
            {items.map((it) => (
              <button key={it.id} className={`inv-item ${selected?.id === it.id ? 'sel' : ''}`} onClick={() => (uiClick(), setSel(it.id))}>
                <Thumb item={it} />
                <span className="name">{it.name}</span>
              </button>
            ))}
          </div>
          <aside className="inv-detail">
            {selected ? (
              <>
                <h3>{selected.name}</h3>
                <div className="tags">
                  {selected.important && <span className="tag">Evidence</span>}
                  {selected.optionalClue && <span className="tag gold">Hidden clue</span>}
                  {selected.hiddenTape && <span className="tag red">Hidden recording</span>}
                </div>
                <p>{selected.description}</p>
                <div className="actions">
                  {(selected.text || selected.back) && (
                    <button className="btn" onClick={() => inspectItem(selected.id)}>
                      {selected.type === 'photo' ? 'Inspect / turn over' : 'Read'}
                    </button>
                  )}
                  {selected.tape && selected.id !== 'final_tape' && (
                    <button
                      className="btn"
                      onClick={() => {
                        playTape(selected.id);
                        close();
                      }}
                      title={canPlay(selected.id) ? '' : 'Needs a cassette player'}
                    >
                      {canPlay(selected.id) ? '▶ Play' : '▶ Play (needs a player)'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="muted">Select an item.</p>
            )}
            <div className="inv-progress">
              <div>Evidence {prog.evidence}/{prog.evidenceTotal}</div>
              <div>Hidden clues {prog.clues}/{prog.cluesTotal}</div>
              <div>Hidden recordings {prog.tapes}/{prog.tapesTotal}</div>
            </div>
          </aside>
        </div>
        <footer className="inv-foot">Tab / Esc — close</footer>
      </div>
    </div>
  );
}

export function ItemViewer() {
  const id = useGame((s) => s.viewItem);
  const [flipped, setFlipped] = useState(false);
  if (!id) return null;
  const item = getItem(id);
  const close = () => {
    setFlipped(false);
    useGame.getState().setViewItem(null);
  };
  return (
    <div className="overlay viewer" role="dialog" aria-label={item.name} onClick={close}>
      <div className={`paper ${item.type}`} onClick={(e) => e.stopPropagation()}>
        {item.type === 'photo' ? (
          <div className={`photo ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)}>
            <div className="photo-front" style={{ ['--tint' as string]: item.tint }}>
              <div className="photo-img">
                <div className="silhouette big" />
                <div className="silhouette small" />
              </div>
              <p className="caption">{item.description}</p>
            </div>
            <div className="photo-back">
              <p className="handwriting">{item.back}</p>
            </div>
          </div>
        ) : (
          <>
            <h3>{item.name}</h3>
            <p className={item.type === 'marking' ? 'mirrored-wrap handwriting' : 'handwriting'}>{item.text ?? item.description}</p>
          </>
        )}
        <div className="viewer-actions">
          {item.type === 'photo' && (
            <button className="btn" onClick={() => setFlipped((f) => !f)}>
              Turn over
            </button>
          )}
          <button className="btn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
