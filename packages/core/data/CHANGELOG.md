# Data sheet changelog

Versions follow semver per sheet:

- **patch**: weight tweaks, renamed display names, typo fixes
- **minor**: new heroes, maps, points or modes
- **major**: schema changes that need code changes

## 2026-10-17

### maps 0.2.1 (llm-draft)

- Corrected understated ranged fit in five preferences: Midtown A/B attack, Rialto B attack/defense, and Hollywood B attack. Kept mobility value on elevated stages; exact percentages remain draft estimates.
- Used the captured Overpicker point/side ratings as corroboration, with terrain descriptions and before/after rationale in `reports/map-corrections-2026-10-17.md`. Preserved the original sweep and wrote a separate post-correction sweep.
- Left ambiguous disagreements, unmapped points, neutral placeholders and hero archetypes unchanged. No scoring formula change.

### matchup_sources 1.0.0 / hero_data (llm-draft)

- Replaced the mixed legacy and capped matchup lists with all positive directed Overpicker ratings for all 54 heroes. Removed per-hero cutoffs and inferred reverse synergy links.
- Saved both complete numeric source matrices, their URLs, source dates, and binary conversion limits. This replaces the earlier sparse evidence-list format.
- Added a live check/write importer and offline parity checks to `npm test`; roster/roles remain sourced from OverFast. Archetype/map-fit weights and engine scoring remain separate.

## archetypes 0.1.0 (2026-10-14)

- First LLM-drafted dive/poke/brawl weights for every hero in `hero_data.json`. Needs human review.

## maps 0.1.0 (2026-10-14)

- First LLM-drafted comp preferences for Control, Escort, Hybrid, Push, Flashpoint and Clash maps, per point and per side for Escort and Hybrid. Needs human review.

## 2026-10-14

### archetypes 0.2.0

- Scaffolded missing heroes from roster.json: anran, dmon, doctrine, domina, emre, freja, jetpackcat, mizuki, shion, sierra, vendetta, wuyang. Counters and weights are placeholders (neutral / empty) pending review.

## 2026-10-14

### maps 0.2.0

- Scaffolded missing maps from roster.json: grimsvotn, neon_junction. Point comps are neutral placeholders pending review.

## 2026-10-14

### roster 1.0.0 -> 1.1.0 (sync-roster)

- Sombra: damage -> support; moved in counter/synergy lists.

### hero_data

- Renamed the `support` lists on the 12 scaffolded heroes to `supports`, the key the engine reads.
- Removed the non-hero entry "rampaging-style tanks" from Junker Queen's synergies.

## 2026-10-16

### hero_data (llm-draft)

- Seeded all 12 previously scaffolded heroes with a sparse selection of published Overpicker counter and synergy ratings, including incoming counters and reciprocal synergy links.
- Added matchup_sources.json with source URLs, original ratings, selection/conversion rules, and review limitations. Positive ratings become the existing binary relationships; engine scoring is unchanged.
- This is an initial subset, not a complete matchup matrix. Archetype weights remain neutral placeholders pending a separate kit/play-style review.

## 2026-10-17

### hero_data (llm-draft)

- Removed the three-target import cutoff for Anran and Doctrine: retain all positive outgoing counter ratings from the captured Overpicker matrix (10 and 15 targets respectively). Recorded the additional source evidence; scoring weights are unchanged.
