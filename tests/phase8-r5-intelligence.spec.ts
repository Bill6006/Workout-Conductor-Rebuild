import { expect, test, type Page } from '@playwright/test';

async function openDemo(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8R5-0814')).toBeVisible();
}

test('R5 exposes history-backed time and structure controls without exceeding mobile layout', async ({
  page,
}) => {
  await openDemo(page);
  await expect(
    page.getByText('Built from your completed training'),
  ).toBeVisible();
  const duration = page.getByRole('combobox', { name: 'Workout length' });
  await expect(duration.locator('option')).toHaveCount(5);
  await duration.selectOption('60');
  await expect(
    page.getByText(/(Recalibrated to|Rechecked) 60 min/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Straight sets' }).click();
  await expect(page.getByText(/straight/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Supersets' }).click();
  await expect(page.getByText(/superset/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Drop sets' }).click();
  await expect(page.getByText(/drop-set/).first()).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('R5 renders a keyboard-accessible date-effective monthly attendance calendar', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Plan' }).click();
  await expect(page.getByText('Training attendance')).toBeVisible();
  const previous = page.getByRole('button', { name: 'Previous month' });
  const next = page.getByRole('button', { name: 'Next month' });
  for (const control of [previous, next]) {
    const bounds = await control.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    await control.focus();
    await expect(control).toBeFocused();
  }
  const heading = page.locator('#training-calendar-title');
  const original = await heading.textContent();
  await previous.press('Enter');
  await expect(heading).not.toHaveText(original ?? '');
  const currentMonth = page.getByRole('button', {
    name: 'Return to current month',
  });
  const currentBounds = await currentMonth.boundingBox();
  expect(currentBounds?.height).toBeGreaterThanOrEqual(44);
  await currentMonth.press('Enter');
  await expect(heading).toHaveText(original ?? '');
  await next.press('Space');
  await expect(heading).not.toHaveText(original ?? '');
  await currentMonth.click();
  await expect(heading).toHaveText(original ?? '');
  await expect(page.getByText('Future dates stay neutral')).toBeVisible();
});

test('R5 Alternative Finder uses the real profile and labels scores as heuristics', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Catalog' }).click();
  await expect(page.getByText('Alternative Finder')).toBeVisible();
  await expect(page.getByText('Ranked for Demo Home Gym')).toBeVisible();
  await expect(page.getByText(/fit score/).first()).toBeVisible();
  await expect(
    page.getByText(
      /Fit scores are transparent ranking heuristics, not scientific probabilities/,
    ),
  ).toBeVisible();
  await expect(page.getByText('Safe swap preview')).toHaveCount(0);
  await expect(page.getByText('Selected preview slot')).toHaveCount(0);
});
