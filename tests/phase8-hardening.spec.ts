import { expect, test } from '@playwright/test';

async function openDemo(page: import('@playwright/test').Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8UX-0814')).toBeVisible();
}

test('QA-P8-002/003/004/005/009/010 hardens readiness and active logging', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('combobox', { name: 'Energy' }).selectOption('1');
  await page.getByRole('combobox', { name: 'Sleep' }).selectOption('1');
  await page.getByRole('combobox', { name: 'Soreness' }).selectOption('5');
  await page.getByRole('combobox', { name: 'Motivation' }).selectOption('1');
  await page
    .getByRole('combobox', { name: 'Joint discomfort' })
    .selectOption('severe');
  await page
    .getByRole('combobox', { name: 'Time pressure' })
    .selectOption('high');
  await page.getByRole('button', { name: 'Apply readiness' }).click();
  await expect(page.getByRole('button', { name: 'Applied' })).toBeVisible();
  await page.getByRole('button', { name: 'Review generated workout' }).click();
  await expect(page.locator('.exercise-row')).toHaveCount(5);
  await expect(page.locator('.exercise-row').first()).toContainText('4 RIR');

  await page.getByRole('button', { name: 'Start workout' }).click();
  const guideOpener = page.getByRole('button', {
    name: /Open demonstration for/,
  });
  await guideOpener.focus();
  await guideOpener.click();
  const guide = page.getByRole('dialog');
  await expect(guide.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
  await expect(guideOpener).toBeFocused();

  await page.getByRole('button', { name: 'Add ramp' }).click();
  await expect(page.getByRole('spinbutton', { name: 'RIR' })).toHaveValue('4');
  await page.getByRole('spinbutton', { name: 'Reps' }).fill('0');
  await expect(page.getByRole('button', { name: 'Log set' })).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Reps' }).fill('8');
  await page.getByRole('button', { name: 'Log set' }).evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.locator('.completed-set-row')).toHaveCount(1);

  await page.getByText('Plate Math', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Target weight' }).fill('-5');
  await expect(
    page.getByText('Enter a nonnegative target weight.'),
  ).toBeVisible();
});

test('QA-P8-001/007 gives actionable onboarding validation and preserves decimals', async ({
  page,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Set up my coach' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Mon' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  const bodyweight = page.getByRole('spinbutton', {
    name: 'Optional bodyweight (lb)',
  });
  await bodyweight.fill('0');
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Bodyweight must be greater than 0 and no more than 1000.',
  );
  await expect(bodyweight).toBeFocused();
  await bodyweight.fill('182.5');
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByText('WC-P8UX-0814')).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('textbox', { name: 'Profile name' }).fill('Decimal QA');
  await page.getByRole('button', { name: 'Save local profile' }).click();
  await expect(
    page.getByText(
      'Profile, settings, and saved locations were written and verified.',
    ),
  ).toBeVisible();
});

test('QA-P8-005 stores one reusable workout after rapid repeated activation', async ({
  page,
}) => {
  await openDemo(page);
  await page
    .getByRole('button', { name: 'Save workout' })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(page.getByText(/saved for reuse in Plan/)).toBeVisible();
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.locator('.saved-workout-card')).toHaveCount(1);
});
