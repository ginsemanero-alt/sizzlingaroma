import { useNavigate } from 'react-router-dom';
import { MenuBackground } from './MenuBackground';
import { SettingsPanel, ControlsList } from '../../components/UI/SettingsPanel';
import { uiClick } from '../../systems/AudioSystem/audioManager';
import { wipeSave } from '../../systems/SaveSystem/saveSystem';
import { useState } from 'react';

export function SettingsPage() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="main-menu sub">
      <MenuBackground />
      <div className="menu-shade strong" />
      <div className="sub-page settings-page">
        <h2>Settings</h2>
        <SettingsPanel />
        <h3>Controls</h3>
        <ControlsList />
        <div className="danger">
          {confirm ? (
            <>
              <span>Erase all progress, chapters and endings?</span>
              <button className="btn" onClick={() => (wipeSave(), setConfirm(false))}>
                Erase
              </button>
              <button className="btn" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => setConfirm(true)}>
              Erase save data…
            </button>
          )}
        </div>
        <button className="menu-btn back" onClick={() => (uiClick(), navigate('/'))}>
          Back
        </button>
      </div>
    </div>
  );
}
