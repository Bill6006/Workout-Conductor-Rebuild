import { z } from 'zod';
import { EquipmentIdSchema } from '../../catalog/schema';
import type { ResolvedTrainingLocation } from '../workoutGenerator/equipmentAdapter';
import type { WorkoutGenerationInput } from '../workoutGenerator/generateWorkout';
import {
  WorkoutDurationSchema,
  generatedWorkoutSchema,
  type GeneratedWorkout,
  type RecentMuscleExposure,
} from '../workoutGenerator/schema';

export const recalibrationTriggerValues = [
  'duration-change',
  'location-change',
  'equipment-profile-change',
  'equipment-unavailable',
  'equipment-busy',
  'exercise-replaced',
  'exercise-skipped',
  'pain-reported',
  'discomfort-reported',
  'performance-over-target',
  'performance-under-target',
  'target-load-change',
  'supersets-change',
  'drop-sets-change',
  'circuits-change',
  'readiness-change',
  'available-time-change',
  'resume-after-interruption',
  'completed-work-change',
  'station-unavailable',
  'finish-early',
  'intensity-request',
] as const;

export const RecalibrationTriggerSchema = z.enum(recalibrationTriggerValues);
export const RecalibrationScopeSchema = z.enum(['local', 'partial', 'full']);

export const CompletedSetRecordSchema = z
  .object({
    recordId: z.string().min(1),
    blockId: z.string().min(1),
    prescriptionId: z.string().min(1),
    exerciseId: z.string().min(1),
    setIndex: z.number().int().min(0),
    load: z.number().nonnegative().nullable(),
    reps: z.number().int().nonnegative(),
    rir: z.number().int().min(0).max(10).nullable(),
    completedAt: z.string().datetime(),
    locked: z.literal(true),
  })
  .strict();

export const CompletedWorkSchema = z
  .object({
    sets: z.array(CompletedSetRecordSchema),
    completedExerciseIds: z.array(z.string().min(1)),
    earnedPersonalRecordIds: z.array(z.string().min(1)),
    notesByExerciseId: z.record(z.string(), z.string()),
  })
  .strict();

export const RecalibrationSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  requestId: z.string().min(1),
  createdAt: z.string().datetime(),
  workout: generatedWorkoutSchema,
});

export type RecalibrationTrigger = z.infer<typeof RecalibrationTriggerSchema>;
export type RecalibrationScope = z.infer<typeof RecalibrationScopeSchema>;
export type CompletedSetRecord = z.infer<typeof CompletedSetRecordSchema>;
export type CompletedWork = z.infer<typeof CompletedWorkSchema>;
export type RecalibrationSnapshot = z.infer<typeof RecalibrationSnapshotSchema>;

export type RecalibrationSettingOverrides = {
  allowSupersets?: boolean;
  allowDropSets?: boolean;
  allowCircuits?: boolean;
};

export type RecalibrationPerformanceChange = {
  exerciseId: string;
  expectedRepMax: number;
  actualReps: number;
  targetLoad: number | null;
};

export type RecalibrationRequest = {
  requestId: string;
  trigger: RecalibrationTrigger;
  currentWorkout: GeneratedWorkout;
  generationInput: WorkoutGenerationInput;
  completedWork: CompletedWork;
  lockedExerciseIds: string[];
  pinnedExerciseIds: string[];
  userSelectedExerciseIds: string[];
  acceptedAlternativeIds: string[];
  currentExerciseId: string | null;
  affectedExerciseId: string | null;
  replacementExerciseId: string | null;
  requestedDuration: z.infer<typeof WorkoutDurationSchema>;
  elapsedSeconds: number;
  locationOverride: ResolvedTrainingLocation | null;
  unavailableEquipmentIds: Array<z.infer<typeof EquipmentIdSchema>>;
  sessionBusyEquipmentIds: Array<z.infer<typeof EquipmentIdSchema>>;
  settingOverrides: RecalibrationSettingOverrides;
  painFlags: string[];
  recoveryOverride: RecentMuscleExposure[] | null;
  readinessOverride: WorkoutGenerationInput['readiness'] | null;
  performanceChanges: RecalibrationPerformanceChange[];
  intensityRequest: 'harder' | 'easier' | null;
  endByExactTime: boolean;
  reason: string;
  timestamp: string;
};

export type RecalibrationChange = {
  code: string;
  kind:
    | 'added'
    | 'removed'
    | 'substituted'
    | 'sets'
    | 'technique'
    | 'protected'
    | 'timing'
    | 'recovery';
  exerciseIds: string[];
  message: string;
};

export type RecalibrationChangeSummary = {
  compact: string;
  addedExercises: number;
  removedExercises: number;
  substitutedExercises: number;
  setChanges: number;
  supersetsAdded: number;
  supersetsRemoved: number;
  protectedRecords: number;
  changes: RecalibrationChange[];
};

export type SuccessfulRecalibration = {
  status: 'success';
  requestId: string;
  trigger: RecalibrationTrigger;
  scope: RecalibrationScope;
  workout: GeneratedWorkout;
  previousWorkout: GeneratedWorkout;
  snapshot: RecalibrationSnapshot;
  completedWork: CompletedWork;
  lockedExerciseIds: string[];
  remainingEstimatedSeconds: number;
  availableRemainingSeconds: number;
  exactTimeImpossible: boolean;
  evaluationMessages: string[];
  summary: RecalibrationChangeSummary;
  elapsedMilliseconds: number;
  sessionOnly: {
    equipmentBusyIds: Array<z.infer<typeof EquipmentIdSchema>>;
    persisted: false;
  };
};

export type RolledBackRecalibration = {
  status: 'rolled-back';
  requestId: string;
  trigger: RecalibrationTrigger;
  scope: RecalibrationScope;
  workout: GeneratedWorkout;
  previousWorkout: GeneratedWorkout;
  snapshot: RecalibrationSnapshot;
  completedWork: CompletedWork;
  errorCode: string;
  errorMessage: string;
  elapsedMilliseconds: number;
};

export type RecalibrationResult =
  SuccessfulRecalibration | RolledBackRecalibration;

export const emptyCompletedWork: CompletedWork = {
  sets: [],
  completedExerciseIds: [],
  earnedPersonalRecordIds: [],
  notesByExerciseId: {},
};
