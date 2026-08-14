import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../../domain/defaults';
import { ActiveSessionSchema } from '../../features/activeWorkout/schema';
import {
  createActiveSession,
  logSet,
  nextSetSlot,
} from '../../features/activeWorkout/session';
import { generateWorkout, generationInputFromBundle } from './generateWorkout';
import { deriveWorkoutHistoryContext } from './historyContext';

function completedAt(completedAt: string) {
  const workout = generateWorkout(
    generationInputFromBundle(createDemoBundle(), '15', { date: completedAt }),
  );
  let session = createActiveSession(workout, completedAt);
  const slot = nextSetSlot(session)!;
  session = logSet(session, slot, { weight: 40, reps: 8, rir: 2 }, completedAt);
  return ActiveSessionSchema.parse({
    ...session,
    status: 'completed',
    completedAt,
    updatedAt: completedAt,
  });
}

describe('completed-history workout context', () => {
  it('derives rolling windows, effective volume, continuity, exposure, and same-day position', () => {
    const now = new Date('2026-08-14T18:00:00.000Z');
    const sessions = [
      completedAt('2026-08-14T12:00:00.000Z'),
      completedAt('2026-08-05T12:00:00.000Z'),
      completedAt('2026-07-25T12:00:00.000Z'),
    ];
    const context = deriveWorkoutHistoryContext(sessions, now);
    expect(context.workoutPosition).toBe(2);
    expect(context.completedSessions7Days).toBe(1);
    expect(context.completedSessions14Days).toBe(2);
    expect(context.completedSessions28Days).toBe(3);
    expect(
      Object.values(context.currentWeeklyVolume).some(
        (sets) => (sets ?? 0) > 0,
      ),
    ).toBe(true);
    expect(context.recentExposure.length).toBeGreaterThan(0);
    expect(context.previousExerciseIds).toContain(
      sessions[0].records[0].exerciseId,
    );
  });

  it('does not count warm-ups or drop techniques as base weekly work', () => {
    const session = completedAt('2026-08-14T12:00:00.000Z');
    const excluded = ActiveSessionSchema.parse({
      ...session,
      records: session.records.map((record) => ({
        ...record,
        kind: 'drop',
        countsTowardProgression: false,
        countsTowardPr: false,
        countsTowardWorkingVolume: false,
        intensityTechnique: 'drop-set',
      })),
    });
    expect(
      deriveWorkoutHistoryContext(
        [excluded],
        new Date('2026-08-14T18:00:00.000Z'),
      ).currentWeeklyVolume,
    ).toEqual({});
  });
});
