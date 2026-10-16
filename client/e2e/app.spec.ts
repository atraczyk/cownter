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
    await expect.poll(() => slotValues(page, 'counter')).toHaveLength(5);
    await expect.poll(() => slotValues(page, 'enemy')).toHaveLength(5);

    const about = page.getByRole('dialog', { name: 'cownter' });
    await page.getByRole('button', { name: 'About cownter' }).click();
    await expect(about).toBeVisible();
    await expect(about).toContainText('ow counter explorer');
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
    await expect(page.locator('.suggestion-block .hero-name')).toContainText(['doomfist', 'mei', 'widowmaker', 'kiriko', 'mercy']);
    const link = page.getByRole('button', { name: 'Link your team to the suggested picks' });
    const suggestedScores = await page.locator('.suggestion-block .score').allTextContents();
    await link.click();
    await expect(link).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.locator('.blue-team .current-score').allTextContents()).toEqual(suggestedScores);
    await expect(page.locator('.blue-team .total-score-display')).toHaveAttribute('data-score', '13');
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

    await expect(page.locator('[data-part="version"]')).toHaveText(/^v\d+\.\d+\.\d+ · ([0-9a-f]{7,}(-dirty)?|unknown)$/);
    await expect(page.locator('[data-part="version"]')).toHaveAttribute('data-tip', /Map data/);
    await expect(page.locator('.compass-verdict')).not.toHaveText(/Choose a mode/);
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
