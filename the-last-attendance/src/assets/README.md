# Assets

Everything in this game is generated procedurally at runtime, so these folders start empty:

- `audio/`: optional recorded replacements for the synthesized sounds (map them in `systems/AudioSystem/AudioSystem.ts` → `ASSET_OVERRIDES`).
- `textures/`: optional authored textures (load them in `components/Environment/materials.ts`).
- `models/`: optional GLB models replacing `Humanoid` / `ItemModel` / level furniture.
- `fonts/`: self-hosted copies of the Google Fonts used in `index.html` (for offline builds).

Use only properly licensed or original assets.
