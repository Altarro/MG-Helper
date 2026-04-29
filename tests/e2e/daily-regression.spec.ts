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
  await page.locator('#campaign-description').fill('Kampania daily regression');
  await page.getByRole('dialog').getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('fronts: create flow and category select are clickable', async ({ page }) => {
  await createCampaign(page, 'E2E Fronts Pack');

  await page.getByRole('link', { name: /Fronty/ }).click();
  await expect(page).toHaveURL(/#\/fronts$/);
  await expect(page.getByRole('heading', { name: 'Fronty' })).toBeVisible();

  await page.getByRole('button', { name: 'Nowy front' }).first().click();
  await page.locator('#front-name').fill('Front E2E');
  const categorySelect = page.locator('#front-category');
  const initialCategory = await categorySelect.inputValue();
  await categorySelect.selectOption({ index: 1 });
  await expect(categorySelect).not.toHaveValue(initialCategory);

  await page.getByRole('button', { name: 'Dodaj stawkę' }).click();
  await page.getByPlaceholder('Stawka 1...').fill('Stawka testowa');
  await page.getByRole('button', { name: 'Utwórz' }).click();

  await expect(page).toHaveURL(/#\/fronts\/.+/);
  await expect(page.getByRole('heading', { name: 'Front E2E' })).toBeVisible();
});

test('sessions: create, open detail and navigate to live view', async ({ page }) => {
  await createCampaign(page, 'E2E Sessions Pack');

  await page.getByRole('link', { name: /Sesje/ }).click();
  await expect(page).toHaveURL(/#\/sessions$/);
  await page.getByRole('button', { name: 'Nowa sesja' }).first().click();

  await page.locator('#session-name').fill('Sesja E2E');
  await page.locator('#session-summary').fill('Streszczenie smoke');
  await page.getByRole('button', { name: 'Utwórz' }).click();

  await expect(page).toHaveURL(/#\/sessions\/.+/);
  await expect(page.getByRole('heading', { name: 'Sesja E2E' })).toBeVisible();

  await page.getByRole('link', { name: 'Na żywo' }).click();
  await expect(page).toHaveURL(/#\/sessions\/.+\/live$/);
  await expect(page.getByText('Sesja na żywo')).toBeVisible();
});

test('settings: system and generator tabs with key controls are clickable', async ({ page }) => {
  await createCampaign(page, 'E2E Settings Pack');

  await page.getByRole('link', { name: /Ustawienia/ }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { name: 'Ustawienia' })).toBeVisible();

  await page.getByRole('button', { name: 'Ustawienia systemowe' }).click();
  await expect(page.getByRole('heading', { name: 'Kopie zapasowe' })).toBeVisible();

  await page.getByRole('button', { name: 'Ustawienia generatora' }).click();
  await expect(page.getByRole('heading', { name: 'Ustawienia generatora' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Przygotuj domyslny zestaw' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dodaj paczki demo PL/EN' })).toBeVisible();
});
