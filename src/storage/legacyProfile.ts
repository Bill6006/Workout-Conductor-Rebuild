import { z } from 'zod';
import type { AppBundle, AppSettings } from '../domain/models';

const LegacyEquipmentProfileSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  equipment: z.array(z.string()).min(1),
  space: z.string().max(120).optional(),
  unavailableExercises: z.array(z.string()).default([]),
});

const LegacyLocationSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  type: z.enum(['commercial-gym', 'home-gym', 'travel', 'other']),
  equipmentProfileId: z.string().min(1),
});

const LegacyPreferencesSchema = z.looseObject({
  preferredExerciseIds: z.array(z.string()).default([]),
  dislikedExerciseIds: z.array(z.string()).default([]),
  painLimitations: z.array(z.string()).default([]),
  movementLimitations: z.array(z.string()).default([]),
  shoulderLimitations: z.boolean().default(false),
  avoidBarbellSquats: z.boolean().default(false),
  trainingStyle: z
    .enum(['straight-sets', 'hybrid', 'high-density'])
    .default('hybrid'),
  allowSupersets: z.boolean().default(true),
  allowDropSets: z.boolean().default(false),
  allowCircuits: z.boolean().default(false),
  restStyle: z.enum(['guided', 'manual', 'minimal']).default('guided'),
  units: z.enum(['lb', 'kg']).default('lb'),
  bodyweight: z.number().positive().max(1500).optional(),
});

export const LegacyUserProfileSchema = z.looseObject({
  schemaVersion: z.literal(1),
  id: z.literal('primary'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  onboardingComplete: z.boolean(),
  primaryGoal: z.enum([
    'build-muscle',
    'get-stronger',
    'recomposition',
    'general-fitness',
  ]),
  secondaryGoal: z.enum([
    'bigger-arms',
    'bigger-chest',
    'broader-shoulders',
    'stronger-legs',
    'balanced',
  ]),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyFrequency: z.number().int().min(1).max(7),
  typicalDuration: z.union([
    z.literal(20),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(75),
    z.literal(90),
  ]),
  availableDays: z.array(
    z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  ),
  gymAccess: z.enum(['full-gym', 'home-gym', 'both', 'minimal']),
  equipmentProfiles: z.array(LegacyEquipmentProfileSchema).min(1),
  savedLocations: z.array(LegacyLocationSchema).min(1),
  activeLocationId: z.string().min(1),
  preferences: LegacyPreferencesSchema,
});

export type LegacyUserProfile = z.infer<typeof LegacyUserProfileSchema>;

const equipmentNames: Record<string, string> = {
  Barbell: 'Barbell and plates',
  Dumbbells: 'Adjustable dumbbells',
  Bench: 'Adjustable bench',
  'Cable stack': 'Cable station',
  'Pull-up bar': 'Pull-up bar',
  'Resistance bands': 'Resistance bands',
  Machines: 'Machines',
};

const weekDays = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
} as const;

function locationKind(
  type: LegacyUserProfile['savedLocations'][number]['type'],
) {
  if (type === 'home-gym') return 'home' as const;
  if (type === 'travel') return 'travel' as const;
  return 'gym' as const;
}

function settingsFromLegacy(profile: LegacyUserProfile): AppSettings {
  const preferences = profile.preferences;
  const programmingStyle =
    preferences.trainingStyle === 'straight-sets'
      ? 'Strength emphasis'
      : preferences.trainingStyle === 'high-density'
        ? 'Hypertrophy emphasis'
        : 'Hybrid hypertrophy and strength';
  const restStyle =
    preferences.restStyle === 'minimal'
      ? 'Short and efficient'
      : preferences.restStyle === 'manual'
        ? 'Full recovery'
        : 'Balanced';
  return {
    programmingStyle,
    allowSupersets: preferences.allowSupersets,
    allowDropSets: preferences.allowDropSets,
    allowCircuits: preferences.allowCircuits,
    restStyle,
    units: preferences.units,
  };
}

export function migrateLegacyUserProfile(
  profile: LegacyUserProfile,
): AppBundle {
  const activeLocation =
    profile.savedLocations.find(
      (location) => location.id === profile.activeLocationId,
    ) ?? profile.savedLocations[0];
  const availableDays = profile.availableDays.map((day) => weekDays[day]);
  return {
    profile: {
      id: 'primary-profile',
      displayName: 'Athlete',
      primaryGoal:
        profile.primaryGoal === 'get-stronger'
          ? 'Build Strength'
          : profile.primaryGoal === 'recomposition'
            ? 'Body Recomposition'
            : profile.primaryGoal === 'general-fitness'
              ? 'General Fitness'
              : 'Build Muscle',
      secondaryGoal:
        profile.secondaryGoal === 'bigger-chest'
          ? 'Bigger Chest'
          : profile.secondaryGoal === 'broader-shoulders'
            ? 'More Overall Size'
            : profile.secondaryGoal === 'stronger-legs'
              ? 'Strength Progress'
              : profile.secondaryGoal === 'balanced'
                ? 'Balanced Development'
                : 'Bigger Arms',
      experience:
        profile.experience === 'beginner'
          ? 'Beginner'
          : profile.experience === 'advanced'
            ? 'Advanced'
            : 'Intermediate',
      weeklyFrequency: profile.weeklyFrequency,
      typicalDuration: profile.typicalDuration,
      availableDays:
        availableDays.length > 0
          ? availableDays
          : ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
      preferredExercises: profile.preferences.preferredExerciseIds,
      dislikedExercises: profile.preferences.dislikedExerciseIds,
      limitations: Array.from(
        new Set([
          ...profile.preferences.painLimitations,
          ...profile.preferences.movementLimitations,
        ]),
      ),
      shoulderLimitations: profile.preferences.shoulderLimitations,
      avoidBarbellSquats: profile.preferences.avoidBarbellSquats,
      gymAccess: profile.gymAccess !== 'minimal',
      bodyweight: profile.preferences.bodyweight ?? null,
      onboardingComplete: profile.onboardingComplete,
      isDemo: false,
      updatedAt: profile.updatedAt,
    },
    equipmentProfiles: profile.equipmentProfiles.map((equipment) => ({
      id: equipment.id,
      name: equipment.name,
      kind: locationKind(
        profile.savedLocations.find(
          (location) => location.equipmentProfileId === equipment.id,
        )?.type ?? activeLocation.type,
      ),
      items: Array.from(
        new Set(
          equipment.equipment
            .map((item) => equipmentNames[item])
            .filter((item): item is string => Boolean(item)),
        ),
      ),
      updatedAt: profile.updatedAt,
    })),
    locations: profile.savedLocations.map((location) => ({
      id: location.id,
      name: location.name,
      kind: locationKind(location.type),
      equipmentProfileId: location.equipmentProfileId,
      isDefault: location.id === activeLocation.id,
      updatedAt: profile.updatedAt,
    })),
    settings: settingsFromLegacy(profile),
  };
}
