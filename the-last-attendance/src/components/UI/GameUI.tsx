import { useEffect, useState } from 'react';
import { useGame } from '@/store/gameStore';
import { runtime } from '@/systems/runtime';
import { InteractionSystem } from '@/systems/InteractionSystem/InteractionSystem';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { CHARACTERS } from '@/data/characters';
import { CaughtOverlay, CenterText, ChapterCard, Fade, FearAndStatus, Meters, Notifications, Objective, Prompt, Subtitles } from './HUD';
import { ConfirmDialog, ControlsPanel, SettingsPanel } from './Settings';
import { InspectOverlay, InventoryOverlay, ReaderOverlay } from '@/components/Inventory/InventoryOverlay';
import { PuzzleOverlay } from '@/components/Puzzles/Puzzles';

export function requestLock(): void {
  const canvas = document.querySelector('#game-canvas canvas') as HTMLCanvasElement | null;
  if (!canvas || document.pointerLockElement) return;
  const s = useGame.getState();
  if (s.overlay !== 'none' || s.inventoryOpen) return;
  if (runtime.noPointerLock) return;
  if (typeof canvas.requestPointerLock !== 'function') { lockUnavailable(); return; }
  try {
    const r = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
    if (r && typeof r.catch === 'function') r.catch((e: unknown) => { if (e instanceof Error && /sandbox|not allowed|NotSupported|WrongDocument/i.test(e.name + e.message)) lockUnavailable(); });
  } catch { lockUnavailable(); }
}

/** Switch to drag-to-look (pointer lock blocked, e.g. inside a sandboxed embed). */
function lockUnavailable(): void {
  if (runtime.noPointerLock) return;
  runtime.noPointerLock = true;
  useGame.getState().notify('Drag with the mouse to look around', 'info');
}

/** Set when the game itself releases the mouse, so the resulting pointerlockchange isn't read as Esc. */
let intentionalRelease = false;

function releaseLock(): void {
  if (document.pointerLockElement) { intentionalRelease = true; document.exitPointerLock(); }
}

function PauseMenu() {
  const close = useGame((s) => s.closeOverlay);
  const reload = useGame((s) => s.reloadCheckpoint);
  const exit = useGame((s) => s.exitToMenu);
  const [view, setView] = useState<'main' | 'settings' | 'controls'>('main');
  const [confirm, setConfirm] = useState<null | 'restart' | 'menu'>(null);
  const chapter = useGame((s) => s.chapter);
  if (view === 'settings') return <div className="overlay"><SettingsPanel onClose={() => setView('main')} /></div>;
  if (view === 'controls') return <div className="overlay"><ControlsPanel onClose={() => setView('main')} /></div>;
  return (
    <div className="overlay">
      <div className="panel interactive" style={{ maxWidth: 420 }}>
        <h2>PAUSED</h2>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: -8 }}>Chapter {chapter}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="menu-btn" onClick={() => { close(); requestLock(); }}>RESUME</button>
          <button className="menu-btn" onClick={() => setView('settings')}>SETTINGS</button>
          <button className="menu-btn" onClick={() => setView('controls')}>CONTROLS</button>
          <button className="menu-btn" onClick={() => setConfirm('restart')}>RESTART CHECKPOINT</button>
          <button className="menu-btn" onClick={() => setConfirm('menu')}>MAIN MENU</button>
        </div>
      </div>
      {confirm === 'restart' && (
        <ConfirmDialog text="Restart from the last checkpoint? Progress since then will be lost." confirmLabel="Restart" onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); reload(); }} />
      )}
      {confirm === 'menu' && (
        <ConfirmDialog text="Return to the main menu? Unsaved progress since the last checkpoint will be lost." confirmLabel="Main menu" onCancel={() => setConfirm(null)} onConfirm={() => { AudioSystem.stopAll(); exit(); }} />
      )}
    </div>
  );
}

function ChoiceOverlay() {
  const choice = useGame((s) => s.choice);
  const answer = useGame((s) => s.answerChoice);
  if (!choice) return null;
  const ch = choice.speaker ? CHARACTERS[choice.speaker] : null;
  return (
    <div className="choice">
      <div className="q">{ch?.name && <span style={{ color: ch.color, fontSize: 12, letterSpacing: '0.2em', display: 'block' }}>{ch.name.toUpperCase()}</span>}{choice.prompt}</div>
      {choice.options.map((o, i) => (
        <button key={o.id} disabled={o.disabled} onClick={() => { AudioSystem.play('click'); answer(o.id); }}>
          {i + 1}. {o.label}
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  );
}

/**
 * All in-game DOM UI + keyboard handling and pointer lock management.
 */
export function GameUI() {
  const overlay = useGame((s) => s.overlay);
  const inventoryOpen = useGame((s) => s.inventoryOpen);
  const inspectItem = useGame((s) => s.inspectItem);
  const transitionTo = useGame((s) => s.transitionTo);
  const caught = useGame((s) => s.caughtMessage);
  const [needsClick, setNeedsClick] = useState(false);

  const uiOpen = overlay !== 'none' || inventoryOpen;

  // pause the simulation while any overlay is open
  useEffect(() => {
    runtime.paused = uiOpen || !!caught;
    if (uiOpen) releaseLock();
  }, [uiOpen, caught]);

  useEffect(() => {
    const onLock = () => {
      runtime.pointerLocked = document.pointerLockElement !== null;
      const s = useGame.getState();
      if (runtime.pointerLocked && (s.overlay !== 'none' || s.inventoryOpen)) {
        // Lock was granted after an overlay opened (async request): give the cursor back.
        releaseLock();
        return;
      }
      if (runtime.pointerLocked) setNeedsClick(false);
      else if (intentionalRelease) intentionalRelease = false;
      else if (s.overlay === 'none' && !s.inventoryOpen && s.inGame && !s.caughtMessage && !s.transitionTo && !s.ending) {
        // Esc pressed while playing → pause
        s.openOverlay('pause');
      }
    };
    const onErr = () => { if (window.self !== window.top) { lockUnavailable(); setNeedsClick(false); } };
    document.addEventListener('pointerlockchange', onLock);
    document.addEventListener('pointerlockerror', onErr);
    return () => { document.removeEventListener('pointerlockchange', onLock); document.removeEventListener('pointerlockerror', onErr); };
  }, []);

  useEffect(() => {
    if (uiOpen) { setNeedsClick(false); return; }
    requestLock();
    const t = window.setTimeout(() => {
      if (!document.pointerLockElement && !runtime.debug && !runtime.noPointerLock) setNeedsClick(true);
    }, 450);
    return () => window.clearTimeout(t);
  }, [uiOpen]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (e.target instanceof HTMLInputElement) return;
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (e.ctrlKey && e.code !== 'ControlLeft' && e.code !== 'ControlRight') e.preventDefault();
      runtime.keys.add(e.code);
      if (e.repeat) return;
      const free = s.overlay === 'none' && !s.inventoryOpen;
      switch (e.code) {
        case 'KeyE':
          if (free) InteractionSystem.interact();
          else if (s.overlay === 'reader' || s.overlay === 'inspect') s.closeOverlay();
          break;
        case 'KeyF':
          if (free && s.collected.includes('flashlight')) {
            if (runtime.battery <= 0) { s.notify('The flashlight is dead.', 'info'); break; }
            AudioSystem.play('click');
            s.setFlashlight(!s.flashlightOn);
          }
          break;
        case 'Tab':
          if (s.overlay === 'pause' || s.overlay === 'choice' || s.caughtMessage) break;
          if (s.overlay === 'reader' || s.overlay === 'inspect') s.closeOverlay();
          s.setInventory(!s.inventoryOpen);
          AudioSystem.play('paper', { volume: 0.4 });
          if (s.inventoryOpen && s.overlay === 'none') requestLock();
          break;
        case 'KeyQ':
          if (s.overlay === 'choice' || s.overlay === 'pause' || s.overlay === 'puzzle') break;
          if (s.selectedItem && s.collected.includes(s.selectedItem)) s.openInspect(s.selectedItem);
          break;
        case 'Escape':
          if (s.inventoryOpen) { s.setInventory(false); break; }
          if (s.overlay === 'reader' || s.overlay === 'inspect' || s.overlay === 'puzzle') { s.closeOverlay(); break; }
          if (s.overlay === 'pause') { s.closeOverlay(); requestLock(); break; }
          if (s.overlay === 'none') s.openOverlay('pause');
          break;
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': {
          if (s.overlay === 'choice' && s.choice) {
            const o = s.choice.options[Number(e.code.slice(5)) - 1];
            if (o && !o.disabled) s.answerChoice(o.id);
          }
          break;
        }
      }
    };
    const up = (e: KeyboardEvent) => { runtime.keys.delete(e.code); };
    const blur = () => runtime.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);

  return (
    <>
      <div className="ui-layer">
        <FearAndStatus />
        <Objective />
        <Meters />
        <Prompt />
        <Notifications />
        <Subtitles />
        <CenterText />
      </div>
      <Fade />
      {overlay === 'pause' && <PauseMenu />}
      {overlay === 'choice' && <ChoiceOverlay />}
      {overlay === 'reader' && <ReaderOverlay />}
      {overlay === 'inspect' && <InspectOverlay key={inspectItem ?? ''} />}
      {overlay === 'puzzle' && <PuzzleOverlay />}
      {inventoryOpen && <InventoryOverlay />}
      {needsClick && !uiOpen && !transitionTo && !caught && (
        <div className="click-resume" onClick={() => { AudioSystem.unlock(); requestLock(); setNeedsClick(false); }}>CLICK TO CONTINUE</div>
      )}
      <ChapterCard />
      <CaughtOverlay />
    </>
  );
}
