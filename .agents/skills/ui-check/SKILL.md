---
name: ui-check
description: Verify a client UI change in a real browser at the three layout breakpoints and with the Playwright suite. Use after editing client/index.html, client/src/*.ts or client/src/styles.css, or when the user reports a layout or rendering bug.
---

# UI check

## Run it

```bash
npm start          # http://127.0.0.1:3000 (Vite prints another port if 3000 is taken)
```

If Vite falls back to 3001, something else owns 3000; Playwright would reuse that server, so free the port before `npm run test:e2e`.

## Check

- [ ] Wide (1440px): pool | boards | suggestions + comp read; comp read lines up with the enemy board
- [ ] Two-column (1024px, ≤1240px breakpoint): header may wrap, hero pool stays below it while scrolling
- [ ] Phone (420px, ≤760px breakpoint): no horizontal scroll, header segments wrap
- [ ] Load a sided map (e.g. Hybrid → Blizzard World) so point and side controls render
- [ ] Fill both teams; rows show chip, counters/synergies, then score; totals match the row sum
- [ ] Clear each team; both boards empty

Measure instead of eyeballing when alignment matters, e.g. evaluate in the page:

```js
[...document.querySelectorAll('.player-row')].map((r) => r.querySelector('select, .hero-name').getBoundingClientRect().width)
```

Saved picks and context live in `localStorage` (`ow2_teams`, `ow2_context`); the user's own tab may share them, so don't wipe them without asking.

## Finish

- [ ] `npm test` and `npm run test:e2e`
- [ ] Add or update an e2e test in `client/e2e/app.spec.ts` for behaviour fixes; confirm it fails without the fix
- [ ] Stop the dev server
