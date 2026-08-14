import { z } from 'zod';
import { generatedWorkoutSchema } from '../../engine/workoutGenerator/schema';
import { CustomExerciseSchema } from '../../catalog/schema';

export const MAX_SET_REPS = 200;
export const WeightUnitSchema = z.enum(['lb', 'kg']);

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
  weightUnit: WeightUnitSchema,
  reps: z.number().int().min(1).max(MAX_SET_REPS),
  legacyInvalidReps: z
    .number()
    .int()
    .min(MAX_SET_REPS + 1)
    .max(1000)
    .nullable()
    .default(null),
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

function setSlotIdentity(record: {
  blockId: string;
  prescriptionId: string;
  kind: string;
  setIndex: number;
  roundIndex: number | null;
  moveIndex: number;
}) {
  return [
    record.blockId,
    record.prescriptionId,
    record.kind,
    record.setIndex,
    record.roundIndex ?? 'none',
    record.moveIndex,
  ].join(':');
}

export const ActiveSessionSchema = z
  .object({
    id: z.string().min(1),
    schemaVersion: z.literal(2),
    weightUnit: WeightUnitSchema,
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
    deferredPrescriptionIds: z.array(z.string()).default([]),
    omittedPrescriptionIds: z.array(z.string()).default([]),
    completionCelebratedAt: z.string().datetime().nullable().default(null),
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
  })
  .superRefine((session, context) => {
    const seen = new Set<string>();
    session.records.forEach((record, index) => {
      const key = setSlotIdentity(record);
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['records', index],
          message:
            'A session cannot contain two records for the same set slot.',
        });
      }
      seen.add(key);
      if (
        record.legacyInvalidReps !== null &&
        (record.countsTowardProgression ||
          record.countsTowardPr ||
          record.countsTowardWorkingVolume)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['records', index],
          message: 'A legacy out-of-range record cannot count as evidence.',
        });
      }
    });
  });

const ActiveSetRecordImportSchema = ActiveSetRecordSchema.extend({
  weightUnit: WeightUnitSchema.optional(),
});

const ActiveSessionImportObjectSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  weightUnit: WeightUnitSchema.optional(),
  workout: generatedWorkoutSchema,
  status: z.enum(['active', 'paused', 'completed']),
  startedAt: z.string().datetime(),
  pausedAt: z.string().datetime().nullable(),
  accumulatedPausedSeconds: z.number().int().nonnegative(),
  completedAt: z.string().datetime().nullable(),
  currentBlockIndex: z.number().int().nonnegative(),
  records: z.array(ActiveSetRecordImportSchema),
  warmupSelections: z.record(
    z.string(),
    z.enum(['pending', 'added', 'skipped']),
  ),
  notesByExerciseId: z.record(z.string(), z.string().max(500)),
  customExerciseSnapshots: z.record(z.string(), CustomExerciseSchema),
  pinnedExerciseIds: z.array(z.string()),
  acceptedAlternativeIds: z.array(z.string()),
  skippedBlockIds: z.array(z.string()),
  deferredPrescriptionIds: z.array(z.string()).default([]),
  omittedPrescriptionIds: z.array(z.string()).default([]),
  completionCelebratedAt: z.string().datetime().nullable().default(null),
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

export const ActiveSessionImportSchema =
  ActiveSessionImportObjectSchema.superRefine((session, context) => {
    const seen = new Set<string>();
    session.records.forEach((record, index) => {
      const key = setSlotIdentity(record);
      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['records', index],
          message: 'A backup cannot contain duplicate set slots.',
        });
      }
      seen.add(key);
    });
  });

const LegacyActiveSetRecordMigrationSchema = ActiveSetRecordImportSchema.extend(
  {
    reps: z.number().int().min(1).max(1000),
    legacyInvalidReps: z
      .number()
      .int()
      .min(MAX_SET_REPS + 1)
      .max(1000)
      .nullable()
      .optional(),
  },
);

const ActiveSessionMigrationSchema = ActiveSessionImportObjectSchema.extend({
  records: z.array(LegacyActiveSetRecordMigrationSchema),
});

export function migrateActiveSession(
  value: unknown,
  fallbackUnit: 'lb' | 'kg',
): ActiveSession {
  const legacy = ActiveSessionMigrationSchema.parse(value);
  const weightUnit = legacy.weightUnit ?? fallbackUnit;
  const records = legacy.records.filter((record, index, all) => {
    const key = setSlotIdentity(record);
    return (
      all.findIndex((candidate) => setSlotIdentity(candidate) === key) === index
    );
  });
  const legacySkippedPrescriptions = legacy.workout.blocks
    .filter((block) => legacy.skippedBlockIds.includes(block.blockId))
    .flatMap((block) =>
      block.kind === 'exercise'
        ? [block.prescription.prescriptionId]
        : block.moves.map((move) => move.prescriptionId),
    );
  return ActiveSessionSchema.parse({
    ...legacy,
    schemaVersion: 2,
    weightUnit,
    omittedPrescriptionIds: Array.from(
      new Set([
        ...legacy.omittedPrescriptionIds,
        ...legacySkippedPrescriptions,
      ]),
    ),
    records: records.map((record) => {
      const legacyInvalidReps =
        record.reps > MAX_SET_REPS
          ? record.reps
          : (record.legacyInvalidReps ?? null);
      return {
        ...record,
        weightUnit: record.weightUnit ?? weightUnit,
        reps: legacyInvalidReps ? MAX_SET_REPS : record.reps,
        legacyInvalidReps,
        countsTowardProgression: legacyInvalidReps
          ? false
          : record.countsTowardProgression,
        countsTowardPr: legacyInvalidReps ? false : record.countsTowardPr,
        countsTowardWorkingVolume: legacyInvalidReps
          ? false
          : record.countsTowardWorkingVolume,
      };
    }),
  });
}

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
