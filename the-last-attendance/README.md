# THE LAST ATTENDANCE

> *"Every name has a story. Every absence has a reason."*

A first-person 3D psychological horror game that runs in the browser. You play Jasmine Semanero, who goes back to Bubog National High School ten years after a fire that the official report says happened in an empty building.

- **6 playable chapters**, each with its own lazy-loaded 3D environment, objectives, puzzles and horror events
- **9 logic puzzles**: breaker panel, photo matching, seating plan, records-computer password, attendance reconstruction, archive keypad, evacuation route, incident timeline, and a secret timeline
- **Teacher AI** built as a finite state machine (idle, watching, patrolling, investigating, searching, chasing, disappearing), with A* navigation, sight, hearing and hiding spots
- **35+ collectible items and evidence pieces**, readable in the inventory, plus 3D inspection with hidden details on the back of some items
- **4 endings** decided by the evidence you collect and the choices you make
- **Belongings of the missing**: 13 optional keepsakes (one for each student of Grade 12 – Sampaguita, plus Mara and Ms. Reyes) spread across all six chapters. Each owner whispers when you find theirs; at the Chapter 6 roll call they answer differently and their belonging appears at their seat, and the ending epilogue counts how many you brought home
- **3D models**: Ms. Reyes, the ghost students, Mara, Daniel, the guard, Room 13, most school rooms, the collectible items and the classroom clutter use Sketchfab models (credits below); the rest of the school, the textures and every sound are generated procedurally
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

**Netlify (drag and drop):** run `npm run build`, zip the *contents* of `dist/` (so `index.html` is at the top of the zip), and drop the zip on https://app.netlify.com/drop. **Netlify (from GitHub):** set the base directory to `the-last-attendance`; `netlify.toml` supplies the build command and publish folder. `public/_headers` adds long-lived caching for the models.

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

## Admin mode (god's eye)

Press **F9** (on many laptops **Fn + F9**), the **`** key (left of 1), or **Esc → ADMIN** in game and enter the admin PIN (default: `BUBOGADMIN13`). The PIN is asked once per browser tab.

| Key | What it does |
|---|---|
| G | Fly through walls (spectator camera: WASD, Space up, C down, Shift fast) |
| M | Overhead map with the ceilings cut away (WASD pan, Space/C zoom) |
| L | See everything: labels on every item, belonging (★), secret clue (◆), door and hiding spot, plus Ms. Reyes and Jasmine, through walls |
| B | Full bright |
| I | Invisible: Ms. Reyes cannot see, hear or catch Jasmine |
| T | Move Jasmine to the flying camera |
| F9 | Admin panel: teacher off/stalker/hunter, give items or belongings, full battery, jump to any chapter, log out |

To change the PIN, run `echo -n "NEWPIN" | sha256sum` (PIN in capitals) and put the hash in `PIN_HASH` in `src/components/Admin/admin.ts`. This is a lock inside the game itself: it keeps ordinary players out, but anyone who reads the game's code could get around it.

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
- **Characters:** GLB files live in `public/models/` (Draco-compressed with WebP textures; the decoder is self-hosted in `public/draco/`) and are registered in `CHARACTER_MODELS` (`components/Characters/ModelCharacter.tsx`). Each model is normalised at runtime (height, feet on the floor, facing direction), T-posed arms are lowered (bone rotation for rigged models, vertex bending for unrigged ones), and ghosts get a translucent glowing material. The procedural `Humanoid` is shown while a model loads.

| Character | Model |
|---|---|
| Ms. Elena Reyes (and her distorted form) | `teacher.glb`, with its idle narration animation |
| Mara Dizon, the girl in the hallway | `girl_bob.glb` |
| Daniel's memory | `boy_rigged.glb` (walk cycle) |
| Ghost students | `girl_ponytail.glb`, `girl_bob.glb`, `boy_stylized.glb`, `boy_stylized6.glb`, `student.glb`, `boy_rigged.glb` |
| Ghost in the Chapter 6 corridor | `boy_animated.glb` (its own animation) |

- **Rooms:** environment GLBs are registered in `ENV_MODELS` (`components/Environment/EnvModel.tsx`). Room 13 is built from them through `scenes/shared/room13Sets.tsx`: each `RoomSet` stores the model's plan-space anchors (teacher, desk, blackboard, seats, doorway). `Room13Model` places the model, cuts the hallway doorway through its wall with clipping planes, and generates walkability colliders directly from the model's triangles (`systems/CollisionSystem/meshColliders.ts`).

| Room 13 | Model |
|---|---|
| 2028, Chapters 1 and 6 (red, distorted in Ch. 6) | `env_abandoned_classroom.glb` |
| March 9, 2018, Chapter 4 flashback; PRESENT ending (morning) | `env_classroom.glb` |
| THE NEW STUDENT ending | `env_old_classroom.glb` |

- **Model viewer:** open `#/viewer` (e.g. `http://localhost:5173/#/viewer?m=env_classroom&top=1`) to inspect any model; `top=1` shows the plan with the generated colliders, `top=2` the plain plan, `rot=<radians>` rotates environments.

---|---|
| Ms. Elena Reyes (and her distorted form) | `teacher.glb`, with its idle narration animation |
| Mara Dizon, the girl in the hallway | `girl_bob.glb` |
| Daniel's memory | `boy_rigged.glb` (walk cycle) |
| Ghost students | `girl_ponytail.glb`, `girl_bob.glb`, `boy_stylized.glb`, `student.glb`, `boy_rigged.glb` |

---

## Story (spoilers below)

<details>
<summary>Setting & premise</summary>

On **Friday, March 9, 2018**, Grade 12 – Section Sampaguita held an evening review in **Room 13** of Bubog National High School. At 7:38 PM a fire started in the science lab. The official report called it an electrical accident, said the session "did not take place", and listed eleven students and their adviser, Ms. Elena Reyes, as missing. The evening attendance book was never recovered, and the school closed.

On **March 9, 2028**, exactly ten years later, Jasmine Semanero gets a text: *"Jasmine, may isang pangalan na hindi pa natawag. Bumalik ka sa Room 13."* Jasmine introduces herself as 18 and is sure she transferred out before the fire. Her Chapter 1 ID card says otherwise.
</details>

<details>
<summary>Chapter walkthrough</summary>

1. **After School:** push the gate, enter, and restore power at the guard station. The note says MAIN → HALLWAY → ROOM 13, and never CANTEEN. Watch the roll call in Room 13, then take the ID and the Wing B key from the teacher's desk.
2. **Present:** open lockers 04, 07, 09 and 11 for the four belongings, then match the faculty photos (ribbon = Hannah, jersey #7 = Carlo, glasses = Katrina, guitar pick = Joshua). Fill the Room 9 seating plan from Ms. Reyes's notes: Katrina, Hannah, Jasmine / Joshua, Carlo, Daniel. Daniel's drawer holds his diary and the records key. Ms. Reyes starts hunting after the photos are identified.
3. **The Missing Names:** the records PC password is your section plus your room (`SAMPAGUITA13`). The printer then prints the original attendance. Reconstruct the attendance with the 11 missing students plus **Semanero, Jasmine**, and leave out Ilagan (transferred), Ocampo (excused) and Torres (other section). Read the "TRANSFERS" file. The archive code is the time every clock stopped: `0738`.
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

**3D models (Sketchfab):**
- "Animated Female Teacher for Narration" by LasquetiSpice: https://sketchfab.com/3d-models/animated-female-teacher-for-narration-2b24fd414b9a4fbb9ffb5ffdd4e6a4e5 (CC BY 4.0)
- "High School Student V10" by Fadly.W: https://sketchfab.com/3d-models/high-school-student-v10-08dcb65df3da4fb9b7537fc85b39828d (CC BY 4.0)
- "Bob Cut High School Girl" by minecraft3193092: https://sketchfab.com/3d-models/bob-cut-high-school-girl-21f78bdb6e3a4b679c4aaf70ad96ea5c (CC BY-SA 4.0)
- "Ponytail High School Girl" by minecraft3193092: https://sketchfab.com/3d-models/ponytail-high-school-girl-d3cb15fd8bc7465182c39f982e32e5d0 (CC BY-SA 4.0)
- "Rigged Anime Japanese High School Boy" by suzuart: https://sketchfab.com/3d-models/rigged-anime-japanese-high-school-boy-845df0101cd5429e86b190be757d1365 (CC BY 4.0)
- "Rigged Anime School Boy (Animation included)" by suzuart: https://sketchfab.com/3d-models/rigged-anime-school-boy-animation-included-288cb16deac54a3c95697a4e2290b499 (CC BY 4.0)
- "Stylized Anime Japanese High School Boy 6" by suzuart: https://sketchfab.com/3d-models/stylized-anime-japanese-high-school-boy-6-e93f1017e9b04beb941af34ee0bd5542 (CC BY 4.0)
- "Stylized Anime Japanese High School Boy 8" by suzuart: https://sketchfab.com/3d-models/stylized-anime-japanese-high-school-boy-8-e5b837094f5340bd898b3e785f59f2b8 (CC BY 4.0)
- "Classroom" by Pino_156: https://sketchfab.com/3d-models/classroom-d4553cc2008242849214e4cbf8ad8551 (CC BY 4.0)
- "Old abandoned classroom" by Rixael: https://sketchfab.com/3d-models/old-abandoned-classroom-9651b7c7d1e546d6b279231d6cf3d1ca (CC BY 4.0)
- "Abandoned classroom" by Pasha: https://sketchfab.com/3d-models/abandoned-classroom-1ee5639dc207421c9f428ac6b380f263 (**Sketchfab Standard licence**: may be used inside the game, but the model file itself must not be redistributed on its own. If this repository is public, confirm that is acceptable or keep `public/models/env_abandoned_classroom.glb` out of it.)

- "Building Hallway" by jimbogies: https://sketchfab.com/3d-models/building-hallway-ac43a501050149f396729bdaa4a308fb (CC BY 4.0) — main menu
- "Cafetery" by Lucia: https://sketchfab.com/3d-models/cafetery-f019c964444d442f8999ab5f9c0f10fb (CC BY 4.0) — Chapter 2 canteen tables
- "Construction school" by Stas: https://sketchfab.com/3d-models/construction-school-eb4b7a91e0ad4106a2fe787ac74b0598 (CC BY 4.0) — Chapter 1 campus backdrop
- "Crenshaw High School - Main Building exterior" by lavarwebb: https://sketchfab.com/3d-models/crenshaw-high-school-main-building-exterior-3775b24251fe405fa1d85b3824dc3d93 (CC BY 4.0) — the Bubog National High School building (Chapter 1 and the ABSENT ending)
- "library" by Pasha: https://sketchfab.com/3d-models/library-7fc61f0d65ee49d0b2904e85d1fa520e (CC BY 4.0) — Chapter 1 campus backdrop
- "Low Poly Chemistry Lab" by gabrielmendesm: https://sketchfab.com/3d-models/low-poly-chemistry-lab-e0d270dbef88448d8a191e95a7c31d46 (CC BY 4.0) — Chapter 4 science lab
- "Private Detective's Office" by Zeps3D: https://sketchfab.com/3d-models/private-detectives-office-2afb913100ac4ca4bb4708fe8183c5b8 (CC BY 4.0) — Chapter 5 principal's office
- "Old Staircase - MTSU Animation, VFX & VP" by MTSU: https://sketchfab.com/3d-models/old-staircase-mtsu-animation-vfx-vp-9e06f0f2e8c842098417c91d84d39f37 (CC BY 4.0) — stairs, Chapters 1 and 4
- "Exit Door" by barbodoji: https://sketchfab.com/3d-models/exit-door-c1d5f41dfb8a4213b65363307dcf1eed (CC BY 4.0) — Chapter 4 emergency exit
- "Filing Cabinets" by TooManyDemons: https://sketchfab.com/3d-models/filing-cabinets-7ef1ca295ff14af2abcbe0ae0168a241 (CC BY 4.0) — cabinets, Chapters 1, 2, 3, 5
- "Fire Animation" by 3DHaupt: https://sketchfab.com/3d-models/fire-animation-ba6315fe80d34b5ba7ff912f5ec71b19 (CC BY 4.0) — Chapter 4 fire
- "Rusty Steel Door Lock" by Incg5764: https://sketchfab.com/3d-models/rusty-steel-door-lock-a36ce37e97c843a78a48b08adbf322e8 (CC BY 4.0) — Chapter 4 chained exit
- "SCHOOL LOCKER" by Lee: https://sketchfab.com/3d-models/school-locker-1ea07e4cb6dc404fa5fa597a0211474d (CC BY 4.0) — Chapter 2 lockers
- "Small Fuse Box" by big: https://sketchfab.com/3d-models/small-fuse-box-1818361dc6554d17bef8c0400959f93f (CC BY 4.0) — Chapter 1 breaker panel
- "Stereo Cassette Deck" by Tom: https://sketchfab.com/3d-models/stereo-cassette-deck-624e0a2e69ed475d85f0492f4341f3ea (CC BY 4.0) — Chapter 5 tape player
- "Stylized Chemistry Set" by hayley.morris1: https://sketchfab.com/3d-models/stylized-chemistry-set-41e5f46a588649658d579069d00f8bbc (CC BY 4.0) — Chapter 4 lab
- "Philippines Flag" by mljsantos: https://sketchfab.com/3d-models/philippines-flag-b0de5302fca04e55bd3efa2d4d602b00 (**Sketchfab Standard licence**) — Chapter 1 courtyard
- "Low-Poly Laboratory" by Yahor: https://sketchfab.com/3d-models/low-poly-laboratory-fedc3b5df4724997ac003f7f1b9c8cca (CC BY 4.0) — science-fair diorama in the Chapter 3 library
- "low-poly office" by DarianDS: https://sketchfab.com/3d-models/low-poly-office-c924672f29df4fd68c3e3b9fd70741fe (CC BY 4.0) — registrar's workstation in the Chapter 3 records office
- "office is old abandoned FREE" by dasy444: https://sketchfab.com/3d-models/office-is-old-abandoned-free-3977a108b2304b85a698f3dda1777015 (CC BY 4.0) — Chapter 3 archive room
- "Science Lab Table" by Skecthfab: https://sketchfab.com/3d-models/science-lab-table-5ef0a834474b41c4bb3f26b6986a404c (CC BY 4.0) — Chapter 4 Room 12

**Belongings, props and characters (batch 3):**

- "Acoustic Guitar" by Jinhong Jeong: https://sketchfab.com/3d-models/acoustic-guitar-e2e7a415bafd4346a481afcc0645dce3 (**CC BY-NC 4.0 (non-commercial)**) — Joshua's guitar, Chapter 2
- "Ballpen" by rustic.orcullo13: https://sketchfab.com/3d-models/ballpen-7995e39be8c2468096966c15838637c9 (CC BY 4.0) — teacher's desk, Room 13
- "Basketball" by Marek Picheta: https://sketchfab.com/3d-models/basketball-b7357866e35e4e1181e7488ae0577bdb (CC BY 4.0) — Miguel's basketball (belonging)
- "Basketball Jersey" by Sev: https://sketchfab.com/3d-models/basketball-jersey-3ee634a324d5400ab84555b0636416f6 (CC BY 4.0) — Carlo's jersey (belonging)
- "Beads Lanyard (EMP (SBH) 15-S)" by eeelabvisual: https://sketchfab.com/3d-models/beads-lanyard-emp-sbh-15-s-c1b19a8f98a4483b9b1df5a9b2a60023 (CC BY 4.0) — registrar desk, Chapter 3
- "calculator" by Cyril43: https://sketchfab.com/3d-models/calculator-f0b1f7c17d70489888f5ae922169c0ce (CC BY 4.0) — Room 13 desks
- "Candles set" by shuvalov.di: https://sketchfab.com/3d-models/candles-set-f09212756bc94764a8bcfcd3c7e38f8e (CC BY-SA 4.0) — memorials, Chapter 6 and the gate
- "Cassette Recorder" by zombitt: https://sketchfab.com/3d-models/cassette-recorder-ce9f02da632641299189f557633cb16d (CC BY 4.0) — Daniel's recorder (belonging)
- "China Doll - toy" by Brian Trepanier: https://sketchfab.com/3d-models/china-doll-toy-7c6f3f614592486e9124b0d84e1fde08 (CC BY 4.0) — Mara's desk, Chapter 6
- "Clipboard" by Cookie: https://sketchfab.com/3d-models/clipboard-a37158f20ccf436483029e8295629738 (CC BY 4.0) — attendance clipboard, Room 13
- "Designer Leather Pencil Case" by Eric Augustinowicz: https://sketchfab.com/3d-models/designer-leather-pencil-case-0f44286d1a2d49fabce767ef1cd365a5 (CC BY 4.0) — Room 13 teacher's desk
- "Desk Fan | Rigged | Free" by plazma019: https://sketchfab.com/3d-models/desk-fan-rigged-free-3cd147a143a64d578d54040224cbc720 (**Sketchfab Standard licence**) — Room 13 (2018) and the principal's office
- "Electric Fan" by Lillya: https://sketchfab.com/3d-models/electric-fan-c27f71e432b84353a245fb9b65dcdbf2 (CC BY 4.0) — Room 13 (2018), computer room
- "Flashlight" by MAR.COS.: https://sketchfab.com/3d-models/flashlight-5fa9a65e7b0141ee877ed18f4f42d953 (CC BY 4.0) — the flashlight
- "Flower Hair Clip" by leman0312: https://sketchfab.com/3d-models/flower-hair-clip-2c3e3299e0ca41af924a23b7c46f90fb (CC BY 4.0) — Mara's hair clip
- "Folded_shirt_men" by funlab117: https://sketchfab.com/3d-models/folded-shirt-men-44b95c9dc9de4dc98c54d5313e394e62 (CC BY 4.0) — Chapter 2 lockers
- "Ghost Girl V2" by Ezau954gamer: https://sketchfab.com/3d-models/ghost-girl-v2-2dc9cc80283f4da281f72888be0215ef (CC BY 4.0) — Mara
- "Horror Game Prop Collection 1" by AlienKat: https://sketchfab.com/3d-models/horror-game-prop-collection-1-eff04084f9954f8c826cb097c81db61a (**CC BY-NC 4.0 (non-commercial)**) — effigy in the Chapter 6 corridor
- "Horror mask" by Bulat.Shakirov: https://sketchfab.com/3d-models/horror-mask-c548becf104644dd802e158848c8f6b4 (CC BY 4.0) — hidden storage, Chapter 5
- "Hospital Bed" by loxfear: https://sketchfab.com/3d-models/hospital-bed-f8c13a19e84343e7b644c19f7b9488d3 (CC BY 4.0) — guard station cot, Chapter 1
- "Jasmine" by SCADL & Co: https://sketchfab.com/3d-models/jasmine-7ccfc2b34bcb45a2b46cef3d3ba15f5d (CC BY 4.0) — sampaguita flowers at the memorials
- "Key" by eucocker: https://sketchfab.com/3d-models/key-a4aca11a2259462f8735a60eead33962 (**CC BY-NC-SA 4.0 (non-commercial)**) — keys
- "Mirror" by eucocker: https://sketchfab.com/3d-models/mirror-cf964a1ff455478ba65771400a4ea1ab (CC BY 4.0) — principal's mirror, Chapter 5
- "MQTT School Bell Ringer" by digitalurban: https://sketchfab.com/3d-models/mqtt-school-bell-ringer-2869c618d1c5406ea06989ef44d0cd91 (CC BY 4.0) — Chapter 1 hallway
- "Old School Skate Shoe" by f l y i n c a t: https://sketchfab.com/3d-models/old-school-skate-shoe-ce83d71a24524480909fb56b37fa7925 (CC BY 4.0) — Room 13 and Chapter 1 hallway
- "PB153 Notebook Low" by Makovetkyi Volodymyr: https://sketchfab.com/3d-models/pb153-notebook-low-79f30cb4af5a40c482e487c8e7c3c58d (CC BY 4.0) — Daniel's diary
- "Pencil case, pencil, sharpener, eraser and ruler" by Mr.Octopus: https://sketchfab.com/3d-models/pencil-case-pencil-sharpener-eraser-and-ruler-62d50825c5de4d1ba574356fbe9b2985 (CC BY 4.0) — Room 13 desks
- "phone" by AlemanGame: https://sketchfab.com/3d-models/phone-7e8a826999e04e7fa82eca240d6ae265 (CC BY 4.0) — phone / Nicole's phone (belonging)
- "Photo Frame" by pedrohfds: https://sketchfab.com/3d-models/photo-frame-7c248d87fc644bcda9a061b64daea3ea (CC BY 4.0) — memorials and offices
- "Plastic Water Bottle" by RoutineStudio: https://sketchfab.com/3d-models/plastic-water-bottle-731efe2635c9472c9c1e4fdb1f8fbd13 (CC BY 4.0) — Room 13, canteen
- "Power strip extension lead" by Sousinho: https://sketchfab.com/3d-models/power-strip-extension-lead-2180b1f7b55b433285cbe08181a9e88a (CC BY 4.0) — the scorched extension cord
- "Realistic Blackboard" by ali98hussain: https://sketchfab.com/3d-models/realistic-blackboard-1fcaf45adf91486c94988080742ebdc5 (**Sketchfab Standard licence**) — Chapter 2 corridor
- "Rosary" by Carlos.Maciel: https://sketchfab.com/3d-models/rosary-fdf7f60f70f74611b655eac50adcc21a (CC BY 4.0) — Paolo's rosary (belonging)
- "Rubiks's Cube" by mellais: https://sketchfab.com/3d-models/rubikss-cube-2391353d88c14642a2e6e2e10d18e5e8 (CC BY 4.0) — Gabriel's puzzle cube (belonging)
- "Ruler" by Artieee: https://sketchfab.com/3d-models/ruler-6ef95979598942cd8aa91922f35dc28f (CC BY 4.0) — Room 13 teacher's desk
- "School Backpack" by MadeByYeshe: https://sketchfab.com/3d-models/school-backpack-524d7fc724094ead9f203ed06bae76e1 (CC BY 4.0) — Room 13 and canteen
- "School in Uniform girl" by Padarozhnik: https://sketchfab.com/3d-models/school-in-uniform-girl-587d7391083c47d29bfa90ee5d2845b1 (CC BY 4.0) — corridor ghost, Chapter 6
- "Security Guard – Rigged 3D Model" by Q.SARDOR: https://sketchfab.com/3d-models/security-guard-rigged-3d-model-1e3307732bbf4453b30f021bfec5bcaf (CC BY 4.0) — the guard at the gate (ending)
- "Sketchbook PBR" by RinRainicorn: https://sketchfab.com/3d-models/sketchbook-pbr-2d27c357a8f9454183e9c157165462a8 (CC BY 4.0) — Andrea's sketchbook (belonging)
- "Sketchpad" by Jeremy E. Grayson: https://sketchfab.com/3d-models/sketchpad-1bd2933b309943febc7e3e2b63a89205 (CC BY 4.0) — Room 13 desks
- "SpringBok - Rugby Jersey" by OmegaRedZA: https://sketchfab.com/3d-models/springbok-rugby-jersey-65a049dab9ed4bb49ec52cd54cf847a1 (CC BY 4.0) — Chapter 2 lockers
- "Stack Of Old Books" by Arjun Perayil: https://sketchfab.com/3d-models/stack-of-old-books-c6ca6667fd7d4381bd184874dcf44075 (CC BY 4.0) — Room 13, library
- "Stylized Eyeglasses Set –  3D Model Pack" by Anka Inoplanetyanka: https://sketchfab.com/3d-models/stylized-eyeglasses-set-3d-model-pack-30fd3bff1e7c485c86c2a1bede38fe2d (CC BY 4.0) — Katrina's glasses (belonging)
- "Teddy Bear" by sergeilihandristov: https://sketchfab.com/3d-models/teddy-bear-fe59581a0be24cb1802c443a2a9bc5ae (CC BY 4.0) — Mara's teddy bear (belonging)
- "The Umbrella Corporation's Umbrella" by Erai: https://sketchfab.com/3d-models/the-umbrella-corporations-umbrella-c1b7cf8f40a94277a5b740bdce328fe6 (CC BY 4.0) — Erika's umbrella (belonging)
- "Wall Clock" by Mehdi Shahsavan: https://sketchfab.com/3d-models/wall-clock-6d7473893d47458495f810f0d2a89945 (CC BY 4.0) — Chapter 1 lobby, Chapter 4 hallway
- "Wheelchair 3.0" by neverfollow81: https://sketchfab.com/3d-models/wheelchair-30-6af0d66a358f45469537e236348dd3d8 (CC BY 4.0) — Chapter 4 hallway
- "Worn leather handbag" by Lassi Kaukonen: https://sketchfab.com/3d-models/worn-leather-handbag-0732e0dfee7747e49cef95f3d179d880 (CC BY 4.0) — Ms. Reyes's handbag (belonging)

The non-commercial models ("Acoustic Guitar", "Horror Game Prop Collection 1", "Key") are fine for a free game; replace them before selling the game.

The Sketchfab Standard models ("Abandoned classroom", "Philippines Flag", "Desk Fan | Rigged | Free", "Realistic Blackboard") may be used inside the game but must not be redistributed as files on their own; keep them out of a public repository if that matters to you.

The models are re-posed, tinted and rendered translucent at runtime. The two CC BY-SA models (and any changes to them) stay under CC BY-SA 4.0.

Made by **Gin Semanero**.

Built with React 18, TypeScript, Vite, Three.js, React Three Fiber, Drei, @react-three/postprocessing, Zustand, Howler.js and React Router. Fonts: Special Elite, IBM Plex Mono and Cormorant Garamond (Google Fonts, OFL). Everything except the Sketchfab models is generated procedurally by the game.

This is a work of fiction. Bubog National High School does not exist.
