# Pocket Rogues

An isometric pixel-art roguelike billiards game for the browser, built with Phaser 3, TypeScript, and Vite.

## Gameplay

Clear an eight-stage run by pocketing every target ball before your shots run out. Each stage changes the target layout and raises the target count. After each successful stage, choose one of three relic upgrades and carry it forward. A scratched cue ball is returned to the table; it does not consume an extra shot beyond the shot that caused the scratch.

### Current mechanics

- Isometric table projection with six working pockets.
- Table-space physics: ball collisions, rail rebounds, friction, stop thresholds, and pocket detection.
- Aim with the mouse and hold/release to charge shot power; Space shoots at the current aim.
- Eight deterministic stage layouts with rising target counts and shot limits.
- Stage-clear upgrade selection, three choices at a time, and persistent run upgrades.
- Six relics: Heavy Break (shot power), Rail Master (rebound strength), Silk Cloth (lower friction), Wide Mouths (larger pockets), Ghost Line (longer aim guide), and Extra Credit (more shots per stage).
- Run failure and retry, stage retry with R, and full-run restart after victory or failure.
- Keyboard upgrade selection: 1, 2, or 3.

## Run locally

Requirements: Node.js 20.19+ or 22.12+, and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Typecheck and production build

```bash
npm run typecheck
npm run build
npm run preview
```

The production site is generated in `dist/` and can be hosted on GitHub Pages or another static host.

## Controls

- Move the mouse to aim.
- Hold the primary mouse button to charge; release to shoot.
- Press Space to shoot at the current aim.
- Press R to retry the current stage.
- After clearing a stage, click a relic card or press 1, 2, or 3.
- After a run ends, click the game or press Enter to start over.

## Architecture

- `src/game/physics.ts`: deterministic table-space simulation and pocket detection.
- `src/game/stages.ts`: stage definitions and seeded stage layouts.
- `src/game/upgrades.ts`: relic definitions and deterministic upgrade offers.
- `src/game/GameScene.ts`: input, run progression, HUD, rendering, and upgrade selection.

## License

GPL-3.0-only. See [LICENSE](./LICENSE).
