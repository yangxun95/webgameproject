# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

All project rules, game specification, and the teaching workflow live in AGENTS.md (shared with other AI tools). Read it first — its communication rules (繁體中文、小步前進、四段式教學) and code conventions (中英並列註解、數值集中在 `js/config.js`) apply to every task:

@AGENTS.md

## Running and verifying

There is no build, lint, or test tooling (by design — no npm). The only command is a static server, because ES Modules don't load over `file://`:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. To check a change yourself, drive the page with the pre-installed Playwright/Chromium (load the page, press Enter to leave the menu, send WASD / mouse input, screenshot, and watch the console for module/import errors). Mobile controls only appear in touch mode, so emulate a touch device in landscape to verify them.

Deployment is GitHub Pages from `main` (`.nojekyll` keeps Pages from running Jekyll). Live URL: https://yangxun95.github.io/webgameproject/

## Runtime architecture (spans several files)

- **`main.js`** owns the canvas: letterbox resizing to the 896×416 logical size, drawing the floor, and the `requestAnimationFrame` loop. It computes `dt` in seconds, caps it with `MAX_DELTA_TIME`, and skips `game.update(dt)` while the portrait rotate hint is showing (draw still runs).
- **`game.js` `Game`** is the central orchestrator and holds all world state: `player`, `enemies`, `bullets`, items, effects, `map`, `stage`. A string state machine (`'menu' | 'playing' | 'dead'`) dispatches to `updateMenu/updatePlaying/updateDead`. The menu reuses `prepareRun()` to build a live stage as a background.
- **Cross-entity interaction lives in `Game`, not in the entity classes**: bullet-vs-character/tile hit checks, explosions, damage numbers, screen shake, aim assist, ammo/item drops, stage clear → exit → `loadStage()`. Entity files (`player.js`, `enemy.js`, `bullet.js`, `items.js`) only update and draw themselves; `Character.shootBullet()` pushes into the `bullets` array that `Game` passes in.
- **Input**: `updateInput(player)` is called once per frame at the top of `Game.update`, filling the shared `input` object; gameplay code reads only that object. `input.js` imports `getWeaponSlotRect` from `ui.js` so touch taps on the HUD weapon bar hit-test the same rectangles the HUD draws — keep them in sync when changing HUD layout.
- **Enemy scaling**: `createEnemyStats` / `createBossStats` in `enemy.js` combine stage-based growth from config with a cap of `player.getBestDps()` × `*_HP_CAP_SECONDS` (DPS math in `getWeaponDps`, `weapons.js`); `Game.spawnEnemies()` wires them together, per the anti-"bullet sponge" rule in AGENTS.md.
- **Images**: `assets.js` loads `IMAGE_FILES` at startup; every draw path calls `getImage(name)` and falls back to canvas shapes on `null` (see `Character.drawSprite` / `drawShape`). Adding a new visual means updating `IMAGE_FILES` and `ART_GUIDE.md` too.
- `localStorage` best-stage record is read/written only in `game.js` (`loadBestStage` / `saveBestStage`).
