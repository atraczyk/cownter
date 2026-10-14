# Overwatch 2 Counter Picker

Analyze Overwatch 2 counter relationships and suggest team compositions, weighted by map and point (dive / poke / brawl).

This is a **static TypeScript app**: `npm start` is enough. There is no Python or Flask server.

## Features

- Counter suggestions with synergy scoring
- Map / mode / point context that adjusts picks by comp type
- Comp-read triangle (map vs your team vs enemy)
- Node CLI for the same engine

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:3000`. Icons are served from `resources/`.

```bash
npm test
npm run build
npm run validate-data
```

## CLI

```bash
npm run ow2 -- --list-heroes
npm run ow2 -- --heroes "reinhardt,genji,tracer,mercy,lucio"
npm run ow2 -- validate-data
```

Or, after `npm install`, `npx ow2 --list-heroes`.

## Project layout

```
ow2-counters/
├── client/                 # Vite UI
├── packages/core/          # Shared engine + CLI (@ow2/core)
│   ├── data/               # hero_data + versioned map/archetype sheets
│   └── src/
├── resources/              # Hero and role icons
└── package.json            # npm workspaces
```

## Data sheets

Versioned JSON in `packages/core/data/`:

- `archetypes.json` — dive / poke / brawl weights per hero
- `maps.json` — modes, maps, points, and preferred comps
- `hero_data.json` — roles, counters, synergies (unversioned)
- `CHANGELOG.md` — sheet history

Validate with `npm run validate-data`. The Cursor skill `.cursor/skills/ow2-data-sheets/SKILL.md` describes drafting and versioning with an LLM.

## History

- **v1** — Python Flask app with the original vanilla UI (`origin/master`)
- **v2** — TypeScript UI plus map/comp fit (still used a Flask API)
- **main (current)** — engine and CLI in TypeScript; no server required
