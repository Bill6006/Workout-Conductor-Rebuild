import { expect, test } from '@playwright/test';

test('renders an Android-ready Phase 0 shell with working navigation', async ({
  page,
}) => {
  await page.goto('./');

  await expect(
    page.getByRole('heading', { name: 'Ready when you are.' }),
  ).toBeVisible();
  await expect(page.getByText('Build WC-P0-0810')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Plan' }).click();
  await expect(page.getByRole('heading', { name: 'Plan' })).toBeVisible();
  await expect(page.getByText('WC-P0-0810')).toBeVisible();

  await page.getByRole('button', { name: 'Today' }).click();
  await expect(
    page.getByRole('button', { name: /start workout/i }),
  ).toBeDisabled();
});
