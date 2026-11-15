# THE VOICE BEHIND ME

*A first-person psychological horror game for the browser.*

> "You trusted the voice. You should have listened to the silence."

Seven years ago a fire took the house on Calle Sampaguita and Elias's younger brother Noah with it. Elias has spent those years believing that Noah called for help and he walked away. Then a voicemail arrives from an unknown number, in Noah's voice:

> *Kuya... huwag kang maniwala sa taong nasa likod mo.*
> (Kuya... don't believe the person behind you.)

Elias goes home.

---

## Running the game

Requirements: **Node.js 18+** and a desktop browser with WebGL 2 (Chrome, Edge, Firefox or Safari 16+).

```bash
cd the-voice-behind-me
npm install
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build        # type-checks, then builds to dist/
npm run preview      # serves dist/ on http://localhost:4173
```

The build uses relative paths and a hash router, so `dist/` can be hosted on any static host (GitHub Pages, Netlify, an S3 bucket, `python -m http.server`).

Headphones are strongly recommended: sounds are positioned in 3D.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look (click the game to capture the mouse) |
| Arrow keys | Look (alternative to the mouse — works without pointer lock) |
| Shift | Run |
| Ctrl or C | Crouch (C is provided because some browsers reserve Ctrl+W) |
| E | Interact |
| F | Toggle flashlight |
| Tab | Inventory (inspect items, read notes, play recordings) |
| Esc or P | Pause / release the mouse |
| 1–9, ↑/↓, Enter | Pick a dialogue choice |

## What's in the game

* **Six chapters**, each a separate lazily-loaded scene:
  1. **The Voicemail** — rain, the front yard, living room, kitchen, hallway. Restore power, hear the message, find the first photograph and the key to Noah's room.
  2. **The Forgotten Room** — Noah's bedroom, storage room, bathroom, hallway. Four photographs, Noah's diary, toys that move when you look away, a music box that plays by itself.
  3. **Someone Behind Me** — the long hallway, the mirror room and the stairwell. Reflections that don't match, markings readable only in mirrors, and the first encounter with The Figure Behind.
  4. **The Recordings** — basement, Dad's office, storage and the hidden archive. Find Noah's recorder and five tapes, open the archive, and put the family's last day back in order.
  5. **The Night We Lost** — the fire, twice. First the way Elias remembers it; then the way it happened.
  6. **The Voice Behind Me** — the endless hallway, the confrontation in the mirror room, and the final memory chamber.
* **Four endings** (A: Acceptance, B: Denial, C: The Figure, D: The Last Recording).
* **Seven puzzles**: photo arrangement, diary page reconstruction, mirror-letter lock, basement padlock, cassette timeline, final memory reconstruction, and a secret tape-splicing puzzle.
* **Systems**: first-person controller with collision, stairs and head-bob; interaction highlighting and prompts; inventory with item inspection, photo backs and tape playback; puzzle framework; horror event director (scripted and randomized events, positional footsteps, whispers, knocks, light flicker, moving objects, visual distortion); The Figure Behind AI; flashlight with battery and pickups; dialogue with subtitles, choices and evidence-dependent lines; autosave checkpoints, chapter select and ending tracking in LocalStorage; settings for audio, sensitivity, graphics, brightness, subtitles, camera shake and fullscreen.

## Project structure

```
src/
  App.tsx, main.tsx            routing (React Router, hash history)
  styles.css                   all interface styling
  data/                        content only — no logic
    items.ts                   every collectible, note, photo and tape
    dialogue.ts                all scripted lines
    puzzles.ts                 puzzle definitions + solution checks
    chapters.ts                chapter titles + objectives
    endings.ts                 ending text + requirements
    types.ts
  store/
    gameStore.ts               Zustand: run state, inventory, flags, UI overlays
    settingsStore.ts           Zustand: persisted settings
  systems/
    AudioSystem/               synth.ts (procedural audio) + audioManager.ts (Howler, 3D audio, mixing)
    ChapterSystem/             game clock, chapter scripts, objectives, chapter/ending transitions
    DialogueSystem/            subtitles, voice playback, choices
    EndingSystem/              evidence/clue tracking and ending requirements
    HorrorEventSystem/         lights registry, flicker, positional sounds, ambient event scheduler
    InteractionSystem/         interactable registry + focus picking with line of sight
    InventorySystem/           give / inspect / play
    PhysicsSystem/             AABB colliders, ramps and floors, cylinder collision
    PuzzleSystem/              promise-based puzzle overlays
    SaveSystem/                LocalStorage checkpoints, unlocked chapters, endings
  components/
    Player/                    PlayerController, Flashlight, MirrorBody (reflection-only body), rig
    Environment/               LevelGeometry (data-driven walls/floors, merged per material),
                               procedural materials, Props (furniture), Door, HouseLight,
                               Mirror (real reflections), Atmosphere (rain, fire, smoke, lightning)
    Enemies/                   Figure (smoke shader + behaviour), figureDirector, Noah, Humanoid
    Interactions/              Interactable, Trigger
    Effects/                   PostFX, GameLoop
    UI/                        HUD, Inventory, puzzles, ChoiceBox, PauseMenu, SettingsPanel
  scenes/
    MainMenu/                  title screen, chapter select, settings, credits
    Game/                      GameScene (Canvas + overlays + lazy chapter loader)
    Chapter1 … Chapter6/       one component per chapter: level layout + script
    Ending/                    the four ending sequences
    shared/house.tsx           the family house layout reused by chapters 1, 5 and the endings
  assets/                      placeholder folders for replacement models/textures/sounds/music
```

### How a chapter works

A chapter is a React component that renders its level (walls/floors as data, props, doors, lights, interactables, triggers) and runs one async script with `useChapterScript`. Scripts are ordinary `async` functions that `await` game-time waits, dialogue, choices and puzzles:

```ts
const takePhoto = async () => {
  const c = await choose('A framed photograph lies face-down in broken glass.', [...]);
  giveItem('photo_porch');
  completeObjective('photo');
  if (c === 'away') useGame.getState().addAvoidance();
  await wait(2.5);
  setDoor('closet', true, { slow: true });
};
```

The game clock only advances while unpaused, so scripted sequences freeze with the pause menu. Restarting a chapter bumps a run id that remounts the scene and abandons every pending wait.

### Performance

* Static level geometry is merged into one mesh per material.
* Repeated objects (books, fence posts) use instancing.
* Chapters are code-split and only loaded when reached; geometries, materials and render targets are disposed on unmount.
* Per-frame state (player, AI, lights) lives outside React; HUD components subscribe to narrow Zustand slices.
* Graphics quality: **Low** (no shadows, no post-processing except vignette, lower resolution, 256px textures), **Medium** (soft shadows, bloom, grain, chromatic aberration), **High** (adds SSAO, shadowed flashlight and lamps, sharper mirrors, up to 1.5× pixel ratio).

### Accessibility

Subtitles (three sizes) for every line including sound cues; brightness; adjustable mouse sensitivity and vertical inversion; arrow-key look; reduced camera shake; separate master/music/ambience/effects volumes; pause at any time; chapter checkpoints. Light flicker is a dimming pattern on individual lamps, never a full-screen strobe, and `prefers-reduced-motion` disables UI animation.

## Replacing placeholder assets

The game ships with **no external asset files**. Everything is generated at runtime so the project runs from a clean checkout. These are temporary assets and are all clearly isolated:

| What | Where it's generated | How to replace |
| --- | --- | --- |
| All sounds and music | `src/systems/AudioSystem/synth.ts` (`GENERATORS`) | Put files in `src/assets/sounds` / `src/assets/music`, import them, and change `getHowl()` in `audioManager.ts` to use the file URL for that name. Names are listed in `GENERATORS`. |
| Character voices | `voice_<kind>_<n>` formant synthesis in `synth.ts`, played by `speak()` in `audioManager.ts` | Record lines and add a `file` field to `Line` in `data/types.ts`; play it in `DialogueSystem/dialogue.ts` instead of `speak()`. |
| Wall / floor / furniture textures | canvas painters in `src/components/Environment/materials.ts` | Load an image with `THREE.TextureLoader` in `getTexture()` for that `MatKey`. UVs are already world-scaled. |
| Furniture | primitive compositions in `src/components/Environment/Props.tsx` | Replace a prop's children with a `useGLTF` model; keep its `collide` footprint. |
| The Figure, Noah, Elias's reflection | `src/components/Enemies/Humanoid.tsx` | Swap `Humanoid` for a rigged GLTF; `Figure.tsx` only needs a group to position and materials to fade. |

## Testing

`npm run build` type-checks the whole project. For automated play-testing, the game exposes a small debug API on `window.__tvbm` in dev mode or when the URL contains `?debug` (teleport, trigger interactions, inspect state, speed up the game clock). It is not used by gameplay.

---

## Spoilers: walkthrough, puzzle solutions and endings

<details>
<summary>Open only if you're stuck</summary>

### Puzzle solutions

| Puzzle | Where | Solution | Clue |
| --- | --- | --- | --- |
| Photo corkboard | Ch2, Noah's desk | Beach → Bicycle → Graduation → Birthday | ages on the backs: 6, 9, 12, 15 |
| Torn diary page | Ch2, storage trunk | "July 13…" → "mean. Tomorrow…" → "the flashlight…" → "up. That's my job…" | each strip ends mid-sentence |
| Letter lock | Ch3, stairwell door | **LIKOD** | five mirrored markings, tally marks give the order |
| Archive padlock | Ch4, basement | **0714** | newspaper clipping + Dad's note ("month, then day") |
| Cassette timeline | Ch4, archive deck | HAPPY BDAY → FIRE DRILL → DON'T → SORRY → (no label) | dates on the labels and in the recordings |
| The night we lost | Ch6, memory chamber | argued → knocked → woke me → led me down → I ran back → pushed me out → never came out | leave out "Noah called for help. I heard him and I walked away." |
| Noah's last tape (secret) | Ch6, "FOR KUYA" deck | the three pairs A1-A2, B1-B2 in either order, then C1-C2 last | fragments starting with "…" continue the previous one |

### Hidden items for Ending D

* **Hidden recordings (3):** the music box in Noah's room (Ch2), the linen closet in the long hallway (Ch3), behind the bottom shelf in basement storage (Ch4).
* **Hidden clues (6):** kitchen calendar and the drawing on the fridge (Ch1); pencil height marks on Noah's doorframe and the drawing on his desk (Ch2); the scratches behind the hallway dresser (Ch3); Mom's unsent letter in Dad's filing drawer (Ch4).

### Endings

* **A — Acceptance:** collect all important evidence, reconstruct the night in the memory chamber, then choose to play the last recording.
* **B — Denial:** at the final decision, destroy the tape. The game returns to the rainy road and the voicemail plays again — on the next playthrough Elias recognises it.
* **C — The Figure:** keep running from the Figure. In the endless hallway, every lap away from it counts; avoiding memories earlier (turning the photo face-down, closing the music box, skipping the argument tape, agreeing with the Figure) shortens how long the hallway lets you run. You can also simply turn away at the final decision.
* **D — The Last Recording:** find all 3 hidden recordings and all 6 hidden clues, solve the splicing puzzle at the "FOR KUYA" deck in the memory chamber, then play Noah's tape.

### The truth (every chapter points at it)

Noah wasn't calling for help. He was waking his brother, as he'd promised Dad in the fire drill and promised himself in his diary. He walked behind Elias down the stairs and out the front door. Outside, Elias couldn't see him, because Noah was right behind him, and ran back into the fire. Noah followed him in and pushed him out. The burns on Elias's back were the shape of two small hands.

</details>
