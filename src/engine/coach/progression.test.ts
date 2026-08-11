import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../../domain/defaults';
import {
  ActiveSessionSchema,
  type ActiveSession,
} from '../../features/activeWorkout/schema';
import {
  blockMoves,
  createActiveSession,
} from '../../features/activeWorkout/session';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../workoutGenerator/generateWorkout';
import { applyConfirmedCoachAction } from './applyCoachAction';
import { coachRecommendation, qualifyingWorkingRecords } from './progression';

const bundle = createDemoBundle();
const workout = generateWorkout(
  generationInputFromBundle(bundle, 'default', {
    date: '2026-08-10T14:00:00.000Z',
  }),
);

function historicalSession(
  date: string,
  reps: number,
  rir: number,
  editedAt: string | null = null,
) {
  const session = createActiveSession(workout, date);
  const block = workout.blocks[0];
  const move = blockMoves(block)[0];
  return ActiveSessionSchema.parse({
    ...session,
    status: 'completed',
    completedAt: date,
    records: [
      {
        id: `record-${date}`,
        sessionId: session.id,
        blockId: block.blockId,
        prescriptionId: move.prescriptionId,
        exerciseId: move.exerciseId,
        exerciseName: move.exerciseName,
        kind: 'working',
        setIndex: 0,
        roundIndex: null,
        moveIndex: 0,
        weight: 100,
        weightUnit: 'lb',
        reps,
        rir,
        tempo: '3-1-1',
        restSecondsTaken: 120,
        painReported: false,
        completedAt: date,
        editedAt,
        countsTowardProgression: true,
        countsTowardPr: true,
        countsTowardWorkingVolume: true,
      },
    ],
  });
}

describe('Phase 6 progression and Adaptive Coach', () => {
  it('does not diagnose a plateau from one poor session', () => {
    const current = createActiveSession(workout, '2026-08-10T18:00:00.000Z');
    const move = blockMoves(workout.blocks[0])[0];
    const history = [
      historicalSession('2026-08-09T18:00:00.000Z', move.repRange.min - 1, 0),
    ];
    const result = coachRecommendation({
      session: current,
      history,
      bundle,
      currentExerciseId: move.exerciseId,
    });
    expect(result.priority).toBe('progression');
    expect(result.title).toContain('Hold load');
  });

  it('uses multiple qualifying failures before offering a confirmed micro-deload', () => {
    const current = createActiveSession(workout, '2026-08-10T18:00:00.000Z');
    const move = blockMoves(workout.blocks[0])[0];
    const history = [
      historicalSession('2026-08-09T18:00:00.000Z', move.repRange.min - 1, 0),
      historicalSession('2026-08-07T18:00:00.000Z', move.repRange.min - 2, 0),
    ];
    const result = coachRecommendation({
      session: current,
      history,
      bundle,
      currentExerciseId: move.exerciseId,
    });
    expect(result.priority).toBe('plateau');
    expect(result.action).toMatchObject({
      kind: 'micro-deload',
      requiresConfirmation: true,
    });
  });

  it('treats manually corrected values as truth and never rewrites records', () => {
    const correctedAt = '2026-08-09T18:05:00.000Z';
    const historical = historicalSession(
      '2026-08-09T18:00:00.000Z',
      8,
      2,
      correctedAt,
    );
    const current = ActiveSessionSchema.parse({
      ...createActiveSession(workout, '2026-08-10T18:00:00.000Z'),
      records: historical.records.map((record) => ({
        ...record,
        id: `current-${record.id}`,
        sessionId: 'current-session',
      })),
    });
    const before = JSON.stringify(current.records);
    const move = blockMoves(workout.blocks[0])[0];
    const next = applyConfirmedCoachAction(current, {
      kind: 'increase-rest',
      label: 'Add 30s rest',
      requiresConfirmation: true,
      exerciseId: move.exerciseId,
    });
    expect(JSON.stringify(next.records)).toBe(before);
    expect(next.records[0].editedAt).toBe(correctedAt);
  });

  it('excludes an incomplete next superset round from evidence', () => {
    const superset = workout.blocks.find((block) => block.kind === 'superset');
    expect(superset?.kind).toBe('superset');
    if (!superset || superset.kind !== 'superset') return;
    const session = createActiveSession(workout, '2026-08-10T18:00:00.000Z');
    const records = [
      ...superset.moves.map((move, moveIndex) => ({
        move,
        moveIndex,
        round: 0,
      })),
      { move: superset.moves[0], moveIndex: 0, round: 1 },
    ].map(({ move, moveIndex, round }) => ({
      id: `${move.prescriptionId}-${round}`,
      sessionId: session.id,
      blockId: superset.blockId,
      prescriptionId: move.prescriptionId,
      exerciseId: move.exerciseId,
      exerciseName: move.exerciseName,
      kind: 'working' as const,
      setIndex: round,
      roundIndex: round,
      moveIndex,
      weight: 40,
      weightUnit: 'lb',
      reps: 10,
      rir: 2,
      completedAt: '2026-08-10T18:05:00.000Z',
      editedAt: null,
      countsTowardProgression: true,
      countsTowardPr: true,
      countsTowardWorkingVolume: true,
    }));
    const parsed = ActiveSessionSchema.parse({ ...session, records });
    expect(qualifyingWorkingRecords(parsed)).toHaveLength(2);
  });

  it('prioritizes pain over progression and requires an alternative confirmation', () => {
    const current = createActiveSession(workout, '2026-08-10T18:00:00.000Z');
    const move = blockMoves(workout.blocks[0])[0];
    const painful: ActiveSession = ActiveSessionSchema.parse({
      ...current,
      readiness: { ...current.readiness, jointDiscomfort: 'severe' },
    });
    const result = coachRecommendation({
      session: painful,
      history: [],
      bundle,
      currentExerciseId: move.exerciseId,
    });
    expect(result.priority).toBe('safety-form');
    expect(result.action?.kind).toBe('open-alternatives');
  });

  it('converts historical loads into the preferred unit for coach targets', () => {
    const kgBundle = {
      ...bundle,
      settings: { ...bundle.settings, units: 'kg' as const },
    };
    const current = createActiveSession(
      workout,
      '2026-08-10T18:00:00.000Z',
      undefined,
      undefined,
      'kg',
    );
    const move = blockMoves(workout.blocks[0])[0];
    const history = [
      historicalSession(
        '2026-08-09T18:00:00.000Z',
        move.repRange.min,
        move.targetRir,
      ),
    ];
    const result = coachRecommendation({
      session: current,
      history,
      bundle: kgBundle,
      currentExerciseId: move.exerciseId,
    });
    expect(result.nextTarget).toContain('45.36 kg');
  });
});
