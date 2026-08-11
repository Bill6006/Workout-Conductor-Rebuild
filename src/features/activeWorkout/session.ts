import type {
  ExercisePrescription,
  GeneratedWorkout,
  WorkoutBlock,
} from '../../engine/workoutGenerator/schema';
import {
  ActiveSessionSchema,
  type ActiveSession,
  type ActiveSetRecord,
  type ReadinessCheck,
  type SetSlot,
} from './schema';

export function blockMoves(block: WorkoutBlock): ExercisePrescription[] {
  return block.kind === 'exercise' ? [block.prescription] : block.moves;
}

function sessionTimestamp(now: Date | string = new Date()) {
  return typeof now === 'string' ? now : now.toISOString();
}

export function createActiveSession(
  workout: GeneratedWorkout,
  now: Date | string = new Date(),
  readiness?: ReadinessCheck,
  trainingContext?: ActiveSession['trainingContext'],
): ActiveSession {
  const timestamp = sessionTimestamp(now);
  return ActiveSessionSchema.parse({
    id: `session-${workout.id}-${timestamp}`,
    schemaVersion: 1,
    workout,
    status: 'active',
    startedAt: timestamp,
    pausedAt: null,
    accumulatedPausedSeconds: 0,
    completedAt: null,
    currentBlockIndex: 0,
    records: [],
    warmupSelections: Object.fromEntries(
      workout.blocks.flatMap((block) =>
        blockMoves(block).map((move) => [move.prescriptionId, 'pending']),
      ),
    ),
    notesByExerciseId: {},
    customExerciseSnapshots: {},
    pinnedExerciseIds: [],
    acceptedAlternativeIds: [],
    skippedBlockIds: [],
    restTimer: null,
    lastRestStartedAt: null,
    lastRestTargetSeconds: null,
    readiness: readiness ?? {
      energy: 3,
      soreness: 2,
      sleep: 3,
      jointDiscomfort: 'none',
      motivation: 3,
      timePressure: 'none',
      checkedAt: timestamp,
    },
    sessionFeedback: null,
    trainingContext: trainingContext ?? {
      locationId: null,
      locationKind: null,
      equipmentIds: [],
    },
    updatedAt: timestamp,
  });
}

function recordsFor(
  session: ActiveSession,
  prescriptionId: string,
  kind?: ActiveSetRecord['kind'],
) {
  return session.records.filter(
    (record) =>
      record.prescriptionId === prescriptionId &&
      (!kind || record.kind === kind),
  );
}

function moveSlot(
  session: ActiveSession,
  block: WorkoutBlock,
  blockIndex: number,
  move: ExercisePrescription,
  moveIndex: number,
  workingSetCount: number,
  roundIndex: number | null,
): SetSlot | null {
  const warmupChoice = session.warmupSelections[move.prescriptionId];
  const warmups = recordsFor(session, move.prescriptionId, 'warmup');
  if (warmupChoice === 'added' && warmups.length < move.warmupSets.length) {
    const warmup = move.warmupSets[warmups.length];
    return {
      blockId: block.blockId,
      blockIndex,
      prescriptionId: move.prescriptionId,
      exerciseId: move.exerciseId,
      exerciseName: move.exerciseName,
      kind: 'warmup',
      setIndex: warmups.length,
      roundIndex: null,
      moveIndex,
      targetReps: String(warmup.reps),
      targetRir: 4,
      restSeconds: 45,
      loadGuidance:
        warmup.loadPercent === null
          ? warmup.note
          : `${warmup.loadPercent}% of working load · ${warmup.note}`,
    };
  }

  const working = recordsFor(session, move.prescriptionId, 'working');
  if (working.length < workingSetCount) {
    const nextRound = roundIndex ?? working.length;
    if (
      roundIndex !== null &&
      working.some((record) => record.roundIndex === roundIndex)
    ) {
      return null;
    }
    return {
      blockId: block.blockId,
      blockIndex,
      prescriptionId: move.prescriptionId,
      exerciseId: move.exerciseId,
      exerciseName: move.exerciseName,
      kind: 'working',
      setIndex: working.length,
      roundIndex: nextRound,
      moveIndex,
      targetReps: `${move.repRange.min}–${move.repRange.max}`,
      targetRir: move.targetRir,
      restSeconds:
        block.kind === 'exercise'
          ? move.restSeconds
          : block.restAfterRoundSeconds,
      loadGuidance: move.loadGuidance,
    };
  }

  if (
    move.dropSet &&
    recordsFor(session, move.prescriptionId, 'drop').length === 0
  ) {
    return {
      blockId: block.blockId,
      blockIndex,
      prescriptionId: move.prescriptionId,
      exerciseId: move.exerciseId,
      exerciseName: move.exerciseName,
      kind: 'drop',
      setIndex: working.length,
      roundIndex: null,
      moveIndex,
      targetReps: move.dropSet.reps,
      targetRir: 0,
      restSeconds: 0,
      loadGuidance: `Reduce load ${move.dropSet.loadReductionPercent}% · ${move.dropSet.rationale}`,
    };
  }
  return null;
}

function nextSlotInBlock(
  session: ActiveSession,
  block: WorkoutBlock,
  blockIndex: number,
): SetSlot | null {
  if (session.skippedBlockIds.includes(block.blockId)) return null;
  const moves = blockMoves(block);
  if (block.kind === 'exercise') {
    return moveSlot(
      session,
      block,
      blockIndex,
      moves[0],
      0,
      moves[0].sets,
      null,
    );
  }

  // A superset or circuit is completed round-by-round so both moves retain
  // separate records while the block remains one readable execution unit.
  for (let round = 0; round < block.rounds; round += 1) {
    for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
      const move = moves[moveIndex];
      const warmupSlot = moveSlot(
        session,
        block,
        blockIndex,
        move,
        moveIndex,
        block.rounds,
        round,
      );
      if (warmupSlot) return warmupSlot;
    }
  }

  for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
    const move = moves[moveIndex];
    if (
      move.dropSet &&
      recordsFor(session, move.prescriptionId, 'drop').length === 0
    ) {
      return {
        blockId: block.blockId,
        blockIndex,
        prescriptionId: move.prescriptionId,
        exerciseId: move.exerciseId,
        exerciseName: move.exerciseName,
        kind: 'drop',
        setIndex: block.rounds,
        roundIndex: null,
        moveIndex,
        targetReps: move.dropSet.reps,
        targetRir: 0,
        restSeconds: 0,
        loadGuidance: `Reduce load ${move.dropSet.loadReductionPercent}% · ${move.dropSet.rationale}`,
      };
    }
  }
  return null;
}

export function nextSetSlot(session: ActiveSession): SetSlot | null {
  if (session.status === 'completed') return null;
  for (
    let blockIndex = session.currentBlockIndex;
    blockIndex < session.workout.blocks.length;
    blockIndex += 1
  ) {
    const slot = nextSlotInBlock(
      session,
      session.workout.blocks[blockIndex],
      blockIndex,
    );
    if (slot) return slot;
  }
  return null;
}

export function logSet(
  session: ActiveSession,
  slot: SetSlot,
  values: { weight: number; reps: number; rir: number },
  now: Date | string = new Date(),
): ActiveSession {
  if (session.status !== 'active') {
    throw new Error('Resume the workout before logging a set.');
  }
  const timestamp = sessionTimestamp(now);
  const record: ActiveSetRecord = {
    id: `${session.id}:${slot.prescriptionId}:${slot.kind}:${slot.setIndex}:${timestamp}`,
    sessionId: session.id,
    blockId: slot.blockId,
    prescriptionId: slot.prescriptionId,
    exerciseId: slot.exerciseId,
    exerciseName: slot.exerciseName,
    kind: slot.kind,
    setIndex: slot.setIndex,
    roundIndex: slot.roundIndex,
    moveIndex: slot.moveIndex,
    weight: values.weight,
    reps: values.reps,
    rir: values.rir,
    tempo: 'controlled',
    restSecondsTaken: session.lastRestStartedAt
      ? Math.max(
          0,
          Math.round(
            (new Date(timestamp).getTime() -
              new Date(session.lastRestStartedAt).getTime()) /
              1000,
          ),
        )
      : null,
    plannedRestSeconds: session.lastRestTargetSeconds,
    painReported: false,
    completedAt: timestamp,
    editedAt: null,
    countsTowardProgression: slot.kind !== 'warmup',
    countsTowardPr: slot.kind !== 'warmup',
    countsTowardWorkingVolume: slot.kind !== 'warmup',
  };
  const candidate = ActiveSessionSchema.parse({
    ...session,
    records: [...session.records, record],
    updatedAt: timestamp,
  });
  const next = nextSetSlot(candidate);
  return ActiveSessionSchema.parse({
    ...candidate,
    currentBlockIndex: next?.blockIndex ?? candidate.workout.blocks.length,
    status: next ? 'active' : 'completed',
    completedAt: next ? null : timestamp,
  });
}

export function editSet(
  session: ActiveSession,
  recordId: string,
  values: { weight: number; reps: number; rir: number },
  now: Date | string = new Date(),
): ActiveSession {
  const timestamp = sessionTimestamp(now);
  if (!session.records.some((record) => record.id === recordId)) {
    throw new Error('Completed set not found.');
  }
  return ActiveSessionSchema.parse({
    ...session,
    records: session.records.map((record) =>
      record.id === recordId
        ? { ...record, ...values, editedAt: timestamp }
        : record,
    ),
    updatedAt: timestamp,
  });
}

export function undoLastSet(
  session: ActiveSession,
  now: Date | string = new Date(),
): ActiveSession {
  if (session.records.length === 0) return session;
  const timestamp = sessionTimestamp(now);
  const records = session.records.slice(0, -1);
  const currentBlockIndex = Math.min(
    session.currentBlockIndex,
    session.workout.blocks.findIndex(
      (block) => block.blockId === session.records.at(-1)?.blockId,
    ),
  );
  return ActiveSessionSchema.parse({
    ...session,
    status: 'active',
    completedAt: null,
    currentBlockIndex: Math.max(0, currentBlockIndex),
    records,
    restTimer: null,
    updatedAt: timestamp,
  });
}

export function setWarmupChoice(
  session: ActiveSession,
  prescriptionId: string,
  choice: 'added' | 'skipped',
  now: Date | string = new Date(),
): ActiveSession {
  const timestamp = sessionTimestamp(now);
  return ActiveSessionSchema.parse({
    ...session,
    warmupSelections: {
      ...session.warmupSelections,
      [prescriptionId]: choice,
    },
    updatedAt: timestamp,
  });
}

export function pauseSession(
  session: ActiveSession,
  now: Date | string = new Date(),
): ActiveSession {
  if (session.status !== 'active') return session;
  const timestamp = sessionTimestamp(now);
  return ActiveSessionSchema.parse({
    ...session,
    status: 'paused',
    pausedAt: timestamp,
    restTimer: null,
    updatedAt: timestamp,
  });
}

export function resumeSession(
  session: ActiveSession,
  now: Date | string = new Date(),
): ActiveSession {
  if (session.status !== 'paused' || !session.pausedAt) return session;
  const timestamp = sessionTimestamp(now);
  const pausedSeconds = Math.max(
    0,
    Math.round(
      (new Date(timestamp).getTime() - new Date(session.pausedAt).getTime()) /
        1000,
    ),
  );
  return ActiveSessionSchema.parse({
    ...session,
    status: 'active',
    pausedAt: null,
    accumulatedPausedSeconds: session.accumulatedPausedSeconds + pausedSeconds,
    updatedAt: timestamp,
  });
}

export function skipCurrentBlock(
  session: ActiveSession,
  now: Date | string = new Date(),
): ActiveSession {
  const block = session.workout.blocks[session.currentBlockIndex];
  if (!block) return session;
  const timestamp = sessionTimestamp(now);
  const candidate = ActiveSessionSchema.parse({
    ...session,
    skippedBlockIds: Array.from(
      new Set([...session.skippedBlockIds, block.blockId]),
    ),
    currentBlockIndex: session.currentBlockIndex + 1,
    updatedAt: timestamp,
  });
  const next = nextSetSlot(candidate);
  return ActiveSessionSchema.parse({
    ...candidate,
    currentBlockIndex: next?.blockIndex ?? candidate.workout.blocks.length,
    status: next ? 'active' : 'completed',
    completedAt: next ? null : timestamp,
  });
}

export function elapsedSessionSeconds(
  session: ActiveSession,
  now: Date | string = new Date(),
) {
  const end = session.completedAt ?? session.pausedAt ?? sessionTimestamp(now);
  return Math.max(
    0,
    Math.floor(
      (new Date(end).getTime() - new Date(session.startedAt).getTime()) / 1000,
    ) - session.accumulatedPausedSeconds,
  );
}

export function completedWorkingSets(session: ActiveSession) {
  return session.records.filter((record) => record.kind !== 'warmup');
}

export function workoutCompletion(session: ActiveSession) {
  const working = completedWorkingSets(session);
  return {
    completedSets: working.length,
    warmupSets: session.records.filter((record) => record.kind === 'warmup')
      .length,
    exercises: new Set(working.map((record) => record.exerciseId)).size,
    volume: working.reduce(
      (total, record) => total + record.weight * record.reps,
      0,
    ),
    skippedBlocks: session.skippedBlockIds.length,
  };
}
