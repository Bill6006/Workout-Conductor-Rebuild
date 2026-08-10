import { z } from 'zod';

export const primaryGoals = [
  'Build Muscle',
  'Build Strength',
  'Body Recomposition',
  'General Fitness',
] as const;

export const secondaryGoals = [
  'Bigger Arms',
  'Bigger Chest',
  'More Overall Size',
  'Balanced Development',
  'Strength Progress',
] as const;

export const experienceLevels = [
  'Beginner',
  'Intermediate',
  'Advanced',
] as const;

export const trainingStyles = [
  'Hybrid hypertrophy and strength',
  'Hypertrophy emphasis',
  'Strength emphasis',
] as const;

export const restStyles = [
  'Balanced',
  'Short and efficient',
  'Full recovery',
] as const;

export const unitSystems = ['lb', 'kg'] as const;
export const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const equipmentOptions = [
  'Adjustable dumbbells',
  'Barbell and plates',
  'Adjustable bench',
  'Pull-up bar',
  'Resistance bands',
  'Cable station',
  'Machines',
  'Squat rack',
] as const;

export const ProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1).max(40),
  primaryGoal: z.enum(primaryGoals),
  secondaryGoal: z.enum(secondaryGoals),
  experience: z.enum(experienceLevels),
  weeklyFrequency: z.number().int().min(1).max(7),
  typicalDuration: z.number().int().min(15).max(180),
  availableDays: z.array(z.enum(weekDays)).min(1),
  preferredExercises: z.array(z.string().trim().min(1)).max(30),
  dislikedExercises: z.array(z.string().trim().min(1)).max(30),
  limitations: z.array(z.string().trim().min(1)).max(30),
  shoulderLimitations: z.boolean(),
  avoidBarbellSquats: z.boolean(),
  gymAccess: z.boolean(),
  bodyweight: z.number().positive().max(1000).nullable(),
  onboardingComplete: z.boolean(),
  isDemo: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const EquipmentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(50),
  kind: z.enum(['home', 'gym', 'travel']),
  items: z.array(z.string().trim().min(1)).max(50),
  updatedAt: z.string().datetime(),
});

export const LocationProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(50),
  kind: z.enum(['home', 'gym', 'travel']),
  equipmentProfileId: z.string().min(1),
  isDefault: z.boolean(),
  updatedAt: z.string().datetime(),
});

export const AppSettingsSchema = z.object({
  programmingStyle: z.enum(trainingStyles),
  allowSupersets: z.boolean(),
  allowDropSets: z.boolean(),
  allowCircuits: z.boolean(),
  restStyle: z.enum(restStyles),
  units: z.enum(unitSystems),
});

export const BackupFoundationSchema = z.object({
  format: z.literal('workout-conductor-backup'),
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  data: z.object({
    profiles: z.array(ProfileSchema),
    equipmentProfiles: z.array(EquipmentProfileSchema),
    locations: z.array(LocationProfileSchema),
    settings: AppSettingsSchema,
  }),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type EquipmentProfile = z.infer<typeof EquipmentProfileSchema>;
export type LocationProfile = z.infer<typeof LocationProfileSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type BackupFoundation = z.infer<typeof BackupFoundationSchema>;

export type AppBundle = {
  profile: Profile | null;
  equipmentProfiles: EquipmentProfile[];
  locations: LocationProfile[];
  settings: AppSettings;
};

export function listFromText(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(
      (item, index, items) => item.length > 0 && items.indexOf(item) === index,
    );
}

export function listToText(value: string[]): string {
  return value.join(', ');
}
