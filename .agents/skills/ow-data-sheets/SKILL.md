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
| `packages/core/data/hero_data.json` | Role, `strong_against`, `synergizes_with` | no, keyed by hero id |

Hero ids are lowercase with no spaces (`soldier76`, `wreckingball`, `jetpackcat`, `dmon`). Icons live at `resources/images/icons/icon-<id>.png`. Map thumbnails live at `resources/images/maps/<id>.jpg`, saved from the OverFast `screenshot` field (`grimsvotn` is requested as `watchpoint-grimsvotn`). A listed screenshot URL can still 404; `grab-maps` fails that id and `audit-data` keeps the warning. Do not substitute another image.

`strong_against` / `synergizes_with` lists are keyed `tanks`, `damage`, `supports` (plural — the engine derives the key as `role + "s"`). A hero must sit in the list matching its current role; `validate-data` fails otherwise.

**Do not trust roster.json or your own memory for roles.** Heroes do change role (Sombra moved from damage to support). `sync-roster` checks against the live game.

Clash maps (`hanaoka`, `throne_of_anubis`) stay in the roster with `"pool": "stadium"` — they are not in core QP/Competitive.

## Commands

```bash
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

`scaffold-missing` creates **placeholders only**: empty counter lists, near-neutral archetype weights, and neutral map point comps. After adding heroes run `npm run grab-icons`; after adding maps run `npm run grab-maps`. Then draft counters/comps and keep `status: llm-draft` until reviewed.

## Workflow after a patch / season

```
- [ ] npm run sync-roster — then --write to apply new heroes / renames / role changes
- [ ] Update roster.json by hand for maps and removed heroes (sync-roster only reports those)
- [ ] npm run audit-data — note missing / extra / empty counters
- [ ] npm run scaffold-missing — only if you want stubs first
- [ ] Draft hero_data counters/synergies and archetype weights
- [ ] Draft map point comps (attack/defense on sided modes)
- [ ] Add icons under resources/images/icons/ (`npm run grab-icons`)
- [ ] Add map thumbnails under resources/images/maps/ (`npm run grab-maps`)
- [ ] Bump sheet versions, set updated + status, CHANGELOG entries
- [ ] npm run validate-data && npm test && npm run audit-data
```

### Version bumps

- **patch**: weight tweaks, display-name fixes
- **minor**: new heroes, maps, points or modes
- **major**: schema change that needs code changes in `packages/core/src/`

### Status

- `llm-draft` — an agent or scaffold produced it; needs player review
- `reviewed` — someone signed off

When an agent edits a `reviewed` sheet, set it back to `llm-draft` unless the user confirms.

### Role changes

`sync-roster --write` updates the hero's role in roster.json and hero_data.json and moves the id between the `tanks` / `damage` / `supports` lists of every other hero. It does not rethink the matchups: afterwards review the hero's own counters, synergies and archetype weights for the new role, and check test fixtures that assume the old role.

## Drafting values

Weights describe how a hero or point plays, not patch-tier strength.

- **Hero weights**: mobility/burst onto isolates → dive; range/sightlines → poke; close-range sustain/grouping → brawl. Split when a hero flexes (Cassidy 0.5/0.5 poke/brawl).
- **Counters**: only list clear soft/hard answers in `strong_against` by role bucket (`tanks` / `damage` / `supports`). Prefer sparse accurate lists over dumping the roster.
- **Point weights**: long sightlines → poke; flanks/verticality → dive; chokes/corridors → brawl. On sided maps, first-point defense often leans poke; final-stretch attack often leans brawl.
- Avoid 0.34/0.33/0.33 — `fit_bonus` ignores near-neutral mixes.
- Do not invent heroes or maps. If unsure, run `npm run audit-data` and ask the user.

## How map fit is used

`fit_bonus = 3.0 × (Σ hero[a] × point[a] − 1/3)`. Adjust `FIT_WEIGHT` in `packages/core/src/fit.ts` if maps should matter more or less.

Every score adds it: suggested picks, and each hero row on Your team / Enemy team (counters + 0.5 per synergy + fit, rounded to 0.1). On sided modes the enemy is scored with the opposite side's point preference.

## Open data work (as of roster 1.1.0)

- 12 scaffolded heroes have empty counter/synergy lists and near-neutral weights: Anran, D.Mon, Doctrine, Domina, Emre, Freja, Jetpack Cat, Mizuki, Shion, Sierra, Vendetta, Wuyang
- Neon Junction and Grímsvötn have neutral placeholder point comps
- Sombra's own counters and weights still reflect her damage kit

Run `npm run sync-roster` and `npm run audit-data` rather than trusting this list.
