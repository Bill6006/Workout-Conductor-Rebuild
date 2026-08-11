import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../../domain/defaults';
import { ActiveSessionSchema } from '../../features/activeWorkout/schema';
import {
  blockMoves,
  createActiveSession,
} from '../../features/activeWorkout/session';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../workoutGenerator/generateWorkout';
import {
  analyzeProgress,
  buildSessionSummary,
  detectSessionPersonalRecords,
} from './analyzeProgress';

const bundle = createDemoBundle();
const workout = generateWorkout(
  generationInputFromBundle(bundle, '30', { date: '2026-08-01T12:00:00.000Z' }),
);
const move = blockMoves(workout.blocks[0])[0];

function completed(date: string, weight: number, reps: number, warmup = false) {
  const session = createActiveSession(workout, date);
  return ActiveSessionSchema.parse({
    ...session,
    status: 'completed',
    completedAt: new Date(new Date(date).getTime() + 30 * 60_000).toISOString(),
    records: [
      {
        id: `warmup-${date}`,
        sessionId: session.id,
        blockId: workout.blocks[0].blockId,
        prescriptionId: move.prescriptionId,
        exerciseId: move.exerciseId,
        exerciseName: move.exerciseName,
        kind: 'warmup',
        setIndex: 0,
        roundIndex: null,
        moveIndex: 0,
        weight: 999,
        reps: 20,
        rir: 4,
        completedAt: date,
        editedAt: null,
        countsTowardProgression: false,
        countsTowardPr: false,
        countsTowardWorkingVolume: false,
      },
      ...(!warmup
        ? [
            {
              id: `working-${date}`,
              sessionId: session.id,
              blockId: workout.blocks[0].blockId,
              prescriptionId: move.prescriptionId,
              exerciseId: move.exerciseId,
              exerciseName: move.exerciseName,
              kind: 'working' as const,
              setIndex: 0,
              roundIndex: null,
              moveIndex: 0,
              weight,
              reps,
              rir: 2,
              completedAt: date,
              editedAt: null,
              countsTowardProgression: true,
              countsTowardPr: true,
              countsTowardWorkingVolume: true,
            },
          ]
        : []),
    ],
  });
}

describe('Phase 7 analytics and personal records', () => {
  it('detects load and reps-at-weight PRs against prior completed work', () => {
    const first = completed('2026-08-01T12:00:00.000Z', 100, 8);
    const heavier = completed('2026-08-04T12:00:00.000Z', 110, 8);
    expect(
      detectSessionPersonalRecords(heavier, [first]).map((pr) => pr.kind),
    ).toContain('weight');

    const moreReps = completed('2026-08-07T12:00:00.000Z', 110, 10);
    expect(
      detectSessionPersonalRecords(moreReps, [first, heavier]).map(
        (pr) => pr.kind,
      ),
    ).toContain('reps-at-weight');
  });

  it('permanently excludes warm-ups from PRs, volume, and estimated strength', () => {
    const warmupOnly = completed('2026-08-02T12:00:00.000Z', 0, 0, true);
    const result = analyzeProgress(
      [warmupOnly],
      bundle.profile!,
      new Date('2026-08-03T12:00:00.000Z'),
    );
    expect(result.personalRecords).toEqual([]);
    expect(result.totalWorkingVolume).toBe(0);
    expect(result.exercises).toEqual([]);
  });

  it('reports direct and indirect weekly muscle coverage with evidence and confidence', () => {
    const result = analyzeProgress(
      [completed('2026-08-05T12:00:00.000Z', 100, 8)],
      bundle.profile!,
      new Date('2026-08-06T12:00:00.000Z'),
    );
    expect(result.coverage.some((row) => row.directSets > 0)).toBe(true);
    expect(result.coverage.some((row) => row.indirectSets > 0)).toBe(true);
    expect(result.evidence).toHaveLength(4);
    expect(result.confidence).toBe('low');
  });

  it('builds a completion summary with recovery, next targets, and substitutions', () => {
    const current = ActiveSessionSchema.parse({
      ...completed('2026-08-08T12:00:00.000Z', 110, 10),
      acceptedAlternativeIds: ['safe-alternative'],
    });
    const summary = buildSessionSummary(
      current,
      [completed('2026-08-01T12:00:00.000Z', 100, 8)],
      bundle.profile!,
    );
    expect(summary.completedSets).toBe(1);
    expect(summary.substitutions).toBe(1);
    expect(summary.recoveryNote).toContain('hours');
    expect(summary.nextTargets.length).toBeGreaterThan(0);
  });
});
