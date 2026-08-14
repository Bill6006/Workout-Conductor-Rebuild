import type {
  ExercisePrescription,
  GeneratedWorkout,
  WorkoutBlock,
} from '../../engine/workoutGenerator/schema';
import {
  ActiveSessionSchema,
  MAX_SET_REPS,
  type ActiveSession,
  type ActiveSetRecord,
  type ReadinessCheck,
  type SetSlot,
} from './schema';

export function blockMoves(block: WorkoutBlock): ExercisePrescription[] {
  return block.kind === 'exercise' ? [block.prescription] : block.moves;
}

export function initialSetValues(
  records: ActiveSetRecord[],
  move: ExercisePrescription,
  slot: SetSlot,
) {
  const previous = records
    .filter(
      (record) =>
        record.prescriptionId === move.prescriptionId &&
        record.exerciseId === move.exerciseId &&
        record.kind === slot.kind &&
        record.legacyInvalidReps === null,
    )
    .at(-1);
  const numericTargetReps = Number(slot.targetReps);
  return {
    weight: previous?.weight ?? (slot.kind === 'warmup' ? 20 : 40),
    reps:
      previous?.reps ??
      (Number.isInteger(numericTargetReps) && numericTargetReps > 0
        ? numericTargetReps
        : move.repRange.max),
    rir: previous?.rir ?? slot.targetRir,
  };
}

function sessionTimestamp(now: Date | string = new Date()) {
  return typeof now === 'string' ? now : now.toISOString();
}

export function createActiveSession(
  workout: GeneratedWorkout,
  now: Date | string = new Date(),
  readiness?: ReadinessCheck,
  trainingContext?: ActiveSession['trainingContext'],
  weightUnit: ActiveSession['weightUnit'] = 'lb',
): ActiveSession {
  const timestamp = sessionTimestamp(now);
  return ActiveSessionSchema.parse({
    id: `session-${workout.id}-${timestamp}`,
    schemaVersion: 2,
    weightUnit,
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
    skippedSetKeys: [],
    deferredPrescriptionIds: [],
    omittedPrescriptionIds: [],
    completionCelebratedAt: null,
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
  includeDropSet = true,
): SetSlot | null {
  const warmupChoice = session.warmupSelections[move.prescriptionId];
  if (warmupChoice === 'added') {
    for (let setIndex = 0; setIndex < move.warmupSets.length; setIndex += 1) {
      const warmup = move.warmupSets[setIndex];
      const candidate: SetSlot = {
        blockId: block.blockId,
        blockIndex,
        prescriptionId: move.prescriptionId,
        exerciseId: move.exerciseId,
        exerciseName: move.exerciseName,
        kind: 'warmup',
        setIndex,
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
      if (!slotConsumed(session, candidate)) return candidate;
    }
  }

  const candidateIndexes =
    roundIndex === null
      ? Array.from({ length: workingSetCount }, (_, index) => index)
      : [roundIndex];
  for (const setIndex of candidateIndexes) {
    const candidate: SetSlot = {
      blockId: block.blockId,
      blockIndex,
      prescriptionId: move.prescriptionId,
      exerciseId: move.exerciseId,
      exerciseName: move.exerciseName,
      kind: 'working',
      setIndex,
      roundIndex: setIndex,
      moveIndex,
      targetReps: `${move.repRange.min}–${move.repRange.max}`,
      targetRir: move.targetRir,
      restSeconds:
        block.kind === 'exercise'
          ? move.restSeconds
          : block.restAfterRoundSeconds,
      loadGuidance: move.loadGuidance,
    };
    if (!slotConsumed(session, candidate)) return candidate;
  }

  if (
    includeDropSet &&
    move.dropSet &&
    recordsFor(session, move.prescriptionId, 'drop').length === 0
  ) {
    const candidate: SetSlot = {
      blockId: block.blockId,
      blockIndex,
      prescriptionId: move.prescriptionId,
      exerciseId: move.exerciseId,
      exerciseName: move.exerciseName,
      kind: 'drop',
      setIndex: workingSetCount,
      roundIndex: null,
      moveIndex,
      targetReps: move.dropSet.reps,
      targetRir: 0,
      restSeconds: 0,
      loadGuidance: `Reduce load ${move.dropSet.loadReductionPercent}% · ${move.dropSet.rationale}`,
    };
    if (!slotConsumed(session, candidate)) return candidate;
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
    if (
      session.deferredPrescriptionIds.includes(moves[0].prescriptionId) ||
      session.omittedPrescriptionIds.includes(moves[0].prescriptionId)
    )
      return null;
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
      if (
        session.deferredPrescriptionIds.includes(move.prescriptionId) ||
        session.omittedPrescriptionIds.includes(move.prescriptionId)
      )
        continue;
      const warmupSlot = moveSlot(
        session,
        block,
        blockIndex,
        move,
        moveIndex,
        block.rounds,
        round,
        false,
      );
      if (warmupSlot) return warmupSlot;
    }
  }

  for (let moveIndex = 0; moveIndex < moves.length; moveIndex += 1) {
    const move = moves[moveIndex];
    if (
      session.deferredPrescriptionIds.includes(move.prescriptionId) ||
      session.omittedPrescriptionIds.includes(move.prescriptionId)
    )
      continue;
    if (move.dropSet) {
      const candidate: SetSlot = {
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
      if (!slotConsumed(session, candidate)) return candidate;
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
  if (
    values.reps < 1 ||
    values.reps > MAX_SET_REPS ||
    !Number.isInteger(values.reps)
  ) {
    throw new Error(
      `A completed set requires 1–${MAX_SET_REPS} whole repetitions.`,
    );
  }
  const currentSlot = nextSetSlot(session);
  const requestedKey = slotKey(slot);
  if (!currentSlot || slotKey(currentSlot) !== requestedKey) return session;
  if (session.records.some((record) => recordSlotKey(record) === requestedKey))
    return session;
  const timestamp = sessionTimestamp(now);
  const record: ActiveSetRecord = {
    id: `${session.id}:${requestedKey}`,
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
    weightUnit: session.weightUnit,
    reps: values.reps,
    legacyInvalidReps: null,
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
    status: 'active',
    completedAt: null,
  });
}

export function editSet(
  session: ActiveSession,
  recordId: string,
  values: { weight: number; reps: number; rir: number },
  now: Date | string = new Date(),
): ActiveSession {
  const timestamp = sessionTimestamp(now);
  if (
    values.reps < 1 ||
    values.reps > MAX_SET_REPS ||
    !Number.isInteger(values.reps)
  ) {
    throw new Error(`A corrected set requires 1–${MAX_SET_REPS} whole reps.`);
  }
  if (!session.records.some((record) => record.id === recordId)) {
    throw new Error('Completed set not found.');
  }
  return ActiveSessionSchema.parse({
    ...session,
    records: session.records.map((record) =>
      record.id === recordId
        ? {
            ...record,
            ...values,
            legacyInvalidReps: null,
            countsTowardProgression: record.kind !== 'warmup',
            countsTowardPr: record.kind !== 'warmup',
            countsTowardWorkingVolume: record.kind !== 'warmup',
            editedAt: timestamp,
          }
        : record,
    ),
    updatedAt: timestamp,
  });
}

export function slotKey(slot: SetSlot): string {
  return [
    slot.blockId,
    slot.prescriptionId,
    slot.kind,
    slot.setIndex,
    slot.roundIndex ?? 'none',
    slot.moveIndex,
  ].join(':');
}

function slotConsumed(session: ActiveSession, slot: SetSlot) {
  const key = slotKey(slot);
  return (
    session.skippedSetKeys.includes(key) ||
    session.records.some((record) => recordSlotKey(record) === key)
  );
}

export function skipCurrentSet(
  session: ActiveSession,
  now: Date | string = new Date(),
): ActiveSession {
  if (session.status !== 'active') return session;
  const current = nextSetSlot(session);
  if (!current) return session;
  const timestamp = sessionTimestamp(now);
  const candidate = ActiveSessionSchema.parse({
    ...session,
    skippedSetKeys: Array.from(
      new Set([...session.skippedSetKeys, slotKey(current)]),
    ),
    restTimer: null,
    updatedAt: timestamp,
  });
  const next = nextSetSlot(candidate);
  return ActiveSessionSchema.parse({
    ...candidate,
    currentBlockIndex: next?.blockIndex ?? candidate.workout.blocks.length,
  });
}

function recordSlotKey(record: ActiveSetRecord): string {
  return [
    record.blockId,
    record.prescriptionId,
    record.kind,
    record.setIndex,
    record.roundIndex ?? 'none',
    record.moveIndex,
  ].join(':');
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

function requiredWorkingSets(block: WorkoutBlock, move: ExercisePrescription) {
  return block.kind === 'exercise' ? move.sets : block.rounds;
}

export type WorkoutExerciseStatus =
  'current' | 'next' | 'completed' | 'skipped' | 'omitted';

export type WorkoutExerciseQueueItem = {
  blockId: string;
  blockIndex: number;
  prescriptionId: string;
  exerciseId: string;
  exerciseName: string;
  status: WorkoutExerciseStatus;
};

function prescriptionComplete(
  session: ActiveSession,
  block: WorkoutBlock,
  move: ExercisePrescription,
) {
  const working = recordsFor(session, move.prescriptionId, 'working').length;
  const skippedWorking = session.skippedSetKeys.filter((key) => {
    const parts = key.split(':');
    return parts[1] === move.prescriptionId && parts[2] === 'working';
  }).length;
  const dropComplete =
    !move.dropSet ||
    recordsFor(session, move.prescriptionId, 'drop').length > 0 ||
    session.skippedSetKeys.some((key) => {
      const parts = key.split(':');
      return parts[1] === move.prescriptionId && parts[2] === 'drop';
    });
  return (
    working + skippedWorking >= requiredWorkingSets(block, move) && dropComplete
  );
}

export function workoutExerciseQueue(
  session: ActiveSession,
): WorkoutExerciseQueueItem[] {
  const currentPrescriptionId = nextSetSlot(session)?.prescriptionId ?? null;
  return session.workout.blocks.flatMap((block, blockIndex) =>
    blockMoves(block).map((move) => {
      let status: WorkoutExerciseStatus = 'next';
      if (session.omittedPrescriptionIds.includes(move.prescriptionId)) {
        status = 'omitted';
      } else if (
        session.deferredPrescriptionIds.includes(move.prescriptionId)
      ) {
        status = 'skipped';
      } else if (move.prescriptionId === currentPrescriptionId) {
        status = 'current';
      } else if (prescriptionComplete(session, block, move)) {
        status = 'completed';
      }
      return {
        blockId: block.blockId,
        blockIndex,
        prescriptionId: move.prescriptionId,
        exerciseId: move.exerciseId,
        exerciseName: move.exerciseName,
        status,
      };
    }),
  );
}

export function unfinishedExercises(session: ActiveSession) {
  return workoutExerciseQueue(session).filter(
    (item) =>
      item.status === 'next' ||
      item.status === 'skipped' ||
      item.status === 'current',
  );
}

export function deferCurrentExercise(
  session: ActiveSession,
  now: Date | string = new Date(),
): ActiveSession {
  if (session.status !== 'active') return session;
  const slot = nextSetSlot(session);
  if (!slot) return session;
  const timestamp = sessionTimestamp(now);
  const candidate = ActiveSessionSchema.parse({
    ...session,
    deferredPrescriptionIds: Array.from(
      new Set([...session.deferredPrescriptionIds, slot.prescriptionId]),
    ),
    restTimer: null,
    updatedAt: timestamp,
  });
  const next = nextSetSlot(candidate);
  return ActiveSessionSchema.parse({
    ...candidate,
    currentBlockIndex: next?.blockIndex ?? candidate.workout.blocks.length,
  });
}

export function returnToExercise(
  session: ActiveSession,
  prescriptionId: string,
  now: Date | string = new Date(),
): ActiveSession {
  if (
    session.status !== 'active' ||
    !session.deferredPrescriptionIds.includes(prescriptionId)
  )
    return session;
  const item = workoutExerciseQueue(session).find(
    (candidate) => candidate.prescriptionId === prescriptionId,
  );
  if (!item) return session;
  const timestamp = sessionTimestamp(now);
  return ActiveSessionSchema.parse({
    ...session,
    deferredPrescriptionIds: session.deferredPrescriptionIds.filter(
      (id) => id !== prescriptionId,
    ),
    currentBlockIndex: item.blockIndex,
    restTimer: null,
    updatedAt: timestamp,
  });
}

export function finishSession(
  session: ActiveSession,
  omitUnfinished: boolean,
  now: Date | string = new Date(),
): ActiveSession {
  if (session.status !== 'active') return session;
  const unfinished = unfinishedExercises(session);
  if (unfinished.length > 0 && !omitUnfinished) {
    throw new Error(
      'Unfinished exercises require confirmation before finishing.',
    );
  }
  const timestamp = sessionTimestamp(now);
  const omitted = omitUnfinished
    ? Array.from(
        new Set([
          ...session.omittedPrescriptionIds,
          ...unfinished.map((item) => item.prescriptionId),
        ]),
      )
    : session.omittedPrescriptionIds;
  return ActiveSessionSchema.parse({
    ...session,
    status: 'completed',
    completedAt: timestamp,
    currentBlockIndex: session.workout.blocks.length,
    deferredPrescriptionIds: session.deferredPrescriptionIds.filter(
      (id) => !omitted.includes(id),
    ),
    omittedPrescriptionIds: omitted,
    completionCelebratedAt: timestamp,
    restTimer: null,
    updatedAt: timestamp,
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
    omittedExercises: session.omittedPrescriptionIds.length,
  };
}
