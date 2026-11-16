# THE LAST ATTENDANCE

> *"Every name has a story. Every absence has a reason."*

A first-person 3D psychological horror game that runs in the browser. You play Alex Mercado, who goes back to San Aurelio High School ten years after a fire that the official report says happened in an empty building.

- **6 playable chapters**, each with its own lazy-loaded 3D environment, objectives, puzzles and horror events
- **9 logic puzzles**: breaker panel, photo matching, seating plan, records-computer password, attendance reconstruction, archive keypad, evacuation route, incident timeline, and a secret timeline
- **Teacher AI** built as a finite state machine (idle, watching, patrolling, investigating, searching, chasing, disappearing), with A* navigation, sight, hearing and hiding spots
- **35+ collectible items and evidence pieces**, readable in the inventory, plus 3D inspection with hidden details on the back of some items
- **4 endings** decided by the evidence you collect and the choices you make
- **Procedural everything**: textures, furniture, characters and every sound are generated at runtime, so the repo contains no licensed assets
- Positional 3D audio, subtitles in English or Filipino, save and checkpoint system, settings and accessibility options

---

## Quick start

Requires **Node.js 18+**.

```bash
cd the-last-attendance
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173), then click once to enable audio.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build a production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript only |

### Deployment

`npm run build` writes a fully static site to `dist/`. Vite uses `base: './'` and the app uses `HashRouter`, so you can host `dist/` from any static host (Netlify, Vercel, GitHub Pages, S3, itch.io HTML upload) under any sub-path without rewrite rules.

---

## Controls

| Key | Action |
|---|---|
| **W A S D** / arrows | Move |
| **Mouse** | Look (click the game to capture the mouse) |
| **Shift** | Run (loud — the teacher hears it from far away) |
| **Ctrl** or **C** | Crouch (quiet; breathe under the smoke in Chapter 4) |
| **E** | Interact / hide / leave a hiding spot / close a document |
| **F** | Flashlight (the battery drains; look for batteries) |
| **Tab** | Inventory & evidence |
| **Q** | Inspect the selected item in 3D (turn it over) |
| **Esc** | Pause (releases the mouse) |
| **1–4** | Pick a dialogue choice |

Browsers close the tab on **Ctrl+W**, so use **C** to crouch while moving forward.

---

## Settings & accessibility

Master, music, ambient and effects volume · synthesized voices on/off · mouse sensitivity · invert Y · graphics quality (low/medium/high) · brightness · field of view · fullscreen · subtitles on/off · subtitle language (English/Filipino) · reduced camera shake · reduced flashing.

Settings are saved in `localStorage` and apply right away. Every spoken line has subtitles, and you never need loud audio to progress.

**Graphics presets**

| | Low | Medium | High |
|---|---|---|---|
| Pixel ratio | 0.75–1 | 1–1.5 | 1–2 |
| Shadows | off | flashlight, 512² | flashlight, 1024² |
| Post-processing | off | bloom, grain, vignette, chromatic aberration | + N8AO ambient occlusion |

---

## Project structure

```
the-last-attendance/
├─ index.html
├─ vite.config.ts            # base './', code-split three / r3f chunks
├─ src/
│  ├─ main.tsx, App.tsx      # HashRouter: / menu, /play, /ending/:id, /credits
│  ├─ types.ts               # shared strict types
│  ├─ data/                  # ── story & game data (no rendering code) ──
│  │  ├─ characters.ts       # cast + the roll call
│  │  ├─ chapters.ts         # chapter metadata & objectives
│  │  ├─ dialogue.ts         # scripted lines (English + Filipino)
│  │  ├─ items.ts            # every collectible, document, photo and recording
│  │  ├─ puzzles.ts          # puzzle data + pure validators
│  │  └─ endings.ts          # ending texts
│  ├─ store/gameStore.ts     # Zustand: progress, flags, inventory, UI state, actions
│  ├─ systems/
│  │  ├─ runtime.ts          # mutable per-frame state (no React re-renders) + event bus
│  │  ├─ CollisionSystem/    # 2.5D AABB collisions, line-of-sight
│  │  ├─ InteractionSystem/  # focus picking, prompts, highlight
│  │  ├─ EnemyAISystem/      # TeacherBrain FSM + NavGrid A*
│  │  ├─ HorrorEventSystem/  # scripted helpers + randomised event director
│  │  ├─ AudioSystem/        # procedural synth → WAV → Howler (3D positional), TTS voices
│  │  ├─ DialogueSystem/     # async, abortable cutscene scripts, subtitles, choices
│  │  ├─ SaveSystem/         # localStorage saves, chapter snapshots, settings
│  │  └─ EndingSystem/       # evidence summary + ending resolution
│  ├─ components/
│  │  ├─ Environment/        # LevelBuilder (procedural architecture), instanced renderer, props, textures, materials
│  │  ├─ Player/             # first-person controller, flashlight
│  │  ├─ Characters/         # procedural humanoid, ghosts, memory figures
│  │  ├─ Enemies/            # Ms. Reyes
│  │  ├─ Interactions/       # Interactable, Pickup, Door, HidingSpot, Trigger, moving props
│  │  ├─ Inventory/          # inventory, reader, 3D inspect, item models, photographs
│  │  ├─ Puzzles/            # all puzzle UIs
│  │  ├─ UI/                 # HUD, pause, settings, loading
│  │  └─ Effects/            # post-processing
│  ├─ scenes/
│  │  ├─ MainMenu/           # cinematic hallway menu
│  │  ├─ Chapter1 … Chapter6 # one lazy-loaded scene per chapter
│  │  ├─ Ending/             # ending cinematics
│  │  ├─ ChapterBase.tsx     # shared chapter scaffolding (player, ambience, autosave, intro)
│  │  └─ GameScene.tsx       # canvas host, loading screen, chapter transitions
│  ├─ utils/debugApi.ts      # window.__tla test hooks
│  └─ assets/                # drop-in folders for replacement models/textures/audio/fonts
```

### Architecture notes

- **Rendering vs. logic.** Story, items, puzzles and endings live in `data/` as plain typed objects. Systems in `systems/` hold no JSX except the event director. Per-frame values (player position, flicker, fear, battery) live in a mutable `runtime` object, so frames never trigger React renders. Zustand only holds state the UI cares about.
- **Levels** are built in code with `LevelBuilder` (walls with door and window openings, rooms, desks, lockers, shelves…). `StaticLevel` draws every box with one `InstancedMesh` per material and registers its colliders. Materials use a world-space (triplanar) UV patch, so non-uniformly scaled boxes never stretch their textures.
- **Collisions** are 2.5D: every collider is an AABB with a vertical range, and characters are circles. The same data drives player collision, teacher line of sight, interaction occlusion and the teacher's A* nav grid. Closed doors add colliders, so the nav grid rebuilds when they change.
- **Scripts** (cutscenes, the roll call, the final attendance) are `async` functions on a `ScriptContext`. When a chapter unmounts, every pending `wait`, `say` and `choose` rejects, so a script can never leak into the next scene.
- **Saving.** Checkpoints save the chapter, inventory, flags, the "caught" counter, flashlight battery and player position. Every chapter start writes a snapshot that Chapter Select uses, which keeps unlocked chapters and endings separate from the current save.
- **Optimisation.** Chapters are code-split and lazy-loaded behind a loading screen. Repeated furniture is instanced. Lights are budgeted (a few real point lights per area, other fixtures emissive only). Geometry and materials are disposed on unmount, and the post-processing quality follows the graphics setting.

### Replacing procedural assets

- **Audio:** add a file to `src/assets/audio/`, import it, and map it in `ASSET_OVERRIDES` in `systems/AudioSystem/AudioSystem.ts` (e.g. `bell: bellUrl`). Every `AudioSystem.play('bell')` then uses the recording.
- **Textures:** swap a generator in `components/Environment/textures.ts` for a `TextureLoader` call (keep `RepeatWrapping`).
- **Models:** `Humanoid` and `ItemModel` are self-contained, so a GLB (via drei `useGLTF`) can replace them one component at a time.

---

## Story (spoilers below)

<details>
<summary>Setting & premise</summary>

On **Friday, March 9, 2018**, Grade 12 – Section Sampaguita held an evening review in **Room 13** of San Aurelio High School. At 7:38 PM a fire started in the science lab. The official report called it an electrical accident, said the session "did not take place", and listed eleven students and their adviser, Ms. Elena Reyes, as missing. The evening attendance book was never recovered, and the school closed.

On **March 9, 2028**, exactly ten years later, Alex Mercado gets a text: *"Alex, may isang pangalan na hindi pa natawag. Bumalik ka sa Room 13."* Alex introduces himself as 18 and is sure he transferred out before the fire. His Chapter 1 ID card says otherwise.
</details>

<details>
<summary>Chapter walkthrough</summary>

1. **After School:** push the gate, enter, and restore power at the guard station. The note says MAIN → HALLWAY → ROOM 13, and never CANTEEN. Watch the roll call in Room 13, then take the ID and the Wing B key from the teacher's desk.
2. **Present:** open lockers 04, 07, 09 and 11 for the four belongings, then match the faculty photos (ribbon = Hannah, jersey #7 = Carlo, glasses = Katrina, guitar pick = Joshua). Fill the Room 9 seating plan from Ms. Reyes's notes: Katrina, Hannah, Alex / Joshua, Carlo, Daniel. Daniel's drawer holds his diary and the records key. Ms. Reyes starts hunting after the photos are identified.
3. **The Missing Names:** the records PC password is your section plus your room (`SAMPAGUITA13`). The printer then prints the original attendance. Reconstruct the attendance with the 11 missing students plus **Mercado, Alex**, and leave out Ilagan (transferred), Ocampo (excused) and Torres (other section). Read the "TRANSFERS" file. The archive code is the time every clock stopped: `0738`.
4. **The Night of the Fire:** crouch in smoke, follow Daniel's four memory fragments, examine the extension cord under the fume hood, and order the evacuation on the Room 13 board (Room 13 → main stairs → east hallway → east exit). Then examine the chained exit.
5. **The False Report:** collect the principal's order and the edited draft report, play the confession tape (side A), open the attendance book in the archive, play Daniel's tape, and pin the timeline: 6:00, 7:10, 7:30, 7:38, 7:44, 7:49, 8:05. Ms. Reyes's last note explains what she wants.
6. **The Last Attendance:** get through the distorted corridor (hide from her distorted form) to Room 13, take the attendance book, decide what to do with the record, answer her three questions, and answer the final name.
</details>

<details>
<summary>Endings</summary>

| # | Ending | How to reach it |
|---|---|---|
| 1 | **PRESENT** (true) | All **18 key evidence** items, the incident timeline solved, *restore* the record, answer all three questions truthfully (by the lab looking for Daniel · Daniel went for his reviewer · separated at the stairs), and answer **"Present."** |
| 2 | **ABSENT** | Leave the record as it is, stay silent, say "I was never here", or walk out through the gate at the start of Chapter 6 |
| 3 | **THE NEW STUDENT** | Answer "Present" without having remembered (missing key evidence, a wrong answer, or tearing out the page), **or get caught by her in Chapter 6** |
| 4 | **THE UNRECORDED** (secret) | Everything for PRESENT, plus every optional record (repair memo, library log, guard logbook, confession side B), every hidden student clue (star hair clip, the back of the class photo, canteen slip, unprocessed enrollment form, the voice in Room 12), and the unrecorded timeline in the room hidden behind the principal's bookshelf |

The inventory footer shows how many key evidence items you have (and ◆ unrecorded clues once you find one). The girl in the hallway points toward the hidden clues.
</details>

---

## Testing

All six chapters and all four endings were played through automatically in headless Chromium against the production build. The test scripts drive the real UI (menu buttons, breaker switches, selects, checkboxes, keypad, terminal input, dialogue choices) and use the `window.__tla` hooks (enabled with `?debug`) for teleporting and reading state:

```js
__tla.state()          // chapter, flags, inventory, overlay, subtitle, choice, teacher state…
__tla.teleport(x, z, yaw)
__tla.interactables()  // ids + prompts in the current scene
__tla.interact(id)     // trigger an interactable exactly like pressing E
__tla.answer(choiceId) // pick a dialogue choice
__tla.solve(puzzleId)  // mark a puzzle solved
```

---

## Credits

Built with React 18, TypeScript, Vite, Three.js, React Three Fiber, Drei, @react-three/postprocessing, Zustand, Howler.js and React Router. Fonts: Special Elite, IBM Plex Mono and Cormorant Garamond (Google Fonts, OFL). All models, textures and sounds are generated procedurally by the game.

This is a work of fiction. San Aurelio High School does not exist.
