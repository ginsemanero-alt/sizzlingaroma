import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Howler } from 'howler';
import { useSettings } from './store/settingsStore';
import MainMenu from './scenes/MainMenu/MainMenu';
import { ChapterSelect } from './scenes/MainMenu/ChapterSelect';
import { Credits } from './scenes/MainMenu/Credits';
import { SettingsPage } from './scenes/MainMenu/SettingsPage';

const GameScene = lazy(() => import('./scenes/Game/GameScene'));
const EndingScene = lazy(() => import('./scenes/Ending/EndingScene'));

function Loading() {
  return <div className="loading">Loading…</div>;
}

export default function App() {
  const master = useSettings((s) => s.master);
  useEffect(() => {
    Howler.volume(master);
  }, [master]);

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/chapters" element={<ChapterSelect />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/play" element={<GameScene />} />
        <Route path="/ending/:id" element={<EndingScene />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
