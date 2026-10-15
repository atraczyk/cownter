import { expect, test, type Page } from '@playwright/test';

async function clearState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('ow2_teams');
    localStorage.removeItem('ow2_context');
  });
}

async function pick(page: Page, team: 'enemy' | 'counter', slot: number, hero: string): Promise<void> {
  await page.locator(`.hero-select[data-team="${team}"][data-slot="${slot}"]`).selectOption(hero);
}

test.describe('counter picker', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Counter Picker' })).toBeVisible();
  });

  test('loads the hero pool and match bar without a backend', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Control' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Escort' })).toBeVisible();
    const heroCount = await page.locator('.hero-icon-select').count();
    expect(heroCount).toBeGreaterThanOrEqual(42);
    await expect(page.locator('.load-error')).toBeHidden();
  });

  test('suggests counters once the enemy team is full', async ({ page }) => {
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
    await page.locator('.suggestion-block .score').first().hover();
    const tip = page.getByRole('tooltip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Counters');
    await expect(tip).toContainText(/Map fit[+±-]\d/);

    await page.getByRole('button', { name: 'How picks are chosen' }).hover();
    await expect(tip).toContainText('How picks are chosen');
    await expect(page.locator('.suggestion-block .fit-chip').first()).not.toBeEmpty();
  });
});
