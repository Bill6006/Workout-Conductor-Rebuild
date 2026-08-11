import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../domain/defaults';
import { BackupFoundationSchema } from '../domain/models';
import { CustomExerciseSchema } from '../catalog/schema';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../engine/workoutGenerator/generateWorkout';
import { createActiveSession } from '../features/activeWorkout/session';
import { createSavedWorkout } from '../features/savedWorkouts/schema';
import {
  CompleteBackupSchema,
  createCompleteBackup,
  hasRollbackPoint,
  previewBackup,
  restoreBackup,
  rollbackLastRestore,
} from './backup';
import {
  DATABASE_NAME,
  clearTemporaryData,
  getStorageDiagnostic,
  loadActiveSession,
  loadBundle,
  loadExerciseNotes,
  loadSavedWorkouts,
  readRawStores,
  replaceRawStores,
  saveActiveSessionVerified,
  saveBundleVerified,
  saveCoachTargetVerified,
  saveCustomExerciseVerified,
  saveCustomMediaVerified,
  saveExerciseNoteVerified,
  saveWorkoutVerified,
  storeNames,
} from './database';
import { loadSettings, saveSettingsVerified } from './settings';
import { CoachTargetSchema, CustomMediaBlobSchema } from './userContent';

function legacyBackup() {
  const demo = createDemoBundle();
  return BackupFoundationSchema.parse({
    format: 'workout-conductor-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      ...demo,
      profiles: [demo.profile],
    },
  });
}

function customExercise() {
  return CustomExerciseSchema.parse({
    id: 'custom-supported-row',
    name: 'My Supported Row',
    primaryMuscles: ['upper-back'],
    secondaryMuscles: ['lats', 'biceps'],
    movementPattern: 'horizontal-pull',
    equipment: ['dumbbells'],
    progressionFamily: 'horizontal-pull',
    instructions: {
      setup: 'Set the bench to the saved support angle.',
      execution: ['Pull both elbows toward the saved torso marker.'],
      breathingCue: 'Exhale through the pull.',
      safetyNotes: ['Stop if the shoulder moves into an uncomfortable path.'],
    },
    media: [
      {
        id: 'custom-media-1',
        kind: 'poster',
        mimeType: 'image/webp',
        blobKey: 'custom-media/custom-media-1',
        byteSize: 4,
        ownership: 'user-owned',
        createdAt: '2026-08-10T17:00:00.000Z',
      },
    ],
    jointStress: ['shoulder-extension'],
    createdAt: '2026-08-10T17:00:00.000Z',
    updatedAt: '2026-08-10T17:00:00.000Z',
  });
}

describe('local-first storage and data safety', () => {
  it('preserves and writes through legacy out-of-line-key stores', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('profiles');
        request.result.createObjectStore('equipmentProfiles');
        request.result.createObjectStore('locations');
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    const demo = createDemoBundle();
    await saveBundleVerified(demo);

    const loaded = await loadBundle();
    expect(loaded.profile?.id).toBe('primary-profile');
    expect(loaded.locations[0]?.name).toBe('Demo Home Gym');
  });

  it('writes durable records and verifies their read-back value', async () => {
    const demo = createDemoBundle();
    saveSettingsVerified(demo.settings);
    await saveBundleVerified(demo);

    const loaded = await loadBundle();
    expect(loaded.profile?.displayName).toBe('Demo Athlete');
    expect(loaded.locations[0]?.name).toBe('Demo Home Gym');
    expect(loadSettings()).toEqual(demo.settings);
  });

  it('previews, confirms, and reverses a legacy foundation migration', async () => {
    const current = createDemoBundle();
    await saveBundleVerified({
      ...current,
      profile: { ...current.profile!, displayName: 'Before migration' },
    });
    const text = JSON.stringify(legacyBackup());
    expect(previewBackup(text)).toMatchObject({
      kind: 'legacy-foundation',
      schemaVersion: 1,
    });

    await restoreBackup(text);
    expect((await loadBundle()).profile?.displayName).toBe('Demo Athlete');
    expect(await hasRollbackPoint()).toBe(true);

    await rollbackLastRestore();
    expect((await loadBundle()).profile?.displayName).toBe('Before migration');
    expect(await hasRollbackPoint()).toBe(false);
  });

  it('rejects invalid and unsupported imports before changing storage', () => {
    expect(() => previewBackup('not json')).toThrow('not valid JSON');
    expect(() => previewBackup('{"schemaVersion":99}')).toThrow(
      'Unsupported backup',
    );
  });

  it('cleans only temporary rollback data and reports protected diagnostics', async () => {
    const demo = createDemoBundle();
    saveSettingsVerified(demo.settings);
    await saveBundleVerified(demo);
    const backup = await createCompleteBackup();
    await restoreBackup(JSON.stringify(backup));

    expect(await clearTemporaryData()).toBe(1);
    expect(await hasRollbackPoint()).toBe(false);
    expect((await loadBundle()).profile?.displayName).toBe('Demo Athlete');
    await expect(getStorageDiagnostic()).resolves.toMatchObject({
      schemaVersion: 4,
      protectedRecords: 3,
      recordsByStore: {
        profiles: 1,
        equipmentProfiles: 1,
        locations: 1,
      },
    });
  });

  it('backs up and exactly restores every protected store and unknown field', async () => {
    const demo = createDemoBundle();
    saveSettingsVerified(demo.settings);
    await saveBundleVerified(demo);
    const workout = generateWorkout(
      generationInputFromBundle(demo, '15', {
        date: '2026-08-11T18:00:00.000Z',
      }),
    );
    const session = createActiveSession(workout, '2026-08-11T18:00:00.000Z');
    await saveActiveSessionVerified(session);
    await saveExerciseNoteVerified({
      id: 'pull-up',
      note: 'Synthetic cue: begin from a quiet shoulder.',
      updatedAt: '2026-08-11T18:01:00.000Z',
    });
    await saveWorkoutVerified(
      createSavedWorkout(
        workout,
        'generated',
        null,
        new Date('2026-08-11T18:02:00.000Z'),
      ),
    );
    await saveCustomExerciseVerified(customExercise());
    await saveCustomMediaVerified(
      CustomMediaBlobSchema.parse({
        id: 'custom-media-1',
        blobKey: 'custom-media/custom-media-1',
        mimeType: 'image/webp',
        dataUrl: 'data:image/webp;base64,AAAA',
        byteSize: 4,
        createdAt: '2026-08-10T17:00:00.000Z',
      }),
    );
    await saveCoachTargetVerified(
      CoachTargetSchema.parse({
        id: 'target-pull-up',
        exerciseId: 'pull-up',
        targetWeight: 40,
        targetReps: 9,
        targetRir: 2,
        rationale: 'Synthetic next-session target.',
        updatedAt: '2026-08-11T18:03:00.000Z',
      }),
    );

    const raw = await readRawStores();
    const profile = raw[storeNames.profiles][0]!;
    profile.value = {
      ...(profile.value as object),
      futureCoachField: { preserve: true },
    };
    await replaceRawStores(raw);

    const backup = await createCompleteBackup();
    expect(CompleteBackupSchema.safeParse(backup).success).toBe(true);
    expect(backup.data.stores[storeNames.activeSessions]).toHaveLength(1);
    expect(backup.data.stores[storeNames.exerciseNotes]).toHaveLength(1);
    expect(backup.data.stores[storeNames.savedWorkouts]).toHaveLength(1);
    expect(backup.data.stores[storeNames.customExercises]).toHaveLength(1);
    expect(backup.data.stores[storeNames.customMedia]).toHaveLength(1);
    expect(backup.data.stores[storeNames.coachTargets]).toHaveLength(1);

    await saveBundleVerified({
      ...demo,
      profile: { ...demo.profile!, displayName: 'After export' },
    });
    await restoreBackup(JSON.stringify(backup));
    const restored = await readRawStores();
    expect(restored[storeNames.profiles][0]?.value).toMatchObject({
      displayName: 'Demo Athlete',
      futureCoachField: { preserve: true },
    });
    expect(restored[storeNames.customMedia][0]?.value).toMatchObject({
      dataUrl: 'data:image/webp;base64,AAAA',
    });
  });

  it('writes and reads back an active session and exercise cue memory', async () => {
    const demo = createDemoBundle();
    const workout = generateWorkout(
      generationInputFromBundle(demo, '15', {
        date: '2026-08-10T18:00:00.000Z',
      }),
    );
    const session = createActiveSession(workout, '2026-08-10T18:00:00.000Z');
    expect((await saveActiveSessionVerified(session)).id).toBe(session.id);
    expect((await loadActiveSession())?.workout.id).toBe(workout.id);

    await saveExerciseNoteVerified({
      id: 'pull-up',
      note: 'Synthetic cue: begin from a quiet shoulder.',
      updatedAt: '2026-08-10T18:01:00.000Z',
    });
    expect(await loadExerciseNotes()).toEqual([
      {
        id: 'pull-up',
        note: 'Synthetic cue: begin from a quiet shoulder.',
        updatedAt: '2026-08-10T18:01:00.000Z',
      },
    ]);
  });

  it('writes and reads back a saved workout without adding synthetic history', async () => {
    const demo = createDemoBundle();
    const workout = generateWorkout(
      generationInputFromBundle(demo, '15', {
        date: '2026-08-11T18:00:00.000Z',
      }),
    );
    const saved = createSavedWorkout(
      workout,
      'generated',
      null,
      new Date('2026-08-11T18:01:00.000Z'),
    );
    await saveWorkoutVerified(saved);
    expect(await loadSavedWorkouts()).toEqual([saved]);
  });
});
