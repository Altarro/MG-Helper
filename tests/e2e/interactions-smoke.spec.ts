import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('mg-helper-onboarding-dismissed', '1');
  });
});

async function createCampaign(page: import('@playwright/test').Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nowa kampania' }).click();
  await page.locator('#campaign-name').fill(name);
  await page.locator('#campaign-description').fill('Kampania smoke E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('sidebar links are clickable and navigate', async ({ page }) => {
  await createCampaign(page, 'E2E Nav Smoke');

  await page.getByRole('link', { name: /Sesje/ }).click();
  await expect(page).toHaveURL(/#\/sessions$/);
  await expect(page.getByRole('heading', { name: 'Sesje' })).toBeVisible();

  await page.getByRole('link', { name: /Wątki/ }).click();
  await expect(page).toHaveURL(/#\/threads$/);
  await expect(page.getByRole('heading', { name: 'Wątki fabularne' })).toBeVisible();

  await page.getByRole('link', { name: /Zegary/ }).click();
  await expect(page).toHaveURL(/#\/clocks$/);
  await expect(page.getByRole('heading', { name: 'Zegary' })).toBeVisible();

  await page.getByRole('link', { name: /Ustawienia/ }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { name: 'Ustawienia' })).toBeVisible();
});

test('clock form dropdown remains clickable and applies selection', async ({ page }) => {
  await createCampaign(page, 'E2E Select Smoke');

  await page.getByRole('link', { name: /Zegary/ }).click();
  await page.getByRole('button', { name: 'Nowy zegar' }).first().click();
  await page.locator('#clock-name').fill('Zegar E2E');

  await page.locator('#clock-segments').selectOption('12');
  await expect(page.locator('#clock-segments')).toHaveValue('12');
  await expect(page.getByPlaceholder('Co dzieje się po tyknięciu 12?')).toBeVisible();
});

test('dnd areas do not steal form inputs or basic clicks', async ({ page }) => {
  await createCampaign(page, 'E2E DnD Smoke');

  await page.getByRole('link', { name: /Wątki/ }).click();

  await page.getByRole('button', { name: 'Nowy wątek' }).first().click();
  await page.locator('#thread-name').fill('Wątek pierwszy');
  await page.getByRole('button', { name: 'Zapisz' }).click();

  await page.getByRole('link', { name: /Wątki/ }).click();
  await expect(page).toHaveURL(/#\/threads$/);
  await expect(page.getByRole('heading', { name: 'Wątki fabularne' })).toBeVisible();

  // With sortable cards mounted, opening form and typing should still work reliably.
  await page.getByRole('button', { name: 'Nowy wątek' }).first().click();
  await page.locator('#thread-name').fill('Wątek drugi');
  await expect(page.locator('#thread-name')).toHaveValue('Wątek drugi');

  await page.getByPlaceholder('Szukaj wątków, tagów albo zagrożeń...').fill('pierwszy');
  await expect(page.getByPlaceholder('Szukaj wątków, tagów albo zagrożeń...')).toHaveValue('pierwszy');

  await page.getByText('Wątek pierwszy', { exact: true }).first().click();
  await expect(page).toHaveURL(/#\/threads\/.+/);
});
