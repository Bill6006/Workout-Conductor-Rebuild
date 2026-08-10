import { MuscleDefinitionSchema, muscleIds } from './schema';

const muscleDetails = {
  chest: ['Chest', 'upper', 'chest', ['pectorals'], 48],
  'upper-chest': ['Upper chest', 'upper', 'chest', ['clavicular chest'], 48],
  'front-delts': [
    'Front delts',
    'upper',
    'shoulders',
    ['anterior deltoids'],
    48,
  ],
  'side-delts': ['Side delts', 'upper', 'shoulders', ['lateral deltoids'], 36],
  'rear-delts': [
    'Rear delts',
    'upper',
    'shoulders',
    ['posterior deltoids'],
    36,
  ],
  triceps: ['Triceps', 'upper', 'arms', ['triceps brachii'], 36],
  biceps: ['Biceps', 'upper', 'arms', ['biceps brachii'], 36],
  brachialis: ['Brachialis', 'upper', 'arms', ['elbow flexors'], 36],
  forearms: ['Forearms', 'upper', 'arms', ['grip'], 36],
  lats: ['Lats', 'upper', 'back', ['latissimus dorsi'], 48],
  'upper-back': ['Upper back', 'upper', 'back', ['rhomboids'], 48],
  traps: ['Traps', 'upper', 'back', ['trapezius'], 48],
  'spinal-erectors': ['Spinal erectors', 'lower', 'back', ['lower back'], 72],
  quads: ['Quadriceps', 'lower', 'legs', ['quads'], 72],
  hamstrings: ['Hamstrings', 'lower', 'legs', ['hams'], 72],
  glutes: ['Glutes', 'lower', 'legs', ['gluteals'], 72],
  calves: ['Calves', 'lower', 'legs', ['gastrocnemius', 'soleus'], 48],
  abs: ['Abdominals', 'core', 'core', ['abs'], 36],
  obliques: ['Obliques', 'core', 'core', ['side abs'], 36],
} as const;

export const muscles = muscleIds.map((id) => {
  const [name, region, group, aliases, recovery] = muscleDetails[id];
  return MuscleDefinitionSchema.parse({
    id,
    name,
    region,
    group,
    aliases,
    directVolumeFactor: 1,
    secondaryVolumeFactor: 0.5,
    typicalRecoveryHours: recovery,
  });
});

export const muscleById = new Map(muscles.map((muscle) => [muscle.id, muscle]));
