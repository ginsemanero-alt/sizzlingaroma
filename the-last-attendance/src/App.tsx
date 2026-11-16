import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MainMenu } from '@/scenes/MainMenu/MainMenu';
import { GameScene } from '@/scenes/GameScene';
import { EndingScreen } from '@/scenes/Ending/EndingScreen';
import { Credits } from '@/scenes/Credits';
import { ModelViewer } from '@/scenes/ModelViewer';
import { useGame } from '@/store/gameStore';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';

/** First click unlocks audio (browser autoplay policy) and sets the mood. */
function Splash({ onEnter }: { onEnter: () => void }) {
  useEffect(() => {
    const k = () => onEnter();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onEnter]);
  return (
    <div className="splash" onClick={onEnter}>
      <div>
        <p>Click or press any key to enter</p>
        <p className="warn">
          This game contains psychological horror, themes of death, grief and institutional cover-ups, sudden loud sounds and flickering lights.
          Headphones recommended. Flashing and camera shake can be reduced in Settings.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const settings = useGame((s) => s.settings);
  const [entered, setEntered] = useState(false);

  useEffect(() => { AudioSystem.applySettings(settings); }, [settings]);

  const enter = () => {
    AudioSystem.unlock();
    AudioSystem.applySettings(useGame.getState().settings);
    setEntered(true);
  };

  return (
    <HashRouter>
      {!entered && <Splash onEnter={enter} />}
      <Routes>
        <Route path="/" element={<MainMenu audioReady={entered} />} />
        <Route path="/play" element={entered ? <GameScene /> : <Navigate to="/" replace />} />
        <Route path="/ending/:id" element={entered ? <EndingScreen /> : <Navigate to="/" replace />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/viewer" element={<ModelViewer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
