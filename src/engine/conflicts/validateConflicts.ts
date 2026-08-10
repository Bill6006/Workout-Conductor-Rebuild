import { equipmentById } from '../../catalog/equipment';
import { exerciseById } from '../../catalog/exercises';
import type { Exercise, JointStressTag, MuscleId } from '../../catalog/schema';
import type {
  ConflictContext,
  ConflictValidation,
  ExerciseConflict,
  SupersetPair,
} from './types';

function conflict(
  value: Omit<ExerciseConflict, 'code'> & { code?: string },
): ExerciseConflict {
  return {
    ...value,
    code: value.code ?? `${value.type}:${value.exerciseIds.join(':')}`,
  };
}

function shared<T>(first: T[], second: T[]): T[] {
  const secondValues = new Set(second);
  return first.filter((value) => secondValues.has(value));
}

function validateSingleExercise(
  exercise: Exercise,
  context: ConflictContext,
): ExerciseConflict[] {
  const conflicts: ExerciseConflict[] = [];
  const available = new Set(context.availableEquipment);
  const missing = exercise.equipment.required.filter(
    (equipment) => equipment !== 'bodyweight' && !available.has(equipment),
  );

  if (missing.length > 0) {
    conflicts.push(
      conflict({
        type: 'equipment',
        severity: 'block',
        exerciseIds: [exercise.id],
        message: `Missing required equipment: ${missing
          .map((id) => equipmentById.get(id)?.name ?? id)
          .join(', ')}.`,
      }),
    );
  }

  if (!exercise.locations.includes(context.location)) {
    conflicts.push(
      conflict({
        type: 'location',
        severity: 'block',
        exerciseIds: [exercise.id],
        message: `${exercise.name} is not suitable for the selected ${context.location} location.`,
      }),
    );
  }

  const blockedStress = shared(
    exercise.jointStress,
    context.blockedJointStress,
  );
  if (blockedStress.length > 0) {
    conflicts.push(
      conflict({
        type: 'limitation',
        severity: 'block',
        exerciseIds: [exercise.id],
        message: `Blocked by limitation tags: ${blockedStress.join(', ')}.`,
      }),
    );
  }

  if (
    context.shoulderSensitive &&
    (exercise.considerations.shoulder !== 'neutral' ||
      exercise.jointStress.some((tag) => tag.startsWith('shoulder-')))
  ) {
    conflicts.push(
      conflict({
        code: `limitation:shoulder:${exercise.id}`,
        type: 'limitation',
        severity: 'block',
        exerciseIds: [exercise.id],
        message: `${exercise.name} is hidden by the shoulder-sensitive guardrail.`,
      }),
    );
  }

  if (context.avoidBarbellSquat && exercise.id === 'barbell-back-squat') {
    conflicts.push(
      conflict({
        code: 'limitation:avoid-barbell-squat',
        type: 'limitation',
        severity: 'block',
        exerciseIds: [exercise.id],
        message: 'Barbell back squat is disabled by the athlete preference.',
      }),
    );
  }

  const fatigued = shared(exercise.primaryMuscles, context.fatiguedMuscles);
  if (fatigued.length > 0) {
    conflicts.push(
      conflict({
        type: 'recovery',
        severity: 'warning',
        exerciseIds: [exercise.id],
        message: `Primary target may still be recovering: ${fatigued.join(', ')}.`,
      }),
    );
  }

  if (
    context.timeBudgetSeconds !== null &&
    exercise.setupTimeSeconds > context.timeBudgetSeconds
  ) {
    conflicts.push(
      conflict({
        type: 'time',
        severity: 'block',
        exerciseIds: [exercise.id],
        message: `${exercise.name} setup exceeds the available time budget.`,
      }),
    );
  }

  return conflicts;
}

function validateSupersetPair(
  pair: SupersetPair,
  byId: Map<string, Exercise>,
): ExerciseConflict[] {
  const first = byId.get(pair.firstExerciseId);
  const second = byId.get(pair.secondExerciseId);
  if (!first || !second) return [];

  const pairIds = [first.id, second.id];
  const conflicts: ExerciseConflict[] = [];
  const sharedStress = shared(first.jointStress, second.jointStress);
  if (sharedStress.length > 0) {
    conflicts.push(
      conflict({
        type: 'joint-stress',
        severity: 'warning',
        exerciseIds: pairIds,
        message: `Both moves load ${sharedStress.join(', ')}.`,
      }),
    );
  }

  if (first.gripDemand >= 4 && second.gripDemand >= 4) {
    conflicts.push(
      conflict({
        type: 'grip',
        severity: 'block',
        exerciseIds: pairIds,
        message: 'Both moves have high grip demand and should not be paired.',
      }),
    );
  }

  const sharedEquipment = shared(
    first.equipment.required,
    second.equipment.required,
  ).filter((equipment) => equipmentById.get(equipment)?.scarceStation);
  if (sharedEquipment.length > 0) {
    conflicts.push(
      conflict({
        type: 'station',
        severity: 'block',
        exerciseIds: pairIds,
        message: `Both moves require the same scarce station: ${sharedEquipment
          .map((id) => equipmentById.get(id)?.name ?? id)
          .join(', ')}.`,
      }),
    );
  }

  if (
    first.superset.avoidWithPatterns.includes(second.movementPattern) ||
    second.superset.avoidWithPatterns.includes(first.movementPattern) ||
    (first.mechanics === 'compound' &&
      second.mechanics === 'compound' &&
      first.stabilityDemand >= 4 &&
      second.stabilityDemand >= 4)
  ) {
    conflicts.push(
      conflict({
        type: 'superset',
        severity: 'block',
        exerciseIds: pairIds,
        message:
          'This pairing would compromise priority-lift quality or stability.',
      }),
    );
  }

  return conflicts;
}

function countValues<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
}

export function validateExerciseSelection(
  exerciseIds: string[],
  context: ConflictContext,
): ConflictValidation {
  const exercises = exerciseIds
    .map((id) => exerciseById.get(id))
    .filter((exercise): exercise is Exercise => Boolean(exercise));
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const conflicts: ExerciseConflict[] = [];

  const duplicateCounts = countValues(exerciseIds);
  duplicateCounts.forEach((count, id) => {
    if (count > 1) {
      conflicts.push(
        conflict({
          type: 'duplicate-exercise',
          severity: 'block',
          exerciseIds: [id],
          message: `${exerciseById.get(id)?.name ?? id} appears more than once.`,
        }),
      );
    }
  });

  exercises.forEach((exercise) =>
    conflicts.push(...validateSingleExercise(exercise, context)),
  );

  const patternCounts = countValues(
    exercises.map((exercise) => exercise.movementPattern),
  );
  patternCounts.forEach((count, pattern) => {
    if (count > 2) {
      conflicts.push(
        conflict({
          type: 'duplicate-pattern',
          severity: 'warning',
          exerciseIds: exercises
            .filter((exercise) => exercise.movementPattern === pattern)
            .map((exercise) => exercise.id),
          message: `Movement pattern ${pattern} appears ${count} times.`,
        }),
      );
    }
  });

  const muscleCounts = countValues(
    exercises.flatMap((exercise) => exercise.primaryMuscles),
  );
  muscleCounts.forEach((count, muscle) => {
    if (count > 3) {
      conflicts.push(
        conflict({
          type: 'muscle-overlap',
          severity: 'warning',
          exerciseIds: exercises
            .filter((exercise) => exercise.primaryMuscles.includes(muscle))
            .map((exercise) => exercise.id),
          message: `Primary ${muscle} volume is repeated ${count} times.`,
        }),
      );
    }
  });

  const primaryStrength = exercises.filter(
    (exercise) => exercise.trainingRole === 'primary-strength',
  );
  if (primaryStrength.length > 2) {
    conflicts.push(
      conflict({
        type: 'progression-role',
        severity: 'warning',
        exerciseIds: primaryStrength.map((exercise) => exercise.id),
        message:
          'More than two primary strength roles may dilute progression quality.',
      }),
    );
  }

  context.supersetPairs.forEach((pair) =>
    conflicts.push(...validateSupersetPair(pair, byId)),
  );

  const unique = Array.from(
    new Map(conflicts.map((item) => [item.code, item])).values(),
  );
  const blocking = unique.filter((item) => item.severity === 'block');
  const warnings = unique.filter((item) => item.severity === 'warning');

  return {
    valid: blocking.length === 0,
    conflicts: unique,
    blocking,
    warnings,
  };
}

export function conflictsForCandidate(
  candidate: Exercise,
  selectedExerciseIds: string[],
  context: ConflictContext,
): ExerciseConflict[] {
  return validateExerciseSelection(
    [...selectedExerciseIds, candidate.id],
    context,
  ).conflicts.filter((item) => item.exerciseIds.includes(candidate.id));
}

export function jointStressOverlap(
  first: Exercise,
  second: Exercise,
): JointStressTag[] {
  return shared(first.jointStress, second.jointStress);
}

export function primaryMuscleOverlap(
  first: Exercise,
  second: Exercise,
): MuscleId[] {
  return shared(first.primaryMuscles, second.primaryMuscles);
}
