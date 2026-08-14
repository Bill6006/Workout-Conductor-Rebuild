import { expect, test, type Page } from '@playwright/test';

async function openActiveWorkout(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8UXR1-0814')).toBeVisible();
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
  const actionNames = ['Current', 'Queue', 'Note', 'Plates', 'Skip for now'];
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 412, height: 915 },
    // Effective CSS viewport for a 915 px landscape screen at 200% zoom.
    { width: 458, height: 412 },
    { width: 667, height: 375 },
    { width: 740, height: 360 },
    { width: 915, height: 412 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(shortcuts).toBeVisible();
    for (const name of actionNames) {
      const action = shortcuts.getByRole('button', { name });
      await expect(action).toBeVisible();
      await action.focus();
      await expect(action).toBeFocused();
    }

    const targets = await shortcuts.locator('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const bounds = button.getBoundingClientRect();
        const center = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
        const style = getComputedStyle(button);
        return {
          label: button.getAttribute('aria-label'),
          height: bounds.height,
          width: bounds.width,
          centerIsInteractive: Boolean(center && button.contains(center)),
          display: style.display,
          opacity: Number(style.opacity),
          pointerEvents: style.pointerEvents,
          visibility: style.visibility,
        };
      }),
    );
    expect(targets.map(({ label }) => label)).toEqual(actionNames);
    for (const target of targets) {
      expect(
        target.height,
        `${target.label} height at ${viewport.width}x${viewport.height}`,
      ).toBeGreaterThanOrEqual(44);
      expect(target.width).toBeGreaterThan(0);
      expect(target.centerIsInteractive).toBe(true);
      expect(target.display).not.toBe('none');
      expect(target.opacity).toBeGreaterThan(0);
      expect(target.pointerEvents).not.toBe('none');
      expect(target.visibility).toBe('visible');
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 915, height: 412 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const scaledHeights = await shortcuts
    .locator('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height),
    );
  expect(scaledHeights.every((height) => height >= 44)).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.removeProperty('font-size');
  });

  await shortcuts.getByRole('button', { name: 'Current' }).press('Enter');
  await expect(page.locator('#active-exercise-title')).toBeVisible();
  await shortcuts.getByRole('button', { name: 'Queue' }).press('Space');
  await expect(
    page.getByRole('dialog', { name: 'Exercise queue' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

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

  const queueTarget = await shortcuts
    .getByRole('button', { name: 'Queue' })
    .boundingBox();
  expect(queueTarget).not.toBeNull();
  await page.touchscreen.tap(
    queueTarget!.x + queueTarget!.width / 2,
    queueTarget!.y + queueTarget!.height / 2,
  );
  await expect(
    page.getByRole('dialog', { name: 'Exercise queue' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');

  const previousExercise = await page
    .locator('#active-exercise-title')
    .textContent();
  await shortcuts.getByRole('button', { name: 'Skip for now' }).press('Enter');
  await page.waitForTimeout(550);
  await expect(page.locator('#active-exercise-title')).not.toHaveText(
    previousExercise ?? '',
  );
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
