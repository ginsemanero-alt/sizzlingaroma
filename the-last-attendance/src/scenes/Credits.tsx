import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioSystem } from '@/systems/AudioSystem/AudioSystem';
import { ROLL_CALL } from '@/data/characters';

export function Credits() {
  const navigate = useNavigate();
  useEffect(() => {
    AudioSystem.loop('drone', 0.6, 2000);
    const back = (e: KeyboardEvent) => { if (e.code === 'Escape') navigate('/'); };
    window.addEventListener('keydown', back);
    return () => { window.removeEventListener('keydown', back); AudioSystem.loop('drone', 0, 800); };
  }, [navigate]);
  return (
    <div className="credits" onClick={() => navigate('/')}>
      <div className="credits-roll">
        <h1>THE LAST ATTENDANCE</h1>
        <p>"Every name has a story. Every absence has a reason."</p>
        <h3>A BROWSER HORROR GAME</h3>
        <p>Design, story, code, procedural art and procedural audio</p>
        <p>built with React, TypeScript, Three.js, React Three Fiber, Drei, Zustand and Howler.js</p>
        <h3>CAST</h3>
        <p>Alex Mercado — the class monitor</p>
        <p>Ms. Elena Reyes — the adviser</p>
        <p>Daniel Cruz — the best friend</p>
        <p>Mara Dizon — the girl in the hallway</p>
        <p>Ricardo Villanueva — the principal</p>
        <h3>GRADE 12 – SAMPAGUITA · MARCH 9, 2018</h3>
        {ROLL_CALL.map((r) => <p key={r.surname}>{r.first} {r.surname}</p>)}
        <p>Elena Reyes</p>
        <p>Mara Dizon</p>
        <h3>ASSETS</h3>
        <p>All 3D models, textures and sounds are generated procedurally at runtime.</p>
        <p>No third-party audio or model assets are used.</p>
        <h3>FONTS</h3>
        <p>Special Elite · IBM Plex Mono · Cormorant Garamond (Google Fonts, OFL)</p>
        <h3>&nbsp;</h3>
        <p>This is a work of fiction. San Aurelio High School does not exist.</p>
        <p>The people it is about could have.</p>
        <h3>&nbsp;</h3>
        <p style={{ color: 'var(--muted)' }}>Click or press Esc to return.</p>
      </div>
    </div>
  );
}
