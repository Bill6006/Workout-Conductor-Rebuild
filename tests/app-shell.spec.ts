import { expect, test } from '@playwright/test';

test('runs the Phase 8 accepted app on the adaptive coaching foundation and persists profile edits', async ({
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
  await expect(page.getByText('Phase 8 UX enhancement')).toBeVisible();
  await expect(page.getByText('Adaptive Coach', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Energy' }).selectOption('2');
  await page.getByRole('button', { name: 'Apply readiness' }).click();
  await expect(page.getByRole('button', { name: 'Applied' })).toBeDisabled();
  await expect(
    page.getByText('Generated locally', { exact: true }),
  ).toBeVisible();

  const duration = page.getByRole('combobox', { name: 'Workout length' });
  for (const option of ['15', '30', '45', 'default']) {
    await duration.selectOption(option);
    await expect(
      page.getByRole('status', { name: 'Recalibrating workout' }),
    ).toBeVisible();
    await expect(duration).toHaveValue(option);
    await expect(
      page.getByText(
        option === 'default'
          ? /Recalibrated to default time/
          : new RegExp(`Recalibrated to ${option} min`),
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        option === 'default'
          ? /Generated for default time/
          : new RegExp(`Generated for ${option} minutes`),
      ),
    ).toBeVisible();
  }
  await duration.selectOption('30');
  await page.getByRole('button', { name: 'Review generated workout' }).click();
  await expect(page.getByText('strength anchor')).toBeVisible();
  await expect(page.getByText('2-move superset')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Equipment status' })
    .selectOption('pull-up-bar');
  await expect(page.getByText(/1 exercise substituted/)).toBeVisible();
  await expect(page.getByText('Session only')).toBeVisible();

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

test('logs, edits, replaces, pauses, and resumes one durable active workout', async ({
  page,
}) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByText('Active workout')).toBeVisible();
  await expect(page.getByText('WC-P8UXR4-0814')).toBeVisible();
  await expect(page.getByText('Adaptive Coach', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Open demonstration for/ }).click();
  const guide = page
    .getByRole('dialog')
    .filter({ hasText: 'Original diagram guide' });
  await expect(
    guide.getByRole('button', { name: 'Pause guide' }),
  ).toBeVisible();
  await guide.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Alternatives' }).click();
  const alternatives = page.getByRole('dialog', { name: 'Alternatives' });
  await expect(alternatives.getByText(/% match/).first()).toBeVisible();
  await alternatives
    .getByRole('button', { name: 'Use this exercise' })
    .first()
    .click();
  await expect(
    page.getByText(/Only this exercise changed/).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Skip warm-up' }).click();
  const logger = page.getByRole('form', { name: /logger for/ });
  await expect(logger.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(
    '40',
  );
  await logger.getByRole('button', { name: 'Log set' }).click();
  await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();
  const editor = page.getByRole('form', { name: /Edit working set logger/ });
  await editor.getByRole('spinbutton', { name: 'Weight' }).fill('42.5');
  await editor.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.getByText('42.5 lb × 12 · 2 RIR')).toBeVisible();

  await page.getByRole('button', { name: 'Note' }).click();
  await page
    .getByRole('textbox', { name: 'Grip, seat height, setup, or form cue' })
    .fill('Synthetic cue: keep the shoulder quiet.');
  await page.getByRole('button', { name: 'Save cue memory' }).click();
  await expect(
    page.getByText(/remembered for the next session/).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Your place is saved.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Resume active workout' }).click();
  await expect(page.getByText('42.5 lb × 12 · 2 RIR')).toBeVisible();
});

test('keeps Phase 8 data controls, analytics, coaching, and logging responsive through 200 percent mobile zoom', async ({
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
  await page.getByRole('button', { name: 'Start workout' }).click();

  for (const width of [360, 375, 412, 430]) {
    await page.setViewportSize({ width, height: 915 });
    await expect(page.getByRole('form', { name: /logger for/ })).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }

  // A 360 CSS-pixel phone exposes effective 240px and 180px layout viewports
  // at 150% and 200% browser zoom. Exercise those layouts directly instead of
  // CSS `zoom`, which scales the document beyond the viewport by definition.
  for (const width of [240, 180]) {
    await page.setViewportSize({ width, height: 610 });
    await expect(page.getByRole('button', { name: 'Log set' })).toBeVisible();
    const zoomOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    const overflowElements = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')]
        .filter(
          (element) =>
            element.getBoundingClientRect().right >
            document.documentElement.clientWidth + 1,
        )
        .slice(0, 8)
        .map((element) => ({
          className: element.className,
          tag: element.tagName,
          width: Math.round(element.getBoundingClientRect().width),
          right: Math.round(element.getBoundingClientRect().right),
        })),
    );
    expect(zoomOverflow, JSON.stringify(overflowElements)).toBeLessThanOrEqual(
      1,
    );
  }
});
