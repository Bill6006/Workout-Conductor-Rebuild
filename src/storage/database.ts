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
import { loadSettings } from './settings';

export const DATABASE_NAME = 'workout-conductor';
const DATABASE_VERSION = 1;

export const storeNames = {
  profiles: 'profiles',
  equipmentProfiles: 'equipmentProfiles',
  locations: 'locations',
} as const;

type StoreName = (typeof storeNames)[keyof typeof storeNames];

let databasePromise: Promise<IDBDatabase> | null = null;

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

export async function writeRecordVerified<T extends { id: string }>(
  storeName: StoreName,
  value: T,
  schema: z.ZodType<T>,
): Promise<T> {
  const validated = schema.parse(value);
  const database = await openDatabase();
  const writeTransaction = database.transaction(storeName, 'readwrite');
  writeTransaction.objectStore(storeName).put(validated);
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

  return verified;
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
  const [profiles, equipmentProfiles, locations] = await Promise.all([
    getAllRecords<Profile>(storeNames.profiles, ProfileSchema),
    getAllRecords<EquipmentProfile>(
      storeNames.equipmentProfiles,
      EquipmentProfileSchema,
    ),
    getAllRecords<LocationProfile>(storeNames.locations, LocationProfileSchema),
  ]);

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

export async function resetDatabaseForTests(): Promise<void> {
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
