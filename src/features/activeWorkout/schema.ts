import { z } from 'zod';
import { generatedWorkoutSchema } from '../../engine/workoutGenerator/schema';
import { CustomExerciseSchema } from '../../catalog/schema';

export const ActiveSetRecordSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  blockId: z.string().min(1),
  prescriptionId: z.string().min(1),
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  kind: z.enum(['warmup', 'working', 'drop']),
  setIndex: z.number().int().nonnegative(),
  roundIndex: z.number().int().nonnegative().nullable(),
  moveIndex: z.number().int().nonnegative(),
  weight: z.number().min(0).max(5000),
  reps: z.number().int().min(1).max(1000),
  rir: z.number().int().min(0).max(10),
  tempo: z.string().min(1).max(40).nullable().default(null),
  restSecondsTaken: z.number().int().min(0).max(3600).nullable().default(null),
  plannedRestSeconds: z.number().int().min(0).max(900).nullable().default(null),
  painReported: z.boolean().default(false),
  completedAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
  countsTowardProgression: z.boolean(),
  countsTowardPr: z.boolean(),
  countsTowardWorkingVolume: z.boolean(),
});

export const ReadinessCheckSchema = z.object({
  energy: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
  sleep: z.number().int().min(1).max(5),
  jointDiscomfort: z.enum(['none', 'mild', 'moderate', 'severe']),
  motivation: z.number().int().min(1).max(5),
  timePressure: z.enum(['none', 'some', 'high']),
  checkedAt: z.string().datetime(),
});

export const SessionFeedbackSchema = z.object({
  difficulty: z.enum(['too-easy', 'right', 'too-hard', 'pain']),
  energyAfter: z.number().int().min(1).max(5),
  note: z.string().max(500),
  submittedAt: z.string().datetime(),
});

const defaultReadiness = () => ({
  energy: 3 as const,
  soreness: 2 as const,
  sleep: 3 as const,
  jointDiscomfort: 'none' as const,
  motivation: 3 as const,
  timePressure: 'none' as const,
  checkedAt: new Date(0).toISOString(),
});

export const RestTimerSchema = z.object({
  startedAt: z.string().datetime(),
  durationSeconds: z.number().int().min(5).max(900),
  targetSeconds: z.number().int().min(0).max(900),
  status: z.enum(['running', 'complete']),
});

export const ActiveSessionSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  workout: generatedWorkoutSchema,
  status: z.enum(['active', 'paused', 'completed']),
  startedAt: z.string().datetime(),
  pausedAt: z.string().datetime().nullable(),
  accumulatedPausedSeconds: z.number().int().nonnegative(),
  completedAt: z.string().datetime().nullable(),
  currentBlockIndex: z.number().int().nonnegative(),
  records: z.array(ActiveSetRecordSchema),
  warmupSelections: z.record(
    z.string(),
    z.enum(['pending', 'added', 'skipped']),
  ),
  notesByExerciseId: z.record(z.string(), z.string().max(500)),
  customExerciseSnapshots: z.record(z.string(), CustomExerciseSchema),
  pinnedExerciseIds: z.array(z.string()),
  acceptedAlternativeIds: z.array(z.string()),
  skippedBlockIds: z.array(z.string()),
  restTimer: RestTimerSchema.nullable(),
  lastRestStartedAt: z.string().datetime().nullable().default(null),
  lastRestTargetSeconds: z
    .number()
    .int()
    .min(0)
    .max(900)
    .nullable()
    .default(null),
  readiness: ReadinessCheckSchema.default(defaultReadiness),
  sessionFeedback: SessionFeedbackSchema.nullable().default(null),
  trainingContext: z
    .object({
      locationId: z.string().min(1).nullable(),
      locationKind: z.enum(['home', 'gym', 'travel']).nullable(),
      equipmentIds: z.array(z.string().min(1)),
    })
    .default({ locationId: null, locationKind: null, equipmentIds: [] }),
  updatedAt: z.string().datetime(),
});

export const ExerciseNoteSchema = z.object({
  id: z.string().min(1),
  note: z.string().max(500),
  updatedAt: z.string().datetime(),
});

export type ActiveSetRecord = z.infer<typeof ActiveSetRecordSchema>;
export type RestTimer = z.infer<typeof RestTimerSchema>;
export type ActiveSession = z.infer<typeof ActiveSessionSchema>;
export type ExerciseNote = z.infer<typeof ExerciseNoteSchema>;
export type ReadinessCheck = z.infer<typeof ReadinessCheckSchema>;
export type SessionFeedback = z.infer<typeof SessionFeedbackSchema>;

export type SetSlot = {
  blockId: string;
  blockIndex: number;
  prescriptionId: string;
  exerciseId: string;
  exerciseName: string;
  kind: ActiveSetRecord['kind'];
  setIndex: number;
  roundIndex: number | null;
  moveIndex: number;
  targetReps: string;
  targetRir: number;
  restSeconds: number;
  loadGuidance: string;
};
