import { expect, test, type Page } from '@playwright/test';

async function openDemo(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8R3-0811')).toBeVisible();
}

test('exports every protected store, previews exact restore, verifies it, and rolls it back', async ({
  page,
}) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByText('Backup & diagnostics').click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export complete backup' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8');
  const backup = JSON.parse(text) as {
    schemaVersion: number;
    data: { stores: Record<string, unknown[]> };
  };
  expect(backup.schemaVersion).toBe(2);
  expect(Object.keys(backup.data.stores).sort()).toEqual(
    [
      'activeSessions',
      'coachTargets',
      'customExercises',
      'customMedia',
      'equipmentProfiles',
      'exerciseNotes',
      'locations',
      'profiles',
      'savedWorkouts',
    ].sort(),
  );

  await page.getByLabel('Import backup JSON').setInputFiles({
    name: 'synthetic-complete-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
  const preview = page.getByRole('dialog', {
    name: 'Complete restore preview',
  });
  await expect(preview).toBeVisible();
  await expect(preview.getByText('No changes made')).toBeVisible();
  await preview.getByRole('button', { name: 'Confirm exact restore' }).click();
  await expect(
    page.getByRole('button', { name: 'Exact local restore verified.' }),
  ).toBeVisible();
  await page.getByText('Backup & diagnostics').click();
  await expect(
    page.getByRole('button', { name: 'Roll back last restore' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Roll back last restore' }).click();
  await expect(
    page.getByRole('button', {
      name: 'Rollback complete. Pre-import local data restored.',
    }),
  ).toBeVisible();

  const tampered = structuredClone(backup) as {
    schemaVersion: number;
    data: {
      stores: Record<
        string,
        Array<{ key: string; value: Record<string, unknown> }>
      >;
    };
  };
  tampered.data.stores.profiles[0].value.displayName = '';
  await page.getByLabel('Import backup JSON').setInputFiles({
    name: 'tampered-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(tampered)),
  });
  await expect(
    page.getByText('Backup record profiles/1 is invalid.'),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Complete restore preview' }),
  ).toHaveCount(0);
});

test('meets the final semantic, keyboard, reduced-motion, and touch-target checks', async ({
  page,
}) => {
  await openDemo(page);
  await page.keyboard.press('Home');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();

  const issues = await page.evaluate(() => {
    const failures: string[] = [];
    const ids = [...document.querySelectorAll<HTMLElement>('[id]')].map(
      (item) => item.id,
    );
    if (new Set(ids).size !== ids.length) failures.push('duplicate ids');
    if (document.querySelectorAll('main').length !== 1)
      failures.push('main landmark');
    if (!document.querySelector('nav[aria-label="Primary navigation"]'))
      failures.push('navigation landmark');
    document.querySelectorAll('img').forEach((image) => {
      if (!image.hasAttribute('alt')) failures.push('image without alt');
    });
    document
      .querySelectorAll<HTMLElement>('button, a, input, select, textarea')
      .forEach((element) => {
        const label =
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          element.closest('label')?.textContent ||
          element.textContent;
        if (!label?.trim()) failures.push(`unnamed ${element.tagName}`);
      });
    return failures;
  });
  expect(issues).toEqual([]);

  for (const name of [
    'Today',
    'Workout',
    'Catalog',
    'Progress',
    'Plan',
    'Settings',
  ]) {
    const box = await page
      .getByRole('button', { name, exact: true })
      .boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: /Open demonstration for/ }).click();
  const animation = await page
    .locator('.guide-stage i')
    .evaluate((item) => getComputedStyle(item).animationName);
  expect(animation).toBe('none');
});

test('installs a controlled service worker and reloads the app shell offline', async ({
  context,
  page,
}) => {
  await openDemo(page);
  const manifest = await page.evaluate(async () => {
    const response = await fetch(
      '/Workout-Conductor-Rebuild/manifest.webmanifest',
    );
    return (await response.json()) as {
      display: string;
      scope: string;
      start_url: string;
      icons: { purpose?: string }[];
    };
  });
  expect(manifest.display).toBe('standalone');
  expect(manifest.scope).toBe('/Workout-Conductor-Rebuild/');
  expect(manifest.start_url).toBe('/Workout-Conductor-Rebuild/');
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('WC-P8R3-0811')).toBeVisible();
  expect(
    await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
  ).toBe(true);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('WC-P8R3-0811')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
