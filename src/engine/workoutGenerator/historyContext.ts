import { exerciseById } from '../../catalog/exercises';
import type { MuscleId } from '../../catalog/schema';
import type { ActiveSession } from '../../features/activeWorkout/schema';
import type { RecentMuscleExposure, WeeklyVolume } from './schema';

const DAY = 86_400_000;

export type WorkoutHistoryContext = {
  currentWeeklyVolume: WeeklyVolume;
  recentExposure: RecentMuscleExposure[];
  previousExerciseIds: string[];
  workoutPosition: number;
  completedSessions7Days: number;
  completedSessions14Days: number;
  completedSessions28Days: number;
};

function completedWithin(sessions: ActiveSession[], now: Date, days: number) {
  const cutoff = now.getTime() - days * DAY;
  return sessions.filter(
    (session) =>
      session.status === 'completed' &&
      session.completedAt &&
      new Date(session.completedAt).getTime() >= cutoff &&
      new Date(session.completedAt).getTime() <= now.getTime(),
  );
}

function add(target: WeeklyVolume, muscle: MuscleId, value: number) {
  target[muscle] = Number(((target[muscle] ?? 0) + value).toFixed(1));
}

export function deriveWorkoutHistoryContext(
  sessions: ActiveSession[],
  now = new Date(),
): WorkoutHistoryContext {
  const last7 = completedWithin(sessions, now, 7);
  const last14 = completedWithin(sessions, now, 14);
  const last28 = completedWithin(sessions, now, 28);
  const currentWeeklyVolume: WeeklyVolume = {};
  const recentExposure: RecentMuscleExposure[] = [];

  for (const session of last28) {
    const sessionSets = new Map<MuscleId, number>();
    for (const record of session.records) {
      if (
        record.kind !== 'working' ||
        !record.countsTowardWorkingVolume ||
        record.legacyInvalidReps !== null
      )
        continue;
      const exercise = exerciseById.get(record.exerciseId);
      if (!exercise) continue;
      for (const muscle of exercise.primaryMuscles) {
        sessionSets.set(muscle, (sessionSets.get(muscle) ?? 0) + 1);
        if (last7.includes(session)) add(currentWeeklyVolume, muscle, 1);
      }
      for (const muscle of exercise.secondaryMuscles) {
        sessionSets.set(muscle, (sessionSets.get(muscle) ?? 0) + 0.5);
        if (last7.includes(session)) add(currentWeeklyVolume, muscle, 0.5);
      }
    }
    for (const [muscle, hardSets] of sessionSets) {
      recentExposure.push({
        muscle,
        trainedAt: session.completedAt ?? session.updatedAt,
        hardSets,
      });
    }
  }

  const previousExerciseIds = Array.from(
    new Set(
      last28
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .flatMap((session) =>
          session.records
            .filter((record) => record.kind === 'working')
            .map((record) => record.exerciseId),
        ),
    ),
  );
  const today = now.toDateString();
  const completedToday = sessions.filter(
    (session) =>
      session.status === 'completed' &&
      session.completedAt &&
      new Date(session.completedAt).toDateString() === today,
  ).length;

  return {
    currentWeeklyVolume,
    recentExposure,
    previousExerciseIds,
    workoutPosition: completedToday + 1,
    completedSessions7Days: last7.length,
    completedSessions14Days: last14.length,
    completedSessions28Days: last28.length,
  };
}
