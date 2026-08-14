import { z } from 'zod';
import {
  EquipmentProfileSchema,
  LocationProfileSchema,
  ProfileSchema,
  type AppBundle,
  type EquipmentProfile,
  type LocationProfile,
  type Profile,
} from '../domain/models';
import { createEmptyBundle } from '../domain/defaults';
import { loadSettings, saveSettingsVerified } from './settings';
import {
  LegacyUserProfileSchema,
  migrateLegacyUserProfile,
  type LegacyUserProfile,
} from './legacyProfile';
import {
  ActiveSessionSchema,
  ExerciseNoteSchema,
  migrateActiveSession,
  type ActiveSession,
  type ExerciseNote,
} from '../features/activeWorkout/schema';
import {
  SavedWorkoutSchema,
  type SavedWorkout,
} from '../features/savedWorkouts/schema';
import { CustomExerciseSchema, type CustomExercise } from '../catalog/schema';
import {
  CoachTargetSchema,
  CustomMediaBlobSchema,
  migrateCoachTarget,
  type CoachTarget,
  type CustomMediaBlob,
} from './userContent';

export const DATABASE_NAME = 'workout-conductor';
export const DATABASE_VERSION = 4;

export const storeNames = {
  profiles: 'profiles',
  equipmentProfiles: 'equipmentProfiles',
  locations: 'locations',
  activeSessions: 'activeSessions',
  exerciseNotes: 'exerciseNotes',
  savedWorkouts: 'savedWorkouts',
  customExercises: 'customExercises',
  customMedia: 'customMedia',
  coachTargets: 'coachTargets',
  restorePoints: 'restorePoints',
} as const;

export type StoreName = (typeof storeNames)[keyof typeof storeNames];

export const protectedStoreNames = [
  storeNames.profiles,
  storeNames.equipmentProfiles,
  storeNames.locations,
  storeNames.activeSessions,
  storeNames.exerciseNotes,
  storeNames.savedWorkouts,
  storeNames.customExercises,
  storeNames.customMedia,
  storeNames.coachTargets,
] as const;

export const temporaryStoreNames = [storeNames.restorePoints] as const;

export type RawStoreRecord = {
  key: string | number;
  value: unknown;
};

export type RawStoreSnapshot = Record<string, RawStoreRecord[]>;

export type StorageDiagnostic = {
  schemaVersion: number;
  protectedRecords: number;
  recordsByStore: Record<string, number>;
  usageBytes: number | null;
  quotaBytes: number | null;
  lastVerifiedAt: string | null;
};

let databasePromise: Promise<IDBDatabase> | null = null;
const pendingWrites = new Set<Promise<unknown>>();
let lastVerifiedAt: string | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error('IndexedDB transaction was aborted.'),
      );
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      for (const storeName of Object.values(storeNames)) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ?? new Error('Unable to open local workout storage.'),
      );
  });

  return databasePromise;
}

export async function getAllRecords<T>(
  storeName: StoreName,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readonly');
  const completed = transactionComplete(transaction);
  const values = await requestResult(
    transaction.objectStore(storeName).getAll(),
  );
  await completed;
  return values.map((value) => schema.parse(value));
}

async function getAllUnknownRecords(storeName: StoreName): Promise<unknown[]> {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readonly');
  const completed = transactionComplete(transaction);
  const values = await requestResult(
    transaction.objectStore(storeName).getAll(),
  );
  await completed;
  return values;
}

async function performVerifiedWrite<T extends { id: string }>(
  storeName: StoreName,
  value: T,
  schema: z.ZodType<T>,
): Promise<T> {
  const validated = schema.parse(value);
  const database = await openDatabase();
  const writeTransaction = database.transaction(storeName, 'readwrite');
  const objectStore = writeTransaction.objectStore(storeName);
  if (objectStore.keyPath === null) {
    // An earlier Workout Conductor build on the same Pages origin created
    // out-of-line-key stores. Supplying the stable record ID preserves those
    // records without deleting or destructively rebuilding the database.
    objectStore.put(validated, validated.id);
  } else {
    objectStore.put(validated);
  }
  await transactionComplete(writeTransaction);

  const verifyTransaction = database.transaction(storeName, 'readonly');
  const verifiedComplete = transactionComplete(verifyTransaction);
  const stored = await requestResult(
    verifyTransaction.objectStore(storeName).get(validated.id),
  );
  await verifiedComplete;
  const verified = schema.parse(stored);

  if (JSON.stringify(verified) !== JSON.stringify(validated)) {
    throw new Error(
      `Local save verification failed for ${storeName}/${validated.id}.`,
    );
  }

  lastVerifiedAt = new Date().toISOString();

  return verified;
}

export async function waitForPendingWrites(): Promise<void> {
  while (pendingWrites.size > 0) {
    await Promise.allSettled(Array.from(pendingWrites));
  }
}

export async function readRawStores(
  names: readonly StoreName[] = protectedStoreNames,
): Promise<RawStoreSnapshot> {
  await waitForPendingWrites();
  const database = await openDatabase();
  const snapshot: RawStoreSnapshot = {};
  for (const name of names) {
    const transaction = database.transaction(name, 'readonly');
    const completed = transactionComplete(transaction);
    const store = transaction.objectStore(name);
    const [keys, values] = await Promise.all([
      requestResult(store.getAllKeys()),
      requestResult(store.getAll()),
    ]);
    await completed;
    snapshot[name] = values.map((value, index) => {
      const key = keys[index];
      if (typeof key !== 'string' && typeof key !== 'number') {
        throw new Error(`Unsupported local key type in ${name}.`);
      }
      return { key, value };
    });
  }
  return snapshot;
}

export async function replaceRawStores(
  snapshot: RawStoreSnapshot,
  names: readonly StoreName[] = protectedStoreNames,
): Promise<void> {
  await waitForPendingWrites();
  const database = await openDatabase();
  const transaction = database.transaction([...names], 'readwrite');
  for (const name of names) {
    const store = transaction.objectStore(name);
    store.clear();
    for (const record of snapshot[name] ?? []) {
      if (store.keyPath === null) store.put(record.value, record.key);
      else store.put(record.value);
    }
  }
  await transactionComplete(transaction);
}

export async function clearTemporaryData(): Promise<number> {
  const database = await openDatabase();
  let removed = 0;
  for (const name of temporaryStoreNames) {
    const transaction = database.transaction(name, 'readwrite');
    const completed = transactionComplete(transaction);
    const store = transaction.objectStore(name);
    removed += await requestResult(store.count());
    store.clear();
    await completed;
  }
  return removed;
}

export async function getStorageDiagnostic(): Promise<StorageDiagnostic> {
  const database = await openDatabase();
  const recordsByStore: Record<string, number> = {};
  for (const name of protectedStoreNames) {
    const transaction = database.transaction(name, 'readonly');
    const completed = transactionComplete(transaction);
    recordsByStore[name] = await requestResult(
      transaction.objectStore(name).count(),
    );
    await completed;
  }
  const estimate = await navigator.storage?.estimate?.();
  return {
    schemaVersion: DATABASE_VERSION,
    protectedRecords: Object.values(recordsByStore).reduce(
      (total, count) => total + count,
      0,
    ),
    recordsByStore,
    usageBytes: estimate?.usage ?? null,
    quotaBytes: estimate?.quota ?? null,
    lastVerifiedAt,
  };
}

export function writeRecordVerified<T extends { id: string }>(
  storeName: StoreName,
  value: T,
  schema: z.ZodType<T>,
): Promise<T> {
  const operation = performVerifiedWrite(storeName, value, schema);
  pendingWrites.add(operation);
  void operation.then(
    () => pendingWrites.delete(operation),
    () => pendingWrites.delete(operation),
  );
  return operation;
}

export async function saveBundleVerified(
  bundle: AppBundle,
): Promise<AppBundle> {
  const profile = bundle.profile
    ? await writeRecordVerified(
        storeNames.profiles,
        bundle.profile,
        ProfileSchema,
      )
    : null;
  const equipmentProfiles = await Promise.all(
    bundle.equipmentProfiles.map((item) =>
      writeRecordVerified(
        storeNames.equipmentProfiles,
        item,
        EquipmentProfileSchema,
      ),
    ),
  );
  const locations = await Promise.all(
    bundle.locations.map((item) =>
      writeRecordVerified(storeNames.locations, item, LocationProfileSchema),
    ),
  );

  return { ...bundle, profile, equipmentProfiles, locations };
}

export async function loadBundle(): Promise<AppBundle> {
  const empty = createEmptyBundle();
  const snapshot = await readRawStores([
    storeNames.profiles,
    storeNames.equipmentProfiles,
    storeNames.locations,
  ]);
  const profiles: Profile[] = [];
  const legacyProfiles: LegacyUserProfile[] = [];
  for (const record of snapshot[storeNames.profiles] ?? []) {
    const current = ProfileSchema.safeParse(record.value);
    if (current.success) {
      profiles.push(current.data);
      continue;
    }
    const legacy = LegacyUserProfileSchema.safeParse(record.value);
    if (legacy.success) {
      legacyProfiles.push(legacy.data);
      continue;
    }
    throw new Error(
      `A protected profile at key ${String(record.key)} uses an unsupported schema. Your local data was kept unchanged; export it from the earlier app or restore a verified backup.`,
    );
  }

  const parseCurrentStore = <T>(name: StoreName, schema: z.ZodType<T>): T[] =>
    (snapshot[name] ?? []).map((record) => {
      const parsed = schema.safeParse(record.value);
      if (!parsed.success) {
        throw new Error(
          `A protected ${name} record at key ${String(record.key)} uses an unsupported schema. Your local data was kept unchanged.`,
        );
      }
      return parsed.data;
    });

  const equipmentProfiles = parseCurrentStore<EquipmentProfile>(
    storeNames.equipmentProfiles,
    EquipmentProfileSchema,
  );
  const locations = parseCurrentStore<LocationProfile>(
    storeNames.locations,
    LocationProfileSchema,
  );

  if (profiles.length === 0 && legacyProfiles.length > 0) {
    const migrated = migrateLegacyUserProfile(legacyProfiles.at(-1)!);
    const settings = saveSettingsVerified(migrated.settings);
    const verified = await saveBundleVerified({ ...migrated, settings });
    return { ...verified, settings };
  }

  return {
    profile:
      profiles.find((profile) => profile.id === 'primary-profile') ??
      profiles[0] ??
      null,
    equipmentProfiles,
    locations,
    settings: loadSettings() ?? empty.settings,
  };
}

export async function saveActiveSessionVerified(
  session: ActiveSession,
): Promise<ActiveSession> {
  return writeRecordVerified(
    storeNames.activeSessions,
    session,
    ActiveSessionSchema,
  );
}

async function loadSessionsWithMigration(
  fallbackUnit: 'lb' | 'kg',
): Promise<ActiveSession[]> {
  const stored = await getAllUnknownRecords(storeNames.activeSessions);
  const sessions = stored.map((value) =>
    migrateActiveSession(value, fallbackUnit),
  );
  await Promise.all(
    sessions.map((session, index) =>
      JSON.stringify(session) === JSON.stringify(stored[index])
        ? Promise.resolve(session)
        : saveActiveSessionVerified(session),
    ),
  );
  return sessions;
}

export async function migrateWeightBearingRecords(
  fallbackUnit: 'lb' | 'kg',
): Promise<void> {
  await loadSessionsWithMigration(fallbackUnit);
  const storedTargets = await getAllUnknownRecords(storeNames.coachTargets);
  await Promise.all(
    storedTargets.map((value) => {
      const target = migrateCoachTarget(value, fallbackUnit);
      return JSON.stringify(target) === JSON.stringify(value)
        ? Promise.resolve(target)
        : saveCoachTargetVerified(target);
    }),
  );
}

export async function loadActiveSession(
  fallbackUnit: 'lb' | 'kg' = 'lb',
): Promise<ActiveSession | null> {
  const sessions = await loadSessionsWithMigration(fallbackUnit);
  return (
    sessions
      .filter((session) => session.status !== 'completed')
      .sort((first, second) =>
        second.updatedAt.localeCompare(first.updatedAt),
      )[0] ?? null
  );
}

export async function loadSessionHistory(
  fallbackUnit: 'lb' | 'kg' = 'lb',
): Promise<ActiveSession[]> {
  const sessions = await loadSessionsWithMigration(fallbackUnit);
  return sessions.sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
}

export async function saveExerciseNoteVerified(
  note: ExerciseNote,
): Promise<ExerciseNote> {
  return writeRecordVerified(
    storeNames.exerciseNotes,
    note,
    ExerciseNoteSchema,
  );
}

export async function loadExerciseNotes(): Promise<ExerciseNote[]> {
  return getAllRecords<ExerciseNote>(
    storeNames.exerciseNotes,
    ExerciseNoteSchema,
  );
}

export async function saveWorkoutVerified(
  workout: SavedWorkout,
): Promise<SavedWorkout> {
  return writeRecordVerified(
    storeNames.savedWorkouts,
    workout,
    SavedWorkoutSchema,
  );
}

export async function loadSavedWorkouts(): Promise<SavedWorkout[]> {
  const workouts = await getAllRecords<SavedWorkout>(
    storeNames.savedWorkouts,
    SavedWorkoutSchema,
  );
  return workouts.sort((first, second) =>
    second.savedAt.localeCompare(first.savedAt),
  );
}

export async function saveCustomExerciseVerified(
  exercise: CustomExercise,
): Promise<CustomExercise> {
  return writeRecordVerified(
    storeNames.customExercises,
    exercise,
    CustomExerciseSchema,
  );
}

export async function saveCustomMediaVerified(
  media: CustomMediaBlob,
): Promise<CustomMediaBlob> {
  return writeRecordVerified(
    storeNames.customMedia,
    media,
    CustomMediaBlobSchema,
  );
}

export async function loadCustomMedia(): Promise<CustomMediaBlob[]> {
  return getAllRecords(storeNames.customMedia, CustomMediaBlobSchema);
}

export async function saveCoachTargetVerified(
  target: CoachTarget,
): Promise<CoachTarget> {
  return writeRecordVerified(
    storeNames.coachTargets,
    target,
    CoachTargetSchema,
  );
}

export async function resetDatabaseForTests(): Promise<void> {
  // React may have optimistic saves queued in a microtask when a test unmounts.
  // Drain those verified writes before deleting the shared fake IndexedDB so a
  // late save cannot repopulate the next test's fresh database.
  while (true) {
    await Promise.resolve();
    const writes = Array.from(pendingWrites);
    if (writes.length === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      if (pendingWrites.size === 0) break;
      continue;
    }
    await Promise.allSettled(writes);
  }
  if (databasePromise) {
    const database = await databasePromise;
    database.close();
    databasePromise = null;
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to reset test database.'));
    request.onblocked = () =>
      reject(new Error('Test database reset was blocked.'));
  });
}
