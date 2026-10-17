# Overpicker map-rating sweep — 2026-10-17

Source: [Overpicker map ratings](https://www.overpicker.com/maps); live page footer updated 2026-10-13. Current local maps 0.2.0, archetypes 0.2.0.

This is a consistency review of two sets of drafts, not a statistical validation of win rates. No map/hero weights or engine scoring were changed.

## Coverage and method

- Source coverage: 31/33 local maps. Missing: Hanaoka, Throne of Anubis.
- Direct point/stage comparisons: 125; contextual grouped comparisons: 10; unmapped local scopes: 6. Attack and defense count separately.
- Excluded 12 near-neutral hero archetype placeholders: anran, dmon, doctrine, domina, emre, freja, jetpackcat, mizuki, shion, sierra, vendetta, wuyang. Remaining 42 heroes are compared by their current role.
- Each hero’s predicted fit is 3 × (hero mix · point mix − 1/3). Compare its rank with the published hero rating, using average ranks for ties, centering within each role and assigning equal total weight to tank/damage/support.
- Rank agreement ranges from −1 (opposite ranking) to +1 (matching ranking). Review buckets are heuristic: aligned ≥0.30; opposed ≤−0.20; mixed otherwise. They are not confidence levels or significance tests.
- Relative agreement subtracts each hero’s average source rating across the 31 maps before ranking (equal weight per map; average its points/sides first). It checks whether apparent agreement/disagreement survives a general source preference for that hero. Both raw and relative values are reported; neither is ground truth.
- Stage A/B/C maps to the three sequential local Escort/Hybrid stages. Named Control points match by name; Push Center maps to Mid. Check each semantic stage mapping before making edits.
- Flashpoint First/Later groups cannot be matched to individual named objectives without further evidence: all five source objectives provide contextual averages only. Push Deep push uses an Ally/Enemy contextual average, not a confirmed spatial match.
- Antarctic Labs/Sublevel do not match source Drilling Rig/Anomaly: no automatic rename or forced comparison. Clash maps are absent from the source.
- Source hero ratings reflect community analysis, without published sample sizes. Hero-style weights are also drafts. Disagreement may originate in either source, an archetype, or a point mapping.
- JSON includes sensitivity without Sombra (whose archetype predates the role rework), per-style rank associations, and source-favored heroes penalized by our fit. Source/style correlations are diagnostic signals, not proposed replacement percentages.
- The accompanying .source.json retains numeric source data and local input snapshots for reproducibility. Offline rerun: pass saved HTML with --source; the reports themselves carry all inputs for independent recalculation.

## Summary

Direct comparisons: {"aligned":33,"mixed":59,"opposed":21,"placeholder":12,"unmapped":0,"no variation":0}.

Direct comparisons after per-hero baseline adjustment: {"aligned":28,"mixed":69,"opposed":16,"placeholder":12,"unmapped":0,"no variation":0}.

Of 113 non-placeholder direct comparisons, 16 disagreements persist with baseline adjustment and 5 raw disagreements become mixed.

Contextual comparisons: {"aligned":4,"mixed":4,"opposed":2,"placeholder":0,"unmapped":0,"no variation":0}.

## Direct disagreements that persist after baseline adjustment

| Map | Point / side | Current mix D/P/B | Source scope | Raw rank agreement | Relative agreement | Raw / relative result |
|---|---|---|---|---:|---:|---|
| Midtown | First checkpoint / attack | 40/20/40 | B | -0.61 | -0.60 | opposed / opposed |
| Midtown | Point A capture / attack | 40/30/30 | A | -0.56 | -0.56 | opposed / opposed |
| Rialto | Second checkpoint / attack | 50/20/30 | B | -0.56 | -0.57 | opposed / opposed |
| Havana | Second checkpoint / attack | 40/30/30 | B | -0.44 | -0.43 | opposed / opposed |
| Hollywood | First checkpoint / attack | 40/20/40 | B | -0.43 | -0.42 | opposed / opposed |
| Rialto | Second checkpoint / defense | 40/30/30 | B | -0.39 | -0.45 | opposed / opposed |
| Blizzard World | Point A capture / attack | 30/20/50 | A | -0.38 | -0.33 | opposed / opposed |
| Rialto | First checkpoint / attack | 30/20/50 | A | -0.37 | -0.30 | opposed / opposed |
| Numbani | Final stretch / attack | 40/20/40 | C | -0.35 | -0.30 | opposed / opposed |
| Route 66 | Second checkpoint / attack | 50/20/30 | B | -0.35 | -0.36 | opposed / opposed |
| Blizzard World | Final stretch / defense | 30/30/40 | C | -0.34 | -0.29 | opposed / opposed |
| Rialto | Final stretch / attack | 30/20/50 | C | -0.31 | -0.21 | opposed / opposed |
| Hollywood | Final stretch / attack | 30/20/50 | C | -0.30 | -0.22 | opposed / opposed |
| Runasapi | Center fight | 40/40/20 | Mid | -0.26 | -0.34 | opposed / opposed |
| Antarctic Peninsula | Icebreaker | 50/30/20 | Icebreaker | -0.24 | -0.30 | opposed / opposed |
| Shambali Monastery | Second checkpoint / attack | 50/20/30 | B | -0.23 | -0.22 | opposed / opposed |

- **Midtown — First checkpoint / attack**: rank agreement -0.61; strongest archetype association poke (0.61). Examples favored upstream but penalized here: ashe (rating +20, fit -0.34); hanzo (rating +20, fit -0.34); illari (rating +20, fit -0.28); sigma (rating +20, fit -0.28).
- **Midtown — Point A capture / attack**: rank agreement -0.56; strongest archetype association poke (0.64). Examples favored upstream but penalized here: ashe (rating +20, fit -0.1); bastion (rating +20, fit -0.1); illari (rating +20, fit -0.1); sigma (rating +20, fit -0.1).
- **Rialto — Second checkpoint / attack**: rank agreement -0.56; strongest archetype association poke (0.54). Examples favored upstream but penalized here: ashe (rating +20, fit -0.37); sigma (rating +20, fit -0.34); hanzo (rating +20, fit -0.31); soldier76 (rating +20, fit -0.28).
- **Havana — Second checkpoint / attack**: rank agreement -0.44; strongest archetype association poke (0.67). Examples favored upstream but penalized here: ashe (rating +20, fit -0.1); baptiste (rating +20, fit -0.1); ramattra (rating +20, fit -0.1); sigma (rating +20, fit -0.1).
- **Hollywood — First checkpoint / attack**: rank agreement -0.43; strongest archetype association poke (0.43). Examples favored upstream but penalized here: hanzo (rating +20, fit -0.34); sigma (rating +20, fit -0.28); mercy (rating +20, fit -0.22); ana (rating +20, fit -0.16).
- **Rialto — Second checkpoint / defense**: rank agreement -0.39; strongest archetype association poke (0.65). Examples favored upstream but penalized here: ashe (rating +20, fit -0.1); orisa (rating +20, fit -0.1); baptiste (rating +10, fit -0.1); illari (rating +10, fit -0.1).
- **Blizzard World — Point A capture / attack**: rank agreement -0.38; strongest archetype association poke (0.41). Examples favored upstream but penalized here: widowmaker (rating +20, fit -0.4); ashe (rating +20, fit -0.31); zenyatta (rating +20, fit -0.31); ana (rating +20, fit -0.1).
- **Rialto — First checkpoint / attack**: rank agreement -0.37; strongest archetype association poke (0.59). Examples favored upstream but penalized here: ashe (rating +20, fit -0.31); sigma (rating +20, fit -0.22); ana (rating +20, fit -0.1); widowmaker (rating +10, fit -0.4).
- **Numbani — Final stretch / attack**: rank agreement -0.35; strongest archetype association poke (0.35). Examples favored upstream but penalized here: ashe (rating +20, fit -0.34); illari (rating +20, fit -0.28); lifeweaver (rating +20, fit -0.16); orisa (rating +20, fit -0.1).
- **Route 66 — Second checkpoint / attack**: rank agreement -0.35; strongest archetype association poke (0.34). Examples favored upstream but penalized here: ashe (rating +20, fit -0.37); sigma (rating +20, fit -0.34); lifeweaver (rating +20, fit -0.28); soldier76 (rating +20, fit -0.28).
- **Blizzard World — Final stretch / defense**: rank agreement -0.34; strongest archetype association poke (0.35). Examples favored upstream but penalized here: widowmaker (rating +20, fit -0.1); juno (rating +10, fit -0.1); mercy (rating +10, fit -0.1); winston (rating +10, fit -0.1).
- **Rialto — Final stretch / attack**: rank agreement -0.31; strongest archetype association poke (0.63). Examples favored upstream but penalized here: ashe (rating +20, fit -0.31); zenyatta (rating +20, fit -0.31); sigma (rating +20, fit -0.22); ana (rating +20, fit -0.1).

## Raw disagreements sensitive to the hero baseline

| Map | Point / side | Current mix D/P/B | Source scope | Raw rank agreement | Relative agreement | Raw / relative result |
|---|---|---|---|---:|---:|---|
| Blizzard World | Final stretch / attack | 30/20/50 | C | -0.32 | -0.17 | opposed / mixed |
| Junkertown | Final stretch / attack | 20/30/50 | C | -0.24 | -0.09 | opposed / mixed |
| Route 66 | Final stretch / attack | 30/30/40 | C | -0.21 | -0.11 | opposed / mixed |
| Shambali Monastery | Final stretch / defense | 30/30/40 | C | -0.22 | -0.11 | opposed / mixed |
| Watchpoint: Gibraltar | Final stretch / attack | 40/20/40 | C | -0.23 | -0.18 | opposed / mixed |

## Strongest agreements that persist after baseline adjustment

| Map | Point / side | Current mix D/P/B | Source scope | Raw rank agreement | Relative agreement | Raw / relative result |
|---|---|---|---|---:|---:|---|
| Rialto | Final stretch / defense | 30/40/30 | C | 0.72 | 0.67 | aligned / aligned |
| Havana | First checkpoint / defense | 10/70/20 | A | 0.60 | 0.59 | aligned / aligned |
| Esperança | Center fight | 40/30/30 | Mid | 0.56 | 0.57 | aligned / aligned |
| Lijiang Tower | Night Market | 30/10/60 | Night Market | 0.53 | 0.57 | aligned / aligned |
| Circuit Royal | Second checkpoint / defense | 20/60/20 | B | 0.58 | 0.55 | aligned / aligned |
| Circuit Royal | Final stretch / defense | 30/40/30 | C | 0.57 | 0.54 | aligned / aligned |
| Havana | First checkpoint / attack | 20/60/20 | A | 0.48 | 0.54 | aligned / aligned |
| Busan | Sanctuary | 40/20/40 | Sanctuary | 0.47 | 0.53 | aligned / aligned |

## All local points and sides

| Map | Point / side | Current mix D/P/B | Source scope | Raw rank agreement | Relative agreement | Raw / relative result |
|---|---|---|---|---:|---:|---|
| Aatlis | First point | 60/20/20 | Station, Bazaar, Resort, Town Center, Garden | 0.42 | 0.39 | aligned / aligned |
| Aatlis | Later points | 50/20/30 | Station, Bazaar, Resort, Town Center, Garden | 0.54 | 0.49 | aligned / aligned |
| Antarctic Peninsula | Icebreaker | 50/30/20 | Icebreaker | -0.24 | -0.30 | opposed / opposed |
| Antarctic Peninsula | Labs | 20/10/70 | unmapped point | — | — | unmapped / unmapped |
| Antarctic Peninsula | Sublevel | 30/20/50 | unmapped point | — | — | unmapped / unmapped |
| Blizzard World | Point A capture / attack | 30/20/50 | A | -0.38 | -0.33 | opposed / opposed |
| Blizzard World | Point A capture / defense | 20/40/40 | A | 0.24 | 0.27 | mixed / mixed |
| Blizzard World | First checkpoint / attack | 40/30/30 | B | -0.16 | -0.16 | mixed / mixed |
| Blizzard World | First checkpoint / defense | 30/40/30 | B | 0.27 | 0.16 | mixed / mixed |
| Blizzard World | Final stretch / attack | 30/20/50 | C | -0.32 | -0.17 | opposed / mixed |
| Blizzard World | Final stretch / defense | 30/30/40 | C | -0.34 | -0.29 | opposed / opposed |
| Busan | Downtown | 40/30/30 | Downtown | 0.22 | 0.16 | mixed / mixed |
| Busan | Sanctuary | 40/20/40 | Sanctuary | 0.47 | 0.53 | aligned / aligned |
| Busan | MEKA Base | 30/10/60 | MEKA Base | 0.26 | 0.34 | mixed / aligned |
| Circuit Royal | First checkpoint / attack | 10/70/20 | A | 0.45 | 0.38 | aligned / aligned |
| Circuit Royal | First checkpoint / defense | 10/80/10 | A | 0.52 | 0.48 | aligned / aligned |
| Circuit Royal | Second checkpoint / attack | 30/40/30 | B | 0.58 | 0.52 | aligned / aligned |
| Circuit Royal | Second checkpoint / defense | 20/60/20 | B | 0.58 | 0.55 | aligned / aligned |
| Circuit Royal | Final stretch / attack | 20/30/50 | C | -0.14 | -0.09 | mixed / mixed |
| Circuit Royal | Final stretch / defense | 30/40/30 | C | 0.57 | 0.54 | aligned / aligned |
| Colosseo | Center fight | 50/30/20 | Mid | 0.36 | 0.28 | aligned / mixed |
| Colosseo | Deep push | 30/20/50 | Ally, Enemy | -0.40 | -0.40 | opposed / opposed |
| Dorado | First checkpoint / attack | 30/30/40 | A | -0.06 | -0.00 | mixed / mixed |
| Dorado | First checkpoint / defense | 30/50/20 | A | 0.06 | 0.00 | mixed / mixed |
| Dorado | Second checkpoint / attack | 50/20/30 | B | -0.12 | -0.13 | mixed / mixed |
| Dorado | Second checkpoint / defense | 40/40/20 | B | 0.07 | -0.02 | mixed / mixed |
| Dorado | Final stretch / attack | 20/20/60 | C | 0.02 | 0.05 | mixed / mixed |
| Dorado | Final stretch / defense | 30/30/40 | C | -0.05 | -0.01 | mixed / mixed |
| Eichenwalde | Point A capture / attack | 10/20/70 | A | -0.06 | -0.03 | mixed / mixed |
| Eichenwalde | Point A capture / defense | 10/50/40 | A | 0.18 | 0.17 | mixed / mixed |
| Eichenwalde | First checkpoint / attack | 20/20/60 | B | -0.08 | -0.05 | mixed / mixed |
| Eichenwalde | First checkpoint / defense | 20/30/50 | B | -0.04 | 0.08 | mixed / mixed |
| Eichenwalde | Castle / attack | 10/10/80 | C | -0.04 | 0.09 | mixed / mixed |
| Eichenwalde | Castle / defense | 20/20/60 | C | -0.05 | 0.04 | mixed / mixed |
| Esperança | Center fight | 40/30/30 | Mid | 0.56 | 0.57 | aligned / aligned |
| Esperança | Deep push | 30/20/50 | Ally, Enemy | -0.18 | -0.17 | mixed / mixed |
| Grímsvötn | First checkpoint / attack | 34/33/33 | A | — | — | placeholder / placeholder |
| Grímsvötn | First checkpoint / defense | 34/33/33 | A | — | — | placeholder / placeholder |
| Grímsvötn | Second checkpoint / attack | 34/33/33 | B | — | — | placeholder / placeholder |
| Grímsvötn | Second checkpoint / defense | 34/33/33 | B | — | — | placeholder / placeholder |
| Grímsvötn | Final stretch / attack | 34/33/33 | C | — | — | placeholder / placeholder |
| Grímsvötn | Final stretch / defense | 34/33/33 | C | — | — | placeholder / placeholder |
| Hanaoka | Middle point | 50/20/30 | missing map | — | — | unmapped / unmapped |
| Hanaoka | Outer points | 30/20/50 | missing map | — | — | unmapped / unmapped |
| Havana | First checkpoint / attack | 20/60/20 | A | 0.48 | 0.54 | aligned / aligned |
| Havana | First checkpoint / defense | 10/70/20 | A | 0.60 | 0.59 | aligned / aligned |
| Havana | Second checkpoint / attack | 40/30/30 | B | -0.44 | -0.43 | opposed / opposed |
| Havana | Second checkpoint / defense | 30/50/20 | B | 0.41 | 0.41 | aligned / aligned |
| Havana | Final stretch / attack | 20/40/40 | C | 0.34 | 0.33 | aligned / aligned |
| Havana | Final stretch / defense | 20/60/20 | C | 0.53 | 0.50 | aligned / aligned |
| Hollywood | Point A capture / attack | 30/20/50 | A | -0.07 | -0.01 | mixed / mixed |
| Hollywood | Point A capture / defense | 20/50/30 | A | 0.47 | 0.46 | aligned / aligned |
| Hollywood | First checkpoint / attack | 40/20/40 | B | -0.43 | -0.42 | opposed / opposed |
| Hollywood | First checkpoint / defense | 30/30/40 | B | -0.01 | 0.09 | mixed / mixed |
| Hollywood | Final stretch / attack | 30/20/50 | C | -0.30 | -0.22 | opposed / opposed |
| Hollywood | Final stretch / defense | 30/30/40 | C | -0.13 | -0.09 | mixed / mixed |
| Ilios | Lighthouse | 50/30/20 | Lighthouse | 0.20 | 0.19 | mixed / mixed |
| Ilios | Ruins | 20/20/60 | Ruins | 0.31 | 0.32 | aligned / aligned |
| Ilios | Well | 50/40/10 | Well | 0.16 | 0.09 | mixed / mixed |
| Junkertown | First checkpoint / attack | 20/60/20 | A | 0.43 | 0.32 | aligned / aligned |
| Junkertown | First checkpoint / defense | 10/70/20 | A | 0.32 | 0.26 | aligned / mixed |
| Junkertown | Second checkpoint / attack | 40/40/20 | B | 0.31 | 0.17 | aligned / mixed |
| Junkertown | Second checkpoint / defense | 30/50/20 | B | 0.39 | 0.34 | aligned / aligned |
| Junkertown | Final stretch / attack | 20/30/50 | C | -0.24 | -0.09 | opposed / mixed |
| Junkertown | Final stretch / defense | 20/50/30 | C | 0.28 | 0.24 | mixed / mixed |
| King's Row | Point A capture / attack | 20/10/70 | A | 0.03 | 0.08 | mixed / mixed |
| King's Row | Point A capture / defense | 20/30/50 | A | 0.21 | 0.30 | mixed / mixed |
| King's Row | Streets / attack | 30/20/50 | B | 0.04 | 0.04 | mixed / mixed |
| King's Row | Streets / defense | 30/30/40 | B | 0.02 | 0.09 | mixed / mixed |
| King's Row | Factory / attack | 20/10/70 | C | -0.09 | -0.03 | mixed / mixed |
| King's Row | Factory / defense | 20/20/60 | C | 0.00 | 0.05 | mixed / mixed |
| Lijiang Tower | Night Market | 30/10/60 | Night Market | 0.53 | 0.57 | aligned / aligned |
| Lijiang Tower | Garden | 60/20/20 | Garden | 0.07 | 0.02 | mixed / mixed |
| Lijiang Tower | Control Center | 50/20/30 | Control Center | 0.39 | 0.46 | aligned / aligned |
| Midtown | Point A capture / attack | 40/30/30 | A | -0.56 | -0.56 | opposed / opposed |
| Midtown | Point A capture / defense | 30/50/20 | A | 0.41 | 0.39 | aligned / aligned |
| Midtown | First checkpoint / attack | 40/20/40 | B | -0.61 | -0.60 | opposed / opposed |
| Midtown | First checkpoint / defense | 30/40/30 | B | 0.54 | 0.50 | aligned / aligned |
| Midtown | Final stretch / attack | 30/20/50 | C | -0.02 | 0.03 | mixed / mixed |
| Midtown | Final stretch / defense | 30/30/40 | C | 0.24 | 0.27 | mixed / mixed |
| Neon Junction | Point A capture / attack | 34/33/33 | A | — | — | placeholder / placeholder |
| Neon Junction | Point A capture / defense | 34/33/33 | A | — | — | placeholder / placeholder |
| Neon Junction | First checkpoint / attack | 34/33/33 | B | — | — | placeholder / placeholder |
| Neon Junction | First checkpoint / defense | 34/33/33 | B | — | — | placeholder / placeholder |
| Neon Junction | Final stretch / attack | 34/33/33 | C | — | — | placeholder / placeholder |
| Neon Junction | Final stretch / defense | 34/33/33 | C | — | — | placeholder / placeholder |
| Nepal | Village | 30/20/50 | Village | 0.41 | 0.42 | aligned / aligned |
| Nepal | Shrine | 60/20/20 | Shrine | 0.08 | 0.08 | mixed / mixed |
| Nepal | Sanctum | 20/10/70 | Sanctum | 0.38 | 0.45 | aligned / aligned |
| New Junk City | First point | 60/20/20 | Arena, Ducts, Refinery, Junkyard, Bomb Flats | 0.28 | 0.26 | mixed / mixed |
| New Junk City | Later points | 50/30/20 | Arena, Ducts, Refinery, Junkyard, Bomb Flats | 0.16 | 0.13 | mixed / mixed |
| New Queen Street | Center fight | 30/20/50 | Mid | 0.02 | 0.14 | mixed / mixed |
| New Queen Street | Deep push | 20/20/60 | Ally, Enemy | -0.26 | -0.21 | opposed / opposed |
| Numbani | Point A capture / attack | 40/40/20 | A | 0.24 | 0.15 | mixed / mixed |
| Numbani | Point A capture / defense | 30/50/20 | A | 0.18 | 0.12 | mixed / mixed |
| Numbani | First checkpoint / attack | 50/30/20 | B | -0.08 | -0.15 | mixed / mixed |
| Numbani | First checkpoint / defense | 40/40/20 | B | 0.16 | 0.05 | mixed / mixed |
| Numbani | Final stretch / attack | 40/20/40 | C | -0.35 | -0.30 | opposed / opposed |
| Numbani | Final stretch / defense | 40/30/30 | C | -0.13 | -0.09 | mixed / mixed |
| Oasis | City Center | 60/20/20 | City Center | 0.22 | 0.21 | mixed / mixed |
| Oasis | Gardens | 30/20/50 | Gardens | 0.39 | 0.41 | aligned / aligned |
| Oasis | University | 50/20/30 | University | 0.33 | 0.30 | aligned / mixed |
| Paraíso | Point A capture / attack | 40/20/40 | A | -0.11 | -0.09 | mixed / mixed |
| Paraíso | Point A capture / defense | 30/40/30 | A | 0.16 | 0.14 | mixed / mixed |
| Paraíso | First checkpoint / attack | 50/20/30 | B | 0.10 | 0.07 | mixed / mixed |
| Paraíso | First checkpoint / defense | 40/30/30 | B | 0.08 | 0.04 | mixed / mixed |
| Paraíso | Final stretch / attack | 30/20/50 | C | -0.12 | -0.08 | mixed / mixed |
| Paraíso | Final stretch / defense | 30/30/40 | C | -0.17 | -0.12 | mixed / mixed |
| Rialto | First checkpoint / attack | 30/20/50 | A | -0.37 | -0.30 | opposed / opposed |
| Rialto | First checkpoint / defense | 20/30/50 | A | 0.08 | 0.14 | mixed / mixed |
| Rialto | Second checkpoint / attack | 50/20/30 | B | -0.56 | -0.57 | opposed / opposed |
| Rialto | Second checkpoint / defense | 40/30/30 | B | -0.39 | -0.45 | opposed / opposed |
| Rialto | Final stretch / attack | 30/20/50 | C | -0.31 | -0.21 | opposed / opposed |
| Rialto | Final stretch / defense | 30/40/30 | C | 0.72 | 0.67 | aligned / aligned |
| Route 66 | First checkpoint / attack | 30/50/20 | A | 0.38 | 0.34 | aligned / aligned |
| Route 66 | First checkpoint / defense | 20/60/20 | A | 0.39 | 0.33 | aligned / aligned |
| Route 66 | Second checkpoint / attack | 50/20/30 | B | -0.35 | -0.36 | opposed / opposed |
| Route 66 | Second checkpoint / defense | 40/40/20 | B | 0.34 | 0.28 | aligned / mixed |
| Route 66 | Final stretch / attack | 30/30/40 | C | -0.21 | -0.11 | opposed / mixed |
| Route 66 | Final stretch / defense | 30/50/20 | C | 0.48 | 0.40 | aligned / aligned |
| Runasapi | Center fight | 40/40/20 | Mid | -0.26 | -0.34 | opposed / opposed |
| Runasapi | Deep push | 30/30/40 | Ally, Enemy | 0.04 | 0.07 | mixed / mixed |
| Samoa | Beach | 50/30/20 | Beach | 0.02 | 0.02 | mixed / mixed |
| Samoa | Downtown | 30/20/50 | Downtown | 0.20 | 0.25 | mixed / mixed |
| Samoa | Volcano | 50/30/20 | Volcano | 0.22 | 0.18 | mixed / mixed |
| Shambali Monastery | First checkpoint / attack | 30/30/40 | A | -0.04 | 0.03 | mixed / mixed |
| Shambali Monastery | First checkpoint / defense | 30/40/30 | A | 0.35 | 0.27 | aligned / mixed |
| Shambali Monastery | Second checkpoint / attack | 50/20/30 | B | -0.23 | -0.22 | opposed / opposed |
| Shambali Monastery | Second checkpoint / defense | 50/30/20 | B | 0.07 | 0.03 | mixed / mixed |
| Shambali Monastery | Final stretch / attack | 20/20/60 | C | 0.06 | 0.14 | mixed / mixed |
| Shambali Monastery | Final stretch / defense | 30/30/40 | C | -0.22 | -0.11 | opposed / mixed |
| Suravasa | First point | 50/20/30 | Market, Gardens, Palace, Temple, Ruins | 0.44 | 0.41 | aligned / aligned |
| Suravasa | Later points | 40/20/40 | Market, Gardens, Palace, Temple, Ruins | 0.42 | 0.37 | aligned / aligned |
| Throne of Anubis | Middle point | 40/30/30 | missing map | — | — | unmapped / unmapped |
| Throne of Anubis | Outer points | 30/20/50 | missing map | — | — | unmapped / unmapped |
| Watchpoint: Gibraltar | First checkpoint / attack | 50/30/20 | A | 0.21 | 0.14 | mixed / mixed |
| Watchpoint: Gibraltar | First checkpoint / defense | 40/40/20 | A | 0.25 | 0.17 | mixed / mixed |
| Watchpoint: Gibraltar | Second checkpoint / attack | 60/20/20 | B | 0.05 | 0.00 | mixed / mixed |
| Watchpoint: Gibraltar | Second checkpoint / defense | 50/30/20 | B | 0.20 | 0.18 | mixed / mixed |
| Watchpoint: Gibraltar | Final stretch / attack | 40/20/40 | C | -0.23 | -0.18 | opposed / mixed |
| Watchpoint: Gibraltar | Final stretch / defense | 40/30/30 | C | -0.05 | -0.10 | mixed / mixed |

## Review guidance

Preserve weights while checking the strongest negative direct comparisons against terrain and player experience. Treat neutral point placeholders as unfinished, not disagreements. Resolve renamed Control points and split generic Flashpoint groups before claiming point-level validation. A mixed or aligned result does not mark a draft as reviewed.
