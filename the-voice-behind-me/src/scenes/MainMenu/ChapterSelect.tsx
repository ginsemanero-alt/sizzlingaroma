import { useNavigate } from 'react-router-dom';
import { CHAPTERS, CHAPTER_IDS } from '../../data/chapters';
import { loadSave, saveCheckpoint } from '../../systems/SaveSystem/saveSystem';
import { useGame } from '../../store/gameStore';
import { stopAll, uiClick, uiHover } from '../../systems/AudioSystem/audioManager';
import { MenuBackground } from './MenuBackground';
import { ENDINGS } from '../../data/endings';

export function ChapterSelect() {
  const navigate = useNavigate();
  const save = loadSave();
  return (
    <div className="main-menu sub">
      <MenuBackground />
      <div className="menu-shade strong" />
      <div className="sub-page">
        <h2>Chapter Select</h2>
        <p className="muted">Chapters unlock as you reach them. Each starts from the checkpoint you saved there.</p>
        <ol className="chapter-list">
          {CHAPTER_IDS.map((id) => {
            const unlocked = save.unlocked.includes(id) && !!save.chapters[id];
            const ch = CHAPTERS[id];
            return (
              <li key={id}>
                <button
                  className="chapter-btn"
                  disabled={!unlocked}
                  onMouseEnter={() => unlocked && uiHover()}
                  onClick={() => {
                    const snap = save.chapters[id];
                    if (!snap) return;
                    uiClick();
                    stopAll(1);
                    saveCheckpoint(snap);
                    useGame.getState().startFromSnapshot(snap);
                    navigate('/play');
                  }}
                >
                  <span className="ch-num">{ch.subtitle}</span>
                  <span className="ch-title">{unlocked ? ch.title : '— locked —'}</span>
                  <span className="ch-loc">{unlocked ? ch.location : ''}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="endings-list">
          <h3>Endings</h3>
          {(['A', 'B', 'C', 'D'] as const).map((e) => (
            <div key={e} className={`ending-row ${save.endings.includes(e) ? 'got' : ''}`}>
              <strong>{ENDINGS[e].title}</strong> — {save.endings.includes(e) ? ENDINGS[e].name : '???'}
              {save.endings.includes(e) && <div className="muted small">{ENDINGS[e].requirement}</div>}
            </div>
          ))}
        </div>
        <button className="menu-btn back" onClick={() => (uiClick(), navigate('/'))}>
          Back
        </button>
      </div>
    </div>
  );
}
