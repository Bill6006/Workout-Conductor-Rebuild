import { exerciseById } from '../../catalog/exercises';
import type { ExercisePrescription, WorkoutBlock } from './schema';

export type WorkoutTimeEstimate = {
  totalSeconds: number;
  warmupSeconds: number;
  setupAndTransitionSeconds: number;
  workingSeconds: number;
  restSeconds: number;
};

function executionSeconds(prescription: ExercisePrescription): number {
  const exercise = exerciseById.get(prescription.exerciseId);
  if (!exercise) return 45;
  if (exercise.laterality === 'unilateral') return 65;
  if (exercise.movementPattern === 'anti-extension') return 50;
  return exercise.mechanics === 'compound' ? 50 : 40;
}

function warmupSeconds(prescription: ExercisePrescription): number {
  return prescription.warmupSets.length * 75;
}

function setupSeconds(prescription: ExercisePrescription): number {
  return exerciseById.get(prescription.exerciseId)?.setupTimeSeconds ?? 30;
}

export function estimateWorkoutTime(
  blocks: WorkoutBlock[],
): WorkoutTimeEstimate {
  // Two minutes covers general movement preparation; exercise-specific ramp
  // sets are estimated separately so compact sessions do not double count it.
  let warmup = 120;
  let setupAndTransition = 0;
  let working = 0;
  let rest = 0;

  blocks.forEach((block) => {
    const prescriptions =
      block.kind === 'exercise' ? [block.prescription] : block.moves;
    warmup += prescriptions.reduce(
      (total, prescription) => total + warmupSeconds(prescription),
      0,
    );
    setupAndTransition +=
      prescriptions.reduce(
        (total, prescription) => total + setupSeconds(prescription),
        0,
      ) + (block.kind === 'exercise' ? 45 : 60);

    if (block.kind === 'exercise') {
      working += executionSeconds(block.prescription) * block.prescription.sets;
      rest +=
        Math.max(0, block.prescription.sets - 1) *
        block.prescription.restSeconds;
    } else {
      working +=
        block.moves.reduce(
          (total, prescription) => total + executionSeconds(prescription),
          0,
        ) * block.rounds;
      rest += Math.max(0, block.rounds - 1) * block.restAfterRoundSeconds;
    }

    prescriptions.forEach((prescription) => {
      if (prescription.dropSet) working += 75;
    });
  });

  return {
    totalSeconds: Math.round(warmup + setupAndTransition + working + rest),
    warmupSeconds: warmup,
    setupAndTransitionSeconds: setupAndTransition,
    workingSeconds: working,
    restSeconds: rest,
  };
}

export function targetSecondsForDuration(
  duration: '15' | '30' | '45' | 'default',
  defaultMinutes: number,
) {
  return (duration === 'default' ? defaultMinutes : Number(duration)) * 60;
}
