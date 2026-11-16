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
        <p>Jasmine Semanero — the class monitor</p>
        <p>Ms. Elena Reyes — the adviser</p>
        <p>Daniel Cruz — the best friend</p>
        <p>Mara Dizon — the girl in the hallway</p>
        <p>Ricardo Villanueva — the principal</p>
        <h3>GRADE 12 – SAMPAGUITA · MARCH 9, 2018</h3>
        {ROLL_CALL.map((r) => <p key={r.surname}>{r.first} {r.surname}</p>)}
        <p>Elena Reyes</p>
        <p>Mara Dizon</p>
        <h3>3D MODELS (SKETCHFAB)</h3>
        <p>"Animated Female Teacher for Narration" by LasquetiSpice — CC BY 4.0</p>
        <p>"High School Student V10" by Fadly.W — CC BY 4.0</p>
        <p>"Bob Cut High School Girl" by minecraft3193092 — CC BY-SA 4.0</p>
        <p>"Ponytail High School Girl" by minecraft3193092 — CC BY-SA 4.0</p>
        <p>"Rigged Anime Japanese High School Boy" by suzuart — CC BY 4.0</p>
        <p>"Stylized Anime Japanese High School Boy 8" by suzuart — CC BY 4.0</p>
        <p>"Stylized Anime Japanese High School Boy 6" by suzuart — CC BY 4.0</p>
        <p>"Rigged Anime School Boy (Animation included)" by suzuart — CC BY 4.0</p>
        <p>"Classroom" by Pino_156 — CC BY 4.0</p>
        <p>"Old abandoned classroom" by Rixael — CC BY 4.0</p>
        <p>"Abandoned classroom" by Pasha — Sketchfab Standard licence</p>
        <p>"Building Hallway" by jimbogies — CC BY 4.0</p>
        <p>"Cafetery" by Lucia — CC BY 4.0</p>
        <p>"Construction school" by Stas — CC BY 4.0</p>
        <p>"Crenshaw High School - Main Building exterior" by lavarwebb — CC BY 4.0</p>
        <p>"library" by Pasha — CC BY 4.0</p>
        <p>"Low Poly Chemistry Lab" by gabrielmendesm — CC BY 4.0</p>
        <p>"Private Detective's Office" by Zeps3D — CC BY 4.0</p>
        <p>"Old Staircase - MTSU Animation, VFX & VP" by MTSU — CC BY 4.0</p>
        <p>"Exit Door" by barbodoji — CC BY 4.0</p>
        <p>"Filing Cabinets" by TooManyDemons — CC BY 4.0</p>
        <p>"Fire Animation" by 3DHaupt — CC BY 4.0</p>
        <p>"Rusty Steel Door Lock" by Incg5764 — CC BY 4.0</p>
        <p>"SCHOOL LOCKER" by Lee — CC BY 4.0</p>
        <p>"Small Fuse Box" by big — CC BY 4.0</p>
        <p>"Stereo Cassette Deck" by Tom — CC BY 4.0</p>
        <p>"Stylized Chemistry Set" by hayley.morris1 — CC BY 4.0</p>
        <p>"Philippines Flag" by mljsantos — Sketchfab Standard licence</p>
        <p>"Low-Poly Laboratory" by Yahor — CC BY 4.0</p>
        <p>"low-poly office" by DarianDS — CC BY 4.0</p>
        <p>"office is old abandoned FREE" by dasy444 — CC BY 4.0</p>
        <p>"Science Lab Table" by Skecthfab — CC BY 4.0</p>
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>Models are re-posed, tinted and rendered as ghosts at runtime.</p>
        <h3>ASSETS</h3>
        <p>The rest of the school, textures, props and all sounds are generated procedurally at runtime.</p>
        <h3>FONTS</h3>
        <p>Special Elite · IBM Plex Mono · Cormorant Garamond (Google Fonts, OFL)</p>
        <h3>&nbsp;</h3>
        <p>This is a work of fiction. Bubog National High School does not exist.</p>
        <p>The people it is about could have.</p>
        <h3>&nbsp;</h3>
        <p style={{ color: 'var(--muted)' }}>Click or press Esc to return.</p>
      </div>
    </div>
  );
}
