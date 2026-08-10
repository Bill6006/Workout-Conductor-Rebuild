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
  createActiveSession,
  editSet,
  elapsedSessionSeconds,
  logSet,
  nextSetSlot,
  pauseSession,
  resumeSession,
  setWarmupChoice,
  skipCurrentBlock,
  undoLastSet,
  workoutCompletion,
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

  it('finishes directly after the final superset move without an extra draft', () => {
    const workout = generated();
    const superset = workout.blocks.find((block) => block.kind === 'superset')!;
    let session = createActiveSession(
      { ...workout, blocks: [superset] },
      startedAt,
    );
    for (let index = 0; index < 20 && session.status === 'active'; index += 1) {
      const slot = nextSetSlot(session);
      expect(slot).not.toBeNull();
      session = logSet(
        session,
        slot!,
        { weight: 25, reps: 10, rir: 2 },
        new Date(new Date(startedAt).getTime() + index * 1000),
      );
    }
    expect(session.status).toBe('completed');
    expect(nextSetSlot(session)).toBeNull();
    expect(session.records).toHaveLength(superset.rounds * 2);
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
  });
});
