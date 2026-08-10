import { z } from 'zod';
import {
  MuscleIdSchema,
  ProgressionFamilyIdSchema,
  TrainingRoleSchema,
} from '../../catalog/schema';

export const workoutDurationValues = ['15', '30', '45', 'default'] as const;
export const WorkoutDurationSchema = z.enum(workoutDurationValues);

export const warmupSetSchema = z.object({
  kind: z.enum(['movement-rehearsal', 'load-ramp']),
  reps: z.number().int().positive(),
  loadPercent: z.number().int().min(0).max(100).nullable(),
  note: z.string().min(1),
  countsTowardProgression: z.literal(false),
  countsTowardPr: z.literal(false),
  countsTowardWorkingVolume: z.literal(false),
});

export const exercisePrescriptionSchema = z.object({
  prescriptionId: z.string().min(1),
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  catalogRole: TrainingRoleSchema,
  progressionRole: z.enum([
    'strength-anchor',
    'hypertrophy-builder',
    'specialization',
    'support',
  ]),
  progressionFamily: ProgressionFamilyIdSchema,
  sets: z.number().int().min(1).max(8),
  repRange: z.object({
    min: z.number().int().positive(),
    max: z.number().int().positive(),
  }),
  loadGuidance: z.string().min(1),
  targetRir: z.number().int().min(0).max(5),
  restSeconds: z.number().int().min(0).max(600),
  warmupSets: z.array(warmupSetSchema),
  dropSet: z
    .object({
      reps: z.string().min(1),
      loadReductionPercent: z.number().int().min(5).max(50),
      rationale: z.string().min(1),
    })
    .nullable(),
  rationale: z.string().min(1),
});

const baseBlockSchema = z.object({
  blockId: z.string().min(1),
  canonicalRow: z.string().min(1),
});

export const workoutBlockSchema = z.discriminatedUnion('kind', [
  baseBlockSchema.extend({
    kind: z.literal('exercise'),
    prescription: exercisePrescriptionSchema,
  }),
  baseBlockSchema.extend({
    kind: z.literal('superset'),
    moves: z.tuple([exercisePrescriptionSchema, exercisePrescriptionSchema]),
    rounds: z.number().int().min(1).max(8),
    restAfterRoundSeconds: z.number().int().min(0).max(600),
  }),
  baseBlockSchema.extend({
    kind: z.literal('circuit'),
    moves: z.array(exercisePrescriptionSchema).min(2).max(4),
    rounds: z.number().int().min(1).max(8),
    restAfterRoundSeconds: z.number().int().min(0).max(600),
  }),
]);

export const generatedWorkoutSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  duration: WorkoutDurationSchema,
  targetSeconds: z.number().int().positive(),
  estimatedSeconds: z.number().int().positive(),
  estimatedMinutes: z.number().int().positive(),
  priorities: z.array(MuscleIdSchema).min(1).max(6),
  prioritySignals: z.array(
    z.object({
      muscle: MuscleIdSchema,
      weeklyDeficitSets: z.number().nonnegative(),
      recoveryRemaining: z.number().min(0).max(100),
    }),
  ),
  plannedVolume: z.partialRecord(MuscleIdSchema, z.number().nonnegative()),
  blocks: z.array(workoutBlockSchema).min(1),
  warmupSummary: z.string().min(1),
  explanation: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  compromises: z.array(z.string().min(1)),
  metadata: z.object({
    engineVersion: z.literal(1),
    generatedLocally: z.literal(true),
    deterministicKey: z.string().min(1),
    usesWeeklyVolume: z.literal(true),
    usesRecentExposure: z.literal(true),
    recalibrationEligible: z.literal(true),
  }),
});

export type WorkoutDuration = z.infer<typeof WorkoutDurationSchema>;
export type WarmupSet = z.infer<typeof warmupSetSchema>;
export type ExercisePrescription = z.infer<typeof exercisePrescriptionSchema>;
export type WorkoutBlock = z.infer<typeof workoutBlockSchema>;
export type GeneratedWorkout = z.infer<typeof generatedWorkoutSchema>;

export type RecentMuscleExposure = {
  muscle: z.infer<typeof MuscleIdSchema>;
  trainedAt: string;
  hardSets: number;
};

export type WeeklyVolume = Partial<
  Record<z.infer<typeof MuscleIdSchema>, number>
>;
