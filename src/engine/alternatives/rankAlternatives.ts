import { equipmentById } from '../../catalog/equipment';
import { exerciseById, exerciseCatalog } from '../../catalog/exercises';
import type { Exercise } from '../../catalog/schema';
import {
  conflictsForCandidate,
  primaryMuscleOverlap,
} from '../conflicts/validateConflicts';
import type { ConflictContext, ExerciseConflict } from '../conflicts/types';

export type AlternativeCandidate = {
  exercise: Exercise;
  score: number;
  primaryReason: string;
  keyDifference: string;
  equipmentLabel: string;
  setupTimeSeconds: number;
  preservesProgression: boolean;
  changesSuperset: boolean;
  warnings: ExerciseConflict[];
};

export type ExcludedAlternative = {
  exercise: Exercise;
  reasons: string[];
};

export type AlternativeRankingResult = {
  current: Exercise;
  ranked: AlternativeCandidate[];
  excluded: ExcludedAlternative[];
};

export function alternativeFitBoundary(
  result: Pick<AlternativeRankingResult, 'ranked'>,
): string | null {
  if (result.ranked.length === 0) {
    return 'No compatible alternative is available for the current equipment, limitations, and training role.';
  }
  if (result.ranked[0].score < 60) {
    return 'No close like-for-like match is available. The listed options are compromises, not equivalent replacements.';
  }
  return null;
}

export type AlternativeRequest = {
  currentExerciseId: string;
  selectedExerciseIds: string[];
  context: ConflictContext;
  dislikedExerciseIds?: string[];
  supersetPartnerId?: string | null;
  catalog?: Exercise[];
};

function sameMembers(first: string[], second: string[]): boolean {
  return (
    first.length === second.length &&
    first.every((value) => second.includes(value))
  );
}

function describeDifference(current: Exercise, candidate: Exercise): string {
  if (current.progressionFamily !== candidate.progressionFamily) {
    return `Changes progression family to ${candidate.progressionFamily.replaceAll('-', ' ')}.`;
  }
  if (current.movementPattern !== candidate.movementPattern) {
    return `Uses a ${candidate.movementPattern.replaceAll('-', ' ')} pattern.`;
  }
  if (candidate.setupTimeSeconds < current.setupTimeSeconds) {
    return `${current.setupTimeSeconds - candidate.setupTimeSeconds}s faster setup.`;
  }
  if (
    candidate.equipment.required.join() !== current.equipment.required.join()
  ) {
    return 'Uses different equipment with the same movement role.';
  }
  return 'Closest like-for-like movement available.';
}

function equipmentLabel(exercise: Exercise): string {
  return exercise.equipment.required
    .map((id) => equipmentById.get(id)?.name ?? id)
    .join(' + ');
}

function calculateScore(current: Exercise, candidate: Exercise): number {
  let score = 10;
  const muscleOverlap = primaryMuscleOverlap(current, candidate);
  score += muscleOverlap.length * 22;
  if (sameMembers(current.primaryMuscles, candidate.primaryMuscles))
    score += 12;
  if (current.movementPattern === candidate.movementPattern) score += 18;
  if (current.trainingRole === candidate.trainingRole) score += 10;
  if (current.progressionFamily === candidate.progressionFamily) score += 20;
  if (current.commonSubstitutions.includes(candidate.id)) score += 8;
  if (
    current.equipment.required.some((equipment) =>
      candidate.equipment.required.includes(equipment),
    )
  ) {
    score += 5;
  }
  score -= Math.min(
    10,
    Math.floor(
      Math.abs(current.setupTimeSeconds - candidate.setupTimeSeconds) / 30,
    ),
  );
  score -= Math.abs(
    current.hypertrophySuitability - candidate.hypertrophySuitability,
  );
  score -= Math.abs(
    current.strengthSuitability - candidate.strengthSuitability,
  );
  return Math.max(0, Math.min(100, score));
}

export function rankAlternatives(
  request: AlternativeRequest,
): AlternativeRankingResult {
  const catalog = request.catalog ?? exerciseCatalog;
  const current = catalog.find(
    (exercise) => exercise.id === request.currentExerciseId,
  );
  if (!current) {
    throw new Error(`Unknown current exercise: ${request.currentExerciseId}`);
  }

  const selectedWithoutCurrent = request.selectedExerciseIds.filter(
    (id) => id !== current.id,
  );
  const disliked = new Set(request.dislikedExerciseIds ?? []);
  const ranked: AlternativeCandidate[] = [];
  const excluded: ExcludedAlternative[] = [];

  catalog.forEach((candidate) => {
    if (candidate.id === current.id) return;
    const reasons: string[] = [];
    if (primaryMuscleOverlap(current, candidate).length === 0) {
      reasons.push('Does not train the same primary muscle.');
    }
    if (disliked.has(candidate.id)) {
      reasons.push('Marked as disliked.');
    }

    const candidateContext: ConflictContext = {
      ...request.context,
      supersetPairs: request.supersetPartnerId
        ? [
            ...request.context.supersetPairs,
            {
              firstExerciseId: candidate.id,
              secondExerciseId: request.supersetPartnerId,
            },
          ]
        : request.context.supersetPairs,
    };
    const candidateConflicts = conflictsForCandidate(
      candidate,
      selectedWithoutCurrent,
      candidateContext,
    );
    reasons.push(
      ...candidateConflicts
        .filter((item) => item.severity === 'block')
        .map((item) => item.message),
    );

    if (reasons.length > 0) {
      excluded.push({
        exercise: candidate,
        reasons: Array.from(new Set(reasons)),
      });
      return;
    }

    const preservesProgression =
      current.progressionFamily === candidate.progressionFamily;
    const muscleOverlap = primaryMuscleOverlap(current, candidate);
    ranked.push({
      exercise: candidate,
      score: calculateScore(current, candidate),
      primaryReason: preservesProgression
        ? 'Preserves progression continuity'
        : `Matches ${muscleOverlap.join(' + ')} priority`,
      keyDifference: describeDifference(current, candidate),
      equipmentLabel: equipmentLabel(candidate),
      setupTimeSeconds: candidate.setupTimeSeconds,
      preservesProgression,
      changesSuperset: candidateConflicts.some(
        (item) =>
          item.type === 'superset' ||
          item.type === 'station' ||
          item.type === 'grip',
      ),
      warnings: candidateConflicts.filter(
        (item) => item.severity === 'warning',
      ),
    });
  });

  ranked.sort(
    (first, second) =>
      second.score - first.score ||
      first.exercise.name.localeCompare(second.exercise.name),
  );

  return { current, ranked, excluded };
}

export type ExerciseSlot = {
  slotId: string;
  exerciseId: string;
  order: number;
  setCount: number;
  note?: string;
};

export function replaceExerciseSlot(
  slots: ExerciseSlot[],
  slotId: string,
  replacementExerciseId: string,
): ExerciseSlot[] {
  if (!exerciseById.has(replacementExerciseId)) {
    throw new Error(`Unknown replacement exercise: ${replacementExerciseId}`);
  }
  return slots.map((slot) =>
    slot.slotId === slotId
      ? { ...slot, exerciseId: replacementExerciseId }
      : slot,
  );
}
