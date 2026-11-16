import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { MenuBackground } from './MenuBackground';
import { useGame } from '@/store/gameStore';
import { SaveSystem } from '@/systems/SaveSystem/SaveSystem';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { CHAPTER_IDS, CHAPTERS } from '@/data/chapters';
import { ENDINGS, ENDING_ORDER } from '@/data/endings';
import { ConfirmDialog, SettingsPanel } from '@/components/UI/Settings';
import { Exposure, PostFX } from '@/components/Effects/PostFX';

type View = 'main' | 'chapters' | 'settings';

export function MainMenu({ audioReady }: { audioReady: boolean }) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('main');
  const [confirm, setConfirm] = useState<null | 'new' | 'delete'>(null);
  const meta = useGame((s) => s.meta);
  const graphics = useGame((s) => s.settings.graphics);
  const [hasSave, setHasSave] = useState(SaveSystem.hasSave());
  const save = SaveSystem.loadSave();

  useEffect(() => { useGame.getState().exitToMenu(); }, []);
  useEffect(() => () => AudioSystem.stopAllLoops(600), []);

  const start = (fn: () => void) => {
    AudioSystem.play('bell', { volume: 0.3 });
    AudioSystem.stopAllLoops(800);
    fn();
    navigate('/play');
  };

  const newGame = () => (hasSave ? setConfirm('new') : start(() => useGame.getState().newGame()));

  return (
    <div className="screen">
      <Canvas dpr={graphics === 'high' ? [1, 2] : [1, 1.5]} camera={{ fov: 62, near: 0.05, far: 100, position: [0, 1.62, 0.5] }} shadows={false}>
        <Exposure />
        {audioReady && <MenuBackground />}
        <PostFX />
      </Canvas>
      {view === 'main' && (
        <div className="menu">
          <h1 className="title">THE LAST<span>ATTENDANCE</span></h1>
          <p className="tagline">"Every name has a story. Every absence has a reason."</p>
          <nav className="menu-list">
            <button className="menu-btn" onClick={newGame}>NEW GAME</button>
            <button className="menu-btn" disabled={!hasSave} onClick={() => start(() => useGame.getState().continueGame())}>
              CONTINUE{save ? `  ·  Ch. ${save.chapter}` : ''}
            </button>
            <button className="menu-btn" onClick={() => setView('chapters')}>CHAPTER SELECT</button>
            <button className="menu-btn" onClick={() => setView('settings')}>SETTINGS</button>
            <button className="menu-btn" onClick={() => navigate('/credits')}>CREDITS</button>
          </nav>
        </div>
      )}
      {view === 'main' && (
        <div className="menu-foot">
          <span>Bubog National High School · Room 13</span>
          <span>Endings found: {meta.endings.length}/4</span>
        </div>
      )}
      {view === 'chapters' && (
        <div className="overlay">
          <div className="panel interactive">
            <h2>CHAPTER SELECT</h2>
            <div className="chapter-grid">
              {CHAPTER_IDS.map((id) => {
                const unlocked = id <= meta.unlockedChapter && (id === 1 || !!meta.snapshots[id]);
                return (
                  <button key={id} className="chapter-card" disabled={!unlocked} onClick={() => start(() => useGame.getState().startChapterFromSelect(id))}>
                    <small>CHAPTER {id}</small>
                    <strong>{unlocked ? CHAPTERS[id].title : '— locked —'}</strong>
                  </button>
                );
              })}
            </div>
            <h3>ENDINGS</h3>
            <div className="ending-gallery">
              {ENDING_ORDER.map((e) => {
                const got = meta.endings.includes(e);
                return (
                  <div key={e} className={got ? '' : 'locked'}>
                    <small>{ENDINGS[e].type.toUpperCase()}</small>
                    <strong>{got ? ENDINGS[e].title : '???'}</strong>
                    {got && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{ENDINGS[e].requirement}</span>}
                  </div>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
              <button className="btn danger" onClick={() => setConfirm('delete')}>Delete all progress</button>
              <button className="btn primary" onClick={() => setView('main')}>Back</button>
            </div>
          </div>
        </div>
      )}
      {view === 'settings' && <div className="overlay"><SettingsPanel onClose={() => setView('main')} /></div>}
      {confirm === 'new' && (
        <ConfirmDialog
          text="Starting a new game will overwrite your current save. Unlocked chapters and endings are kept."
          confirmLabel="Start new game"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { setConfirm(null); start(() => useGame.getState().newGame()); }}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          text="Delete ALL progress — your save, unlocked chapters and endings? This cannot be undone."
          confirmLabel="Delete everything"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { useGame.getState().deleteAllProgress(); setHasSave(false); setConfirm(null); }}
        />
      )}
    </div>
  );
}
