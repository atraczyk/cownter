---
name: scoring-engine
description: Change how heroes and teams are scored (counters, synergy, map fit, suggestions) and keep the UI in sync. Use when editing packages/core/src/scores.ts, suggest.ts, fit.ts or session.ts, or when the user says a score, total or suggestion looks wrong.
---

# Scoring engine

## Where scores come from

| Piece | File | What it does |
|-------|------|--------------|
| Team rows + totals | `packages/core/src/scores.ts` → `scoreTeams` | per hero: 1 per enemy countered + 0.5 per synergy pair + map fit, rounded to 0.1 |
| Suggested picks | `packages/core/src/suggest.ts` → `suggestCounterTeam` | best 1/2/2 team over the top candidates; map fit added to ranking and total |
| Map fit | `packages/core/src/fit.ts` | `FIT_WEIGHT × (hero·point − 1/3)` per hero |
| State | `packages/core/src/session.ts` → `MatchSession` | holds teams + context; `mapFit()` for your side, `enemyMapFit()` for the opposite side on sided modes |
| UI | `client/src/scoreManager.ts`, `suggestionManager.ts`, `fitChip.ts` | render only; no scoring logic in the client |

Counter/synergy lists are keyed `tanks` / `damage` / `supports`; look up a hero's list with `role + "s"` (damage stays `damage`).

## Rules

- Every `ScoreUpdate` is a full snapshot of both boards. A `null` block means "nothing to show", so the client clears that board. Scoring needs heroes on both teams.
- Anything that changes scores (team edit, clear, mode/map/point/side) must return fresh `current_scores` / `enemy_scores` and the client must repaint both boards.
- The enemy plays the opposite side: score and label enemy heroes with `enemy_map_fit`.
- Keep suggestion totals and team totals on the same formula so they are comparable.

## Checklist

- [ ] Change the core function, not the client
- [ ] Add a test in `packages/core/src/engine.test.ts` (fixtures must be legal 1/2/2 teams)
- [ ] If expected picks change, get them from the engine (`npx tsx -e` with `suggestCounterTeam`) and update both `engine.test.ts` and `client/e2e/app.spec.ts`
- [ ] Update "How map fit is used" in `.agents/skills/ow-data-sheets/SKILL.md` if the formula changes
- [ ] `npm test`, `npm run test:e2e`, then check the boards with the ui-check skill
