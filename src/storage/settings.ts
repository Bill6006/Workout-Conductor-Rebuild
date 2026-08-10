import { AppSettingsSchema, type AppSettings } from '../domain/models';

export const SETTINGS_STORAGE_KEY = 'workout-conductor:settings:v1';

export function loadSettings(): AppSettings | null {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) return null;

  try {
    const result = AppSettingsSchema.safeParse(JSON.parse(stored) as unknown);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveSettingsVerified(settings: AppSettings): AppSettings {
  const validated = AppSettingsSchema.parse(settings);
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(validated));
  const readBack = loadSettings();

  if (!readBack || JSON.stringify(readBack) !== JSON.stringify(validated)) {
    throw new Error('Local settings save verification failed.');
  }

  return readBack;
}
