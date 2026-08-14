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

function completed(
  date: string,
  weight: number,
  reps: number,
  warmup = false,
  weightUnit: 'lb' | 'kg' = 'lb',
) {
  const session = createActiveSession(
    workout,
    date,
    undefined,
    undefined,
    weightUnit,
  );
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
        weightUnit,
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
              weightUnit,
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

  it('records intentional omissions without creating volume, PR, or progression targets', () => {
    const base = completed('2026-08-08T12:00:00.000Z', 110, 10);
    const allMoves = base.workout.blocks.flatMap((block) =>
      block.kind === 'exercise' ? [block.prescription] : block.moves,
    );
    const omittedMove = allMoves.find(
      (candidate) =>
        candidate.prescriptionId !== base.records[0].prescriptionId &&
        allMoves.filter((move) => move.exerciseName === candidate.exerciseName)
          .length === 1,
    )!;
    const current = ActiveSessionSchema.parse({
      ...base,
      omittedPrescriptionIds: [omittedMove.prescriptionId],
    });
    const summary = buildSessionSummary(current, [], bundle.profile!);
    expect(summary.omittedExercises).toEqual([omittedMove.exerciseName]);
    expect(summary.nextTargets.map((target) => target.split(':')[0])).toEqual(
      allMoves
        .filter(
          (candidate) =>
            candidate.prescriptionId !== omittedMove.prescriptionId,
        )
        .slice(0, 3)
        .map((candidate) => candidate.exerciseName),
    );
    expect(summary.volume).toBe(1100);
    expect(
      summary.personalRecords.every(
        (record) => record.exerciseId !== omittedMove.exerciseId,
      ),
    ).toBe(true);
  });

  it('keeps kilogram units in Progress milestone details', () => {
    const first = completed('2026-08-01T12:00:00.000Z', 35, 8, false, 'kg');
    const heavier = completed('2026-08-08T12:00:00.000Z', 40, 8, false, 'kg');
    const result = analyzeProgress(
      [first, heavier],
      bundle.profile!,
      new Date('2026-08-09T12:00:00.000Z'),
      'kg',
    );
    expect(
      result.personalRecords.some((record) => record.detail.includes('40 kg')),
    ).toBe(true);
    expect(
      result.personalRecords.every((record) => !record.detail.includes('lb')),
    ).toBe(true);
  });

  it('converts mixed-unit history before PR and volume comparisons', () => {
    const pounds = completed('2026-08-01T12:00:00.000Z', 100, 8);
    const kilograms = completed(
      '2026-08-08T12:00:00.000Z',
      45.359237,
      8,
      false,
      'kg',
    );
    expect(
      detectSessionPersonalRecords(kilograms, [pounds], 'kg').some(
        (record) => record.kind === 'weight',
      ),
    ).toBe(false);

    const asKg = analyzeProgress(
      [pounds, kilograms],
      bundle.profile!,
      new Date('2026-08-09T12:00:00.000Z'),
      'kg',
    );
    const asLb = analyzeProgress(
      [pounds, kilograms],
      bundle.profile!,
      new Date('2026-08-09T12:00:00.000Z'),
      'lb',
    );
    expect(asKg.totalWorkingVolume).toBeCloseTo(725.75, 1);
    expect(asLb.totalWorkingVolume).toBeCloseTo(1600, 1);
  });
});
