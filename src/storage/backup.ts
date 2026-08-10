import { saveBundleVerified, getAllRecords, storeNames } from './database';
import { loadSettings, saveSettingsVerified } from './settings';
import { defaultSettings } from '../domain/defaults';
import {
  AppSettingsSchema,
  BackupFoundationSchema,
  EquipmentProfileSchema,
  LocationProfileSchema,
  ProfileSchema,
  type AppBundle,
  type BackupFoundation,
  type EquipmentProfile,
  type LocationProfile,
  type Profile,
} from '../domain/models';

export async function createBackupFoundation(): Promise<BackupFoundation> {
  const [profiles, equipmentProfiles, locations] = await Promise.all([
    getAllRecords<Profile>(storeNames.profiles, ProfileSchema),
    getAllRecords<EquipmentProfile>(
      storeNames.equipmentProfiles,
      EquipmentProfileSchema,
    ),
    getAllRecords<LocationProfile>(storeNames.locations, LocationProfileSchema),
  ]);

  return BackupFoundationSchema.parse({
    format: 'workout-conductor-backup',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      profiles,
      equipmentProfiles,
      locations,
      settings: loadSettings() ?? defaultSettings,
    },
  });
}

export function downloadBackup(backup: BackupFoundation): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workout-conductor-backup-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseBackupFoundation(text: string): BackupFoundation {
  return BackupFoundationSchema.parse(JSON.parse(text) as unknown);
}

export async function importBackupFoundation(text: string): Promise<AppBundle> {
  const backup = parseBackupFoundation(text);
  const profile = backup.data.profiles[0] ?? null;
  const settings = AppSettingsSchema.parse(backup.data.settings);
  const bundle = await saveBundleVerified({
    profile,
    equipmentProfiles: backup.data.equipmentProfiles,
    locations: backup.data.locations,
    settings,
  });
  const verifiedSettings = saveSettingsVerified(settings);
  return { ...bundle, settings: verifiedSettings };
}
