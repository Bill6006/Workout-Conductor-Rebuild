import { exerciseById } from '../../catalog/exercises';
import { progressionFamilyById } from '../../catalog/progressionFamilies';
import type { AppBundle } from '../../domain/models';
import type {
  ActiveSession,
  ActiveSetRecord,
} from '../../features/activeWorkout/schema';
import { blockMoves } from '../../features/activeWorkout/session';
import type { CoachRecommendation } from './schema';

type CoachInput = {
  session: ActiveSession;
  history: ActiveSession[];
  bundle: AppBundle;
  currentExerciseId?: string | null;
};

const priorityOrder: Record<CoachRecommendation['priority'], number> = {
  'safety-form': 0,
  'save-storage': 1,
  'recovery-fatigue': 2,
  plateau: 3,
  progression: 4,
  'exercise-fit': 5,
  'weekly-coverage': 6,
  tip: 7,
};

function prescription(session: ActiveSession, exerciseId: string) {
  return session.workout.blocks
    .flatMap(blockMoves)
    .find((move) => move.exerciseId === exerciseId);
}

/**
 * Returns completed working truth. Warm-ups and optional drop sets are not
 * progression evidence. A superset round qualifies only after every move in
 * that round has a record, so an A-only next-round draft cannot distort trends.
 */
export function qualifyingWorkingRecords(
  session: ActiveSession,
): ActiveSetRecord[] {
  const working = session.records.filter(
    (record) => record.kind === 'working' && record.countsTowardProgression,
  );
  const allowed = new Set<string>();

  for (const block of session.workout.blocks) {
    const blockRecords = working.filter(
      (record) => record.blockId === block.blockId,
    );
    if (block.kind === 'exercise') {
      blockRecords.forEach((record) => allowed.add(record.id));
      continue;
    }
    const moveIds = new Set(block.moves.map((move) => move.prescriptionId));
    const rounds = new Set(
      blockRecords
        .map((record) => record.roundIndex)
        .filter((round): round is number => round !== null),
    );
    for (const round of rounds) {
      const records = blockRecords.filter(
        (record) => record.roundIndex === round,
      );
      if (
        new Set(records.map((record) => record.prescriptionId)).size ===
        moveIds.size
      ) {
        records.forEach((record) => allowed.add(record.id));
      }
    }
  }
  return working.filter((record) => allowed.has(record.id));
}

function readinessLevel(session: ActiveSession) {
  const readiness = session.readiness;
  if (
    readiness.jointDiscomfort === 'severe' ||
    readiness.energy === 1 ||
    readiness.sleep === 1
  ) {
    return 'low' as const;
  }
  if (
    readiness.jointDiscomfort === 'moderate' ||
    readiness.soreness >= 4 ||
    readiness.energy <= 2 ||
    readiness.sleep <= 2 ||
    readiness.motivation <= 2 ||
    readiness.timePressure === 'high'
  ) {
    return 'moderate' as const;
  }
  return 'ready' as const;
}

function sessionsForExercise(
  history: ActiveSession[],
  exerciseId: string,
  progressionFamily: string,
) {
  return history
    .filter((item) => item.status === 'completed')
    .map((item) => ({
      session: item,
      records: qualifyingWorkingRecords(item).filter((record) => {
        const recordedExercise = exerciseById.get(record.exerciseId);
        return (
          record.exerciseId === exerciseId ||
          recordedExercise?.progressionFamily === progressionFamily
        );
      }),
    }))
    .filter((item) => item.records.length > 0)
    .slice(0, 4);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function progressionCandidates(input: CoachInput): CoachRecommendation[] {
  const { session, history, bundle } = input;
  const targetExerciseId =
    input.currentExerciseId ??
    qualifyingWorkingRecords(session).at(-1)?.exerciseId ??
    session.workout.blocks.flatMap(blockMoves)[0]?.exerciseId;
  if (!targetExerciseId) return [];
  const move = prescription(session, targetExerciseId);
  if (!move) return [];
  const exercise = exerciseById.get(targetExerciseId);
  const family = progressionFamilyById.get(move.progressionFamily);
  const recent = sessionsForExercise(
    history,
    targetExerciseId,
    move.progressionFamily,
  );
  const current = qualifyingWorkingRecords(session).filter(
    (record) => record.exerciseId === targetExerciseId,
  );
  const latestRecords =
    current.length > 0 ? current : (recent[0]?.records ?? []);
  const edited = latestRecords.some((record) => record.editedAt !== null);
  const candidates: CoachRecommendation[] = [];
  const recentFeedback = history
    .filter((item) => item.status === 'completed' && item.sessionFeedback)
    .slice(0, 3)
    .map((item) => item.sessionFeedback!);

  if (
    session.readiness.jointDiscomfort === 'severe' ||
    latestRecords.some((record) => record.painReported) ||
    session.sessionFeedback?.difficulty === 'pain'
  ) {
    candidates.push({
      priority: 'safety-form',
      title: 'Choose a pain-free pattern',
      guidance: `Stop loading ${move.exerciseName} through pain. Keep the rest of the workout if it feels normal.`,
      why: 'Joint discomfort outranks progression. The coach changes only this exercise after you confirm.',
      evidence: ['Pain or severe joint discomfort was reported.'],
      nextTarget: null,
      action: {
        kind: 'open-alternatives',
        label: 'Review alternatives',
        requiresConfirmation: true,
        exerciseId: targetExerciseId,
      },
    });
  }

  const readiness = readinessLevel(session);
  if (readiness === 'low') {
    candidates.push({
      priority: 'recovery-fatigue',
      title: 'Keep the session, lower the demand',
      guidance:
        'Use about 10% less load and leave one extra rep in reserve on unfinished work.',
      why: 'Low energy or sleep calls for an adjustment, not an automatic cancellation.',
      evidence: [
        `Energy ${session.readiness.energy}/5 · sleep ${session.readiness.sleep}/5`,
        `Soreness ${session.readiness.soreness}/5`,
      ],
      nextTarget: `${move.repRange.min}–${move.repRange.max} reps at ${Math.min(5, move.targetRir + 1)} RIR`,
      action: {
        kind: 'reduce-intensity',
        label: 'Apply easier targets',
        requiresConfirmation: true,
        exerciseId: null,
      },
    });
  } else if (readiness === 'moderate') {
    candidates.push({
      priority: 'recovery-fatigue',
      title: 'Train, but protect quality',
      guidance:
        session.readiness.timePressure === 'high'
          ? 'Keep the main lifts and trim one unfinished support set if time gets tight.'
          : 'Hold load today and keep one extra rep in reserve if performance fades.',
      why: 'Several readiness signals are below baseline, while the workout can still be productive.',
      evidence: [
        `Energy ${session.readiness.energy}/5 · sleep ${session.readiness.sleep}/5`,
      ],
      nextTarget: `Hold load · ${move.repRange.min}–${move.repRange.max} clean reps`,
      action:
        session.readiness.timePressure === 'high'
          ? {
              kind: 'reduce-volume',
              label: 'Trim support volume',
              requiresConfirmation: true,
              exerciseId: null,
            }
          : null,
    });
  }

  if (
    readiness === 'ready' &&
    recentFeedback.filter(
      (feedback) =>
        feedback.difficulty === 'too-hard' || feedback.energyAfter <= 2,
    ).length >= 2
  ) {
    candidates.push({
      priority: 'recovery-fatigue',
      title: 'Recent sessions are costing too much',
      guidance:
        'Keep the primary work and remove one unfinished support set today.',
      why: 'Two recent whole-session feedback entries show high difficulty or low finishing energy.',
      evidence: recentFeedback
        .slice(0, 2)
        .map(
          (feedback) =>
            `${feedback.difficulty.replaceAll('-', ' ')} · energy after ${feedback.energyAfter}/5`,
        ),
      nextTarget: 'Primary work unchanged · one fewer support set',
      action: {
        kind: 'reduce-volume',
        label: 'Trim support volume',
        requiresConfirmation: true,
        exerciseId: null,
      },
    });
  }

  if (latestRecords.length === 0) {
    candidates.push({
      priority: 'progression',
      title: 'Establish today’s baseline',
      guidance: `Use a stable load for ${move.repRange.min}–${move.repRange.max} reps and finish near ${move.targetRir} RIR.`,
      why: 'There is no qualifying completed-set evidence for this movement yet.',
      evidence: [
        `${family?.name ?? move.progressionFamily} progression family`,
      ],
      nextTarget: `${move.repRange.min}–${move.repRange.max} reps · ${move.targetRir} RIR`,
      action: null,
    });
    return candidates;
  }

  const avgReps = average(latestRecords.map((record) => record.reps));
  const avgRir = average(latestRecords.map((record) => record.rir));
  const latestLoad = latestRecords.at(-1)?.weight ?? 0;
  const failures = recent.slice(0, 3).filter(({ records }) => {
    const priorMove = prescription(
      recent.find((item) => item.records === records)?.session ?? session,
      targetExerciseId,
    );
    const minimum = priorMove?.repRange.min ?? move.repRange.min;
    return (
      average(records.map((record) => record.reps)) < minimum ||
      average(records.map((record) => record.rir)) < 0.75
    );
  }).length;
  const evidence = [
    `${latestRecords.length} qualifying sets · ${avgReps.toFixed(1)} avg reps · ${avgRir.toFixed(1)} avg RIR`,
    `${recent.length} recent qualifying session${recent.length === 1 ? '' : 's'}`,
  ];
  const recordedRest = latestRecords
    .map((record) => record.restSecondsTaken)
    .filter((seconds): seconds is number => seconds !== null);
  if (recordedRest.length > 0) {
    evidence.push(
      `${Math.round(average(recordedRest))}s average actual rest · ${move.restSeconds}s planned`,
    );
  }
  const mostRecentCompleted = recent[0]?.session;
  if (mostRecentCompleted?.completedAt) {
    const actualMinutes = Math.max(
      0,
      Math.round(
        (new Date(mostRecentCompleted.completedAt).getTime() -
          new Date(mostRecentCompleted.startedAt).getTime()) /
          60_000 -
          mostRecentCompleted.accumulatedPausedSeconds / 60,
      ),
    );
    evidence.push(
      `${actualMinutes} min actual · ${mostRecentCompleted.workout.estimatedMinutes} min estimated`,
    );
  }
  if (edited)
    evidence.push('Your corrected set values are the source of truth.');

  if (failures >= 2) {
    candidates.push({
      priority: 'plateau',
      title: 'Repeated misses: reset one step',
      guidance:
        'Reduce this exercise about 7% and rebuild within the same rep range.',
      why: 'The same movement missed its minimum or intended reserve in multiple recent sessions; one poor set alone would not trigger this.',
      evidence: evidence.slice(0, 4),
      nextTarget: `${Math.max(0, Math.round(latestLoad * 0.93 * 2) / 2)} ${bundle.settings.units} · ${move.repRange.min}–${move.repRange.max} reps`,
      action: {
        kind: 'micro-deload',
        label: 'Apply exercise reset',
        requiresConfirmation: true,
        exerciseId: targetExerciseId,
      },
    });
  } else if (
    avgReps >= move.repRange.max &&
    avgRir >= move.targetRir &&
    latestLoad === 0 &&
    move.sets < 5
  ) {
    candidates.push({
      priority: 'progression',
      title: 'Set progression is available',
      guidance:
        'Keep reps and form stable; add one working set only if the remaining session time is comfortable.',
      why: 'The top of the rep range was reached without external load, so a confirmed set increase is the practical next progression.',
      evidence: evidence.slice(0, 4),
      nextTarget: `${move.sets + 1} sets · ${move.repRange.min}–${move.repRange.max} reps`,
      action: {
        kind: 'add-set',
        label: 'Add one set',
        requiresConfirmation: true,
        exerciseId: targetExerciseId,
      },
    });
  } else if (avgReps >= move.repRange.max && avgRir >= move.targetRir) {
    const increment = bundle.settings.units === 'lb' ? 5 : 2.5;
    candidates.push({
      priority: 'progression',
      title: 'Earned a small load increase',
      guidance: `Add the smallest practical increment next time and return to the lower half of the rep range.`,
      why: `${family?.incrementHint ?? 'The top of the rep range was reached with reserve.'}`,
      evidence: evidence.slice(0, 4),
      nextTarget: `${latestLoad + increment} ${bundle.settings.units} · ${move.repRange.min}–${Math.max(move.repRange.min, move.repRange.max - 2)} reps`,
      action: null,
    });
  } else if (avgReps < move.repRange.min || avgRir < 1) {
    candidates.push({
      priority: 'progression',
      title: 'Hold load and recover between sets',
      guidance:
        'Do not chase load after one difficult exposure. Add 30 seconds of rest if the next set is also below range.',
      why: 'Current performance is below the target, but there is not enough repeated evidence for regression.',
      evidence: evidence.slice(0, 4),
      nextTarget: `${latestLoad} ${bundle.settings.units} · reach ${move.repRange.min} clean reps`,
      action: {
        kind: 'increase-rest',
        label: 'Add 30s rest',
        requiresConfirmation: true,
        exerciseId: targetExerciseId,
      },
    });
  } else {
    candidates.push({
      priority: 'progression',
      title: 'Build reps before load',
      guidance:
        'Keep the load stable and add one controlled rep where form and reserve allow.',
      why:
        family?.incrementHint ??
        'Rep progression is the safest next step inside the target range.',
      evidence: evidence.slice(0, 4),
      nextTarget: `${latestLoad} ${bundle.settings.units} · aim for ${Math.min(move.repRange.max, Math.ceil(avgReps) + 1)} reps`,
      action: null,
    });
  }

  const last = latestRecords.at(-1);
  if (
    bundle.settings.allowDropSets &&
    exercise?.dropSet.support === 'safe' &&
    last &&
    last.rir >= 2 &&
    readiness === 'ready' &&
    !move.dropSet
  ) {
    candidates.push({
      priority: 'tip',
      title: 'Optional final drop set is available',
      guidance:
        'Only add it after the planned working sets; stop if form changes.',
      why: 'The exercise is marked drop-set safe, readiness is normal, and the latest set retained reserve.',
      evidence: [`Latest set finished at ${last.rir} RIR.`],
      nextTarget: 'Reduce load 20% · controlled 10–15 reps',
      action: {
        kind: 'add-drop-set',
        label: 'Add optional drop set',
        requiresConfirmation: true,
        exerciseId: targetExerciseId,
      },
    });
  }
  return candidates;
}

export type CoachDiagnosis =
  | 'load-plateau'
  | 'rep-plateau'
  | 'fatigue'
  | 'recovery'
  | 'exercise-fit'
  | 'weekly-coverage';

export function coachAnalysis(input: CoachInput): {
  recommendation: CoachRecommendation;
  diagnoses: CoachDiagnosis[];
} {
  const candidates = progressionCandidates(input);
  const diagnoses = new Set<CoachDiagnosis>();
  const completed = input.history
    .filter((item) => item.status === 'completed')
    .slice(0, 4);
  const targetExerciseId =
    input.currentExerciseId ??
    input.session.workout.blocks.flatMap(blockMoves)[0]?.exerciseId;
  if (targetExerciseId) {
    const target = prescription(input.session, targetExerciseId);
    const recent = target
      ? sessionsForExercise(
          input.history,
          targetExerciseId,
          target.progressionFamily,
        ).slice(0, 3)
      : [];
    if (recent.length >= 3) {
      const loads = recent.map(({ records }) =>
        Math.max(...records.map((record) => record.weight)),
      );
      const reps = recent.map(({ records }) =>
        average(records.map((record) => record.reps)),
      );
      if (Math.max(...loads) === Math.min(...loads))
        diagnoses.add('load-plateau');
      if (Math.max(...reps) - Math.min(...reps) < 1)
        diagnoses.add('rep-plateau');
      if (
        recent.filter(
          ({ records }) => average(records.map((record) => record.rir)) <= 1,
        ).length >= 2
      )
        diagnoses.add('fatigue');
    }
    if (
      input.session.acceptedAlternativeIds.includes(targetExerciseId) ||
      input.session.records.some(
        (record) =>
          record.exerciseId === targetExerciseId && record.painReported,
      )
    )
      diagnoses.add('exercise-fit');
  }
  if (readinessLevel(input.session) !== 'ready') diagnoses.add('recovery');
  if (completed.length >= 2) {
    const trained = new Set(
      completed.flatMap((item) =>
        qualifyingWorkingRecords(item).flatMap(
          (record) => exerciseById.get(record.exerciseId)?.primaryMuscles ?? [],
        ),
      ),
    );
    if (
      input.session.workout.priorities.some((muscle) => !trained.has(muscle))
    ) {
      diagnoses.add('weekly-coverage');
    }
  }
  const recommendation = [...candidates].sort(
    (first, second) =>
      priorityOrder[first.priority] - priorityOrder[second.priority],
  )[0] ?? {
    priority: 'tip' as const,
    title: 'Follow the planned targets',
    guidance:
      'Log actual reps, load, and RIR. The coach will update after completed work.',
    why: 'There is not enough qualifying evidence for a more specific change.',
    evidence: [],
    nextTarget: null,
    action: null,
  };
  return { recommendation, diagnoses: Array.from(diagnoses) };
}

export function coachRecommendation(input: CoachInput): CoachRecommendation {
  return coachAnalysis(input).recommendation;
}

export function readinessClassification(session: ActiveSession) {
  return readinessLevel(session);
}
