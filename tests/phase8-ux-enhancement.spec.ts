import { expect, test, type Page } from '@playwright/test';

async function openActiveWorkout(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8UX-0814')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Workout length' })
    .selectOption('15');
  await expect(page.getByText(/Recalibrated to 15 min/)).toBeVisible();
  await page.getByRole('button', { name: 'Start workout' }).click();
}

async function skipEveryRemainingExercise(page: Page) {
  const skip = page.getByRole('button', { name: 'Skip for now' });
  for (let index = 0; index < 20 && (await skip.isEnabled()); index += 1) {
    await skip.click();
    await page.waitForTimeout(500);
  }
  await expect(
    page.getByRole('button', { name: 'Finish workout' }),
  ).toBeVisible();
}

test('sticky icon navigator is keyboard and mobile/landscape accessible', async ({
  page,
}) => {
  await openActiveWorkout(page);
  const shortcuts = page.getByRole('navigation', { name: 'Workout shortcuts' });
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 915, height: 412 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(shortcuts).toBeVisible();
    for (const name of ['Current', 'Queue', 'Note', 'Plates', 'Skip for now']) {
      const action = shortcuts.getByRole('button', { name });
      await expect(action).toBeVisible();
      await action.focus();
      await expect(action).toBeFocused();
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }

  await shortcuts.getByRole('button', { name: 'Note' }).click();
  await expect(
    page.getByRole('textbox', { name: /Grip, seat height/ }),
  ).toBeFocused();
  await shortcuts.getByRole('button', { name: 'Plates' }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Target weight' }),
  ).toBeFocused();
  await shortcuts.getByRole('button', { name: 'Queue' }).click();
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Exercise queue' }),
  ).toBeHidden();
});

test('skip-for-now survives verified reload, pause/resume, and returns without losing a superset record', async ({
  page,
}) => {
  await openActiveWorkout(page);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.waitForTimeout(100);
  await expect(page.locator('.active-exercise-card--superset')).toBeVisible();
  const warmupSkip = page.getByRole('button', { name: 'Skip', exact: true });
  if (await warmupSkip.isVisible()) await warmupSkip.click();
  await page.getByRole('button', { name: 'Log set' }).click();
  await page.waitForTimeout(550);
  await expect(page.locator('.completed-set-row')).toHaveCount(1);

  const deferredName = await page
    .locator('#active-exercise-title')
    .textContent();
  await page
    .getByRole('button', { name: 'Skip for now' })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await page.waitForTimeout(550);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.getByRole('button', { name: 'Queue' }).click();
  const queue = page.getByRole('dialog', { name: 'Exercise queue' });
  const skipped = queue.locator("article[data-status='skipped']");
  await expect(skipped).toHaveCount(2);
  await expect(skipped.filter({ hasText: deferredName ?? '' })).toHaveCount(1);
  await skipped
    .filter({ hasText: deferredName ?? '' })
    .getByRole('button', { name: 'Return' })
    .click();
  await expect(page.locator('#active-exercise-title')).toHaveText(
    deferredName ?? '',
  );
  await expect(page.locator('.completed-set-row')).toHaveCount(1);
});

test('finish warning records omissions and celebrates once only after verified save', async ({
  page,
}) => {
  await openActiveWorkout(page);
  await skipEveryRemainingExercise(page);
  await page.getByRole('button', { name: 'Finish workout' }).click();
  const warning = page.getByRole('alertdialog', {
    name: 'Finish without these exercises?',
  });
  await expect(warning.getByRole('listitem')).not.toHaveCount(0);
  await expect(
    warning.getByRole('button', { name: 'Return to missed exercises' }),
  ).toBeFocused();
  await warning
    .getByRole('button', { name: 'Finish without them' })
    .evaluate((button) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole('status')).toContainText('Workout complete!');
  await expect(page.locator('.completion-confetti i')).toHaveCount(18);
  await expect(page.getByText(/intentionally omitted/).first()).toBeVisible();
  await page.waitForTimeout(2300);
  await expect(page.locator('.completion-celebration')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Progress', exact: true }).click();
  await expect(page.locator('.history-card').first()).toContainText('0 lb');
  await expect(page.locator('.completion-celebration')).toHaveCount(0);
});

test('reduced motion replaces animated confetti with the nonanimated completion status', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openActiveWorkout(page);
  await skipEveryRemainingExercise(page);
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('button', { name: 'Finish without them' }).click();
  await expect(page.getByRole('status')).toContainText('Workout complete!');
  await expect(page.locator('.completion-confetti')).toHaveCSS(
    'display',
    'none',
  );
  await expect(page.locator('.completion-celebration > span')).toHaveCSS(
    'animation-name',
    'none',
  );
});
