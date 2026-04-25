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
  await page.locator('#campaign-description').fill('Kampania hardening E2E');
  await page.getByRole('dialog').getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

async function createSession(page: import('@playwright/test').Page, sessionName: string) {
  await page.getByRole('link', { name: /Sesje/ }).click();
  await expect(page).toHaveURL(/#\/sessions$/);
  await page.getByRole('button', { name: 'Nowa sesja' }).first().click();
  await page.locator('#session-name').fill(sessionName);
  await page.locator('#session-summary').fill('Sesja do testu hardening');
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page).toHaveURL(/#\/sessions\/.+/);
  await expect(page.getByRole('heading', { name: sessionName })).toBeVisible();
}

test('settings confirm modal supports keyboard close and focus restore', async ({ page }) => {
  await createCampaign(page, 'E2E Modal Settings');

  await page.getByRole('link', { name: /Ustawienia/ }).click();
  await expect(page).toHaveURL(/#\/settings$/);

  const openDialogButton = page.getByRole('button', { name: 'Załaduj dane demo' });
  await openDialogButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Załaduj dane demonstracyjne' })).toBeVisible();

  const cancelButton = dialog.getByRole('button', { name: 'Anuluj' });
  await expect(cancelButton).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openDialogButton).toBeFocused();

  await openDialogButton.click();
  await expect(dialog).toBeVisible();

  // Click on viewport corner (outside modal panel) to trigger backdrop close.
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
});

test('session picker modal closes with Escape and returns focus', async ({ page }) => {
  await createCampaign(page, 'E2E Modal Session');
  await createSession(page, 'Sesja Modal E2E');

  const addItemsButton = page.getByRole('button', { name: 'Dodaj do sesji: Przedmioty' });
  await addItemsButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dodaj przedmioty z kampanii' })).toBeVisible();

  const searchInput = dialog.getByPlaceholder('Szukaj...');
  await expect(searchInput).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(addItemsButton).toBeVisible();
  await addItemsButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
