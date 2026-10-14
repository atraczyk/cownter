---
name: ow2-data-sheets
description: Build, update and version the Overwatch 2 data sheets that drive counter picks and map comp fit (hero archetypes, maps, points and game modes). Use when adding a new hero or map, rebalancing dive/poke/brawl weights after a patch or season, reviewing LLM-drafted data, or editing files in src/core/data or src/core/hero_data.json.
---

# OW2 data sheets

## Sheets

| File | What it holds | Versioned |
|------|---------------|-----------|
| `src/core/data/archetypes.json` | Per-hero `dive` / `poke` / `brawl` weights | yes |
| `src/core/data/maps.json` | Modes, maps, points, and the comp each point favors | yes |
| `src/core/hero_data.json` | Role, `strong_against`, `synergizes_with` | no, keyed directly by hero |

Every hero key in `hero_data.json` must also exist in `archetypes.json`, using the same lowercase, no-space id (`soldier76`, `wreckingball`). Icons live at `resources/images/icons/icon-<id>.png`.

## Schema rules

- Each weight triple holds exactly `dive`, `poke` and `brawl`, each between 0 and 1, and sums to 1 (±0.01).
- A mode with `"sided": true` (Escort, Hybrid) needs `comp.attack` and `comp.defense` on every point. Unsided modes use a single `comp`.
- Map and point ids are lowercase `snake_case` and unique (point ids only need to be unique within their map).
- The header fields are `sheet`, `version` (semver), `updated` (YYYY-MM-DD), `status` and `notes`.

## Workflow

Copy this checklist:

```
- [ ] Decide the change and its version bump
- [ ] Edit the sheet(s)
- [ ] Bump version, set updated, set status
- [ ] Add a CHANGELOG entry
- [ ] python tools/validate_data.py passes
- [ ] python tests/run_all.py passes
```

1. **Version bump** (per sheet, in `src/core/data/CHANGELOG.md` terms):
   - patch: weight tweaks, display-name fixes
   - minor: new hero, map, point or mode
   - major: schema change that needs code changes in `src/core/comp_fit.py` or the client
2. **Status**: use `llm-draft` for anything an LLM produced without a player checking it, and `reviewed` once someone has signed off. When an LLM edits a sheet that was `reviewed`, set it back to `llm-draft` unless the user confirms the values.
3. **Validate** with `python tools/validate_data.py`. Fix every reported problem before moving on, then run the tests.

## Drafting values with an LLM

Weights describe how a hero or point plays, not how strong it is in the current meta.

- **Hero weights**: ask how the hero wins fights. Mobility and burst onto isolated targets push toward dive (Winston, Tracer). Range and sightlines push toward poke (Widowmaker, Sigma). Close-range sustain and grouping push toward brawl (Reinhardt, Mei). Split weights when a hero plays both ways (Cassidy is 0.5 poke and 0.5 brawl).
- **Point weights**: long sightlines and high ground favor poke. Verticality, flanks and separated high ground favor dive. Chokes, corridors and indoor areas favor brawl. On sided points, defenders usually lean further toward poke on the first point, and attackers toward brawl on tight final stretches.
- Keep differences meaningful: a point at 0.34 / 0.33 / 0.33 has no effect, because `fit_bonus` only rewards distance from neutral.
- Do not invent maps, points or heroes. If unsure whether something exists in the current game, ask the user.

## How the values are used

`fit_bonus = 3.0 × (Σ hero[a] × point[a] − 1/3)`, a number between about -1 and +2. It is added to each candidate's counter score when ranking suggestions, so one counter (1 point) can outweigh a mild fit. To change how much maps matter, adjust `FIT_WEIGHT` in `src/core/comp_fit.py`, not the sheets.

## Examples

**New hero "freja" (damage)**: add her to `hero_data.json` (role, counters, synergies), add `"freja": { "dive": 0.3, "poke": 0.7, "brawl": 0.0 }` to `archetypes.json`, add her icon, bump `archetypes` minor (0.1.0 to 0.2.0), add a changelog line, then validate.

**Rebalance after a patch**: change only the affected weights, bump patch (0.2.0 to 0.2.1), and in the changelog say which heroes or points changed and why.
