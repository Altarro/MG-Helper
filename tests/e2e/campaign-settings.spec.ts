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
  await page.locator('#campaign-description').fill('Kampania E2E dla ustawień kampanii');
  await page.getByRole('dialog').getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('campaign settings: custom clue type is added and default can be disabled', async ({ page }) => {
  await createCampaign(page, 'E2E Campaign Settings');

  await page.getByRole('link', { name: /Ustawienia/ }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.getByRole('button', { name: 'Ustawienia kampanii' }).click();

  const clueTypeCard = page
    .locator('.app-input-shell')
    .filter({ hasText: 'Typy wskazówek' })
    .first();
  await expect(clueTypeCard).toBeVisible();

  await clueTypeCard.getByPlaceholder('Dodaj custom dla: typy wskazówek').fill('Dowód');
  await clueTypeCard.getByRole('button', { name: 'Dodaj' }).click();
  await expect(clueTypeCard.getByText('Dowód')).toBeVisible();

  await clueTypeCard.getByText('Zdarzenie').click();
  await page.getByRole('button', { name: 'Zapisz ustawienia kampanii' }).click();
  await expect(page.getByText('Ustawienia kampanii zapisane')).toBeVisible();

  await page.getByRole('link', { name: /Wskazówki/ }).click();
  await expect(page).toHaveURL(/#\/clues$/);
  await page.getByRole('button', { name: 'Nowa wskazówka' }).first().click();
  await page.locator('#clue-name').fill('Wskazówka custom E2E');

  await expect(page.getByRole('button', { name: 'Dowód' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zdarzenie' })).toHaveCount(0);
});
