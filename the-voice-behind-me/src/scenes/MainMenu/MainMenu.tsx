import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuBackground } from './MenuBackground';
import { hasContinue, loadSave, newGameSnapshot, saveCheckpoint } from '../../systems/SaveSystem/saveSystem';
import { useGame } from '../../store/gameStore';
import { setAmbience, setMusic, uiClick, uiHover, stopAll } from '../../systems/AudioSystem/audioManager';
import { ENDINGS } from '../../data/endings';

export function useMenuAudio() {
  useEffect(() => {
    setAmbience({ rain: 0.6, wind: 0.3 }, 2.5);
    setMusic('menu_music', 0.55, 3);
  }, []);
}

export default function MainMenu() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(() => sessionStorage.getItem('tvbm.entered') === '1');
  const [confirmNew, setConfirmNew] = useState(false);
  const canContinue = hasContinue();
  const save = loadSave();

  useEffect(() => {
    if (!started) return;
    setAmbience({ rain: 0.6, wind: 0.3 }, 2.5);
    setMusic('menu_music', 0.55, 3);
  }, [started]);

  const enter = () => {
    sessionStorage.setItem('tvbm.entered', '1');
    setStarted(true);
  };

  const begin = (snapFn: () => ReturnType<typeof newGameSnapshot>) => {
    uiClick();
    stopAll(1.2);
    const snap = snapFn();
    saveCheckpoint(snap);
    useGame.getState().startFromSnapshot(snap);
    navigate('/play');
  };

  const newGame = () => {
    if (canContinue && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    begin(newGameSnapshot);
  };

  const cont = () => {
    const s = loadSave().latest;
    if (s) begin(() => s);
  };

  const exitToMenu = () => {
    uiClick();
    stopAll(0.6);
    sessionStorage.removeItem('tvbm.entered');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setStarted(false);
    setConfirmNew(false);
  };

  const item = (label: string, fn: () => void, disabled = false, hint?: string) => (
    <button className="menu-btn" disabled={disabled} onMouseEnter={() => !disabled && uiHover()} onClick={fn} title={hint}>
      {label}
    </button>
  );

  return (
    <div className="main-menu">
      <MenuBackground />
      <div className="menu-shade" />
      {!started ? (
        <button className="press-start" onClick={enter} onKeyDown={(e) => e.key === 'Enter' && enter()} autoFocus>
          <div className="title-block slow">
            <h1 className="game-title">THE VOICE BEHIND ME</h1>
            <p className="tagline">You trusted the voice. You should have listened to the silence.</p>
          </div>
          <span className="press">Click or press Enter · headphones recommended</span>
        </button>
      ) : (
        <div className="menu-content">
          <div className="title-block">
            <h1 className="game-title">THE VOICE BEHIND ME</h1>
            <p className="tagline">You trusted the voice. You should have listened to the silence.</p>
          </div>
          {confirmNew ? (
            <nav className="menu-list">
              <p className="confirm-text">Start over? Your current checkpoint will be replaced (unlocked chapters and endings are kept).</p>
              {item('Start a new game', () => begin(newGameSnapshot))}
              {item('Cancel', () => (uiClick(), setConfirmNew(false)))}
            </nav>
          ) : (
            <nav className="menu-list">
              {item('New Game', newGame)}
              {item('Continue', cont, !canContinue, canContinue ? undefined : 'No checkpoint yet')}
              {item('Chapter Select', () => (uiClick(), navigate('/chapters')))}
              {item('Settings', () => (uiClick(), navigate('/settings')))}
              {item('Credits', () => (uiClick(), navigate('/credits')))}
              {item('Exit to Menu', exitToMenu)}
            </nav>
          )}
          {save.endings.length > 0 && (
            <div className="endings-seen">
              Endings found:{' '}
              {(['A', 'B', 'C', 'D'] as const).map((e) => (
                <span key={e} className={save.endings.includes(e) ? 'got' : ''} title={save.endings.includes(e) ? ENDINGS[e].name : '???'}>
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
