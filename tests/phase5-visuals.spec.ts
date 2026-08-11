import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const evidenceDirectory = process.env.CAPTURE_PHASE6_EVIDENCE
  ? path.resolve('docs/screenshots/phase-6')
  : path.resolve('test-results/phase6-visuals');

async function startSyntheticWorkout(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('Phase 8 repair')).toBeVisible();
}

async function saveViewport(page: Page, filename: string) {
  await page.screenshot({
    path: path.join(evidenceDirectory, filename),
    animations: 'disabled',
  });
}

test('captures the Phase 6 mobile and desktop review evidence', async ({
  page,
}) => {
  await mkdir(evidenceDirectory, { recursive: true });
  await page.setViewportSize({ width: 412, height: 915 });
  await startSyntheticWorkout(page);
  await page.getByRole('combobox', { name: 'Energy' }).selectOption('1');
  await page.getByRole('button', { name: 'Apply readiness' }).click();
  await expect(page.getByRole('button', { name: 'Applied' })).toBeDisabled();
  await page
    .getByRole('heading', { name: 'Check today’s readiness' })
    .scrollIntoViewIfNeeded();
  await saveViewport(page, 'readiness-coach-412x915.png');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByText('Adaptive Coach', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await saveViewport(page, 'active-workout-412x915.png');

  await page.getByRole('button', { name: 'Apply easier targets' }).click();
  await expect(
    page.getByText(/Completed and manually corrected sets stay untouched/),
  ).toBeVisible();
  await saveViewport(page, 'coach-confirmation-412x915.png');
  await page.getByRole('button', { name: 'Keep plan' }).click();

  await page.getByRole('button', { name: 'Alternatives' }).click();
  await expect(
    page.getByRole('heading', { name: 'Alternatives' }),
  ).toBeVisible();
  await saveViewport(page, 'alternatives-412x915.png');
  await page.getByRole('button', { name: 'Close' }).click();

  await page.setViewportSize({ width: 360, height: 800 });
  await saveViewport(page, 'set-logging-360x800.png');

  await page.setViewportSize({ width: 412, height: 915 });
  for (let block = 0; block < 4; block += 1) {
    await page.getByRole('button', { name: 'Set options' }).click();
    await page.getByRole('button', { name: 'Skip this block' }).click();
  }
  await expect(page.getByText(/Superset · round 1 of/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await saveViewport(page, 'superset-412x915.png');

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your place is saved.' }),
  ).toBeVisible();
  await saveViewport(page, 'paused-resume-412x915.png');
  await page.getByRole('button', { name: 'Resume workout' }).click();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await saveViewport(page, 'active-workout-desktop-1280x900.png');
});
