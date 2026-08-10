import type {
  EquipmentId,
  JointStressTag,
  LocationKind,
  MuscleId,
} from '../../catalog/schema';

export const conflictTypes = [
  'duplicate-exercise',
  'duplicate-pattern',
  'muscle-overlap',
  'joint-stress',
  'grip',
  'equipment',
  'station',
  'superset',
  'recovery',
  'time',
  'limitation',
  'location',
  'progression-role',
] as const;

export type ConflictType = (typeof conflictTypes)[number];
export type ConflictSeverity = 'block' | 'warning';

export type ExerciseConflict = {
  code: string;
  type: ConflictType;
  severity: ConflictSeverity;
  exerciseIds: string[];
  message: string;
};

export type SupersetPair = {
  firstExerciseId: string;
  secondExerciseId: string;
};

export type ConflictContext = {
  availableEquipment: EquipmentId[];
  location: LocationKind;
  blockedJointStress: JointStressTag[];
  fatiguedMuscles: MuscleId[];
  shoulderSensitive: boolean;
  avoidBarbellSquat: boolean;
  timeBudgetSeconds: number | null;
  supersetPairs: SupersetPair[];
};

export const defaultConflictContext: ConflictContext = {
  availableEquipment: [],
  location: 'gym',
  blockedJointStress: [],
  fatiguedMuscles: [],
  shoulderSensitive: false,
  avoidBarbellSquat: false,
  timeBudgetSeconds: null,
  supersetPairs: [],
};

export type ConflictValidation = {
  valid: boolean;
  conflicts: ExerciseConflict[];
  blocking: ExerciseConflict[];
  warnings: ExerciseConflict[];
};
