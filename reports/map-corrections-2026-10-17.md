# Map preference corrections — 2026-10-17

Map sheet: 0.2.0 → 0.2.1; status remains **llm-draft**. Five preferences changed across three maps. Exact replacement percentages remain estimates, not measured or fitted win probabilities.

## Changes

| Map / point / side | Dive/poke/brawl before | After | Raw rank agreement before → after | Baseline-adjusted before → after |
|---|---|---|---:|---:|
| Midtown / Point A capture / attack | 40/30/30 | 30/40/30 | -0.56 → 0.64 | -0.56 → 0.61 |
| Midtown / First checkpoint / attack | 40/20/40 | 30/40/30 | -0.61 → 0.61 | -0.60 → 0.60 |
| Rialto / Second checkpoint / attack | 50/20/30 | 30/50/20 | -0.56 → 0.40 | -0.57 → 0.36 |
| Rialto / Second checkpoint / defense | 40/30/30 | 20/50/30 | -0.39 → 0.60 | -0.45 → 0.60 |
| Hollywood / First checkpoint / attack | 40/20/40 | 35/40/25 | -0.43 → 0.33 | -0.42 → 0.31 |

## Rationale

- **Midtown / Point A capture / attack:** The old dive lead penalized ranged pressure against exposed approaches and elevated defenders; source A attack consistently favors ranged heroes.
- **Midtown / First checkpoint / attack:** The old dive/brawl split gave poke only 20% despite source B attack favoring ranged pressure along the payload stage.
- **Rialto / Second checkpoint / attack:** Long bridge/canal sightlines and high-ground angles were underweighted by the old 20% poke preference; mobility remains useful for access.
- **Rialto / Second checkpoint / defense:** Correct the dive-first defense preference on the same exposed stage; preserve some close-range holding value.
- **Hollywood / First checkpoint / attack:** Recognize rooftop firing angles in the streets phase while retaining substantial dive value for reaching and contesting high ground.

## Evidence and limits

- [Overpicker point/side ratings](https://www.overpicker.com/maps), captured October 17 with an October 13 source footer. The same captured data was used before and after, so source changes cannot explain the difference.
- [Midtown terrain description](https://overwatchmaps.gg/midtown/guide), [Rialto terrain description](https://overwatch.fandom.com/wiki/Rialto), and [Hollywood high-ground discussion](https://dignitas.gg/articles/blogs/overwatch/10390/mada-mada-a-collection-of-genji-flank-routes-part-iii-the-hybrid-maps) corroborate exposed approaches, firing angles and access to high ground. Some terrain guides are historical: they support the general layout reasoning, not present-day hero balance or every rework detail.
- These changes repair the sign/direction of ranged fit in the clearest cases. The source ratings informed the edits, so improved agreement is expected and is **not held-out validation**.
- Havana’s indoor stage, close-range final sections, other disputed preferences, Antarctic naming mismatches, generic Flashpoint groups, map placeholders, and hero archetypes were left unchanged.
- A regression checks that source-supported ranged picks receive positive fit on the corrected stages; it failed against the prior sheet.

## Reports

- [Original sweep](overpicker-map-sweep-2026-10-17.md), preserved with the original local input snapshot.
- [After-correction sweep](overpicker-map-sweep-2026-10-17-after-corrections.md), preserving the revised local input snapshot.
- Persistent direct disagreements decreased from 16 to 11; unresolved cases remain review items rather than automatic edits.
