import { exerciseById } from '../../catalog/exercises';
import type { EquipmentId, Exercise } from '../../catalog/schema';
import { rankAlternatives } from '../alternatives/rankAlternatives';
import { validateExerciseSelection } from '../conflicts/validateConflicts';
import type { ConflictContext } from '../conflicts/types';
import {
  generateWorkout,
  type WorkoutGenerationInput,
} from '../workoutGenerator/generateWorkout';
import {
  generatedWorkoutSchema,
  type ExercisePrescription,
  type GeneratedWorkout,
  type WorkoutBlock,
} from '../workoutGenerator/schema';
import { generationConflictContext } from '../workoutGenerator/scoreExercises';
import { estimateWorkoutTime } from '../workoutGenerator/timeEstimator';
import {
  calculatePlannedVolume,
  rankMusclePriorities,
} from '../workoutGenerator/weeklyVolume';
import {
  CompletedWorkSchema,
  RecalibrationSnapshotSchema,
  type CompletedWork,
  type RecalibrationChange,
  type RecalibrationChangeSummary,
  type RecalibrationRequest,
  type RecalibrationResult,
  type RecalibrationScope,
  type RecalibrationSnapshot,
  type SuccessfulRecalibration,
} from './schema';
import {
  evaluationMessagesFor,
  recalibrationScopeFor,
} from './triggerRegistry';

type RecalibrationDependencies = {
  generate: typeof generateWorkout;
};

type Substitution = {
  fromExerciseId: string;
  toExerciseId: string;
};

class RecalibrationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const defaultDependencies: RecalibrationDependencies = {
  generate: generateWorkout,
};

function nowMilliseconds() {
  return globalThis.performance?.now() ?? Date.now();
}

function cloneWorkout(workout: GeneratedWorkout) {
  return generatedWorkoutSchema.parse(workout);
}

function createSnapshot(request: RecalibrationRequest): RecalibrationSnapshot {
  return RecalibrationSnapshotSchema.parse({
    snapshotId: `${request.requestId}:before`,
    requestId: request.requestId,
    createdAt: request.timestamp,
    workout: cloneWorkout(request.currentWorkout),
  });
}

function prescriptionsForBlock(block: WorkoutBlock) {
  return block.kind === 'exercise' ? [block.prescription] : block.moves;
}

function prescriptionsForWorkout(workout: GeneratedWorkout) {
  return workout.blocks.flatMap(prescriptionsForBlock);
}

function exerciseIdsForBlock(block: WorkoutBlock) {
  return prescriptionsForBlock(block).map((move) => move.exerciseId);
}

function canonicalRow(block: WorkoutBlock) {
  const names = prescriptionsForBlock(block).map((move) => move.exerciseName);
  return block.kind === 'circuit' ? names.join(' → ') : names.join(' + ');
}

function completedSetCounts(completedWork: CompletedWork) {
  const counts = new Map<string, number>();
  completedWork.sets.forEach((set) => {
    counts.set(set.prescriptionId, (counts.get(set.prescriptionId) ?? 0) + 1);
  });
  return counts;
}

function allLockedExerciseIds(request: RecalibrationRequest) {
  const completedExerciseIds = request.completedWork.sets.map(
    (set) => set.exerciseId,
  );
  const currentExerciseLocked =
    request.currentExerciseId &&
    request.completedWork.sets.some(
      (set) => set.exerciseId === request.currentExerciseId,
    )
      ? [request.currentExerciseId]
      : [];
  return Array.from(
    new Set([
      ...request.lockedExerciseIds,
      ...request.pinnedExerciseIds,
      ...request.userSelectedExerciseIds,
      ...request.acceptedAlternativeIds,
      ...request.completedWork.completedExerciseIds,
      ...completedExerciseIds,
      ...currentExerciseLocked,
    ]),
  );
}

function applyInputChanges(
  request: RecalibrationRequest,
): WorkoutGenerationInput {
  const unavailable = new Set<EquipmentId>([
    ...request.unavailableEquipmentIds,
    ...request.sessionBusyEquipmentIds,
  ]);
  const location = request.locationOverride ?? request.generationInput.location;
  const painText = request.painFlags.join(' ').toLowerCase();
  const skippedExercise =
    request.trigger === 'exercise-skipped' && request.affectedExerciseId
      ? exerciseById.get(request.affectedExerciseId)
      : null;
  const dislikedExercises = skippedExercise
    ? Array.from(
        new Set([
          ...request.generationInput.profile.dislikedExercises,
          skippedExercise.id,
          skippedExercise.name,
        ]),
      )
    : request.generationInput.profile.dislikedExercises;
  const readiness =
    request.readinessOverride ??
    (request.trigger === 'performance-under-target' ||
    request.intensityRequest === 'easier'
      ? 'low'
      : request.generationInput.readiness);

  return {
    ...request.generationInput,
    profile: {
      ...request.generationInput.profile,
      dislikedExercises,
      shoulderLimitations:
        request.generationInput.profile.shoulderLimitations ||
        painText.includes('shoulder'),
      limitations: Array.from(
        new Set([
          ...request.generationInput.profile.limitations,
          ...request.painFlags,
        ]),
      ),
    },
    settings: {
      ...request.generationInput.settings,
      ...request.settingOverrides,
    },
    location: {
      ...location,
      equipment: location.equipment.filter(
        (equipment) => !unavailable.has(equipment),
      ),
    },
    duration: request.requestedDuration,
    recentExposure:
      request.recoveryOverride ?? request.generationInput.recentExposure,
    readiness,
    painFlags: Array.from(
      new Set([...request.generationInput.painFlags, ...request.painFlags]),
    ),
  };
}

function findSupersetPartner(workout: GeneratedWorkout, exerciseId: string) {
  const block = workout.blocks.find(
    (item) =>
      item.kind === 'superset' &&
      item.moves.some((move) => move.exerciseId === exerciseId),
  );
  if (block?.kind !== 'superset') return null;
  return (
    block.moves.find((move) => move.exerciseId !== exerciseId)?.exerciseId ??
    null
  );
}

function replacementContext(
  input: WorkoutGenerationInput,
  workout: GeneratedWorkout,
  exerciseId: string,
): ConflictContext {
  const priorities = rankMusclePriorities({
    profile: input.profile,
    currentWeeklyVolume: input.currentWeeklyVolume,
    recentExposure: input.recentExposure,
    now: new Date(input.date),
  });
  const context = generationConflictContext({
    profile: input.profile,
    location: input.location,
    priorities,
    timeBudgetSeconds: Math.max(60, workout.targetSeconds),
  });
  const partner = findSupersetPartner(workout, exerciseId);
  return {
    ...context,
    supersetPairs: partner
      ? [{ firstExerciseId: exerciseId, secondExerciseId: partner }]
      : [],
  };
}

function replacementExercise(
  request: RecalibrationRequest,
  input: WorkoutGenerationInput,
  targetExerciseId: string,
) {
  const selectedExerciseIds = prescriptionsForWorkout(
    request.currentWorkout,
  ).map((move) => move.exerciseId);
  const partnerId = findSupersetPartner(
    request.currentWorkout,
    targetExerciseId,
  );
  const context = replacementContext(
    input,
    request.currentWorkout,
    targetExerciseId,
  );
  const result = rankAlternatives({
    currentExerciseId: targetExerciseId,
    selectedExerciseIds,
    context,
    dislikedExerciseIds: input.profile.dislikedExercises,
    supersetPartnerId: partnerId,
  });
  const candidate = request.replacementExerciseId
    ? result.ranked.find(
        (item) => item.exercise.id === request.replacementExerciseId,
      )
    : result.ranked[0];
  if (!candidate) {
    throw new RecalibrationError(
      'NO_SAFE_ALTERNATIVE',
      'No safe alternative fits the current location, equipment, and locks.',
    );
  }
  return candidate.exercise;
}

function updatedPrescription(
  prescription: ExercisePrescription,
  replacement: Exercise,
  reason: string,
): ExercisePrescription {
  return {
    ...prescription,
    exerciseId: replacement.id,
    exerciseName: replacement.name,
    catalogRole: replacement.trainingRole,
    progressionFamily: replacement.progressionFamily,
    repRange: replacement.typicalRepRange,
    warmupSets: replacement.warmup.rampEligible ? prescription.warmupSets : [],
    dropSet:
      replacement.dropSet.support === 'safe' ? prescription.dropSet : null,
    rationale: `${reason} Compatible targets were transferred to this slot.`,
  };
}

function replaceOneExercise(
  workout: GeneratedWorkout,
  fromExerciseId: string,
  replacement: Exercise,
  reason: string,
) {
  let replacementCount = 0;
  const blocks = workout.blocks.map((block): WorkoutBlock => {
    if (block.kind === 'exercise') {
      if (block.prescription.exerciseId !== fromExerciseId) return block;
      replacementCount += 1;
      const prescription = updatedPrescription(
        block.prescription,
        replacement,
        reason,
      );
      return {
        ...block,
        prescription,
        canonicalRow: prescription.exerciseName,
      };
    }
    const moves = block.moves.map((move) => {
      if (move.exerciseId !== fromExerciseId) return move;
      replacementCount += 1;
      return updatedPrescription(move, replacement, reason);
    });
    if (block.kind === 'superset') {
      const pair = moves as [ExercisePrescription, ExercisePrescription];
      return {
        ...block,
        moves: pair,
        canonicalRow: canonicalRow({ ...block, moves: pair }),
      };
    }
    return { ...block, moves, canonicalRow: canonicalRow({ ...block, moves }) };
  });
  if (replacementCount !== 1) {
    throw new RecalibrationError(
      'INVALID_REPLACEMENT_TARGET',
      'The requested exercise slot could not be replaced exactly once.',
    );
  }
  return blocks;
}

function withWorkoutAccounting(
  base: GeneratedWorkout,
  blocks: WorkoutBlock[],
  request: RecalibrationRequest,
  remainingEstimatedSeconds: number,
  exactTimeImpossible: boolean,
) {
  const warmupCount = blocks.reduce(
    (total, block) =>
      total +
      prescriptionsForBlock(block).reduce(
        (sum, move) => sum + move.warmupSets.length,
        0,
      ),
    0,
  );
  const workout: GeneratedWorkout = {
    ...base,
    id: request.currentWorkout.id,
    duration: request.requestedDuration,
    estimatedSeconds: request.elapsedSeconds + remainingEstimatedSeconds,
    estimatedMinutes: Math.ceil(
      (request.elapsedSeconds + remainingEstimatedSeconds) / 60,
    ),
    blocks,
    plannedVolume: calculatePlannedVolume(blocks),
    warmupSummary: `${warmupCount} non-working ramp set${warmupCount === 1 ? '' : 's'}; excluded from PRs, progression, and weekly working volume.`,
    explanation: `${base.explanation} Recalibrated because ${request.reason.toLowerCase()}.`,
    compromises: Array.from(
      new Set([
        ...base.compromises,
        ...(exactTimeImpossible
          ? [
              'Locked remaining work cannot fit the exact requested time; the closest realistic finish is shown.',
            ]
          : []),
      ]),
    ),
    metadata: {
      ...base.metadata,
      deterministicKey: `${base.metadata.deterministicKey}:recal:${request.trigger}:${request.requestId}`,
    },
  };
  return generatedWorkoutSchema.parse(workout);
}

function updateLocalTarget(
  workout: GeneratedWorkout,
  request: RecalibrationRequest,
) {
  const targetExerciseId =
    request.affectedExerciseId ?? request.currentExerciseId;
  if (!targetExerciseId) {
    throw new RecalibrationError(
      'MISSING_TARGET',
      'A target exercise is required for this local recalibration.',
    );
  }
  const targetLoad = request.performanceChanges.find(
    (change) => change.exerciseId === targetExerciseId,
  )?.targetLoad;
  const blocks = workout.blocks.map((block): WorkoutBlock => {
    const update = (move: ExercisePrescription) =>
      move.exerciseId === targetExerciseId
        ? {
            ...move,
            loadGuidance:
              targetLoad === null || targetLoad === undefined
                ? 'Use the newly accepted target while preserving the logged work.'
                : `Use the accepted ${targetLoad} target for future unlogged sets only.`,
          }
        : move;
    if (block.kind === 'exercise') {
      return { ...block, prescription: update(block.prescription) };
    }
    const moves = block.moves.map(update);
    return block.kind === 'superset'
      ? {
          ...block,
          moves: moves as [ExercisePrescription, ExercisePrescription],
        }
      : { ...block, moves };
  });
  return blocks;
}

function executeLocalRecalibration(
  request: RecalibrationRequest,
  input: WorkoutGenerationInput,
  lockedIds: string[],
) {
  const targetExerciseId =
    request.affectedExerciseId ?? request.currentExerciseId;
  if (!targetExerciseId) {
    throw new RecalibrationError(
      'MISSING_TARGET',
      'A target exercise is required for this local recalibration.',
    );
  }
  if (
    request.trigger !== 'target-load-change' &&
    lockedIds.includes(targetExerciseId)
  ) {
    throw new RecalibrationError(
      'LOCKED_EXERCISE',
      'Completed or explicitly locked exercise work cannot be replaced.',
    );
  }
  let blocks: WorkoutBlock[];
  let substitution: Substitution | null = null;
  if (request.trigger === 'target-load-change') {
    blocks = updateLocalTarget(request.currentWorkout, request);
  } else {
    const replacement = replacementExercise(request, input, targetExerciseId);
    blocks = replaceOneExercise(
      request.currentWorkout,
      targetExerciseId,
      replacement,
      request.trigger === 'equipment-busy'
        ? 'Session-only equipment-busy substitution.'
        : 'Accepted one-slot substitution.',
    );
    substitution = {
      fromExerciseId: targetExerciseId,
      toExerciseId: replacement.id,
    };
  }
  const remaining = remainingTimeEstimate(blocks, request.completedWork);
  const workout = withWorkoutAccounting(
    request.currentWorkout,
    blocks,
    request,
    remaining,
    false,
  );
  return { workout, substitution, exactTimeImpossible: false, remaining };
}

function blockSignature(block: WorkoutBlock) {
  return `${block.kind}:${exerciseIdsForBlock(block).slice().sort().join(':')}`;
}

function transferStableIds(
  candidate: WorkoutBlock,
  previous: WorkoutBlock,
): WorkoutBlock {
  if (candidate.kind !== previous.kind) return candidate;
  const previousMoves = prescriptionsForBlock(previous);
  const transfer = (move: ExercisePrescription) => {
    const stable = previousMoves.find(
      (previousMove) => previousMove.exerciseId === move.exerciseId,
    );
    return stable ? { ...move, prescriptionId: stable.prescriptionId } : move;
  };
  if (candidate.kind === 'exercise') {
    return {
      ...candidate,
      blockId: previous.blockId,
      prescription: transfer(candidate.prescription),
    };
  }
  const moves = candidate.moves.map(transfer);
  return candidate.kind === 'superset'
    ? {
        ...candidate,
        blockId: previous.blockId,
        moves: moves as [ExercisePrescription, ExercisePrescription],
      }
    : { ...candidate, blockId: previous.blockId, moves };
}

function mergeLockedWork(
  previous: GeneratedWorkout,
  candidate: GeneratedWorkout,
  lockedIds: string[],
) {
  if (lockedIds.length === 0) return candidate.blocks;
  const locked = new Set(lockedIds);
  const lockedBlocks = previous.blocks.filter((block) =>
    exerciseIdsForBlock(block).some((exerciseId) => locked.has(exerciseId)),
  );
  const lockedExerciseIds = new Set(lockedBlocks.flatMap(exerciseIdsForBlock));
  const previousBySignature = new Map(
    previous.blocks.map((block) => [blockSignature(block), block]),
  );
  const usedBlockIds = new Set(lockedBlocks.map((block) => block.blockId));
  const futureBlocks = candidate.blocks
    .filter(
      (block) =>
        !exerciseIdsForBlock(block).some((exerciseId) =>
          lockedExerciseIds.has(exerciseId),
        ),
    )
    .map((block, index) => {
      const previousMatch = previousBySignature.get(blockSignature(block));
      if (previousMatch && !usedBlockIds.has(previousMatch.blockId)) {
        usedBlockIds.add(previousMatch.blockId);
        return transferStableIds(block, previousMatch);
      }
      let suffix = index + 1;
      let blockId = `recal-block-${suffix}`;
      while (usedBlockIds.has(blockId)) {
        suffix += 1;
        blockId = `recal-block-${suffix}`;
      }
      usedBlockIds.add(blockId);
      const moves = prescriptionsForBlock(block).map((move, moveIndex) => ({
        ...move,
        prescriptionId: `${blockId}-move-${moveIndex + 1}`,
      }));
      if (block.kind === 'exercise') {
        return { ...block, blockId, prescription: moves[0] };
      }
      return block.kind === 'superset'
        ? {
            ...block,
            blockId,
            moves: moves as [ExercisePrescription, ExercisePrescription],
          }
        : { ...block, blockId, moves };
    });
  return [...lockedBlocks, ...futureBlocks];
}

function remainingTimeEstimate(
  blocks: WorkoutBlock[],
  completedWork: CompletedWork,
) {
  const counts = completedSetCounts(completedWork);
  const remainingBlocks = blocks.flatMap((block): WorkoutBlock[] => {
    if (block.kind === 'exercise') {
      const complete = counts.get(block.prescription.prescriptionId) ?? 0;
      const sets = Math.max(0, block.prescription.sets - complete);
      if (sets === 0) return [];
      return [
        {
          ...block,
          prescription: {
            ...block.prescription,
            sets,
            warmupSets: complete > 0 ? [] : block.prescription.warmupSets,
          },
        },
      ];
    }
    const remainingMoves = block.moves.map((move) => {
      const complete = counts.get(move.prescriptionId) ?? 0;
      return {
        ...move,
        sets: Math.max(0, move.sets - complete),
        warmupSets: complete > 0 ? [] : move.warmupSets,
      };
    });
    const rounds = Math.max(...remainingMoves.map((move) => move.sets));
    if (rounds === 0) return [];
    return block.kind === 'superset'
      ? [
          {
            ...block,
            rounds,
            moves: remainingMoves as [
              ExercisePrescription,
              ExercisePrescription,
            ],
          },
        ]
      : [{ ...block, rounds, moves: remainingMoves }];
  });
  return remainingBlocks.length > 0
    ? estimateWorkoutTime(remainingBlocks).totalSeconds
    : 0;
}

function reduceFutureBlock(block: WorkoutBlock): WorkoutBlock | null {
  if (block.kind === 'exercise') {
    if (block.prescription.sets <= 2) return null;
    return {
      ...block,
      prescription: {
        ...block.prescription,
        sets: block.prescription.sets - 1,
      },
    };
  }
  if (block.rounds <= 2) return null;
  const rounds = block.rounds - 1;
  const moves = block.moves.map((move) => ({ ...move, sets: rounds }));
  return block.kind === 'superset'
    ? {
        ...block,
        rounds,
        moves: moves as [ExercisePrescription, ExercisePrescription],
      }
    : { ...block, rounds, moves };
}

function fitRemainingToTime(
  sourceBlocks: WorkoutBlock[],
  completedWork: CompletedWork,
  lockedIds: string[],
  availableSeconds: number,
) {
  const blocks = sourceBlocks.map((block) => ({ ...block })) as WorkoutBlock[];
  const locked = new Set(lockedIds);
  while (
    remainingTimeEstimate(blocks, completedWork) >
    Math.max(0, availableSeconds) + 45
  ) {
    let changed = false;
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      if (
        exerciseIdsForBlock(blocks[index]).some((exerciseId) =>
          locked.has(exerciseId),
        )
      ) {
        continue;
      }
      const reduced = reduceFutureBlock(blocks[index]);
      if (reduced) blocks[index] = reduced;
      else blocks.splice(index, 1);
      changed = true;
      break;
    }
    if (!changed) break;
  }
  const remaining = remainingTimeEstimate(blocks, completedWork);
  return {
    blocks,
    remaining,
    exactTimeImpossible: remaining > Math.max(0, availableSeconds) + 45,
  };
}

function prepareGeneratedCandidate(
  request: RecalibrationRequest,
  input: WorkoutGenerationInput,
  dependencies: RecalibrationDependencies,
) {
  const candidate = dependencies.generate(input);
  if (
    request.trigger === 'performance-over-target' ||
    request.intensityRequest === 'harder'
  ) {
    const changedIds = new Set(
      request.performanceChanges.map((change) => change.exerciseId),
    );
    candidate.blocks = candidate.blocks.map((block): WorkoutBlock => {
      const update = (move: ExercisePrescription) =>
        changedIds.has(move.exerciseId)
          ? {
              ...move,
              loadGuidance:
                'Performance exceeded the target; use a modest progression only on future unlogged sets.',
              targetRir: Math.max(1, move.targetRir),
            }
          : move;
      if (block.kind === 'exercise') {
        return { ...block, prescription: update(block.prescription) };
      }
      const moves = block.moves.map(update);
      return block.kind === 'superset'
        ? {
            ...block,
            moves: moves as [ExercisePrescription, ExercisePrescription],
          }
        : { ...block, moves };
    });
  }
  return generatedWorkoutSchema.parse(candidate);
}

function executeGeneratedRecalibration(
  request: RecalibrationRequest,
  input: WorkoutGenerationInput,
  lockedIds: string[],
  dependencies: RecalibrationDependencies,
) {
  const candidate = prepareGeneratedCandidate(request, input, dependencies);
  const merged = mergeLockedWork(request.currentWorkout, candidate, lockedIds);
  const available = Math.max(
    0,
    candidate.targetSeconds - request.elapsedSeconds,
  );
  const fitted = fitRemainingToTime(
    merged,
    request.completedWork,
    lockedIds,
    available,
  );
  return {
    workout: withWorkoutAccounting(
      candidate,
      fitted.blocks,
      request,
      fitted.remaining,
      fitted.exactTimeImpossible,
    ),
    substitution: null,
    exactTimeImpossible: fitted.exactTimeImpossible,
    remaining: fitted.remaining,
  };
}

function countSupersets(workout: GeneratedWorkout) {
  return workout.blocks.filter((block) => block.kind === 'superset').length;
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function buildChangeSummary(args: {
  previous: GeneratedWorkout;
  next: GeneratedWorkout;
  request: RecalibrationRequest;
  lockedIds: string[];
  substitution: Substitution | null;
}): RecalibrationChangeSummary {
  const previousMoves = prescriptionsForWorkout(args.previous);
  const nextMoves = prescriptionsForWorkout(args.next);
  const previousById = new Map(
    previousMoves.map((move) => [move.exerciseId, move]),
  );
  const nextById = new Map(nextMoves.map((move) => [move.exerciseId, move]));
  const substitutedFrom = args.substitution?.fromExerciseId;
  const substitutedTo = args.substitution?.toExerciseId;
  const removed = previousMoves.filter(
    (move) =>
      !nextById.has(move.exerciseId) && move.exerciseId !== substitutedFrom,
  );
  const added = nextMoves.filter(
    (move) =>
      !previousById.has(move.exerciseId) && move.exerciseId !== substitutedTo,
  );
  const setChanges = nextMoves.filter((move) => {
    const previous = previousById.get(move.exerciseId);
    return previous && previous.sets !== move.sets;
  });
  const previousSupersets = countSupersets(args.previous);
  const nextSupersets = countSupersets(args.next);
  const changes: RecalibrationChange[] = [];
  if (args.substitution) {
    changes.push({
      code: `substituted:${substitutedFrom}:${substitutedTo}`,
      kind: 'substituted',
      exerciseIds: [substitutedFrom!, substitutedTo!],
      message: `${exerciseById.get(substitutedFrom!)?.name ?? substitutedFrom} was replaced by ${exerciseById.get(substitutedTo!)?.name ?? substitutedTo}.`,
    });
  }
  removed.forEach((move) =>
    changes.push({
      code: `removed:${move.exerciseId}`,
      kind: 'removed',
      exerciseIds: [move.exerciseId],
      message: `${move.exerciseName} was removed from future work.`,
    }),
  );
  added.forEach((move) =>
    changes.push({
      code: `added:${move.exerciseId}`,
      kind: 'added',
      exerciseIds: [move.exerciseId],
      message: `${move.exerciseName} was added to the remaining plan.`,
    }),
  );
  setChanges.forEach((move) =>
    changes.push({
      code: `sets:${move.exerciseId}`,
      kind: 'sets',
      exerciseIds: [move.exerciseId],
      message: `${move.exerciseName} changed from ${previousById.get(move.exerciseId)?.sets} to ${move.sets} planned sets.`,
    }),
  );
  if (args.lockedIds.length > 0) {
    changes.push({
      code: 'protected:locked-work',
      kind: 'protected',
      exerciseIds: args.lockedIds,
      message: `${plural(args.lockedIds.length, 'locked exercise')} and ${plural(args.request.completedWork.sets.length, 'completed set')} were protected.`,
    });
  }
  const supersetsAdded = Math.max(0, nextSupersets - previousSupersets);
  const supersetsRemoved = Math.max(0, previousSupersets - nextSupersets);
  if (supersetsAdded || supersetsRemoved) {
    changes.push({
      code: 'technique:superset',
      kind: 'technique',
      exerciseIds: [],
      message: supersetsAdded
        ? `${plural(supersetsAdded, 'superset')} added.`
        : `${plural(supersetsRemoved, 'superset')} removed.`,
    });
  }

  const durationLabel =
    args.request.requestedDuration === 'default'
      ? 'default time'
      : `${args.request.requestedDuration} min`;
  const parts = [
    removed.length ? `${plural(removed.length, 'exercise')} removed` : null,
    added.length ? `${plural(added.length, 'exercise')} added` : null,
    args.substitution ? '1 exercise substituted' : null,
    supersetsAdded ? `${plural(supersetsAdded, 'superset')} added` : null,
    supersetsRemoved ? `${plural(supersetsRemoved, 'superset')} removed` : null,
  ].filter((part): part is string => Boolean(part));
  return {
    compact:
      parts.length > 0
        ? `Recalibrated to ${durationLabel}: ${parts.join(', ')}.`
        : `Rechecked ${durationLabel}: priorities and locked work remain stable.`,
    addedExercises: added.length,
    removedExercises: removed.length,
    substitutedExercises: args.substitution ? 1 : 0,
    setChanges: setChanges.length,
    supersetsAdded,
    supersetsRemoved,
    protectedRecords:
      args.request.completedWork.sets.length + args.lockedIds.length,
    changes,
  };
}

function executeRecalibration(
  request: RecalibrationRequest,
  dependencies: RecalibrationDependencies,
  snapshot: RecalibrationSnapshot,
  startedAt: number,
): SuccessfulRecalibration {
  const completedWork = CompletedWorkSchema.parse(request.completedWork);
  const normalizedRequest = { ...request, completedWork };
  const scope = recalibrationScopeFor(request.trigger, completedWork);
  const lockedIds = allLockedExerciseIds(normalizedRequest);
  const input = applyInputChanges(normalizedRequest);
  const outcome =
    scope === 'local'
      ? executeLocalRecalibration(normalizedRequest, input, lockedIds)
      : executeGeneratedRecalibration(
          normalizedRequest,
          input,
          lockedIds,
          dependencies,
        );
  const summary = buildChangeSummary({
    previous: request.currentWorkout,
    next: outcome.workout,
    request: normalizedRequest,
    lockedIds,
    substitution: outcome.substitution,
  });
  if (outcome.exactTimeImpossible) {
    summary.changes.push({
      code: 'timing:exact-impossible',
      kind: 'timing',
      exerciseIds: lockedIds,
      message:
        'Locked work cannot fit the exact requested time; the closest realistic finish is shown.',
    });
    summary.compact += ' Locked work may run a few minutes over.';
  }
  return {
    status: 'success',
    requestId: request.requestId,
    trigger: request.trigger,
    scope,
    workout: outcome.workout,
    previousWorkout: snapshot.workout,
    snapshot,
    completedWork,
    lockedExerciseIds: lockedIds,
    remainingEstimatedSeconds: outcome.remaining,
    availableRemainingSeconds: Math.max(
      0,
      outcome.workout.targetSeconds - request.elapsedSeconds,
    ),
    exactTimeImpossible: outcome.exactTimeImpossible,
    evaluationMessages: evaluationMessagesFor(
      request.trigger,
      request.requestedDuration,
    ),
    summary,
    elapsedMilliseconds: nowMilliseconds() - startedAt,
    sessionOnly: {
      equipmentBusyIds: request.sessionBusyEquipmentIds,
      persisted: false,
    },
  };
}

export function recalibrateWorkout(
  request: RecalibrationRequest,
  dependencies: RecalibrationDependencies = defaultDependencies,
): RecalibrationResult {
  const startedAt = nowMilliseconds();
  const snapshot = createSnapshot(request);
  const scope: RecalibrationScope = recalibrationScopeFor(
    request.trigger,
    request.completedWork,
  );
  try {
    return executeRecalibration(request, dependencies, snapshot, startedAt);
  } catch (error) {
    const knownError = error instanceof RecalibrationError ? error : null;
    return {
      status: 'rolled-back',
      requestId: request.requestId,
      trigger: request.trigger,
      scope,
      workout: cloneWorkout(snapshot.workout),
      previousWorkout: cloneWorkout(snapshot.workout),
      snapshot,
      completedWork: CompletedWorkSchema.parse(request.completedWork),
      errorCode: knownError?.code ?? 'RECALIBRATION_FAILED',
      errorMessage:
        knownError?.message ??
        'Recalibration failed. The previous valid workout was restored.',
      elapsedMilliseconds: nowMilliseconds() - startedAt,
    };
  }
}

export function validateRecalibratedWorkout(
  workout: GeneratedWorkout,
  request: RecalibrationRequest,
) {
  const input = applyInputChanges(request);
  const context = replacementContext(
    input,
    workout,
    prescriptionsForWorkout(workout)[0]?.exerciseId ?? '',
  );
  return validateExerciseSelection(
    prescriptionsForWorkout(workout).map((move) => move.exerciseId),
    { ...context, supersetPairs: [] },
  );
}
