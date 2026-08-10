import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../domain/defaults';
import { BackupFoundationSchema } from '../domain/models';
import {
  createBackupFoundation,
  importBackupFoundation,
  parseBackupFoundation,
} from './backup';
import { loadBundle, saveBundleVerified } from './database';
import { loadSettings, saveSettingsVerified } from './settings';

describe('local-first storage foundation', () => {
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
});
