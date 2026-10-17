import { expect, test, type Page } from '@playwright/test';

async function clearState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('ow_e2e_cleared')) return;
    sessionStorage.setItem('ow_e2e_cleared', '1');
    localStorage.removeItem('ow_teams');
    localStorage.removeItem('ow_context');
    localStorage.removeItem('ow2_teams');
    localStorage.removeItem('ow2_context');
  });
}

async function pick(page: Page, team: 'enemy' | 'counter', slot: number, hero: string): Promise<void> {
  // Startup teams are random; free a hero already occupying another slot.
  for (const select of await page.locator(`.hero-select[data-team="${team}"]:not([data-slot="${slot}"])`).all()) {
    if (await select.inputValue() === hero) await select.selectOption('');
  }
  await page.locator(`.hero-select[data-team="${team}"][data-slot="${slot}"]`).selectOption(hero);
}

async function slotValues(page: Page, team: 'enemy' | 'counter'): Promise<string[]> {
  return page.locator(`.hero-select[data-team="${team}"]`).evaluateAll((elements) =>
    elements
      .sort((a, b) => Number((a as HTMLSelectElement).dataset.slot) - Number((b as HTMLSelectElement).dataset.slot))
      .map((element) => (element as HTMLSelectElement).value),
  );
}

test.describe('counter picker', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'cownter' })).toBeVisible();
    await expect(page).toHaveTitle('ow counter explorer');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/resources/images/favicon.svg');
    await expect(page.locator('#map-select')).not.toHaveValue('');
    await expect.poll(async () => {
      const enemy = await slotValues(page, 'enemy');
      const yours = await slotValues(page, 'counter');
      return enemy.length === 5 && yours.length === 5 && [...enemy, ...yours].every(Boolean);
    }).toBe(true);
  });

  test('loads the hero pool and match bar without a backend', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Control' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Escort' })).toBeVisible();
    const heroCount = await page.locator('.hero-icon-select').count();
    expect(heroCount).toBeGreaterThanOrEqual(42);
    await expect(page.locator('.load-error')).toBeHidden();
    const mapName = await page.locator('#map-select option:checked').textContent();
    await expect(page.locator('.map-panel')).toContainText(mapName!.trim());
    await expect(page.locator('.compass-card .map-panel')).toHaveCount(1);
    await expect(page.locator('.pool-column .map-panel')).toHaveCount(0);
    await expect(page.locator('.pool-hint strong')).toHaveText('Drag a hero onto a team slot.');
    await expect(page.locator('.match-bar').getByRole('button', { name: 'Clear map', exact: true })).toBeVisible();
    await expect.poll(() => slotValues(page, 'counter')).toHaveLength(5);
    await expect.poll(() => slotValues(page, 'enemy')).toHaveLength(5);

    const about = page.getByRole('dialog', { name: 'cownter' });
    await page.getByRole('button', { name: 'About cownter' }).click();
    await expect(about).toBeVisible();
    await expect(about).toContainText('ow counter explorer');
    await expect(about.getByRole('heading', { name: 'How the hero data is built' })).toBeVisible();
    await expect(about.getByRole('link', { name: 'Overpicker', exact: true })).toHaveAttribute('href', 'https://www.overpicker.com/');
    await expect(about.getByRole('link', { name: 'Autopoietico', exact: true })).toHaveAttribute('href', 'https://www.overpicker.com/about');
    await expect(about.getByRole('link', { name: 'overwatch comps EXPLAINED', exact: true })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=93nrrdo-w0M');
    await expect(about.getByRole('heading', { name: 'Map preferred play styles', exact: true })).toBeVisible();
    await expect(about).toContainText('not affiliated with, endorsed, sponsored, or approved by Blizzard Entertainment');
    await expect(about).toContainText('claims no ownership');
    await about.getByRole('button', { name: 'Close' }).click();
    await expect(about).toBeHidden();
  });

  test('keeps the match after reload and can randomize your team', async ({ page }) => {
    const map = await page.locator('#map-select').inputValue();
    const point = await page.locator('[data-part="points"] [aria-pressed="true"]').textContent();
    const enemy = await slotValues(page, 'enemy');
    const yours = await slotValues(page, 'counter');

    await page.reload();
    await expect(page.locator('#map-select')).toHaveValue(map);
    await expect(page.locator('[data-part="points"] [aria-pressed="true"]')).toHaveText(point!);
    await expect.poll(() => slotValues(page, 'enemy')).toEqual(enemy);
    await expect.poll(() => slotValues(page, 'counter')).toEqual(yours);

    const link = page.getByRole('button', { name: 'Link your team to the suggested picks' });
    await link.click();
    await expect(link).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Randomize your team' }).click();
    await expect(link).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => slotValues(page, 'counter')).not.toEqual(yours);
    await expect.poll(async () => (await slotValues(page, 'counter')).every(Boolean)).toBe(true);
  });

  test('suggests counters once the enemy team is full', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear map' }).click();
    await expect(page.locator('.map-panel')).toContainText('No map selected');
    await pick(page, 'enemy', 0, 'hazard');
    await pick(page, 'enemy', 1, 'echo');
    await pick(page, 'enemy', 2, 'genji');
    await pick(page, 'enemy', 3, 'sombra');
    await pick(page, 'enemy', 4, 'illari');

    await expect(page.getByRole('heading', { name: 'Suggested picks' })).toBeVisible();
    const suggested = await page.locator('.suggestion-block .hero-name').allTextContents();
    expect(suggested).toHaveLength(5);
    expect(new Set(suggested).size).toBe(5);
    const link = page.getByRole('button', { name: 'Link your team to the suggested picks' });
    const suggestedScores = await page.locator('.suggestion-block .score').allTextContents();
    await link.click();
    await expect(link).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => slotValues(page, 'counter')).toEqual(suggested);
    await expect.poll(() => page.locator('.blue-team .current-score').allTextContents()).toEqual(suggestedScores);
    const total = Math.round(suggestedScores.reduce((sum, score) => sum + Number(score), 0) * 10) / 10;
    await expect(page.locator('.blue-team .total-score-display')).toHaveAttribute('data-score', String(total));
    await pick(page, 'counter', 1, 'genji');
    await expect(link).toHaveAttribute('aria-pressed', 'false');
  });

  test('randomizes the enemy and uses the suggested picks', async ({ page }) => {
    const enemySelects = page.locator('.hero-select[data-team="enemy"]');
    const yourSelects = page.locator('.hero-select[data-team="counter"]');
    const yourTotal = page.locator('.blue-team .total-score-display');
    const totalHeight = async () => (await yourTotal.boundingBox())?.height;
    const emptyHeight = await totalHeight();

    await page.getByRole('button', { name: 'Randomize enemy team' }).click();
    for (const select of await enemySelects.all()) await expect(select).not.toHaveValue('');
    const values = (selects: typeof enemySelects) =>
      selects.evaluateAll((elements) => elements.map((element) => (element as HTMLSelectElement).value));
    expect(new Set(await values(enemySelects)).size).toBe(5);

    await expect(page.locator('.suggestion-block .hero-name').first()).toBeVisible();
    const suggested = await page.locator('.suggestion-block .hero-name').allTextContents();
    await page.getByRole('button', { name: 'Link your team to the suggested picks' }).click();
    await expect.poll(async () => (await values(yourSelects)).filter(Boolean)).toEqual(suggested);
    await expect(page.locator('.hero-picker[data-team="counter"][data-slot="0"] img'))
      .toHaveAttribute('src', `/resources/images/icons/icon-${suggested[0]}.png`);
    await expect(yourTotal).toHaveAttribute('data-score', /\d/);
    expect(await totalHeight()).toBe(emptyHeight);
  });

  test('clearing a team resets both scoreboards', async ({ page }) => {
    page.on('dialog', (dialog) => void dialog.accept());
    const yourTotal = page.locator('.blue-team .total-score-display');
    const enemyTotal = page.locator('.red-team .total-score-display');
    const scoredRows = page.locator('.current-score:not(:empty), .enemy-score:not(:empty)');

    for (const team of ['counter', 'enemy'] as const) {
      await pick(page, 'counter', 0, 'doomfist');
      await pick(page, 'counter', 1, 'mei');
      await pick(page, 'enemy', 0, 'hazard');
      await pick(page, 'enemy', 2, 'genji');
      await expect(yourTotal).toHaveAttribute('data-score', /\d/);
      await expect(enemyTotal).toHaveAttribute('data-score', /\d/);

      await page.locator(`[data-clear-team="${team}"]`).click();
      await expect(yourTotal).not.toHaveAttribute('data-score');
      await expect(enemyTotal).not.toHaveAttribute('data-score');
      await expect(scoredRows).toHaveCount(0);

      await page.locator('[data-clear-team="counter"]').click();
      await page.locator('[data-clear-team="enemy"]').click();
    }
  });

  test('weighs suggestions by map point and side', async ({ page }) => {
    await pick(page, 'enemy', 0, 'hazard');
    await pick(page, 'enemy', 1, 'echo');
    await pick(page, 'enemy', 2, 'genji');
    await pick(page, 'enemy', 3, 'sombra');
    await pick(page, 'enemy', 4, 'illari');

    await page.getByRole('button', { name: 'Escort' }).click();
    await page.locator('#map-select').selectOption('dorado');
    await page.getByRole('button', { name: 'First checkpoint' }).click();
    await page.getByRole('button', { name: 'Attacking' }).click();

    await expect(page.locator('[data-part="version"]')).toHaveText(/^v\d+\.\d+\.\d+ · [0-9a-f]{7,}$/);
    await expect(page.locator('[data-part="version"]')).not.toHaveAttribute('data-tip');
    await expect(page.locator('[data-part="fit-total"]')).not.toHaveText('—');
    await expect(page.locator('.map-panel')).toContainText('Dorado');
    await expect(page.locator('.map-panel')).toContainText('First checkpoint');
    await expect(page.getByRole('heading', { name: 'Analysis', exact: true })).toBeVisible();
    await expect(page.locator('.compass-card')).toContainText(/Poke \d+%/);
    await expect(page.locator('.map-panel')).not.toContainText(/Poke \d+%/);
    await expect(page.locator('.map-thumb')).toHaveAttribute('src', '/resources/images/maps/dorado.jpg');
    await page.locator('.suggestion-block .score').first().hover();
    const tip = page.getByRole('tooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Counters');
    await expect(tip).toContainText(/Map fit[+±-]\d/);

    await page.getByRole('button', { name: 'How picks are chosen' }).hover();
    await expect(tip).toContainText('How picks are chosen');
    await expect(page.locator('.suggestion-block .fit-chip').first()).not.toBeEmpty();
  });

  for (const width of [1440, 1024, 420]) {
    test(`keeps panels stable at ${width}px when context and teams change`, async ({ page }) => {
      page.on('dialog', dialog => void dialog.accept());
      await page.setViewportSize({ width, height: 1000 });
      if (width === 420) await page.locator('.match-toggle').click();
      await page.getByRole('button', { name: 'Hybrid', exact: true }).click();
      await page.locator('#map-select').selectOption('blizzard_world');
      await expect(page.getByRole('button', { name: 'Attacking', exact: true })).toBeVisible();
      const geometry = () => page.locator('.board-yours, .board-enemy, .right-column, .compass-card')
        .evaluateAll(elements => elements.map(element => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height };
        }));
      const filled = await geometry();
      if (width === 1440) {
        expect(filled[0].y).toBe(filled[1].y);
        expect(filled[0].height).toBe(filled[1].height);
        expect(filled[2].y).toBe(filled[3].y);
        expect(filled[2].height).toBe(filled[3].height);
        const pool = await page.locator('.pool-column').boundingBox();
        expect(pool!.y).toBe(filled[0].y);
        expect(pool!.y + pool!.height).toBe(filled[2].y + filled[2].height);
        const footer = await page.locator('.compass-verdict').boundingBox();
        const teamFooter = await page.locator('.red-team .total-score-display').boundingBox();
        expect(footer!.y).toBe(teamFooter!.y);
      }
      await page.getByRole('button', { name: 'Clear map', exact: true }).click();
      await page.locator('[data-clear-team="enemy"]').click();
      await page.locator('[data-clear-team="counter"]').click();
      await expect(page.locator('.suggestion-block')).toHaveClass(/is-empty/);
      expect(await geometry()).toEqual(filled);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await page.getByRole('button', { name: 'Randomize enemy team' }).click();
      await expect(page.locator('.suggestion-block')).toBeVisible();
      expect(await geometry()).toEqual(filled);
    });
  }
});

test('highlights the point style and totals the displayed map-fit bonuses', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await clearState(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Hybrid', exact: true }).click();
  await page.locator('#map-select').selectOption('blizzard_world');
  await page.getByRole('button', { name: 'Point A capture', exact: true }).click();
  await page.getByRole('button', { name: 'Attacking', exact: true }).click();
  for (const [slot, hero] of ['reinhardt', 'mei', 'reaper', 'brigitte', 'lucio'].entries()) {
    await pick(page, 'counter', slot, hero);
  }
  await expect(page.locator('.playstyle-title')).toHaveText('Brawl favored');
  await expect(page.locator('.map-analysis')).toHaveClass(/arch-brawl/);
  await expect(page.locator('.playstyle-callout .map-note')).toContainText('Group up close');
  await expect(page.locator('.compass-body .map-panel')).toBeVisible();

  const expectFitTotal = async () => {
    const texts = await page.locator('.blue-team .fit-chip').allTextContents();
    const total = Math.round(texts.reduce((sum, text) => {
      const value = text.match(/([+−±-]?\d+(?:\.\d+)?)$/)?.[1] ?? '0';
      return sum + Number(value.replace('±', '').replace('−', '-'));
    }, 0) * 10) / 10;
    const formatted = total === 0 ? '±0' : total > 0 ? `+${total}` : String(total);
    await expect(page.locator('[data-part="fit-total"]')).toHaveText(formatted);
  };
  await expectFitTotal();
  await page.locator('.compass-verdict').hover();
  await expect(page.getByRole('tooltip')).toContainText('Already included in your team’s total score');
  await page.locator('.hero-select[data-team="counter"][data-slot="4"]').selectOption('');
  await expectFitTotal();
  await page.getByRole('button', { name: 'Clear map', exact: true }).click();
  await expect(page.locator('[data-part="fit-total"]')).toHaveText('—');
  await expect(page.locator('.playstyle-title')).toHaveText('Point play style');
});

test('sizes the point selector to its buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Clash', exact: true }).click();
  await page.locator('#map-select').selectOption('hanaoka');
  const points = page.locator('[data-part="points"]');
  const group = await points.boundingBox();
  const last = await points.getByRole('button').last().boundingBox();
  expect(Math.abs(group!.x + group!.width - last!.x - last!.width)).toBeLessThanOrEqual(1);
});

test('balances phone match controls without moving the board when a side disappears', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto('/');
  await page.locator('.match-toggle').click();
  await page.getByRole('button', { name: 'Clash', exact: true }).click();
  await page.locator('#map-select').selectOption('hanaoka');

  const modeButtons = await page.locator('.mode-tabs .mode-tab').all();
  const boxes = await Promise.all(modeButtons.map(button => button.boundingBox()));
  expect(boxes).toHaveLength(6);
  expect(boxes.slice(0, 3).every(box => box!.y === boxes[0]!.y)).toBe(true);
  expect(boxes.slice(3).every(box => box!.y === boxes[3]!.y)).toBe(true);
  expect(boxes[3]!.y).toBeGreaterThan(boxes[0]!.y);
  expect(Math.abs(boxes[0]!.width - boxes[3]!.width)).toBeLessThanOrEqual(1);

  const mapField = await page.locator('.match-field').nth(1).boundingBox();
  const modeField = await page.locator('.match-field').first().boundingBox();
  expect(mapField!.width).toBe(modeField!.width);
  const boardY = (await page.locator('.board-yours').boundingBox())!.y;

  await page.getByRole('button', { name: 'Hybrid', exact: true }).click();
  await page.locator('#map-select').selectOption('blizzard_world');
  await expect(page.getByRole('button', { name: 'Attacking', exact: true })).toBeVisible();
  expect((await page.locator('.board-yours').boundingBox())!.y).toBe(boardY);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(420);
});

test('collapses match setup into a live summary on phones', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto('/');
  const toggle = page.locator('.match-toggle');
  const bar = page.getByRole('navigation', { name: 'Match setup' });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(bar).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(bar).toBeVisible();
  await page.getByRole('button', { name: 'Clash', exact: true }).click();
  await page.locator('#map-select').selectOption('hanaoka');
  await page.getByRole('button', { name: 'Outer points', exact: true }).click();
  await toggle.click();
  await expect(bar).toBeHidden();
  await expect(page.locator('.match-summary')).toHaveText('Clash · Hanaoka · Outer points');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(420);

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(toggle).toBeHidden();
  await expect(bar).toBeVisible();
});

test('uses an avatar picker without the hero pool on phones', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto('/');
  await expect(page.locator('.hero-selector')).toBeHidden();
  page.on('dialog', dialog => void dialog.accept());
  await page.locator('[data-clear-team="counter"]').click();

  const tank = page.locator('.hero-picker[data-team="counter"][data-slot="0"]');
  await tank.click();
  const search = page.getByRole('searchbox', { name: 'Search heroes' });
  await expect(search).not.toBeFocused();
  await expect(search).toHaveAttribute('placeholder', 'Search heroes');
  const picker = page.getByRole('dialog', { name: 'Choose hero' });
  await expect(picker.getByRole('heading', { name: 'Choose hero' })).toBeVisible();
  await expect(picker.locator('.hero-picker-context')).toHaveText('Your Tank');
  await expect(picker.getByRole('button', { name: 'Close hero picker' })).toBeVisible();
  expect(await picker.boundingBox()).toEqual({ x: 0, y: 0, width: 420, height: 900 });
  await search.fill('dva');
  const option = page.getByRole('option', { name: 'Dva' });
  await expect(option.locator('.hero-picker-hint')).toHaveText('Dive');
  await expect(option.locator('img')).toHaveAttribute('src', '/resources/images/icons/icon-dva.png');
  await option.click();
  await expect(page.locator('.hero-select[data-team="counter"][data-slot="0"]')).toHaveValue('dva');
  await expect(tank).toContainText('Dva');
  await expect(tank).toHaveAttribute('aria-label', 'Your Tank: Dva');
  await expect(tank.locator('img')).toHaveAttribute('src', '/resources/images/icons/icon-dva.png');

  const damage1 = page.locator('.hero-picker[data-team="counter"][data-slot="1"]');
  await damage1.click();
  await expect(page.getByRole('option').last()).toHaveAccessibleName('Clear hero');
  const clearBox = page.getByRole('option').last().locator('.hero-picker-empty-icon');
  const box = await clearBox.boundingBox();
  const cross = await clearBox.locator('svg').boundingBox();
  expect(cross!.x + cross!.width / 2).toBe(box!.x + box!.width / 2);
  expect(cross!.y + cross!.height / 2).toBe(box!.y + box!.height / 2);
  await search.fill('genji');
  await page.getByRole('option', { name: 'Genji' }).click();
  const damage2 = page.locator('.hero-picker[data-team="counter"][data-slot="2"]');
  await damage2.click();
  await search.fill('genji');
  await expect(page.getByRole('option', { name: 'Genji', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('option', { name: 'Genji', exact: true })).toContainText('already selected');
  await search.press('Escape');
  await expect(damage2).toBeFocused();

  await page.reload();
  await expect(tank).toContainText('Dva');
  await expect(damage1).toContainText('Genji');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(420);
});

test('supports keyboard hero selection and keeps the pool on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.hero-selector')).toBeVisible();
  page.on('dialog', dialog => void dialog.accept());
  await page.locator('[data-clear-team="enemy"]').click();
  const tank = page.locator('.hero-picker[data-team="enemy"][data-slot="0"]');
  await tank.focus();
  await tank.press('Enter');
  const search = page.getByRole('searchbox', { name: 'Search heroes' });
  await expect(search).toBeFocused();
  await search.fill('winston');
  await expect(page.getByRole('option', { name: 'Winston', exact: true }).locator('.hero-picker-hint')).toHaveText('Dive');
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.locator('.hero-select[data-team="enemy"][data-slot="0"]')).toHaveValue('winston');
  await expect(tank).toContainText('Winston');
});

for (const width of [1440, 1024, 420]) {
  test(`loads without cumulative layout shift at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      (window as any).layoutShifts = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) (window as any).layoutShifts += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/');
    await expect(page.locator('body')).not.toHaveClass('app-loading');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.evaluate(() => (window as any).layoutShifts)).toBe(0);
  });
}

for (const width of [1440, 1024, 420]) {
  test(`locks background scrolling while About is open at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.goto('/');
    await expect(page.locator('body')).not.toHaveClass(/app-loading/);
    const about = page.getByRole('dialog', { name: 'cownter' });
    const backgroundY = () => page.evaluate(() => window.scrollY);
    for (const dismiss of (width <= 760 ? ['escape', 'button'] : ['escape', 'button', 'backdrop'])) {
      await page.getByRole('button', { name: 'About cownter' }).click();
      if (width <= 760) {
        const bounds = await about.boundingBox();
        expect(bounds).toEqual({ x: 0, y: 0, width, height: 600 });
      }
      const before = await backgroundY();
      await page.mouse.move(2, 300);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(150);
      expect(await backgroundY()).toBe(before);
      await about.hover();
      await page.mouse.wheel(0, 500);
      await expect.poll(() => about.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
      expect(await backgroundY()).toBe(before);
      if (dismiss === 'escape') await page.keyboard.press('Escape');
      else if (dismiss === 'button') await about.getByRole('button', { name: 'Close' }).click();
      else await page.mouse.click(2, 300);
      await expect(about).toBeHidden();
      expect(await backgroundY()).toBe(before);
      await page.mouse.move(2, 300);
      await page.mouse.wheel(0, 200);
      await expect.poll(backgroundY).toBeGreaterThan(before);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
  });
}

for (const width of [1280, 1440]) {
  test(`keeps all escort checkpoints visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Escort', exact: true }).click();
    await page.locator('#map-select').selectOption('havana');
    const points = page.locator('[data-part="points"]');
    expect(await points.evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(await points.evaluate(el => el.clientWidth));
    const group = await points.boundingBox();
    const last = await points.getByRole('button').last().boundingBox();
    expect(last!.x + last!.width).toBeLessThanOrEqual(group!.x + group!.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test('gives the analysis triangle room on phones', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto('/');
  const plot = page.locator('.compass-plot');
  await plot.scrollIntoViewIfNeeded();
  const bounds = await plot.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(280);
  const legend = await page.locator('.compass-legend').boundingBox();
  expect(legend!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(420);
});

test('shows analysis then enemy, suggestions and your team on phones', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto('/');
  const sections = await page.locator('.compass-card, .board-enemy, .board-yours, .right-column').evaluateAll(elements =>
    elements.map(el => ({ name: el.className, y: el.getBoundingClientRect().top })).sort((a, b) => a.y - b.y).map(el => el.name));
  expect(sections[0]).toContain('compass-card');
  expect(sections[1]).toContain('board-enemy');
  expect(sections[2]).toContain('right-column');
  expect(sections[3]).toContain('board-yours');
});
