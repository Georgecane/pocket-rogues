# Pocket Rogues

An isometric pixel-art roguelike billiards game for the browser.

> **Status:** early prototype. The current build is a technical playground, not a finished game. Physics, pocket detection, rules, and rendering are expected to evolve.

## Stack

- [Phaser 3](https://phaser.io/) for browser game rendering and input
- TypeScript for game logic
- Vite for local development and production builds
- Custom 2D table-space physics, rendered through an isometric projection

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Checks and production build

```bash
npm run typecheck
npm run build
npm run preview
```

The production site is generated in `dist/` and can be hosted on GitHub Pages or another static host.

## Controls in the prototype

- Move the mouse to aim.
- Hold the primary mouse button to charge a shot; release to shoot.
- Press `R` to reset the rack.
- Press `Space` to shoot at the current aim direction when the table is still.

## Project direction

1. Stabilize and test the table-space physics.
2. Separate table rendering from simulation and add pocket detection.
3. Implement a complete single-player challenge loop.
4. Add seeded stage generation and upgrade selection.
5. Add local two-player mode.
6. Consider online multiplayer after deterministic rules and turn commands are defined.

## License

This project is licensed under the GNU General Public License v3.0 only. See [LICENSE](./LICENSE).

## Contributions

Issues and pull requests are welcome. Keep physics independent from Phaser rendering where practical, and add tests for changes to collision or stage-generation rules.
