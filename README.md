# Overwatch Counter Picker

Analyze Overwatch counter relationships and suggest team compositions, weighted by map and point (dive / poke / brawl).

Static TypeScript app: `npm start` is enough. No Python server.

> Formerly **Overwatch 2** — Blizzard dropped the “2” in February 2026. Tags: `v1` (Python), `v2` (this TypeScript stack).

## Features

- Counter suggestions with synergy scoring
- Map / mode / point context that adjusts picks by comp type
- Comp-read triangle (map vs your team vs enemy)
- Node CLI for the same engine
- Roster audit / scaffold for keeping sheets current

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:3000`.

```bash
npm test
npm run test:e2e
npm run build
npm run validate-data
npm run audit-data
npm run grab-icons
```

## CLI

```bash
npm run ow2 -- --list-heroes
npm run ow2 -- --heroes "reinhardt,genji,tracer,mercy,lucio"
npm run ow2 -- validate-data
npm run ow2 -- audit-data
npm run ow2 -- scaffold-missing
```

## Project layout

```
ow2-counters/
├── client/                 # Vite UI + Playwright e2e
├── packages/core/          # Shared engine + CLI (@ow2/core)
│   └── data/               # roster, hero_data, archetypes, maps
├── resources/              # Hero and role icons
└── .cursor/skills/ow-data-sheets/
```

## Data sheets

Versioned JSON in `packages/core/data/`:

- `roster.json` — expected Overwatch heroes/maps (audit source of truth)
- `archetypes.json` — dive / poke / brawl weights
- `maps.json` — modes, maps, points, preferred comps
- `hero_data.json` — roles, counters, synergies
- `CHANGELOG.md` — sheet history

After a season patch: update `roster.json`, run `npm run audit-data`, optionally `npm run scaffold-missing`, then draft counters and comps. See `.cursor/skills/ow-data-sheets/SKILL.md`.
