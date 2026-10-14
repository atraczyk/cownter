---
name: ow-data-sheets
description: Build, update and version the Overwatch data sheets that drive counter picks and map comp fit (hero roster, archetypes, maps, points and game modes). Use when adding a new hero or map, rebalancing dive/poke/brawl weights after a patch or season, reviewing LLM-drafted data, auditing gaps after an Overwatch roster change, or editing files in packages/core/data.
---

# Overwatch data sheets

The game rebranded from **Overwatch 2** to **Overwatch** in February 2026. Prefer “Overwatch” / “OW” in copy. Repo paths may still say `ow2` for history.

## Sheets

| File | What it holds | Versioned |
|------|---------------|-----------|
| `packages/core/data/roster.json` | Canonical expected heroes + maps (audit source of truth) | yes |
| `packages/core/data/archetypes.json` | Per-hero `dive` / `poke` / `brawl` weights | yes |
| `packages/core/data/maps.json` | Modes, maps, points, and the comp each point favors | yes |
| `packages/core/data/hero_data.json` | Role, `strong_against`, `synergizes_with` | no, keyed by hero id |

Hero ids are lowercase with no spaces (`soldier76`, `wreckingball`, `jetpackcat`, `dmon`). Icons live at `resources/images/icons/icon-<id>.png`.

Clash maps (`hanaoka`, `throne_of_anubis`) stay in the roster with `"pool": "stadium"` — they are not in core QP/Competitive.

## Commands

```bash
npm run validate-data   # schema / weight / parity checks
npm run audit-data      # gaps vs roster.json + missing icons + empty counters
npm run scaffold-missing  # stub any roster heroes/maps not yet in the sheets
npm test
npm run test:e2e
```

`scaffold-missing` creates **placeholders only**: empty counter lists, near-neutral archetype weights, and neutral map point comps. Always follow with a real draft pass and keep `status: llm-draft` until reviewed.

## Workflow after a patch / season

```
- [ ] Update roster.json (new/removed heroes and maps, bump its version)
- [ ] npm run audit-data — note missing / extra / empty counters
- [ ] npm run scaffold-missing — only if you want stubs first
- [ ] Draft hero_data counters/synergies and archetype weights
- [ ] Draft map point comps (attack/defense on sided modes)
- [ ] Add icons under resources/images/icons/
- [ ] Bump sheet versions, set updated + status, CHANGELOG entries
- [ ] npm run validate-data && npm test && npm run audit-data
```

### Version bumps

- **patch**: weight tweaks, display-name fixes
- **minor**: new heroes, maps, points or modes
- **major**: schema change that needs code changes in `packages/core/src/`

### Status

- `llm-draft` — LLM or scaffold produced it; needs player review
- `reviewed` — someone signed off

When an LLM edits a `reviewed` sheet, set it back to `llm-draft` unless the user confirms.

## Drafting values with an LLM

Weights describe how a hero or point plays, not patch-tier strength.

- **Hero weights**: mobility/burst onto isolates → dive; range/sightlines → poke; close-range sustain/grouping → brawl. Split when a hero flexes (Cassidy 0.5/0.5 poke/brawl).
- **Counters**: only list clear soft/hard answers in `strong_against` by role bucket (`tanks` / `damage` / `support`). Prefer sparse accurate lists over dumping the roster.
- **Point weights**: long sightlines → poke; flanks/verticality → dive; chokes/corridors → brawl. On sided maps, first-point defense often leans poke; final-stretch attack often leans brawl.
- Avoid 0.34/0.33/0.33 — `fit_bonus` ignores near-neutral mixes.
- Do not invent heroes or maps. If unsure, run `npm run audit-data` and ask the user.

## How map fit is used

`fit_bonus = 3.0 × (Σ hero[a] × point[a] − 1/3)`. Adjust `FIT_WEIGHT` in `packages/core/src/fit.ts` if maps should matter more or less.

## Known gap pattern (as of roster 1.0.0)

Typical missing pieces after the 2026 expansion:

- Heroes such as Freja, Vendetta, Wuyang, Anran, Domina, Emre, Mizuki, Jetpack Cat, Shion, Sierra, Doctrine, D.Mon
- Maps such as Neon Junction (Hybrid) and Grímsvötn (Escort)
- Icons for every new id

Use `audit-data` rather than this list — the roster file is authoritative.
