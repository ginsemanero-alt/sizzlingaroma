import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../store/gameStore';
import { SettingsPanel, ControlsList } from './SettingsPanel';
import { restartCheckpoint } from '../../systems/ChapterSystem/chapterRuntime';
import { uiClick, uiHover } from '../../systems/AudioSystem/audioManager';
import { requestLock } from '../Player/PlayerController';
import { CHAPTERS } from '../../data/chapters';

export function PauseMenu() {
  const paused = useGame((s) => s.paused);
  const chapter = useGame((s) => s.chapter);
  const [view, setView] = useState<'main' | 'settings' | 'controls' | 'confirm-restart' | 'confirm-menu'>('main');
  const navigate = useNavigate();
  if (!paused) return null;

  const resume = () => {
    uiClick();
    setView('main');
    useGame.getState().setPaused(false);
    requestLock();
  };
  const btn = (label: string, fn: () => void) => (
    <button className="menu-btn" onMouseEnter={uiHover} onClick={() => (uiClick(), fn())}>
      {label}
    </button>
  );

  return (
    <div className="overlay pause" role="dialog" aria-label="Paused">
      <div className="pause-panel">
        <div className="pause-title">Paused</div>
        <div className="pause-chapter">
          Chapter {chapter} — {CHAPTERS[chapter].title}
        </div>
        {view === 'main' && (
          <nav className="menu-list">
            <button className="menu-btn" onMouseEnter={uiHover} onClick={resume}>
              Resume
            </button>
            {btn('Settings', () => setView('settings'))}
            {btn('Controls', () => setView('controls'))}
            {btn('Restart checkpoint', () => setView('confirm-restart'))}
            {btn('Main menu', () => setView('confirm-menu'))}
          </nav>
        )}
        {view === 'settings' && (
          <>
            <SettingsPanel />
            {btn('Back', () => setView('main'))}
          </>
        )}
        {view === 'controls' && (
          <>
            <ControlsList />
            {btn('Back', () => setView('main'))}
          </>
        )}
        {view === 'confirm-restart' && (
          <div className="confirm">
            <p>Restart from the beginning of this chapter? Progress since the checkpoint is lost.</p>
            {btn('Restart', () => {
              setView('main');
              restartCheckpoint();
            })}
            {btn('Cancel', () => setView('main'))}
          </div>
        )}
        {view === 'confirm-menu' && (
          <div className="confirm">
            <p>Return to the main menu? You can continue from the last checkpoint.</p>
            {btn('Main menu', () => {
              setView('main');
              useGame.getState().stop();
              navigate('/');
            })}
            {btn('Cancel', () => setView('main'))}
          </div>
        )}
      </div>
    </div>
  );
}
