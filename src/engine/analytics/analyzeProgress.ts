import { exerciseById } from '../../catalog/exercises';
import { muscleById, muscles } from '../../catalog/muscles';
import type { MuscleId } from '../../catalog/schema';
import type { Profile } from '../../domain/models';
import {
  comparableWeight,
  convertWeight,
  roundedWeight,
  type WeightUnit,
} from '../../domain/units';
import type {
  ActiveSession,
  ActiveSetRecord,
} from '../../features/activeWorkout/schema';
import {
  blockMoves,
  elapsedSessionSeconds,
} from '../../features/activeWorkout/session';
import type {
  ExerciseProgress,
  MuscleCoverage,
  PersonalRecord,
  ProgressAnalytics,
  SessionSummary,
} from './schema';

const DAY = 86_400_000;

function weightInUnit(record: ActiveSetRecord, units: WeightUnit) {
  return convertWeight(record.weight, record.weightUnit, units);
}

function displayWeight(record: ActiveSetRecord, units: WeightUnit) {
  return roundedWeight(record.weight, record.weightUnit, units);
}

function recordVolume(record: ActiveSetRecord, units: WeightUnit) {
  return weightInUnit(record, units) * record.reps;
}

export function sumRecordVolume(records: ActiveSetRecord[], units: WeightUnit) {
  return records.reduce(
    (total, record) => total + recordVolume(record, units),
    0,
  );
}

function completedSessions(sessions: ActiveSession[]) {
  return sessions
    .filter(
      (session) =>
        session.status === 'completed' && Boolean(session.completedAt),
    )
    .sort((first, second) =>
      (first.completedAt ?? first.updatedAt).localeCompare(
        second.completedAt ?? second.updatedAt,
      ),
    );
}

function prRecords(session: ActiveSession) {
  return session.records.filter(
    (record) =>
      record.kind === 'working' && record.countsTowardPr && record.reps > 0,
  );
}

function volumeRecords(session: ActiveSession) {
  return session.records.filter(
    (record) => record.countsTowardWorkingVolume && record.reps > 0,
  );
}

function prescriptionTop(session: ActiveSession, prescriptionId: string) {
  for (const block of session.workout.blocks) {
    const move = blockMoves(block).find(
      (candidate) => candidate.prescriptionId === prescriptionId,
    );
    if (move) return move.repRange.max;
  }
  return null;
}

function makePr(
  session: ActiveSession,
  record: ActiveSetRecord,
  kind: PersonalRecord['kind'],
  label: string,
  detail: string,
): PersonalRecord {
  return {
    id: `${session.id}:${record.exerciseId}:${kind}:${record.id}`,
    exerciseId: record.exerciseId,
    exerciseName: record.exerciseName,
    kind,
    label,
    detail,
    achievedAt: record.completedAt,
    sessionId: session.id,
  };
}

export function detectSessionPersonalRecords(
  session: ActiveSession,
  priorSessions: ActiveSession[],
  units: 'lb' | 'kg' = 'lb',
): PersonalRecord[] {
  const prior = completedSessions(priorSessions).filter(
    (candidate) => candidate.id !== session.id,
  );
  const currentRecords = prRecords(session);
  const previousRecords = prior.flatMap(prRecords);
  const records: PersonalRecord[] = [];

  const byExercise = new Map<string, ActiveSetRecord[]>();
  currentRecords.forEach((record) => {
    byExercise.set(record.exerciseId, [
      ...(byExercise.get(record.exerciseId) ?? []),
      record,
    ]);
  });

  for (const [exerciseId, current] of byExercise) {
    const previous = previousRecords.filter(
      (record) => record.exerciseId === exerciseId,
    );
    const bestWeight = current.reduce((best, record) =>
      weightInUnit(record, units) > weightInUnit(best, units) ? record : best,
    );
    const previousMaxWeight = Math.max(
      0,
      ...previous.map((record) => weightInUnit(record, units)),
    );
    if (
      weightInUnit(bestWeight, units) > 0 &&
      weightInUnit(bestWeight, units) > previousMaxWeight
    ) {
      records.push(
        makePr(
          session,
          bestWeight,
          'weight',
          'Load PR',
          `${displayWeight(bestWeight, units)} ${units} × ${bestWeight.reps}`,
        ),
      );
    }

    const bestByWeight = new Map<number, ActiveSetRecord>();
    current.forEach((record) => {
      const key = comparableWeight(record.weight, record.weightUnit);
      const best = bestByWeight.get(key);
      if (!best || record.reps > best.reps) bestByWeight.set(key, record);
    });
    let repPr: ActiveSetRecord | null = null;
    let repPrDelta = 0;
    for (const record of bestByWeight.values()) {
      if (record.weight <= 0) continue;
      const key = comparableWeight(record.weight, record.weightUnit);
      const previousReps = Math.max(
        0,
        ...previous
          .filter(
            (candidate) =>
              comparableWeight(candidate.weight, candidate.weightUnit) === key,
          )
          .map((candidate) => candidate.reps),
      );
      if (previousReps > 0 && record.reps > previousReps) {
        const delta = record.reps - previousReps;
        if (!repPr || delta > repPrDelta) {
          repPr = record;
          repPrDelta = delta;
        }
      }
    }
    if (repPr) {
      records.push(
        makePr(
          session,
          repPr,
          'reps-at-weight',
          'Rep PR',
          `${repPr.reps} reps at ${displayWeight(repPr, units)} ${units}`,
        ),
      );
    }

    const currentVolume = sumRecordVolume(current, units);
    const previousSessionVolumes = prior.map((candidate) =>
      sumRecordVolume(
        prRecords(candidate).filter(
          (record) => record.exerciseId === exerciseId,
        ),
        units,
      ),
    );
    if (
      currentVolume > 0 &&
      previousSessionVolumes.some((value) => value > 0) &&
      currentVolume > Math.max(0, ...previousSessionVolumes)
    ) {
      records.push(
        makePr(
          session,
          current[0],
          'volume',
          'Volume PR',
          `${Math.round(currentVolume).toLocaleString()} ${units}`,
        ),
      );
    }

    const prescriptionGroups = new Map<string, ActiveSetRecord[]>();
    current.forEach((record) => {
      prescriptionGroups.set(record.prescriptionId, [
        ...(prescriptionGroups.get(record.prescriptionId) ?? []),
        record,
      ]);
    });
    for (const [prescriptionId, group] of prescriptionGroups) {
      const top = prescriptionTop(session, prescriptionId);
      const workingTarget = session.workout.blocks
        .flatMap(blockMoves)
        .find((move) => move.prescriptionId === prescriptionId)?.sets;
      if (
        top !== null &&
        group.length >= (workingTarget ?? 1) &&
        group.every((record) => record.reps >= top)
      ) {
        const previouslyCompleted = prior.some((candidate) => {
          const previousGroup = prRecords(candidate).filter(
            (record) =>
              record.exerciseId === exerciseId &&
              record.prescriptionId === prescriptionId,
          );
          return (
            previousGroup.length >= group.length &&
            previousGroup.every((record) => record.reps >= top)
          );
        });
        if (!previouslyCompleted) {
          records.push(
            makePr(
              session,
              group[0],
              'top-range',
              'Range complete',
              `All ${group.length} sets reached ${top}+ reps`,
            ),
          );
        }
      }
    }
  }

  return records.sort((first, second) =>
    first.exerciseName.localeCompare(second.exerciseName),
  );
}

function exerciseMuscles(session: ActiveSession, exerciseId: string) {
  const exercise = exerciseById.get(exerciseId);
  const custom = session.customExerciseSnapshots[exerciseId];
  return {
    primary: exercise?.primaryMuscles ?? custom?.primaryMuscles ?? [],
    secondary: exercise?.secondaryMuscles ?? custom?.secondaryMuscles ?? [],
  };
}

function coverageFor(
  sessions: ActiveSession[],
  priorityMuscles: MuscleId[],
): MuscleCoverage[] {
  const totals = new Map<MuscleId, { direct: number; indirect: number }>();
  muscles.forEach((muscle) =>
    totals.set(muscle.id, { direct: 0, indirect: 0 }),
  );
  for (const session of sessions) {
    for (const record of volumeRecords(session)) {
      const trained = exerciseMuscles(session, record.exerciseId);
      trained.primary.forEach((muscle) => {
        const current = totals.get(muscle)!;
        current.direct += muscleById.get(muscle)?.directVolumeFactor ?? 1;
      });
      trained.secondary.forEach((muscle) => {
        const current = totals.get(muscle)!;
        current.indirect +=
          muscleById.get(muscle)?.secondaryVolumeFactor ?? 0.5;
      });
    }
  }
  return muscles
    .map((muscle) => {
      const total = totals.get(muscle.id)!;
      const priority = priorityMuscles.includes(muscle.id);
      return {
        muscle: muscle.id,
        name: muscle.name,
        directSets: Number(total.direct.toFixed(1)),
        indirectSets: Number(total.indirect.toFixed(1)),
        effectiveSets: Number((total.direct + total.indirect).toFixed(1)),
        targetMin: priority ? 10 : 6,
        targetMax: priority ? 16 : 12,
        priority,
      };
    })
    .filter((row) => row.effectiveSets > 0 || row.priority)
    .sort(
      (first, second) =>
        Number(second.priority) - Number(first.priority) ||
        second.effectiveSets - first.effectiveSets,
    );
}

function epley(record: ActiveSetRecord, units: WeightUnit) {
  if (record.weight <= 0 || record.reps <= 0) return null;
  return weightInUnit(record, units) * (1 + Math.min(record.reps, 12) / 30);
}

function confidenceFor(samples: number): 'low' | 'medium' | 'high' {
  if (samples >= 8) return 'high';
  if (samples >= 3) return 'medium';
  return 'low';
}

export function analyzeProgress(
  sessions: ActiveSession[],
  profile: Profile,
  now: Date = new Date(),
  units: 'lb' | 'kg' = 'lb',
): ProgressAnalytics {
  const completed = completedSessions(sessions);
  const fourWeekStart = now.getTime() - 28 * DAY;
  const fourWeek = completed.filter(
    (session) => new Date(session.completedAt!).getTime() >= fourWeekStart,
  );
  const weekStart = now.getTime() - 7 * DAY;
  const thisWeek = completed.filter(
    (session) => new Date(session.completedAt!).getTime() >= weekStart,
  );
  const latest = completed.at(-1);
  const priorityMuscles = latest?.workout.priorities ?? [];
  const coverage = coverageFor(thisWeek, priorityMuscles);

  const allPrs: PersonalRecord[] = [];
  completed.forEach((session, index) => {
    allPrs.push(
      ...detectSessionPersonalRecords(
        session,
        completed.slice(0, index),
        units,
      ),
    );
  });

  const exerciseIds = Array.from(
    new Set(
      completed.flatMap((session) =>
        prRecords(session).map((record) => record.exerciseId),
      ),
    ),
  );
  const exercises: ExerciseProgress[] = exerciseIds.map((exerciseId) => {
    const relevant = completed.filter((session) =>
      prRecords(session).some((record) => record.exerciseId === exerciseId),
    );
    const records = relevant.flatMap((session) =>
      prRecords(session).filter((record) => record.exerciseId === exerciseId),
    );
    const firstStrength = Math.max(
      0,
      ...prRecords(relevant[0]!)
        .filter((record) => record.exerciseId === exerciseId)
        .map((record) => epley(record, units) ?? 0),
    );
    const lastStrength = Math.max(
      0,
      ...prRecords(relevant.at(-1)!)
        .filter((record) => record.exerciseId === exerciseId)
        .map((record) => epley(record, units) ?? 0),
    );
    const latestSession = relevant.at(-1)!;
    return {
      exerciseId,
      exerciseName: records.at(-1)?.exerciseName ?? exerciseId,
      sessionCount: relevant.length,
      workingSets: records.length,
      totalVolume: sumRecordVolume(records, units),
      estimatedStrength:
        lastStrength > 0 ? Number(lastStrength.toFixed(1)) : null,
      strengthChangePercent:
        relevant.length >= 2 && firstStrength > 0
          ? Number(
              (((lastStrength - firstStrength) / firstStrength) * 100).toFixed(
                1,
              ),
            )
          : null,
      prCount: allPrs.filter((record) => record.exerciseId === exerciseId)
        .length,
      latestAt: latestSession.completedAt!,
      note: latestSession.notesByExerciseId[exerciseId] ?? null,
    };
  });
  exercises.sort(
    (first, second) =>
      second.prCount - first.prCount ||
      (second.strengthChangePercent ?? 0) -
        (first.strengthChangePercent ?? 0) ||
      second.sessionCount - first.sessionCount,
  );

  const durationMinutes = completed.map((session) =>
    Math.max(
      1,
      elapsedSessionSeconds(session, new Date(session.completedAt!)) / 60,
    ),
  );
  const actualDuration = durationMinutes.reduce(
    (total, value) => total + value,
    0,
  );
  const plannedDuration = completed.reduce(
    (total, session) => total + session.workout.estimatedMinutes,
    0,
  );
  const workingSets = completed.reduce(
    (total, session) => total + volumeRecords(session).length,
    0,
  );
  const targetFourWeeks = profile.weeklyFrequency * 4;

  return {
    completedSessions: completed.length,
    fourWeekSessions: fourWeek.length,
    consistencyPercent: Math.min(
      100,
      Math.round((fourWeek.length / Math.max(1, targetFourWeeks)) * 100),
    ),
    averageDurationMinutes: completed.length
      ? Math.round(actualDuration / completed.length)
      : 0,
    durationEfficiencyPercent:
      actualDuration > 0
        ? Math.min(150, Math.round((plannedDuration / actualDuration) * 100))
        : 0,
    workingSetsPerMinute:
      actualDuration > 0
        ? Number((workingSets / actualDuration).toFixed(2))
        : 0,
    totalWorkingVolume: completed.reduce(
      (total, session) =>
        total + sumRecordVolume(volumeRecords(session), units),
      0,
    ),
    coverage,
    personalRecords: allPrs.sort((first, second) =>
      second.achievedAt.localeCompare(first.achievedAt),
    ),
    exercises,
    confidence: confidenceFor(completed.length),
    sampleLabel: `${completed.length} completed ${completed.length === 1 ? 'session' : 'sessions'}`,
    evidence: [
      'Only completed, locally stored sessions are analyzed.',
      'Warm-ups are excluded from working volume, progression, and personal records.',
      'Estimated strength uses Epley: load × (1 + reps ÷ 30), capped at 12 reps.',
      'Weekly coverage counts direct sets at 1.0 and indirect sets at 0.5.',
    ],
  };
}

export function buildSessionSummary(
  session: ActiveSession,
  priorSessions: ActiveSession[],
  profile: Profile,
  units: 'lb' | 'kg' = 'lb',
): SessionSummary {
  const records = volumeRecords(session);
  const history = priorSessions.filter(
    (candidate) => candidate.id !== session.id,
  );
  const analytics = analyzeProgress(
    [...history, session],
    profile,
    new Date(session.completedAt ?? session.updatedAt),
    units,
  );
  const musclesTrained = coverageFor(
    [session],
    session.workout.priorities,
  ).filter((row) => row.effectiveSets > 0);
  const recoveryHours = Math.max(
    24,
    ...musclesTrained.map(
      (row) => muscleById.get(row.muscle)?.typicalRecoveryHours ?? 24,
    ),
  );
  const nextTargets = session.workout.blocks
    .flatMap(blockMoves)
    .slice(0, 3)
    .map((move) => {
      const sets = records.filter(
        (record) =>
          record.prescriptionId === move.prescriptionId &&
          record.kind === 'working',
      );
      const completedTop =
        sets.length >= move.sets &&
        sets.every((record) => record.reps >= move.repRange.max);
      return completedTop
        ? `${move.exerciseName}: add the smallest available load next time`
        : `${move.exerciseName}: reach ${move.repRange.max} reps with ${move.targetRir} RIR`;
    });
  const focus = analytics.coverage.find(
    (row) => row.priority && row.effectiveSets < row.targetMin,
  );

  return {
    completedSets: records.length,
    exercises: new Set(records.map((record) => record.exerciseId)).size,
    volume: sumRecordVolume(records, units),
    durationMinutes: Math.max(
      1,
      Math.round(
        elapsedSessionSeconds(
          session,
          new Date(session.completedAt ?? session.updatedAt),
        ) / 60,
      ),
    ),
    personalRecords: detectSessionPersonalRecords(session, history, units),
    musclesTrained,
    recoveryNote: `Allow roughly ${recoveryHours} hours before hard training for the slowest-recovering muscle from this session; readiness still overrides the estimate.`,
    substitutions: session.acceptedAlternativeIds.length,
    nextTargets,
    nextFocus: focus
      ? `${focus.name} is ${Number((focus.targetMin - focus.effectiveSets).toFixed(1))} effective sets below its planning band.`
      : 'Priority muscles are currently inside their weekly planning bands.',
    confidence: confidenceFor(
      history.filter((candidate) => candidate.status === 'completed').length +
        1,
    ),
    sampleLabel: `${history.filter((candidate) => candidate.status === 'completed').length + 1} completed-session sample`,
  };
}
