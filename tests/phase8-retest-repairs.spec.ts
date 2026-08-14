import { expect, test, type Page } from '@playwright/test';

async function openDemo(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8UXR3-0814')).toBeVisible();
}

async function rapidSetActivation(page: Page) {
  await page.getByRole('button', { name: 'Log set' }).click();
  // Resolve the button again after React advances the slot. This reproduces
  // the click-through failure where the second activation lands on the newly
  // rendered working set rather than replaying the detached first button.
  await page.getByRole('button', { name: 'Log set' }).click({ force: true });
}

async function skipCurrentExercise(page: Page) {
  await page.getByRole('button', { name: 'Skip for now' }).click();
}

async function finishWithoutRemaining(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip for now' });
  for (let index = 0; index < 20 && (await skip.isEnabled()); index += 1) {
    await skip.click();
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('button', { name: 'Finish without them' }).click();
}

test('QA-P8-005 latches warm-up, ordinary, and superset set creation plus completion save', async ({
  page,
}) => {
  await openDemo(page);
  await page
    .getByRole('combobox', { name: 'Workout length' })
    .selectOption('15');
  await expect(page.getByText(/Recalibrated to 15 min/)).toBeVisible();
  await page.getByRole('button', { name: 'Start workout' }).click();

  await page.getByRole('button', { name: 'Add warm-up' }).click();
  await rapidSetActivation(page);
  await page.waitForTimeout(550);
  await expect(page.locator('.completed-set-row')).toHaveCount(1);
  await expect(page.getByRole('form', { name: /Set 1 logger/ })).toBeVisible();

  await rapidSetActivation(page);
  await page.waitForTimeout(550);
  await expect(page.locator('.completed-set-row')).toHaveCount(2);
  await expect(page.getByRole('form', { name: /Set 2 logger/ })).toBeVisible();

  await page.getByRole('spinbutton', { name: 'Reps' }).fill('999');
  await expect(page.getByText('Reps must be between 1 and 200.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log set' })).toBeDisabled();

  await skipCurrentExercise(page);
  const optionalWarmupSkip = page.getByRole('button', {
    name: 'Skip warm-up',
    exact: true,
  });
  if (await optionalWarmupSkip.isVisible()) await optionalWarmupSkip.click();
  await rapidSetActivation(page);
  await page.waitForTimeout(550);
  await expect(page.locator('.completed-set-row')).toHaveCount(1);
  await expect(
    page.getByRole('form', { name: /Round 1 logger/ }),
  ).toBeVisible();

  await finishWithoutRemaining(page);
  const save = page.getByRole('button', { name: 'Save this workout' });
  await save.evaluate((button) => {
    button.click();
    button.click();
  });
  await expect(page.getByText(/saved for reuse in Plan/)).toBeVisible();
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.locator('.saved-workout-card')).toHaveCount(1);
});

test('QA-P8R-011 preserves an active lb load and converts history after a kg preference change', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Skip warm-up' }).click();
  await page.getByRole('spinbutton', { name: 'Weight' }).fill('43');
  await page.getByRole('spinbutton', { name: 'Reps' }).fill('9');
  await page.getByRole('button', { name: 'Log set' }).click();
  await page.waitForTimeout(550);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('combobox', { name: 'Units' }).selectOption('kg');
  await page.getByRole('spinbutton', { name: 'Bodyweight (kg)' }).fill('82.5');
  await page.getByRole('button', { name: 'Save local profile' }).click();
  await expect(
    page.getByText(
      'Profile, settings, and saved locations were written and verified.',
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(
    '43',
  );
  await expect(page.locator('.set-logger__input-wrap small')).toHaveText('lb');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(
    '43',
  );
  await expect(page.locator('.set-logger__input-wrap small')).toHaveText('lb');

  await finishWithoutRemaining(page);
  await page.getByRole('button', { name: 'Progress' }).click();
  await expect(page.getByText(/19\.5 kg × 9/)).toBeVisible();
  await expect(page.getByText(/43 kg × 9/)).toHaveCount(0);
  const completedSession = page.locator('.history-card').first();
  await expect(completedSession).toContainText('176 kg');
  await expect(completedSession).not.toContainText('387 kg');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('combobox', { name: 'Units' }).selectOption('lb');
  await page.getByRole('button', { name: 'Save local profile' }).click();
  await page.getByRole('button', { name: 'Progress' }).click();
  await expect(page.getByText(/43 lb × 9/)).toBeVisible();
  await expect(page.locator('.history-card').first()).toContainText('387 lb');
});

test('QA-P8R-013 exposes Catalog as a keyboard-reachable primary destination at mobile and landscape widths', async ({
  page,
}) => {
  await openDemo(page);
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 915, height: 412 },
  ]) {
    await page.setViewportSize(viewport);
    const catalog = page.getByRole('button', { name: 'Catalog', exact: true });
    await expect(catalog).toBeVisible();
    await catalog.focus();
    await expect(catalog).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Catalog', level: 1 }),
    ).toBeVisible();
    await expect(catalog).toHaveAttribute('aria-current', 'page');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});
