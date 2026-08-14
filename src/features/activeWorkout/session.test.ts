import { describe, expect, it } from 'vitest';
import { exerciseById } from '../../catalog/exercises';
import { createDemoBundle } from '../../domain/defaults';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../../engine/workoutGenerator/generateWorkout';
import { calculatePlateMath } from './plateMath';
import { ActiveSessionSchema } from './schema';
import {
  blockMoves,
  createActiveSession,
  deferCurrentExercise,
  editSet,
  elapsedSessionSeconds,
  finishSession,
  initialSetValues,
  logSet,
  nextSetSlot,
  pauseSession,
  returnToExercise,
  resumeSession,
  setWarmupChoice,
  skipCurrentBlock,
  skipCurrentSet,
  undoLastSet,
  workoutCompletion,
  workoutExerciseQueue,
} from './session';

const startedAt = '2026-08-10T18:00:00.000Z';

function generated() {
  return generateWorkout(
    generationInputFromBundle(createDemoBundle(), 'default', {
      date: startedAt,
    }),
  );
}

function logged(session = createActiveSession(generated(), startedAt)) {
  const slot = nextSetSlot(session)!;
  return logSet(session, slot, { weight: 40, reps: 8, rir: 2 }, startedAt);
}

describe('Phase 5 durable active workout session', () => {
  it('creates one validated resumable source of truth', () => {
    const session = createActiveSession(generated(), startedAt);
    expect(ActiveSessionSchema.safeParse(session).success).toBe(true);
    expect(session.status).toBe('active');
    expect(session.records).toEqual([]);
    expect(nextSetSlot(session)?.blockIndex).toBe(0);
  });

  it('adds or skips optional warm-ups with permanent accounting exclusions', () => {
    const session = createActiveSession(generated(), startedAt);
    const first = nextSetSlot(session)!;
    const withRamp = setWarmupChoice(
      session,
      first.prescriptionId,
      'added',
      startedAt,
    );
    const warmup = nextSetSlot(withRamp)!;
    expect(warmup.kind).toBe('warmup');
    const afterWarmup = logSet(
      withRamp,
      warmup,
      { weight: 20, reps: 6, rir: 4 },
      '2026-08-10T18:00:01.000Z',
    );
    expect(afterWarmup.records[0]).toMatchObject({
      kind: 'warmup',
      countsTowardProgression: false,
      countsTowardPr: false,
      countsTowardWorkingVolume: false,
    });

    const skipped = setWarmupChoice(
      session,
      first.prescriptionId,
      'skipped',
      startedAt,
    );
    expect(nextSetSlot(skipped)?.kind).toBe('working');
  });

  it('skips exactly the current set without creating a completed record', () => {
    const session = createActiveSession(generated(), startedAt);
    const first = nextSetSlot(session)!;
    const skipped = skipCurrentSet(session, '2026-08-10T18:00:01.000Z');

    expect(skipped.records).toEqual([]);
    expect(skipped.skippedSetKeys).toHaveLength(1);
    expect(nextSetSlot(skipped)).toMatchObject({
      prescriptionId: first.prescriptionId,
      setIndex: first.setIndex + 1,
    });
    expect(ActiveSessionSchema.parse(structuredClone(skipped))).toEqual(
      skipped,
    );
  });

  it('persists skipped warm-ups and advances into working sets', () => {
    const session = createActiveSession(generated(), startedAt);
    const first = nextSetSlot(session)!;
    const withWarmups = setWarmupChoice(
      session,
      first.prescriptionId,
      'added',
      startedAt,
    );
    expect(nextSetSlot(withWarmups)?.kind).toBe('warmup');

    const skipped = skipCurrentSet(withWarmups, startedAt);
    const reloaded = ActiveSessionSchema.parse(structuredClone(skipped));
    expect(reloaded.records).toEqual([]);
    expect(nextSetSlot(reloaded)?.kind).toBe(
      first &&
        generated()
          .blocks.flatMap((block) => blockMoves(block))
          .find((move) => move.prescriptionId === first.prescriptionId)!
          .warmupSets.length > 1
        ? 'warmup'
        : 'working',
    );
  });

  it('advances a skipped superset set to its partner without losing the round', () => {
    const workout = generated();
    const groupIndex = workout.blocks.findIndex(
      (block) => block.kind === 'superset' || block.kind === 'circuit',
    );
    expect(groupIndex).toBeGreaterThanOrEqual(0);
    const deferredBeforeGroup = workout.blocks
      .slice(0, groupIndex)
      .flatMap(blockMoves)
      .map((move) => move.prescriptionId);
    let current = ActiveSessionSchema.parse({
      ...createActiveSession(workout, startedAt),
      currentBlockIndex: groupIndex,
      deferredPrescriptionIds: deferredBeforeGroup,
    });
    const first = nextSetSlot(current)!;
    current = skipCurrentSet(current, startedAt);
    const partner = nextSetSlot(current)!;
    expect(partner.blockId).toBe(first.blockId);
    expect(partner.roundIndex).toBe(first.roundIndex);
    expect(partner.moveIndex).not.toBe(first.moveIndex);
    expect(current.records).toEqual([]);

    const reloaded = ActiveSessionSchema.parse(structuredClone(current));
    expect(nextSetSlot(reloaded)).toEqual(partner);
  });

  it('logs a normal prefilled set well inside the 100 ms response target', () => {
    const session = createActiveSession(generated(), startedAt);
    const slot = nextSetSlot(session)!;
    const before = performance.now();
    const next = logSet(
      session,
      slot,
      { weight: 40, reps: 8, rir: 2 },
      startedAt,
    );
    expect(performance.now() - before).toBeLessThan(100);
    expect(next.records).toHaveLength(1);
    expect(next.records[0]).toMatchObject({ weight: 40, reps: 8, rir: 2 });
  });

  it('rejects zero-rep completed records at the session boundary', () => {
    const session = createActiveSession(generated(), startedAt);
    const slot = nextSetSlot(session)!;
    expect(() =>
      logSet(session, slot, { weight: 40, reps: 0, rir: 2 }, startedAt),
    ).toThrow('1–200 whole repetitions');
  });

  it('rejects extreme repetitions at log and correction boundaries', () => {
    const session = createActiveSession(generated(), startedAt);
    const slot = nextSetSlot(session)!;
    expect(() =>
      logSet(session, slot, { weight: 40, reps: 999, rir: 2 }, startedAt),
    ).toThrow('1–200 whole repetitions');

    const completed = logSet(
      session,
      slot,
      { weight: 40, reps: 8, rir: 2 },
      startedAt,
    );
    expect(() =>
      editSet(completed, completed.records[0].id, {
        weight: 40,
        reps: 999,
        rir: 2,
      }),
    ).toThrow('1–200 whole reps');
  });

  it('makes one logical set slot idempotent at the session boundary', () => {
    const session = createActiveSession(generated(), startedAt);
    const slot = nextSetSlot(session)!;
    const first = logSet(
      session,
      slot,
      { weight: 40, reps: 8, rir: 2 },
      startedAt,
    );
    const replay = logSet(
      first,
      slot,
      { weight: 40, reps: 8, rir: 2 },
      '2026-08-10T18:00:00.050Z',
    );
    expect(replay.records).toHaveLength(1);
    expect(replay.records[0].id).toBe(first.records[0].id);
    expect(() =>
      ActiveSessionSchema.parse({
        ...first,
        records: [
          ...first.records,
          { ...first.records[0], id: 'forged-duplicate' },
        ],
      }),
    ).toThrow('same set slot');
  });

  it('resets replacement values and uses the warm-up slot RIR', () => {
    const session = createActiveSession(generated(), startedAt);
    const workingSlot = nextSetSlot(session)!;
    const originalMove = blockMoves(session.workout.blocks[0])[0];
    const afterOriginal = logSet(
      session,
      workingSlot,
      { weight: 75, reps: 30, rir: 2 },
      startedAt,
    );
    const replacementMove = {
      ...originalMove,
      exerciseId: 'incline-dumbbell-press',
      exerciseName: 'Incline Dumbbell Press',
      repRange: { min: 8, max: 12 },
      targetRir: 1,
    };
    expect(
      initialSetValues(afterOriginal.records, replacementMove, {
        ...workingSlot,
        exerciseId: replacementMove.exerciseId,
        exerciseName: replacementMove.exerciseName,
        targetReps: '8–12',
        targetRir: 1,
      }),
    ).toEqual({ weight: 40, reps: 12, rir: 1 });

    const withRamp = setWarmupChoice(
      session,
      workingSlot.prescriptionId,
      'added',
      startedAt,
    );
    const warmupSlot = nextSetSlot(withRamp)!;
    expect(
      initialSetValues(withRamp.records, originalMove, warmupSlot),
    ).toMatchObject({ reps: 8, rir: 4 });
  });

  it('edits a completed set inline without adding a set or changing position', () => {
    const session = logged();
    const record = session.records[0];
    const edited = editSet(
      session,
      record.id,
      { weight: 42.5, reps: 9, rir: 1 },
      '2026-08-10T18:01:00.000Z',
    );
    expect(edited.records).toHaveLength(1);
    expect(edited.currentBlockIndex).toBe(session.currentBlockIndex);
    expect(edited.records[0]).toMatchObject({ weight: 42.5, reps: 9, rir: 1 });
    expect(edited.records[0].editedAt).not.toBeNull();
  });

  it('undoes the last record safely and restores active logging', () => {
    const session = logged();
    const undone = undoLastSet(session, '2026-08-10T18:02:00.000Z');
    expect(undone.records).toEqual([]);
    expect(undone.status).toBe('active');
    expect(nextSetSlot(undone)?.exerciseId).toBe(session.records[0].exerciseId);
  });

  it('keeps superset moves as separate records in one combined block', () => {
    const workout = generated();
    const supersetIndex = workout.blocks.findIndex(
      (block) => block.kind === 'superset',
    );
    expect(supersetIndex).toBeGreaterThanOrEqual(0);
    let session = ActiveSessionSchema.parse({
      ...createActiveSession(workout, startedAt),
      currentBlockIndex: supersetIndex,
      skippedBlockIds: workout.blocks
        .slice(0, supersetIndex)
        .map((block) => block.blockId),
    });
    const block = workout.blocks[supersetIndex];
    expect(block.kind).toBe('superset');
    const first = nextSetSlot(session)!;
    session = logSet(
      session,
      first,
      { weight: 30, reps: 10, rir: 2 },
      startedAt,
    );
    const second = nextSetSlot(session)!;
    expect(second.blockId).toBe(first.blockId);
    expect(second.exerciseId).not.toBe(first.exerciseId);
    session = logSet(
      session,
      second,
      { weight: 25, reps: 12, rir: 2 },
      '2026-08-10T18:00:20.000Z',
    );
    expect(session.records).toHaveLength(2);
    expect(
      new Set(session.records.map((record) => record.exerciseId)).size,
    ).toBe(2);
    expect(block.canonicalRow).toContain(' + ');
  });

  it('waits for one explicit finish after the final superset move', () => {
    const workout = generated();
    const superset = workout.blocks.find((block) => block.kind === 'superset')!;
    let session = createActiveSession(
      { ...workout, blocks: [superset] },
      startedAt,
    );
    for (let index = 0; index < 20 && nextSetSlot(session); index += 1) {
      const slot = nextSetSlot(session);
      expect(slot).not.toBeNull();
      session = logSet(
        session,
        slot!,
        { weight: 25, reps: 10, rir: 2 },
        new Date(new Date(startedAt).getTime() + index * 1000),
      );
    }
    expect(session.status).toBe('active');
    expect(nextSetSlot(session)).toBeNull();
    expect(session.records).toHaveLength(superset.rounds * 2);
    session = finishSession(session, false, '2026-08-10T18:10:00.000Z');
    expect(session.status).toBe('completed');
    expect(session.completionCelebratedAt).toBe('2026-08-10T18:10:00.000Z');
  });

  it('persists skip-for-now and returns without changing completed records', () => {
    const firstLogged = logged();
    const current = nextSetSlot(firstLogged)!;
    const deferred = deferCurrentExercise(
      firstLogged,
      '2026-08-10T18:03:00.000Z',
    );
    expect(deferred.records).toEqual(firstLogged.records);
    expect(deferred.deferredPrescriptionIds).toContain(current.prescriptionId);
    expect(
      workoutExerciseQueue(deferred).find(
        (item) => item.prescriptionId === current.prescriptionId,
      )?.status,
    ).toBe('skipped');

    const reloaded = ActiveSessionSchema.parse(structuredClone(deferred));
    const returned = returnToExercise(
      reloaded,
      current.prescriptionId,
      '2026-08-10T18:04:00.000Z',
    );
    expect(returned.records).toEqual(firstLogged.records);
    expect(returned.deferredPrescriptionIds).not.toContain(
      current.prescriptionId,
    );
    expect(nextSetSlot(returned)?.prescriptionId).toBe(current.prescriptionId);
  });

  it('defers one superset or circuit move while its partners remain runnable', () => {
    const workout = generated();
    const grouped = workout.blocks.find(
      (block) => block.kind === 'superset' || block.kind === 'circuit',
    )!;
    let session = createActiveSession(
      { ...workout, blocks: [grouped] },
      startedAt,
    );
    const first = nextSetSlot(session)!;
    session = deferCurrentExercise(session, '2026-08-10T18:01:00.000Z');
    const partner = nextSetSlot(session)!;
    expect(partner.blockId).toBe(first.blockId);
    expect(partner.prescriptionId).not.toBe(first.prescriptionId);
    session = logSet(session, partner, { weight: 25, reps: 10, rir: 2 });
    const returned = returnToExercise(session, first.prescriptionId);
    expect(nextSetSlot(returned)?.prescriptionId).toBe(first.prescriptionId);
    expect(returned.records).toEqual(session.records);
  });

  it('defers and returns one circuit move across persistence without losing its partner record', () => {
    const workout = generated();
    const grouped = workout.blocks.find(
      (block) => block.kind === 'superset' || block.kind === 'circuit',
    )!;
    const circuit = { ...grouped, kind: 'circuit' as const };
    let session = createActiveSession(
      { ...workout, blocks: [circuit] },
      startedAt,
    );
    const deferredMove = nextSetSlot(session)!;
    session = deferCurrentExercise(session, '2026-08-10T18:01:00.000Z');
    const partner = nextSetSlot(session)!;
    expect(partner.blockId).toBe(deferredMove.blockId);
    expect(partner.prescriptionId).not.toBe(deferredMove.prescriptionId);
    session = logSet(session, partner, { weight: 25, reps: 10, rir: 2 });

    const reloaded = ActiveSessionSchema.parse(structuredClone(session));
    const returned = returnToExercise(
      reloaded,
      deferredMove.prescriptionId,
      '2026-08-10T18:02:00.000Z',
    );
    expect(nextSetSlot(returned)?.prescriptionId).toBe(
      deferredMove.prescriptionId,
    );
    expect(returned.records).toEqual(session.records);
  });

  it('requires confirmation, records intentional omissions, and is idempotent under rapid deferral', () => {
    const session = createActiveSession(generated(), startedAt);
    const first = nextSetSlot(session)!;
    const once = deferCurrentExercise(session, '2026-08-10T18:01:00.000Z');
    const replay = deferCurrentExercise(session, '2026-08-10T18:01:00.000Z');
    expect(once.deferredPrescriptionIds).toEqual(
      replay.deferredPrescriptionIds,
    );

    let deferred = once;
    while (nextSetSlot(deferred)) {
      deferred = deferCurrentExercise(deferred, '2026-08-10T18:02:00.000Z');
    }
    expect(() => finishSession(deferred, false)).toThrow(
      'require confirmation',
    );
    const finished = finishSession(deferred, true, '2026-08-10T18:05:00.000Z');
    expect(finished.status).toBe('completed');
    expect(finished.omittedPrescriptionIds).toContain(first.prescriptionId);
    expect(finished.deferredPrescriptionIds).toEqual([]);
    expect(workoutCompletion(finished)).toMatchObject({
      completedSets: 0,
      exercises: 0,
      volume: 0,
      omittedExercises: workoutExerciseQueue(finished).length,
    });
  });

  it('keeps deferred work through pause and resume', () => {
    const session = createActiveSession(generated(), startedAt);
    const deferred = deferCurrentExercise(session);
    const paused = pauseSession(deferred, '2026-08-10T18:03:00.000Z');
    const resumed = resumeSession(paused, '2026-08-10T18:04:00.000Z');
    expect(resumed.deferredPrescriptionIds).toEqual(
      deferred.deferredPrescriptionIds,
    );
    expect(resumed.records).toEqual([]);
  });

  it('pauses and resumes at the same position while excluding paused time', () => {
    const session = createActiveSession(generated(), startedAt);
    const paused = pauseSession(session, '2026-08-10T18:05:00.000Z');
    const resumed = resumeSession(paused, '2026-08-10T18:15:00.000Z');
    expect(resumed.status).toBe('active');
    expect(resumed.currentBlockIndex).toBe(0);
    expect(resumed.accumulatedPausedSeconds).toBe(600);
    expect(elapsedSessionSeconds(resumed, '2026-08-10T18:20:00.000Z')).toBe(
      600,
    );
  });

  it('skips only the current block and preserves completed truth', () => {
    const session = logged();
    const firstRecord = session.records[0];
    const skipped = skipCurrentBlock(session, '2026-08-10T18:03:00.000Z');
    expect(skipped.records).toEqual([firstRecord]);
    expect(skipped.skippedBlockIds).toContain(firstRecord.blockId);
    expect(skipped.currentBlockIndex).toBeGreaterThan(
      session.currentBlockIndex,
    );
  });

  it('summarizes working truth and excludes warm-ups from volume', () => {
    const session = logged();
    expect(workoutCompletion(session)).toMatchObject({
      completedSets: 1,
      exercises: 1,
      volume: 320,
      warmupSets: 0,
    });
  });

  it('calculates barbell plates and clarifies each-hand dumbbells', () => {
    const barbell = exerciseById.get('barbell-bench-press')!;
    expect(calculatePlateMath(barbell, 135)).toMatchObject({
      platesPerSide: [45],
      remainder: 0,
    });
    const dumbbell = exerciseById.get('dumbbell-bench-press')!;
    expect(calculatePlateMath(dumbbell, 50).label).toBe('50 per hand');
    expect(calculatePlateMath(dumbbell, -5).label).toBe(
      'Enter a nonnegative target weight.',
    );
  });
});
