import { z } from 'zod';
import {
  AppSettingsSchema,
  BackupFoundationSchema,
  EquipmentProfileSchema,
  LocationProfileSchema,
  ProfileSchema,
} from '../domain/models';
import { CustomExerciseSchema } from '../catalog/schema';
import {
  ActiveSessionImportSchema,
  ExerciseNoteSchema,
} from '../features/activeWorkout/schema';
import { SavedWorkoutSchema } from '../features/savedWorkouts/schema';
import {
  clearTemporaryData,
  protectedStoreNames,
  readRawStores,
  replaceRawStores,
  storeNames,
  temporaryStoreNames,
  type RawStoreSnapshot,
  type StoreName,
} from './database';
import { SETTINGS_STORAGE_KEY } from './settings';
import { CoachTargetImportSchema, CustomMediaBlobSchema } from './userContent';

const RawStoreRecordSchema = z.looseObject({
  key: z.union([z.string(), z.number()]),
  value: z.unknown(),
});

export const CompleteBackupSchema = z.looseObject({
  format: z.literal('workout-conductor-backup'),
  schemaVersion: z.literal(2),
  exportedAt: z.string().datetime(),
  data: z.looseObject({
    stores: z.record(z.string(), z.array(RawStoreRecordSchema)),
    settingsRaw: z.string().nullable(),
  }),
});

export type CompleteBackup = z.infer<typeof CompleteBackupSchema>;

export type BackupPreview = {
  kind: 'complete' | 'legacy-foundation';
  schemaVersion: 1 | 2;
  protectedRecords: number;
  recordsByStore: Record<string, number>;
  warnings: string[];
};

type RestorePoint = {
  id: 'last-restore';
  createdAt: string;
  snapshot: RawStoreSnapshot;
  settingsRaw: string | null;
};

const recordSchemas: Partial<Record<StoreName, z.ZodType>> = {
  [storeNames.profiles]: ProfileSchema,
  [storeNames.equipmentProfiles]: EquipmentProfileSchema,
  [storeNames.locations]: LocationProfileSchema,
  [storeNames.activeSessions]: ActiveSessionImportSchema,
  [storeNames.exerciseNotes]: ExerciseNoteSchema,
  [storeNames.savedWorkouts]: SavedWorkoutSchema,
  [storeNames.customExercises]: CustomExerciseSchema,
  [storeNames.customMedia]: CustomMediaBlobSchema,
  [storeNames.coachTargets]: CoachTargetImportSchema,
};

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Backup is not valid JSON.');
  }
}

function rawSettings(): string | null {
  return localStorage.getItem(SETTINGS_STORAGE_KEY);
}

function writeRawSettings(value: string | null) {
  if (value === null) localStorage.removeItem(SETTINGS_STORAGE_KEY);
  else localStorage.setItem(SETTINGS_STORAGE_KEY, value);
}

function validateSettings(value: string | null) {
  if (value === null) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('Backup settings are not valid JSON.');
  }
  if (!AppSettingsSchema.safeParse(parsed).success) {
    throw new Error('Backup settings do not match the supported schema.');
  }
}

function validateSnapshot(snapshot: RawStoreSnapshot) {
  for (const name of protectedStoreNames) {
    const records = snapshot[name];
    if (!records) throw new Error(`Backup is missing protected store ${name}.`);
    const schema = recordSchemas[name];
    if (!schema) continue;
    records.forEach((record, index) => {
      if (!schema.safeParse(record.value).success) {
        throw new Error(`Backup record ${name}/${index + 1} is invalid.`);
      }
    });
  }
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

function comparableSnapshot(snapshot: RawStoreSnapshot) {
  return Object.fromEntries(
    protectedStoreNames.map((name) => [
      name,
      [...(snapshot[name] ?? [])]
        .sort((first, second) =>
          String(first.key).localeCompare(String(second.key)),
        )
        .map((record) => normalize(record)),
    ]),
  );
}

function snapshotsMatch(first: RawStoreSnapshot, second: RawStoreSnapshot) {
  return (
    JSON.stringify(comparableSnapshot(first)) ===
    JSON.stringify(comparableSnapshot(second))
  );
}

function completeFromUnknown(value: unknown): CompleteBackup | null {
  const parsed = CompleteBackupSchema.safeParse(value);
  if (!parsed.success) return null;
  validateSnapshot(parsed.data.data.stores);
  validateSettings(parsed.data.data.settingsRaw);
  return parsed.data;
}

function legacyFromUnknown(value: unknown) {
  const parsed = BackupFoundationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function createCompleteBackup(): Promise<CompleteBackup> {
  const backup = CompleteBackupSchema.parse({
    format: 'workout-conductor-backup',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    data: {
      stores: await readRawStores(),
      settingsRaw: rawSettings(),
    },
  });
  validateSnapshot(backup.data.stores);
  validateSettings(backup.data.settingsRaw);
  return backup;
}

export function downloadBackup(backup: CompleteBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workout-conductor-complete-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function previewBackup(text: string): BackupPreview {
  const value = parseJson(text);
  const complete = completeFromUnknown(value);
  if (complete) {
    const recordsByStore = Object.fromEntries(
      protectedStoreNames.map((name) => [
        name,
        complete.data.stores[name]?.length ?? 0,
      ]),
    );
    return {
      kind: 'complete',
      schemaVersion: 2,
      protectedRecords: Object.values(recordsByStore).reduce(
        (total, count) => total + count,
        0,
      ),
      recordsByStore,
      warnings: [
        'Confirmed restore replaces protected local data with this exact snapshot.',
        'An automatic rollback point is created before any record changes.',
      ],
    };
  }
  const legacy = legacyFromUnknown(value);
  if (legacy) {
    const recordsByStore = {
      [storeNames.profiles]: legacy.data.profiles.length,
      [storeNames.equipmentProfiles]: legacy.data.equipmentProfiles.length,
      [storeNames.locations]: legacy.data.locations.length,
    };
    return {
      kind: 'legacy-foundation',
      schemaVersion: 1,
      protectedRecords: Object.values(recordsByStore).reduce(
        (total, count) => total + count,
        0,
      ),
      recordsByStore,
      warnings: [
        'Legacy import updates profile, equipment, locations, and settings only.',
        'Workout history, notes, saved workouts, custom content, and Coach targets remain untouched.',
        'An automatic rollback point is created before migration.',
      ],
    };
  }
  throw new Error('Unsupported backup format or schema version.');
}

async function saveRollbackPoint(
  snapshot: RawStoreSnapshot,
  settingsRaw: string | null,
) {
  const point: RestorePoint = {
    id: 'last-restore',
    createdAt: new Date().toISOString(),
    snapshot,
    settingsRaw,
  };
  await replaceRawStores(
    {
      [storeNames.restorePoints]: [{ key: point.id, value: point }],
    },
    temporaryStoreNames,
  );
  const verified = await readRawStores(temporaryStoreNames);
  if (verified[storeNames.restorePoints]?.length !== 1) {
    throw new Error('Unable to verify the automatic rollback point.');
  }
}

async function restoreVerified(
  target: RawStoreSnapshot,
  settingsRaw: string | null,
) {
  const before = await readRawStores();
  const beforeSettings = rawSettings();
  await saveRollbackPoint(before, beforeSettings);
  try {
    await replaceRawStores(target);
    writeRawSettings(settingsRaw);
    const verified = await readRawStores();
    if (!snapshotsMatch(target, verified) || rawSettings() !== settingsRaw) {
      throw new Error('Exact restore verification did not match the import.');
    }
  } catch (error) {
    await replaceRawStores(before);
    writeRawSettings(beforeSettings);
    throw error;
  }
}

export async function restoreBackup(text: string): Promise<BackupPreview> {
  const value = parseJson(text);
  const complete = completeFromUnknown(value);
  if (complete) {
    await restoreVerified(complete.data.stores, complete.data.settingsRaw);
    return previewBackup(text);
  }

  const legacy = legacyFromUnknown(value);
  if (!legacy) throw new Error('Unsupported backup format or schema version.');
  const current = await readRawStores();
  current[storeNames.profiles] = legacy.data.profiles.map((item) => ({
    key: item.id,
    value: item,
  }));
  current[storeNames.equipmentProfiles] = legacy.data.equipmentProfiles.map(
    (item) => ({ key: item.id, value: item }),
  );
  current[storeNames.locations] = legacy.data.locations.map((item) => ({
    key: item.id,
    value: item,
  }));
  await restoreVerified(current, JSON.stringify(legacy.data.settings));
  return previewBackup(text);
}

export async function rollbackLastRestore(): Promise<void> {
  const temporary = await readRawStores(temporaryStoreNames);
  const record = temporary[storeNames.restorePoints]?.find(
    (item) => item.key === 'last-restore',
  );
  const point = record?.value as RestorePoint | undefined;
  if (!point?.snapshot || typeof point.createdAt !== 'string') {
    throw new Error('No verified rollback point is available.');
  }
  validateSnapshot(point.snapshot);
  validateSettings(point.settingsRaw);
  await replaceRawStores(point.snapshot);
  writeRawSettings(point.settingsRaw);
  const verified = await readRawStores();
  if (!snapshotsMatch(point.snapshot, verified)) {
    throw new Error('Rollback verification failed.');
  }
  await clearTemporaryData();
}

export async function hasRollbackPoint(): Promise<boolean> {
  const snapshot = await readRawStores(temporaryStoreNames);
  return (snapshot[storeNames.restorePoints]?.length ?? 0) > 0;
}
