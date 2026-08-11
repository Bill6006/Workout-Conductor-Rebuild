import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../domain/defaults';
import { BackupFoundationSchema } from '../domain/models';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../engine/workoutGenerator/generateWorkout';
import { createActiveSession } from '../features/activeWorkout/session';
import {
  createBackupFoundation,
  importBackupFoundation,
  parseBackupFoundation,
} from './backup';
import {
  DATABASE_NAME,
  loadActiveSession,
  loadBundle,
  loadExerciseNotes,
  saveActiveSessionVerified,
  saveBundleVerified,
  saveExerciseNoteVerified,
} from './database';
import { loadSettings, saveSettingsVerified } from './settings';

describe('local-first storage foundation', () => {
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

  it('exports a schema-valid foundation with no workout history', async () => {
    const demo = createDemoBundle();
    saveSettingsVerified(demo.settings);
    await saveBundleVerified(demo);

    const backup = await createBackupFoundation();
    expect(BackupFoundationSchema.safeParse(backup).success).toBe(true);
    expect(backup.format).toBe('workout-conductor-backup');
    expect(JSON.stringify(backup)).not.toContain('workoutHistory');
  });

  it('rejects invalid imports and verifies valid profile imports', async () => {
    expect(() => parseBackupFoundation('{"schemaVersion":99}')).toThrow();

    const backup = BackupFoundationSchema.parse({
      format: 'workout-conductor-backup',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        ...createDemoBundle(),
        profiles: [createDemoBundle().profile],
      },
    });
    const imported = await importBackupFoundation(JSON.stringify(backup));
    expect(imported.profile?.isDemo).toBe(true);
    expect((await loadBundle()).profile?.displayName).toBe('Demo Athlete');
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
});
