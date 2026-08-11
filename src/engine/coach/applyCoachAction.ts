import type { CoachAction } from './schema';
import {
  ActiveSessionSchema,
  type ActiveSession,
} from '../../features/activeWorkout/schema';
import type {
  ExercisePrescription,
  WorkoutBlock,
} from '../workoutGenerator/schema';

function updateMove(
  move: ExercisePrescription,
  action: CoachAction,
  completedCount: number,
) {
  if (action.exerciseId && move.exerciseId !== action.exerciseId) return move;
  switch (action.kind) {
    case 'increase-rest':
      return { ...move, restSeconds: Math.min(600, move.restSeconds + 30) };
    case 'micro-deload':
      return {
        ...move,
        loadGuidance: `Confirmed exercise reset: use about 7% less than the last completed working load. ${move.loadGuidance}`,
        targetRir: Math.min(5, move.targetRir + 1),
      };
    case 'reduce-intensity':
      return {
        ...move,
        loadGuidance: `Readiness adjustment: use about 10% less load. ${move.loadGuidance}`,
        targetRir: Math.min(5, move.targetRir + 1),
        dropSet: null,
      };
    case 'reduce-volume':
      return {
        ...move,
        sets: Math.max(completedCount, 1, move.sets - 1),
        dropSet: null,
      };
    case 'add-set':
      return { ...move, sets: Math.min(8, move.sets + 1) };
    case 'add-drop-set':
      return {
        ...move,
        dropSet: {
          reps: '10–15',
          loadReductionPercent: 20,
          rationale: 'Optional coach recommendation; stop if form changes.',
        },
      };
    case 'open-alternatives':
      return move;
  }
}

export function applyConfirmedCoachAction(
  session: ActiveSession,
  action: CoachAction,
): ActiveSession {
  if (action.kind === 'open-alternatives') return session;
  const completedByPrescription = new Map<string, number>();
  for (const record of session.records) {
    if (record.kind !== 'working') continue;
    completedByPrescription.set(
      record.prescriptionId,
      (completedByPrescription.get(record.prescriptionId) ?? 0) + 1,
    );
  }
  const blocks = session.workout.blocks.map((block): WorkoutBlock => {
    if (block.kind === 'exercise') {
      return {
        ...block,
        prescription: updateMove(
          block.prescription,
          action,
          completedByPrescription.get(block.prescription.prescriptionId) ?? 0,
        ),
      };
    }
    const moves = block.moves.map((move) =>
      updateMove(
        move,
        action,
        completedByPrescription.get(move.prescriptionId) ?? 0,
      ),
    );
    if (block.kind === 'superset') {
      return {
        ...block,
        moves: [moves[0], moves[1]],
        rounds:
          action.kind === 'reduce-volume'
            ? Math.max(
                1,
                ...moves.map(
                  (move) =>
                    completedByPrescription.get(move.prescriptionId) ?? 0,
                ),
                block.rounds - 1,
              )
            : action.kind === 'add-set' &&
                block.moves.some(
                  (move) =>
                    !action.exerciseId || move.exerciseId === action.exerciseId,
                )
              ? Math.min(8, block.rounds + 1)
              : block.rounds,
        restAfterRoundSeconds:
          action.kind === 'increase-rest'
            ? Math.min(600, block.restAfterRoundSeconds + 30)
            : block.restAfterRoundSeconds,
      };
    }
    return {
      ...block,
      moves,
      rounds:
        action.kind === 'reduce-volume'
          ? Math.max(
              1,
              ...moves.map(
                (move) => completedByPrescription.get(move.prescriptionId) ?? 0,
              ),
              block.rounds - 1,
            )
          : action.kind === 'add-set' &&
              block.moves.some(
                (move) =>
                  !action.exerciseId || move.exerciseId === action.exerciseId,
              )
            ? Math.min(8, block.rounds + 1)
            : block.rounds,
      restAfterRoundSeconds:
        action.kind === 'increase-rest'
          ? Math.min(600, block.restAfterRoundSeconds + 30)
          : block.restAfterRoundSeconds,
    };
  });

  const timestamp = new Date().toISOString();
  return ActiveSessionSchema.parse({
    ...session,
    workout: { ...session.workout, blocks },
    updatedAt: timestamp,
  });
}
