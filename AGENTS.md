# AGENTS.md

Vanilla JS/HTML/CSS Pac-Man clone used as the training project for Spec-Driven Development. No framework, no build tools, no tests, no `package.json`. There is no lint/typecheck/test command — the only verification is opening `src/index.html` in a browser.

Repo language is Spanish: README, code comments, and specs are in Spanish. Keep new content in Spanish; reply to the user in whatever language they use.

## Architecture: globals, not modules

- JS files are plain `<script>` tags in `src/index.html`, loaded in strict order. Files communicate via `window` globals — there are NO imports/exports. If you add a JS file you MUST add a matching `<script>` tag in the correct order.
- Load order: `maze.js` → `game.js` → `render.js` → `main.js`.
- Cross-file contracts:
  - `maze.js` owns maze + constants (`MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`) and publishes them on `window`.
  - `game.js` consumes those globals and exposes `window.createGame`, `window.update`, `window.DIRS`. It copies `MAZE` into `game.grid` per game — never mutate `MAZE`.
  - `render.js` draws from `game.grid` (not `MAZE`) and depends on the `DIRS` global defined in `game.js`.
  - `main.js` is the loop/input/overlay driver; it calls the global `createGame`/`update`/`draw`.
- Style quirk: parentheses and brackets get inner spaces (`f( x )`, `[ 0 ].length`), code uses semicolons.

## Maze format (`src/js/maze.js`)

Grid is 31 strings of 28 chars (28×31 cells), symmetric about the vertical axis. `#` = wall (1), `.` = dot (2), ` ` = walkable (0), `-` = pen door (3). Row `TUNNEL_ROW` (14) wraps horizontally at the edges.

## Spec-Driven Development workflow

This repo exists to practice spec-driven development via two repo skills in `.agents/skills/`: `/spec` writes specs, `/spec-impl` implements them.

- Specs live in `specs/NN-slug.md`, numbered sequentially from `01-` (zero-padded). The `specs/` folder does not exist yet — `/spec` creates it, plus `specs/.spec-config.yml` (`AutoCreateBranch`, default `true`).
- `/spec` never writes code and never auto-implements; user must approve the spec first (`Draft` → `Approved`/`Aprobado`).
- `/spec-impl` only proceeds when the spec's state clearly means "Approved"; it creates/switches to branch `spec-NN-slug`, then implements the plan step by step, pausing for diff review after each step.
- `/spec-impl` NEVER commits — committing is always the user's explicit call.