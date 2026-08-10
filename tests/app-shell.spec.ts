import { expect, test } from '@playwright/test';

test('runs the synthetic Phase 2 preview and persists profile edits', async ({
  page,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });

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
  await expect(page.getByText('Phase 2 live')).toBeVisible();
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

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ready, Jordan.' }),
  ).toBeVisible();
});

test('browses the catalog and applies one safe preview alternative', async ({
  page,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await page.getByRole('button', { name: 'Workout', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Catalog', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('28 movements. Every decision has metadata.'),
  ).toBeVisible();
  await expect(page.getByText(/incompatible options hidden/)).toBeVisible();

  await page
    .getByRole('button', { name: 'Use Push-Up in preview slot' })
    .click();
  await expect(
    page.getByText(
      'Dumbbell Bench Press → Push-Up. Only this preview slot changed.',
    ),
  ).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search catalog' }).fill('RDL');
  await expect(
    page.getByRole('button', { name: 'Inspect Barbell Romanian Deadlift' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Inspect Dumbbell Bench Press' }),
  ).toHaveCount(0);
});

test('presents onboarding as five focused editable steps', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
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

test('keeps the Phase 2 catalog responsive at supported mobile widths', async ({
  page,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const navigationTiming = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    return navigation?.domContentLoadedEventEnd ?? 0;
  });
  expect(navigationTiming).toBeLessThan(2_000);

  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await page.getByRole('button', { name: 'Workout', exact: true }).click();

  for (const width of [360, 375, 412, 430]) {
    await page.setViewportSize({ width, height: 915 });
    await expect(
      page.getByRole('heading', { name: 'Catalog', level: 1 }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await page
    .getByRole('button', { name: 'Use Push-Up in preview slot' })
    .click();
  await expect(
    page.getByText(
      'Dumbbell Bench Press → Push-Up. Only this preview slot changed.',
    ),
  ).toBeVisible();
});
