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

async function dismissTransientBanners(page: import('@playwright/test').Page) {
  const banners = [
    page.getByRole('button', { name: 'Offline app shell ready' }),
    page.getByRole('button', {
      name: 'Synthetic demo profile saved locally.',
    }),
  ];
  await page.waitForTimeout(200);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const banner of banners) {
      if (await banner.isVisible()) await banner.click({ force: true });
    }
    await page.waitForTimeout(50);
  }
}

test('captures the final mobile data-safety and demonstration evidence', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await mkdir(evidenceDirectory, { recursive: true });
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8UXR3-0814')).toBeVisible();
  await dismissTransientBanners(page);
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
  await dismissTransientBanners(page);
  await saveViewport(page, 'data-safety-412x915.png');

  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: /Open demonstration for/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await saveViewport(page, 'production-guide-412x915.png');

  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 1265, height: 900 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByText('Backup & diagnostics').click();
  await page
    .getByRole('button', { name: 'Export complete backup' })
    .scrollIntoViewIfNeeded();
  await saveViewport(page, 'data-safety-desktop-1265x900.png');
});
