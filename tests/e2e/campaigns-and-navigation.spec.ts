import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('mg-helper-onboarding-dismissed', '1');
  });
});

test('pokazuje ekran kampanii gdy brak aktywnej kampanii', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Kampanie' })).toBeVisible();
  await expect(page.getByText('Brak kampanii')).toBeVisible();
});

test('tworzy kampanię i pozwala przejść do ustawień', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Nowa kampania' }).click();
  await page.locator('#campaign-name').fill('E2E Kampania');
  await page.locator('#campaign-description').fill('Kampania utworzona przez Playwright');
  await page.getByRole('dialog').getByRole('button', { name: 'Utwórz' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);

  await page.getByRole('link', { name: /Ustawienia/ }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { name: 'Ustawienia' })).toBeVisible();
});
