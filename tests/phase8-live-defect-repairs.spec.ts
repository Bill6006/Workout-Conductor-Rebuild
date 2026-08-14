import { expect, test, type Page } from '@playwright/test';

const originalProfile = {
  schemaVersion: 1,
  id: 'primary',
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-14T12:00:00.000Z',
  onboardingComplete: true,
  primaryGoal: 'build-muscle',
  secondaryGoal: 'bigger-arms',
  experience: 'intermediate',
  weeklyFrequency: 4,
  typicalDuration: 60,
  availableDays: ['mon', 'tue', 'thu', 'sat'],
  gymAccess: 'home-gym',
  equipmentProfiles: [
    {
      id: 'original-equipment',
      name: 'Original setup',
      equipment: ['Dumbbells', 'Bench', 'Resistance bands'],
      unavailableExercises: [],
    },
  ],
  savedLocations: [
    {
      id: 'original-location',
      name: 'Original home gym',
      type: 'home-gym',
      equipmentProfileId: 'original-equipment',
    },
  ],
  activeLocationId: 'original-location',
  preferences: {
    preferredExerciseIds: [],
    dislikedExerciseIds: [],
    painLimitations: [],
    movementLimitations: [],
    shoulderLimitations: false,
    avoidBarbellSquats: false,
    trainingStyle: 'hybrid',
    allowSupersets: true,
    allowDropSets: true,
    allowCircuits: false,
    restStyle: 'guided',
    units: 'lb',
  },
  retainedOriginalField: { mustSurvive: true },
};

async function seedOriginalDatabase(page: Page) {
  await page.goto('manifest.webmanifest', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (profile) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('workout-conductor');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('workout-conductor', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('profiles');
        request.result.createObjectStore('workoutHistory');
        request.result.createObjectStore('backups');
        request.result.createObjectStore('meta');
      };
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('profiles', 'readwrite');
        transaction.objectStore('profiles').put(profile, 'primary');
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, originalProfile);
}

async function openActiveWorkout(page: Page) {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Explore with a synthetic demo profile' })
    .click();
  await expect(page.getByText('WC-P8UXR3-0814')).toBeVisible();
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
}

test('P8-RT-001 migrates original profile data and preserves the exact active slot across reload', async ({
  page,
}) => {
  await seedOriginalDatabase(page);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('WC-P8UXR3-0814')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ready, Athlete.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Your training, intelligently arranged.'),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Start workout' }).click();
  const before = await page.locator('#active-exercise-title').textContent();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Your place is saved.' }),
  ).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('button', { name: 'Resume active workout' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resume active workout' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume workout' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await expect(page.locator('#active-exercise-title')).toHaveText(before ?? '');

  const protectedState = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-conductor');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction(
      ['profiles', 'activeSessions'],
      'readonly',
    );
    const profiles = await new Promise<unknown[]>((resolve, reject) => {
      const request = transaction.objectStore('profiles').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const sessions = await new Promise<unknown[]>((resolve, reject) => {
      const request = transaction.objectStore('activeSessions').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return { profiles, sessions };
  });
  expect(protectedState.profiles).toHaveLength(2);
  expect(protectedState.profiles).toContainEqual(originalProfile);
  expect(protectedState.sessions).toHaveLength(1);
});

test('P8-RT-002 restores exact dialog launchers after every supported dismissal path', async ({
  page,
}) => {
  await openActiveWorkout(page);

  const queue = page.getByRole('button', { name: 'Queue' });
  await queue.click();
  await page.keyboard.press('Escape');
  await expect(queue).toBeFocused();

  const note = page.getByRole('button', { name: 'Note' });
  await note.click();
  await page
    .getByRole('dialog', { name: 'Exercise note' })
    .getByRole('button', { name: 'Close' })
    .click();
  await expect(note).toBeFocused();

  const plates = page.getByRole('button', { name: 'Plates' });
  await plates.click();
  const plateDialog = page.getByRole('dialog', { name: 'Plate Math' });
  await plateDialog.locator('..').click({ position: { x: 2, y: 2 } });
  await expect(plates).toBeFocused();

  const options = page.getByRole('button', { name: 'Set options' });
  await options.click();
  await page.keyboard.press('Escape');
  await expect(options).toBeFocused();

  const alternatives = page.getByRole('button', { name: 'Alternatives' });
  await alternatives.click();
  await page
    .getByRole('dialog', { name: 'Alternatives' })
    .getByRole('button', { name: 'Close' })
    .click();
  await expect(alternatives).toBeFocused();

  await skipEveryRemainingExercise(page);
  const finish = page.getByRole('button', { name: 'Finish workout' });
  await finish.click();
  await page.keyboard.press('Escape');
  await expect(finish).toBeFocused();
});

test('P8-RT-003 keeps a grouped final drop after every working round under rapid activation and reload', async ({
  page,
}) => {
  await openActiveWorkout(page);
  const group = await page.evaluate(async () => {
    type StoredMove = {
      prescriptionId: string;
      warmupSets: unknown[];
      dropSet: unknown;
    };
    type StoredBlock = {
      kind: 'exercise' | 'superset' | 'circuit';
      prescription?: StoredMove;
      moves?: StoredMove[];
      rounds?: number;
    };
    type StoredSession = {
      workout: { blocks: StoredBlock[] };
      currentBlockIndex: number;
      deferredPrescriptionIds: string[];
      updatedAt: string;
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-conductor');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = database.transaction('activeSessions', 'readonly');
    const sessions = await new Promise<StoredSession[]>((resolve, reject) => {
      const request = read.objectStore('activeSessions').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const active = sessions[0];
    const groupIndex = active.workout.blocks.findIndex(
      (block) => block.kind === 'superset',
    );
    if (groupIndex < 0) throw new Error('Expected generated superset.');
    const block = active.workout.blocks[groupIndex];
    for (const move of block.moves ?? []) {
      move.warmupSets = [];
      move.dropSet = {
        reps: '8–12',
        loadReductionPercent: 25,
        rationale: 'Final intensity work after all superset rounds.',
      };
    }
    active.currentBlockIndex = groupIndex;
    active.deferredPrescriptionIds = active.workout.blocks
      .slice(0, groupIndex)
      .flatMap((candidate) =>
        candidate.kind === 'exercise'
          ? [candidate.prescription!.prescriptionId]
          : (candidate.moves ?? []).map((move) => move.prescriptionId),
      );
    active.updatedAt = new Date().toISOString();
    const write = database.transaction('activeSessions', 'readwrite');
    write.objectStore('activeSessions').put(active);
    await new Promise<void>((resolve, reject) => {
      write.oncomplete = () => resolve();
      write.onerror = () => reject(write.error);
    });
    database.close();
    return {
      rounds: block.rounds!,
      moves: block.moves!.length,
    };
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Workout', exact: true }).click();
  const workingSlots = group.rounds * group.moves;
  for (let index = 0; index < workingSlots; index += 1) {
    const expectedRound = Math.floor(index / group.moves) + 1;
    await expect(page.locator('.active-exercise-card__topline')).toContainText(
      new RegExp(`round ${expectedRound} of ${group.rounds}`, 'i'),
    );
    const logger = page.getByRole('form', { name: /logger for/ });
    await expect(logger).not.toHaveAccessibleName(/Drop set logger/);
    const log = logger.getByRole('button', { name: 'Log set' });
    if (index === 0) {
      await log.evaluate((button) => {
        button.click();
        button.click();
      });
    } else {
      await expect(log).toBeEnabled();
      await log.click();
    }
    await expect(page.locator('.completed-set-row')).toHaveCount(index + 1);
    await page.waitForTimeout(500);
    if (index === group.moves - 1) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Workout', exact: true }).click();
    }
  }

  await expect(
    page.getByRole('form', { name: /Drop set logger for/ }),
  ).toBeVisible();
  await expect(page.locator('.active-exercise-card__topline')).toContainText(
    'Final intensity set',
  );
  await expect(page.locator('.completed-set-row')).toHaveCount(workingSlots);
});

test('P8-RT-004 exports and restores a complete backup containing original and migrated profiles', async ({
  page,
}) => {
  await seedOriginalDatabase(page);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('WC-P8UXR3-0814')).toBeVisible();
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
    data: { stores: Record<string, Array<{ key: string; value: unknown }>> };
  };
  expect(backup.data.stores.profiles).toHaveLength(2);
  expect(backup.data.stores.profiles).toContainEqual({
    key: 'primary',
    value: originalProfile,
  });

  await page.getByLabel('Import backup JSON').setInputFiles({
    name: 'original-profile-complete-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
  const preview = page.getByRole('dialog', {
    name: 'Complete restore preview',
  });
  await expect(preview).toBeVisible();
  await preview.getByRole('button', { name: 'Confirm exact restore' }).click();
  await expect(
    page.getByRole('button', { name: 'Exact local restore verified.' }),
  ).toBeVisible();
});
