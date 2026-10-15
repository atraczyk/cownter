# AGENTS.md

Overwatch counter picker: suggests counter teams and scores both teams by counters, synergy and map fit (dive / poke / brawl). Static TypeScript app, no backend.

## Layout

- `packages/core/` — `@ow/core`: engine (`src/`), data sheets (`data/`), CLI (`src/cli.ts`, run via `bin/ow.js` + tsx), maintenance scripts (`scripts/*.mjs`)
- `client/` — Vite UI that runs the engine in the browser (`src/api.ts` wraps an in-memory `MatchSession`), Playwright e2e in `e2e/`
- `resources/images/` — hero portraits (`icons/icon-<id>.png`), map thumbnails (`maps/<id>.jpg`), role icons, and the title-triangle favicon (`favicon.svg`), served at `/resources/`
- `.agents/skills/` — task skills; read the matching `SKILL.md` before starting that task:
  - `ow-data-sheets` — heroes, maps, roles, weights, roster sync
  - `scoring-engine` — counters, synergy, map fit, suggestions
  - `ui-check` — verifying client changes in the browser and e2e
  - `git-history` — commits, rewording, tags, pushing

## Commands

```bash
npm install
npm start            # dev server on http://127.0.0.1:3000
npm test             # vitest: core + client
npm run test:e2e     # playwright; starts the dev server, or reuses whatever already listens on :3000
npm run build        # tsc + vite build
npm run validate-data
npm run audit-data
npm run sync-roster
```

Pushes to `main` publish `client/dist` to GitHub Pages (`.github/workflows/pages.yml`). The build sets Vite's base from the Pages path, so asset URLs stay under the project site.

On Windows PowerShell, `npm run <script> -- --flag` can drop the flag. Call the script directly instead, e.g. `node packages/core/scripts/grab-icons.mjs --force`, `node packages/core/scripts/grab-maps.mjs --force`, or `npx playwright test -g "name"` from `client/`.

## Code

- `packages/core/src/index.ts` must stay browser-safe. Node-only modules (`audit.ts`, `scaffold.ts`, anything using `node:fs`) are imported directly by `cli.ts`, never re-exported from the barrel.
- Score changes belong in core (`scores.ts`, `suggest.ts`, `fit.ts`, `session.ts`) with a test in `engine.test.ts`; the client only renders.
- UI changes: check wide (≥1240px), two-column (≤1240px) and phone (≤760px) layouts.
- Test fixtures must be legal role-queue teams (1 tank, 2 damage, 2 support); the UI's role-filtered dropdowns reject anything else.

## Data

Hero/map data lives in `packages/core/data/`. Follow `.agents/skills/ow-data-sheets/SKILL.md` for any change there. Never invent heroes, maps or roles; check the live roster with `npm run sync-roster`.

## Commits

- Subject starts with a lowercase letter, imperative, no trailing period: `fix stale team scores after clearing a team`
- Keep the subject short; keep proper nouns as written (`port the engine to TypeScript`)
- One logical change per commit; run `npm test` (and `npm run test:e2e` for UI changes) before committing
- Never commit `client/dist/`, `client/test-results/` or `node_modules/`
