import { expect, test } from '@playwright/test';

test('runs the synthetic Phase 1 preview and persists profile edits', async ({
  page,
}) => {
  await page.goto('./');

  await expect(
    page.getByRole('heading', {
      name: 'Your training, intelligently arranged.',
    }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Ready, Demo.' }),
  ).toBeVisible();
  await expect(page.getByText('Phase 1 live')).toBeVisible();
  await expect(page.getByText('Synthetic demo', { exact: true })).toBeVisible();

  const duration = page.getByRole('combobox', { name: 'Workout length' });
  await duration.selectOption('30');
  await expect(duration).toHaveValue('30');
  await page.getByRole('button', { name: 'Review workout preview' }).click();
  await expect(page.getByText('Dumbbell Bench Press')).toBeVisible();

  await page.getByRole('button', { name: 'Plan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Plan', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Demo Home Gym')).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('textbox', { name: 'Profile name' }).fill('Jordan');
  await page.getByRole('button', { name: 'Save local profile' }).click();
  await expect(
    page.getByText(
      'Profile, settings, and saved locations were written and verified.',
    ),
  ).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ready, Jordan.' }),
  ).toBeVisible();
});

test('presents onboarding as five focused editable steps', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Set up my coach' }).click();

  await expect(
    page.getByRole('heading', { name: 'Goals', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Schedule', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Places', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Style', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Guardrails', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Finish setup' }),
  ).toBeEnabled();
});
