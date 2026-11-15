import { useNavigate } from 'react-router-dom';
import { MenuBackground } from './MenuBackground';
import { uiClick } from '../../systems/AudioSystem/audioManager';

export function Credits() {
  const navigate = useNavigate();
  return (
    <div className="main-menu sub">
      <MenuBackground />
      <div className="menu-shade strong" />
      <div className="sub-page credits">
        <h2>Credits</h2>
        <div className="credits-roll">
          <p className="game-title small">THE VOICE BEHIND ME</p>
          <p>A psychological horror story about two brothers, a fire, and a memory told backwards.</p>
          <h4>Design, story, code, sound</h4>
          <p>Built with React, TypeScript, Vite, three.js, React Three Fiber, Drei, Zustand, Howler.js and React Router.</p>
          <h4>Audio</h4>
          <p>Every sound — rain, footsteps, the music box, the voices — is synthesized live in the browser. No recorded audio is used.</p>
          <h4>Art</h4>
          <p>All models and textures are procedural and generated at runtime.</p>
          <h4>Language</h4>
          <p>
            <em>Kuya</em> — older brother (Filipino). <em>Huwag kang maniwala sa taong nasa likod mo</em> — don't believe the person behind you. <em>Sa likod mo lang ako</em> — I'm right behind you.
          </p>
          <h4>For anyone carrying a loss like Elias's</h4>
          <p>Survivor's guilt is real and it is not a verdict. If you are struggling, please talk to someone you trust or a local support line.</p>
        </div>
        <button className="menu-btn back" onClick={() => (uiClick(), navigate('/'))}>
          Back
        </button>
      </div>
    </div>
  );
}
