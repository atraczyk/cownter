# cownter

Overwatch counter explorer. Suggests team compositions from counters, synergy, and how a map point plays (dive / poke / brawl).

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`. Pushes to `main` publish to GitHub Pages.

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
npm run sync-data       # check live OverFast roster and live Overpicker matchups (no writes)
npm run sync-matchups   # check live matchup data only
node packages/core/scripts/sync-matchups.mjs --write
npm run test:data-sync  # offline snapshot parity and importer tests
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

Hero and map sheets live in `packages/core/data/`. OverFast supplies the roster and roles; [Overpicker](https://www.overpicker.com/counters) supplies counters and [synergies](https://www.overpicker.com/synergies) for the whole roster. `npm run sync-data` checks both live sources without writing. If the roster changed, apply `node packages/core/scripts/sync-roster.mjs --write`, scaffold missing entries, then run `node packages/core/scripts/sync-matchups.mjs --write` and review the diff. Run `npm run validate-data`, `npm test`, `npm run audit-data`, and `npm run test:e2e` after an update.

The matchup importer keeps every positive directed rating, with no hero-specific cutoff or inferred reverse links. `matchup_sources.json` retains the complete numeric source matrices, URLs, dates, and conversion rules. The app uses binary counter/synergy links, so it does not reproduce Overpicker's strength weighting or negative matchup penalties. Source synergies can be asymmetric; the existing engine reads the earlier team slot's link. Overpicker ratings are community analysis and remain draft pending player review. Archetype and map-fit weights are maintained separately; this command does not sync those sheets.

`npm test` checks the imported sheets against the saved source snapshot offline. Live source drift is checked by `npm run sync-data`; unknown heroes, missing matrix cells, changed markup, or unexpected ratings fail instead of silently producing empty lists. Data workflow details are in `.agents/skills/ow-data-sheets/SKILL.md`.
