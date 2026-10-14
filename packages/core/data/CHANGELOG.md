# Data sheet changelog

Versions follow semver per sheet:

- **patch**: weight tweaks, renamed display names, typo fixes
- **minor**: new heroes, maps, points or modes
- **major**: schema changes that need code changes

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
