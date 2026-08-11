import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const evidenceDirectory = process.env.CAPTURE_PHASE8_EVIDENCE
  ? path.resolve('docs/screenshots/phase-8')
  : path.resolve('test-results/phase8-visuals');

async function saveViewport(
  page: import('@playwright/test').Page,
  filename: string,
) {
  await page.screenshot({
    path: path.join(evidenceDirectory, filename),
    animations: 'disabled',
  });
}

test('captures the final mobile data-safety and demonstration evidence', async ({
  page,
}) => {
  await mkdir(evidenceDirectory, { recursive: true });
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8H-0811')).toBeVisible();
  const offlineReady = page.getByRole('button', {
    name: 'Offline app shell ready',
  });
  if (await offlineReady.isVisible()) await offlineReady.click();
  const announcement = page.getByRole('button', {
    name: 'Synthetic demo profile saved locally.',
  });
  if (await announcement.isVisible()) await announcement.click();
  await saveViewport(page, 'final-today-412x915.png');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByText('Profile & goals', { exact: true }).click();
  await page.getByText('Training style', { exact: true }).click();
  await page.getByText('Locations & equipment', { exact: true }).click();
  await page.getByText('Backup & diagnostics').click();
  await page
    .getByRole('button', { name: 'Export complete backup' })
    .scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 320);
  if (await offlineReady.isVisible()) await offlineReady.click();
  if (await announcement.isVisible()) await announcement.click();
  await saveViewport(page, 'data-safety-412x915.png');

  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: /Open demonstration for/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await saveViewport(page, 'production-guide-412x915.png');
});
