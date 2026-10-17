---
name: ow-data-sheets
description: Build, update and version the Overwatch data sheets that drive counter picks and map comp fit (hero roster, archetypes, maps, points and game modes). Use when adding a new hero or map, handling a hero role change, rebalancing dive/poke/brawl weights after a patch or season, reviewing drafted data, auditing gaps after an Overwatch roster change, or editing files in packages/core/data.
---

# Overwatch data sheets

Repo-wide conventions (commands, commit messages, code layout) are in the root `AGENTS.md`.

Prefer “Overwatch” / “OW” in copy.

## Sheets

| File | What it holds | Versioned |
|------|---------------|-----------|
| `packages/core/data/roster.json` | Expected heroes + maps (audit source of truth, synced from the live game) | yes |
| `packages/core/data/archetypes.json` | Per-hero `dive` / `poke` / `brawl` weights | yes |
| `packages/core/data/maps.json` | Modes, maps, points, and the comp each point favors | yes |
| `packages/core/data/hero_data.json` | OverFast roles and generated Overpicker counter/synergy links | no, keyed by hero id |
| `packages/core/data/matchup_sources.json` | Complete numeric Overpicker matrices, URLs, dates and conversion rules | yes |

Hero ids are lowercase with no spaces (`soldier76`, `wreckingball`, `jetpackcat`, `dmon`). Icons live at `resources/images/icons/icon-<id>.png`. Map thumbnails live at `resources/images/maps/<id>.jpg`, saved from the OverFast `screenshot` field (`grimsvotn` is requested as `watchpoint-grimsvotn`). A listed screenshot URL can still 404; `grab-maps` fails that id and `audit-data` keeps the warning. Do not substitute another image.

`strong_against` / `synergizes_with` lists are keyed `tanks`, `damage`, `supports` (plural — the engine derives the key as `role + "s"`). A hero must sit in the list matching its current role; `validate-data` fails otherwise.

**Do not trust roster.json or your own memory for roles.** Heroes do change role (Sombra moved from damage to support). `sync-roster` checks against the live game.

Clash maps (`hanaoka`, `throne_of_anubis`) stay in the roster with `"pool": "stadium"` — they are not in core QP/Competitive.

## Commands

```bash
npm run sync-data       # check live roster + Overpicker matchups without writing
npm run sync-matchups   # compare live Overpicker matrices with sheets and snapshot
node packages/core/scripts/sync-matchups.mjs --write   # apply full validated matchup import
npm run test:data-sync  # importer tests + offline snapshot parity
npm run sync-roster     # diff roster.json vs the live hero list (OverFast API); exits 1 if stale
node packages/core/scripts/sync-roster.mjs --write   # apply new heroes, renames, role changes
npm run validate-data   # schema / weight / parity / role-list checks
npm run audit-data      # gaps vs roster.json + missing icons + empty counters
npm run scaffold-missing  # stub any roster heroes/maps not yet in the sheets
npm run grab-icons      # download portraits into resources/images/icons/
node packages/core/scripts/grab-icons.mjs --force   # refresh every icon
npm run grab-maps       # download map thumbnails into resources/images/maps/
node packages/core/scripts/grab-maps.mjs --force    # refresh every thumbnail
npm test
npm run test:e2e
```

`scaffold-missing` creates **placeholders only**: empty counter lists, near-neutral archetype weights, and neutral map point comps. After adding heroes run `npm run grab-icons`; after adding maps run `npm run grab-maps`. Then sync Overpicker matchups and draft archetype/map weights; keep `status: llm-draft` until reviewed.

## Workflow after a patch / season

```
- [ ] npm run sync-roster — then --write to apply new heroes / renames / role changes
- [ ] Update roster.json by hand for maps and removed heroes (sync-roster only reports those)
- [ ] npm run audit-data — note missing / extra / empty counters
- [ ] npm run scaffold-missing — only if you want stubs first
- [ ] Run node packages/core/scripts/sync-matchups.mjs --write for the full roster; review the sheet and source snapshot diff
- [ ] Draft archetype weights from verified kits/play styles (not supplied by the matchup sync)
- [ ] Draft map point comps (attack/defense on sided modes)
- [ ] Add icons under resources/images/icons/ (`npm run grab-icons`)
- [ ] Add map thumbnails under resources/images/maps/ (`npm run grab-maps`)
- [ ] Record source, date, review status and rationale in the data changelog
- [ ] npm run validate-data && npm test && npm run audit-data
```

### Status

- `llm-draft` — an agent or scaffold produced it; needs player review
- `reviewed` — someone signed off

When an agent edits a `reviewed` sheet, set it back to `llm-draft` unless the user confirms.

### Role changes

`sync-roster --write` updates the hero's role in roster.json and hero_data.json and moves the id between the `tanks` / `damage` / `supports` lists of every other hero. It does not rethink the matchups: afterwards review the hero's own counters, synergies and archetype weights for the new role, and check test fixtures that assume the old role.

## Drafting values

Weights describe how a hero or point plays, not patch-tier strength.

- **Hero weights**: mobility/burst onto isolates → dive; range/sightlines → poke; close-range sustain/grouping → brawl. Split when a hero flexes (Cassidy 0.5/0.5 poke/brawl).
- **Counters/synergies**: generated from Overpicker using the policy below. Change the importer and its tests if the conversion policy needs changing; do not hand-edit generated lists.
- **Point weights**: long sightlines → poke; flanks/verticality → dive; chokes/corridors → brawl. On sided maps, first-point defense often leans poke; final-stretch attack often leans brawl.
- Avoid 0.34/0.33/0.33 — `fit_bonus` ignores near-neutral mixes.
- Do not invent heroes or maps. If unsure, run `npm run audit-data` and ask the user.

## How map fit is used

`fit_bonus = 3.0 × (Σ hero[a] × point[a] − 1/3)`. Adjust `FIT_WEIGHT` in `packages/core/src/fit.ts` if maps should matter more or less.

Every score adds it: suggested picks, and each hero row on Your team / Enemy team (counters + 0.5 per synergy + fit, rounded to 0.1). On sided modes the enemy is scored with the opposite side's point preference.

## Overpicker matchup sync

Use `packages/core/scripts/sync-matchups.mjs` for counters and synergies. Default/`--check` checks live data without writes; `--write` replaces the whole roster's matchup lists and saves numeric matrices in `matchup_sources.json`; `--offline` verifies sheets against that saved snapshot. `npm test` includes the offline check and importer tests. Use `npm run sync-data` to detect live roster and matchup drift.

- Import every positive rating (10/20), not a top-N sample. Counter rows are attackers and columns are targets. Keep synergy direction as published, even when asymmetric; do not infer reverse links. Exclude self links, retain every other positive link, and use current roster roles for buckets.
- Preserve complete numeric ratings in the source snapshot. Binary engine scoring does not distinguish 10 from 20 or apply negative matchup penalties. Do not claim score/ranking parity with Overpicker.
- OverFast remains the roster/role authority. Unknown/missing heroes, incomplete matrix rows, unexpected scores, or changed page markup must fail before sheets are written. No silent neutral fallbacks or legacy matchup overrides.
- Ratings are community analysis, not official matchup statistics; imported data stays `llm-draft` pending player review. URLs, source update dates and conversion limits belong in the snapshot.
- After syncing, run `npm run validate-data`, `npm test`, `npm run audit-data`, and `npm run test:e2e`. If known picks change, derive the new expectations from the engine and update core/e2e fixtures together.
- The snapshot check is offline and does not prove freshness. A live `npm run sync-data` check is needed after roster or source updates. A successful schema validation or audit alone does not prove matchup parity.

## Open data work

- The 12 formerly scaffolded heroes still have near-neutral archetype weights; matchup sync does not update these.
- Neon Junction and Grímsvötn have neutral placeholder point comps.
- Sombra's archetype weights still need review after her support rework; her matchup lists now follow Overpicker.

Run `npm run sync-data` and `npm run audit-data` rather than trusting a static roster list.

## Keep updates simple

The UI shows one app version from client/package.json, followed by the short Git commit hash, with no version popup. Bump that version and its package-lock.json workspace entry when shipping an update. Record data sources, dates and the reason for changes in the existing data changelog, then run validation and tests. Do not add separate release governance, version enforcement scripts or an ADR for routine data updates.
