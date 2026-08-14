import { z } from 'zod';

export const muscleIds = [
  'chest',
  'upper-chest',
  'front-delts',
  'side-delts',
  'rear-delts',
  'triceps',
  'biceps',
  'brachialis',
  'forearms',
  'lats',
  'upper-back',
  'traps',
  'spinal-erectors',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
] as const;

export const movementPatternIds = [
  'horizontal-press',
  'incline-press',
  'vertical-press',
  'horizontal-pull',
  'vertical-pull',
  'squat',
  'lunge',
  'hinge',
  'knee-flexion',
  'knee-extension',
  'hip-extension',
  'plantar-flexion',
  'elbow-flexion',
  'elbow-extension',
  'shoulder-abduction',
  'scapular-retraction',
  'anti-extension',
  'anti-rotation',
  'trunk-flexion',
  'lateral-flexion',
  'loaded-carry',
] as const;

export const equipmentIds = [
  'bodyweight',
  'dumbbells',
  'adjustable-bench',
  'barbell',
  'weight-plates',
  'squat-rack',
  'pull-up-bar',
  'cable-station',
  'lat-pulldown',
  'seated-row',
  'chest-press-machine',
  'leg-press',
  'leg-curl',
  'leg-extension',
  'pec-deck',
  'shoulder-press-machine',
  'assisted-pullup-dip',
  'dip-station',
  'calf-raise-machine',
  'resistance-band',
  'exercise-mat',
] as const;

export const progressionFamilyIds = [
  'horizontal-press',
  'incline-press',
  'vertical-press',
  'vertical-pull',
  'horizontal-pull',
  'squat',
  'single-leg-squat',
  'hip-hinge',
  'knee-flexion',
  'knee-extension',
  'hip-extension',
  'plantar-flexion',
  'lateral-raise',
  'rear-delt',
  'elbow-flexion-supinated',
  'elbow-flexion-neutral',
  'elbow-extension',
  'anti-extension',
  'anti-rotation',
  'trunk-flexion',
  'lateral-flexion',
  'loaded-carry',
] as const;

export const jointStressTags = [
  'shoulder-extension',
  'shoulder-overhead',
  'shoulder-internal-rotation',
  'elbow-flexor-tendon',
  'elbow-extension-tendon',
  'wrist-extension',
  'knee-deep-flexion',
  'knee-shear',
  'lumbar-loading',
  'hip-deep-flexion',
] as const;

export const trainingRoles = [
  'primary-strength',
  'secondary-strength',
  'primary-hypertrophy',
  'secondary-hypertrophy',
  'isolation',
  'specialization',
  'corrective',
] as const;

export const locationKinds = ['home', 'gym', 'travel'] as const;

export const MuscleIdSchema = z.enum(muscleIds);
export const MovementPatternIdSchema = z.enum(movementPatternIds);
export const EquipmentIdSchema = z.enum(equipmentIds);
export const ProgressionFamilyIdSchema = z.enum(progressionFamilyIds);
export const JointStressTagSchema = z.enum(jointStressTags);
export const TrainingRoleSchema = z.enum(trainingRoles);
export const LocationKindSchema = z.enum(locationKinds);

export const MuscleDefinitionSchema = z.object({
  id: MuscleIdSchema,
  name: z.string().min(1),
  region: z.enum(['upper', 'lower', 'core']),
  group: z.enum(['chest', 'shoulders', 'arms', 'back', 'legs', 'core']),
  aliases: z.array(z.string().min(1)),
  directVolumeFactor: z.number().min(0).max(1),
  secondaryVolumeFactor: z.number().min(0).max(1),
  typicalRecoveryHours: z.number().int().min(12).max(168),
});

export const MovementPatternSchema = z.object({
  id: MovementPatternIdSchema,
  name: z.string().min(1),
  category: z.enum(['push', 'pull', 'lower', 'arms', 'core']),
  plane: z.enum([
    'horizontal',
    'vertical',
    'sagittal',
    'frontal',
    'transverse',
  ]),
  description: z.string().min(1),
});

export const EquipmentDefinitionSchema = z.object({
  id: EquipmentIdSchema,
  name: z.string().min(1),
  category: z.enum([
    'bodyweight',
    'free-weight',
    'station',
    'machine',
    'accessory',
  ]),
  locations: z.array(LocationKindSchema).min(1),
  scarceStation: z.boolean(),
  supportsPlateMath: z.boolean(),
});

export const ProgressionFamilySchema = z.object({
  id: ProgressionFamilyIdSchema,
  name: z.string().min(1),
  defaultMethod: z.enum([
    'double-progression',
    'load-progression',
    'rep-progression',
    'time-progression',
  ]),
  continuityKey: z.string().min(1),
  incrementHint: z.string().min(1),
});

export const MediaManifestEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  posterPath: z.string().startsWith('/'),
  demonstrationPath: z.string().startsWith('/').nullable(),
  status: z.enum(['original-placeholder', 'production-ready']),
  source: z.literal('Workout Conductor original'),
  license: z.literal('Project-owned; redistribution permitted'),
  author: z.literal('Workout Conductor project'),
  reducedMotionPosterPath: z.string().startsWith('/'),
});

export const ExerciseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(80),
  aliases: z.array(z.string().min(1)).max(10),
  primaryMuscles: z.array(MuscleIdSchema).min(1).max(4),
  secondaryMuscles: z.array(MuscleIdSchema).max(8),
  movementPattern: MovementPatternIdSchema,
  trainingRole: TrainingRoleSchema,
  strengthSuitability: z.number().int().min(1).max(5),
  hypertrophySuitability: z.number().int().min(1).max(5),
  equipment: z.object({
    required: z.array(EquipmentIdSchema).min(1),
    optional: z.array(EquipmentIdSchema),
  }),
  locations: z.array(LocationKindSchema).min(1),
  setupTimeSeconds: z.number().int().min(0).max(600),
  transitionCost: z.number().int().min(1).max(5),
  typicalRepRange: z.object({
    min: z.number().int().min(1).max(100),
    max: z.number().int().min(1).max(100),
  }),
  dropSet: z.object({
    support: z.enum(['safe', 'conditional', 'avoid']),
    reason: z.string().min(1),
  }),
  superset: z.object({
    tags: z.array(
      z.enum([
        'push',
        'pull',
        'lower',
        'arms',
        'core',
        'low-setup',
        'stationary',
      ]),
    ),
    avoidWithPatterns: z.array(MovementPatternIdSchema),
  }),
  laterality: z.enum(['bilateral', 'unilateral', 'alternating']),
  mechanics: z.enum(['compound', 'isolation']),
  stabilityDemand: z.number().int().min(1).max(5),
  gripDemand: z.number().int().min(1).max(5),
  jointStress: z.array(JointStressTagSchema),
  considerations: z.object({
    shoulder: z.enum(['neutral', 'caution', 'avoid']),
    knee: z.enum(['neutral', 'caution', 'avoid']),
    lowerBack: z.enum(['neutral', 'caution', 'avoid']),
  }),
  commonSubstitutions: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(8),
  instructions: z.array(z.string().min(8)).min(3).max(8),
  commonMistakes: z.array(z.string().min(5)).min(1).max(6),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  mediaId: z.string().regex(/^[a-z0-9-]+$/),
  progressionFamily: ProgressionFamilyIdSchema,
  warmup: z.object({
    rampEligible: z.boolean(),
    minimumRampSets: z.number().int().min(0).max(6),
    protocol: z.enum(['load-ramp', 'movement-rehearsal', 'none']),
  }),
  plateMath: z.object({
    loadType: z.enum([
      'barbell-total',
      'dumbbell-each-hand',
      'machine-stack',
      'cable-stack',
      'bodyweight',
      'band',
    ]),
    barWeightCompatible: z.boolean(),
    eachHand: z.boolean(),
  }),
  productionEnabled: z.boolean(),
});

export const ExerciseCatalogSchema = z
  .array(ExerciseSchema)
  .min(20)
  .superRefine((catalog, context) => {
    const ids = new Set<string>();
    catalog.forEach((exercise, index) => {
      if (ids.has(exercise.id)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: `Duplicate exercise id: ${exercise.id}`,
        });
      }
      ids.add(exercise.id);
      if (exercise.typicalRepRange.min > exercise.typicalRepRange.max) {
        context.addIssue({
          code: 'custom',
          path: [index, 'typicalRepRange'],
          message: 'Minimum reps cannot exceed maximum reps.',
        });
      }
    });
  });

export const CustomInstructionSchema = z
  .object({
    setup: z.string().trim().min(8).max(500),
    execution: z.array(z.string().trim().min(8).max(300)).min(1).max(8),
    breathingCue: z.string().trim().min(3).max(200),
    safetyNotes: z.array(z.string().trim().min(3).max(300)).max(8),
  })
  .strict();

export const CustomMediaSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['poster', 'demonstration']),
    mimeType: z.enum([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ]),
    blobKey: z.string().min(1),
    byteSize: z.number().int().positive().max(50_000_000),
    ownership: z.literal('user-owned'),
    createdAt: z.string().datetime(),
  })
  .strict();

export const CustomExerciseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(2).max(80),
    primaryMuscles: z.array(MuscleIdSchema).min(1).max(4),
    secondaryMuscles: z.array(MuscleIdSchema).max(8),
    movementPattern: MovementPatternIdSchema,
    equipment: z.array(EquipmentIdSchema).min(1),
    progressionFamily: ProgressionFamilyIdSchema,
    instructions: CustomInstructionSchema,
    media: z.array(CustomMediaSchema).max(4),
    jointStress: z.array(JointStressTagSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type MuscleId = z.infer<typeof MuscleIdSchema>;
export type MovementPatternId = z.infer<typeof MovementPatternIdSchema>;
export type EquipmentId = z.infer<typeof EquipmentIdSchema>;
export type ProgressionFamilyId = z.infer<typeof ProgressionFamilyIdSchema>;
export type JointStressTag = z.infer<typeof JointStressTagSchema>;
export type LocationKind = z.infer<typeof LocationKindSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type MediaManifestEntry = z.infer<typeof MediaManifestEntrySchema>;
export type CustomExercise = z.infer<typeof CustomExerciseSchema>;
