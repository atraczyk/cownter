# cownter

Overwatch counter explorer. Suggests team compositions from counters, synergy, and how a map point plays (dive / poke / brawl).

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`. Pushes to `main` publish [atraczyk.github.io/cownter](https://atraczyk.github.io/cownter/).

## Commands

```bash
npm test
npm run test:e2e
npm run build
npm run validate-data
npm run audit-data
npm run grab-icons
npm run grab-maps
npm run sync-roster
```

## CLI

```bash
npm run ow -- --list-heroes
npm run ow -- --heroes "reinhardt,genji,tracer,mercy,lucio"
npm run ow -- validate-data
npm run ow -- audit-data
npm run ow -- scaffold-missing
```

## Layout

```
client/            Vite UI
packages/core/     engine, CLI, and data sheets
resources/images/  portraits, map thumbnails, favicon
```

Hero and map sheets live in `packages/core/data/`. After a season patch, `npm run sync-roster` and `npm run audit-data` show what the roster changed. Drafting notes are in `.agents/skills/ow-data-sheets/SKILL.md`.
