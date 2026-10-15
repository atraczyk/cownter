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
    await expect(page.locator('.suggestion-block .total-score-display')).toHaveAttribute('data-score', '12');
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
    await expect(page.locator('[data-part="version"]')).toHaveAttribute('title', /Map data v\d/);
    await expect(page.locator('.compass-verdict')).not.toHaveText(/Choose a mode/);
    await expect(page.locator('.suggestion-block .board-note')).toHaveText('Counters + synergy + map fit');
    await expect(page.locator('.suggestion-block .fit-chip').first()).not.toBeEmpty();
  });
});
