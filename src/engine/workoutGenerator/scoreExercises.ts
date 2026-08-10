import { exerciseCatalog } from '../../catalog/exercises';
import type { Exercise, JointStressTag, MuscleId } from '../../catalog/schema';
import type { Profile } from '../../domain/models';
import { validateExerciseSelection } from '../conflicts/validateConflicts';
import type { ConflictContext } from '../conflicts/types';
import type { MusclePriority } from './weeklyVolume';
import type { ResolvedTrainingLocation } from './equipmentAdapter';

export type ScoredExercise = {
  exercise: Exercise;
  score: number;
  reasons: string[];
  warnings: string[];
};

function limitationTags(profile: Profile): JointStressTag[] {
  const text = profile.limitations.join(' ').toLowerCase();
  const tags = new Set<JointStressTag>();
  if (text.includes('knee')) {
    tags.add('knee-deep-flexion');
    tags.add('knee-shear');
  }
  if (text.includes('lower back') || text.includes('lumbar')) {
    tags.add('lumbar-loading');
  }
  if (text.includes('wrist')) tags.add('wrist-extension');
  if (text.includes('elbow')) {
    tags.add('elbow-flexor-tendon');
    tags.add('elbow-extension-tendon');
  }
  return Array.from(tags);
}

export function generationConflictContext(args: {
  profile: Profile;
  location: ResolvedTrainingLocation;
  priorities: MusclePriority[];
  timeBudgetSeconds: number;
}): ConflictContext {
  return {
    availableEquipment: args.location.equipment,
    location: args.location.kind,
    blockedJointStress: limitationTags(args.profile),
    fatiguedMuscles: args.priorities
      .filter((priority) => priority.recoveryRemaining >= 60)
      .map((priority) => priority.muscle),
    shoulderSensitive: args.profile.shoulderLimitations,
    avoidBarbellSquat: args.profile.avoidBarbellSquats,
    timeBudgetSeconds: args.timeBudgetSeconds,
    supersetPairs: [],
  };
}

function nameMatches(values: string[], exercise: Exercise) {
  const names = [exercise.id, exercise.name, ...exercise.aliases].map((value) =>
    value.toLowerCase(),
  );
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return names.some(
      (name) => name.includes(normalized) || normalized.includes(name),
    );
  });
}

function musclePriorityScore(
  exercise: Exercise,
  priorities: MusclePriority[],
): number {
  const byMuscle = new Map(priorities.map((item) => [item.muscle, item]));
  return (
    exercise.primaryMuscles.reduce(
      (total, muscle) => total + (byMuscle.get(muscle)?.score ?? 0),
      0,
    ) /
      exercise.primaryMuscles.length +
    exercise.secondaryMuscles.reduce(
      (total, muscle) => total + (byMuscle.get(muscle)?.score ?? 0) * 0.25,
      0,
    )
  );
}

export function rankExercises(args: {
  profile: Profile;
  location: ResolvedTrainingLocation;
  priorities: MusclePriority[];
  timeBudgetSeconds: number;
  excludeIds?: string[];
  continuityExerciseIds?: string[];
  primaryMuscles?: MuscleId[];
  predicate?: (exercise: Exercise) => boolean;
}): ScoredExercise[] {
  const context = generationConflictContext(args);
  const excluded = new Set(args.excludeIds ?? []);

  return exerciseCatalog
    .filter((exercise) => !excluded.has(exercise.id))
    .filter((exercise) =>
      args.primaryMuscles?.length
        ? exercise.primaryMuscles.some((muscle) =>
            args.primaryMuscles?.includes(muscle),
          )
        : true,
    )
    .filter((exercise) => args.predicate?.(exercise) ?? true)
    .flatMap((exercise): ScoredExercise[] => {
      if (nameMatches(args.profile.dislikedExercises, exercise)) return [];
      const validation = validateExerciseSelection([exercise.id], context);
      if (!validation.valid) return [];

      const goalFit =
        args.profile.primaryGoal === 'Build Strength'
          ? exercise.strengthSuitability * 9
          : args.profile.primaryGoal === 'General Fitness'
            ? (exercise.strengthSuitability + exercise.hypertrophySuitability) *
              4
            : exercise.hypertrophySuitability * 9;
      const roleFit =
        exercise.trainingRole === 'primary-strength' ||
        exercise.trainingRole === 'primary-hypertrophy'
          ? 12
          : 0;
      const preference = nameMatches(args.profile.preferredExercises, exercise)
        ? 24
        : 0;
      const progressionContinuity = args.continuityExerciseIds?.includes(
        exercise.id,
      )
        ? 18
        : 0;
      const setupPenalty =
        exercise.setupTimeSeconds / 12 + exercise.transitionCost * 2;
      const recoveryPenalty =
        validation.warnings.filter((warning) => warning.type === 'recovery')
          .length * 30;
      const score = Math.round(
        musclePriorityScore(exercise, args.priorities) +
          goalFit +
          roleFit +
          progressionContinuity +
          preference -
          setupPenalty -
          recoveryPenalty,
      );
      const primaryPriority = exercise.primaryMuscles
        .slice()
        .sort(
          (first, second) =>
            (args.priorities.findIndex((item) => item.muscle === first) + 1 ||
              999) -
            (args.priorities.findIndex((item) => item.muscle === second) + 1 ||
              999),
        )[0];
      return [
        {
          exercise,
          score,
          reasons: [
            `${primaryPriority.replaceAll('-', ' ')} weekly-volume priority`,
            `${args.profile.primaryGoal.toLowerCase()} fit`,
            preference
              ? 'athlete preference match'
              : progressionContinuity
                ? 'progression continuity'
                : 'equipment-ready setup',
          ],
          warnings: validation.warnings.map((warning) => warning.message),
        },
      ];
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.exercise.name.localeCompare(second.exercise.name),
    );
}
