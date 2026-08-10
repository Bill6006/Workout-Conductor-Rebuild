import type {
  AppBundle,
  AppSettings,
  EquipmentProfile,
  LocationProfile,
  Profile,
} from './models';

export const defaultSettings: AppSettings = {
  programmingStyle: 'Hybrid hypertrophy and strength',
  allowSupersets: true,
  allowDropSets: false,
  allowCircuits: false,
  restStyle: 'Balanced',
  units: 'lb',
};

export const onboardingProfileDefaults: Omit<Profile, 'updatedAt'> = {
  id: 'primary-profile',
  displayName: 'Athlete',
  primaryGoal: 'Build Muscle',
  secondaryGoal: 'Bigger Arms',
  experience: 'Intermediate',
  weeklyFrequency: 4,
  typicalDuration: 60,
  availableDays: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
  preferredExercises: [],
  dislikedExercises: [],
  limitations: [],
  shoulderLimitations: false,
  avoidBarbellSquats: false,
  gymAccess: true,
  bodyweight: null,
  onboardingComplete: false,
  isDemo: false,
};

export function createDemoBundle(): AppBundle {
  const updatedAt = new Date().toISOString();
  const equipment: EquipmentProfile = {
    id: 'equipment-demo-home',
    name: 'Demo Home Setup',
    kind: 'home',
    items: [
      'Adjustable dumbbells',
      'Adjustable bench',
      'Pull-up bar',
      'Resistance bands',
    ],
    updatedAt,
  };
  const location: LocationProfile = {
    id: 'location-demo-home',
    name: 'Demo Home Gym',
    kind: 'home',
    equipmentProfileId: equipment.id,
    isDefault: true,
    updatedAt,
  };
  const profile: Profile = {
    ...onboardingProfileDefaults,
    displayName: 'Demo Athlete',
    onboardingComplete: true,
    isDemo: true,
    updatedAt,
  };

  return {
    profile,
    equipmentProfiles: [equipment],
    locations: [location],
    settings: defaultSettings,
  };
}

export function createEmptyBundle(): AppBundle {
  return {
    profile: null,
    equipmentProfiles: [],
    locations: [],
    settings: defaultSettings,
  };
}
