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

export const syntheticWorkout = {
  id: 'synthetic-phase-1-upper',
  title: 'Upper Strength + Arms',
  plannedMinutes: 58,
  readiness: 'Ready',
  focus: ['Chest', 'Biceps', 'Triceps'],
  reason:
    'Chest leads the session, then efficient arm work adds targeted growth without crowding the main lifts.',
  exercises: [
    {
      name: 'Dumbbell Bench Press',
      detail: '4 sets · 6–8 reps',
      role: 'Strength lead',
    },
    {
      name: 'One-arm Dumbbell Row',
      detail: '3 sets · 8–10 reps',
      role: 'Balanced pull',
    },
    {
      name: 'Incline Dumbbell Curl',
      detail: '3 sets · 10–12 reps',
      role: 'Biceps focus',
    },
    {
      name: 'Band Triceps Pressdown',
      detail: '3 sets · 12–15 reps',
      role: 'Triceps focus',
    },
  ],
} as const;
