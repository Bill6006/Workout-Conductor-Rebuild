import { describe, expect, it } from 'vitest';
import { exerciseById } from '../../catalog/exercises';
import type { EquipmentId } from '../../catalog/schema';
import { createDemoBundle } from '../../domain/defaults';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../workoutGenerator/generateWorkout';
import type {
  ExercisePrescription,
  GeneratedWorkout,
  WorkoutDuration,
} from '../workoutGenerator/schema';
import { recalibrateWorkout } from './recalibrateWorkout';
import {
  emptyCompletedWork,
  recalibrationTriggerValues,
  type CompletedSetRecord,
  type RecalibrationRequest,
} from './schema';
import {
  recalibrationScopeFor,
  recalibrationTriggerRegistry,
} from './triggerRegistry';

const recalibrationTime = '2026-08-10T17:00:00.000Z';

function inputFor(duration: WorkoutDuration = 'default') {
  return generationInputFromBundle(createDemoBundle(), duration, {
    date: recalibrationTime,
  });
}

function generated(duration: WorkoutDuration = 'default') {
  return generateWorkout(inputFor(duration));
}

function moves(workout: GeneratedWorkout): ExercisePrescription[] {
  return workout.blocks.flatMap((block) =>
    block.kind === 'exercise' ? [block.prescription] : block.moves,
  );
}

function completedSet(
  workout: GeneratedWorkout,
  move: ExercisePrescription = moves(workout)[0],
  setIndex = 0,
): CompletedSetRecord {
  const block = workout.blocks.find((item) =>
    item.kind === 'exercise'
      ? item.prescription.prescriptionId === move.prescriptionId
      : item.moves.some(
          (candidate) => candidate.prescriptionId === move.prescriptionId,
        ),
  )!;
  return {
    recordId: `record-${move.prescriptionId}-${setIndex}`,
    blockId: block.blockId,
    prescriptionId: move.prescriptionId,
    exerciseId: move.exerciseId,
    setIndex,
    load: 40,
    reps: 8,
    rir: 2,
    completedAt: recalibrationTime,
    locked: true,
  };
}

function requestFor(
  currentWorkout: GeneratedWorkout,
  overrides: Partial<RecalibrationRequest> = {},
): RecalibrationRequest {
  const duration = overrides.requestedDuration ?? currentWorkout.duration;
  return {
    requestId: `request-${overrides.trigger ?? 'duration-change'}-${duration}`,
    trigger: 'duration-change',
    currentWorkout,
    generationInput: inputFor(currentWorkout.duration),
    completedWork: emptyCompletedWork,
    lockedExerciseIds: [],
    pinnedExerciseIds: [],
    userSelectedExerciseIds: [],
    acceptedAlternativeIds: [],
    currentExerciseId: null,
    affectedExerciseId: null,
    replacementExerciseId: null,
    requestedDuration: duration,
    elapsedSeconds: 0,
    locationOverride: null,
    unavailableEquipmentIds: [],
    sessionBusyEquipmentIds: [],
    settingOverrides: {},
    painFlags: [],
    recoveryOverride: null,
    readinessOverride: null,
    performanceChanges: [],
    intensityRequest: null,
    endByExactTime: false,
    reason: 'The workout conditions changed',
    timestamp: recalibrationTime,
    ...overrides,
  };
}

function successful(result: ReturnType<typeof recalibrateWorkout>) {
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error(result.errorMessage);
  return result;
}

describe('Phase 4 central recalibration engine', () => {
  it('registers every supported trigger with a scope and loading messages', () => {
    expect(Object.keys(recalibrationTriggerRegistry)).toEqual([
      ...recalibrationTriggerValues,
    ]);
    recalibrationTriggerValues.forEach((trigger) => {
      expect(
        recalibrationTriggerRegistry[trigger].evaluationMessages.length,
      ).toBeGreaterThan(1);
    });
    expect(recalibrationScopeFor('equipment-busy', emptyCompletedWork)).toBe(
      'local',
    );
  });

  it('recalibrates Default → 15 → 30 → 45 → Default with one duration model', () => {
    let current = generated('default');
    for (const duration of ['15', '30', '45', 'default'] as const) {
      const result = successful(
        recalibrateWorkout(
          requestFor(current, {
            requestedDuration: duration,
            reason: `Duration changed to ${duration}`,
          }),
        ),
      );
      expect(result.scope).toBe('full');
      expect(result.workout.duration).toBe(duration);
      expect(result.workout.targetSeconds).toBe(
        (duration === 'default' ? 60 : Number(duration)) * 60,
      );
      expect(result.evaluationMessages[0]).toMatch(
        duration === 'default' ? /complete intended/ : /Fitting the session/,
      );
      current = result.workout;
    }
  });

  it('switches to partial recalibration after the first completed set', () => {
    const current = generated('default');
    const anchor = moves(current)[0];
    const record = completedSet(current, anchor);
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          requestedDuration: '15',
          elapsedSeconds: 6 * 60,
          currentExerciseId: anchor.exerciseId,
          completedWork: {
            ...emptyCompletedWork,
            sets: [record],
          },
        }),
      ),
    );
    expect(result.scope).toBe('partial');
    expect(result.completedWork.sets).toEqual([record]);
    expect(result.lockedExerciseIds).toContain(anchor.exerciseId);
    expect(
      moves(result.workout).find(
        (move) => move.exerciseId === anchor.exerciseId,
      )?.prescriptionId,
    ).toBe(anchor.prescriptionId);
  });

  it('never deletes completed halfway-through work or its logged truth', () => {
    const current = generated('default');
    const firstTwo = moves(current).slice(0, 2);
    const records = firstTwo.flatMap((move) =>
      Array.from({ length: move.sets }, (_, index) =>
        completedSet(current, move, index),
      ),
    );
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          requestedDuration: '15',
          elapsedSeconds: 12 * 60,
          completedWork: {
            ...emptyCompletedWork,
            sets: records,
            completedExerciseIds: firstTwo.map((move) => move.exerciseId),
            earnedPersonalRecordIds: ['synthetic-pr'],
            notesByExerciseId: {
              [firstTwo[0].exerciseId]: 'Synthetic test note',
            },
          },
        }),
      ),
    );
    firstTwo.forEach((move) => {
      expect(moves(result.workout).map((item) => item.exerciseId)).toContain(
        move.exerciseId,
      );
    });
    expect(result.completedWork.sets).toEqual(records);
    expect(result.completedWork.earnedPersonalRecordIds).toEqual([
      'synthetic-pr',
    ]);
    expect(result.completedWork.notesByExerciseId).toEqual({
      [firstTwo[0].exerciseId]: 'Synthetic test note',
    });
  });

  it('fully recalibrates for a new location and its equipment', () => {
    const current = generated();
    const gymEquipment: EquipmentId[] = [
      'bodyweight',
      'barbell',
      'weight-plates',
      'squat-rack',
      'adjustable-bench',
      'cable-station',
      'lat-pulldown',
      'seated-row',
      'chest-press-machine',
      'leg-press',
      'leg-curl',
      'exercise-mat',
    ];
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'location-change',
          locationOverride: {
            locationId: 'synthetic-gym',
            name: 'Synthetic Gym',
            kind: 'gym',
            equipment: gymEquipment,
          },
          reason: 'Location changed to Synthetic Gym',
        }),
      ),
    );
    expect(result.scope).toBe('full');
    moves(result.workout).forEach((move) => {
      const exercise = exerciseById.get(move.exerciseId)!;
      expect(exercise.locations).toContain('gym');
      expect(
        exercise.equipment.required.every(
          (equipment) =>
            equipment === 'bodyweight' || gymEquipment.includes(equipment),
        ),
      ).toBe(true);
    });
  });

  it.each(['equipment-unavailable', 'station-unavailable'] as const)(
    'removes unavailable equipment during %s',
    (trigger) => {
      const current = generated();
      const result = successful(
        recalibrateWorkout(
          requestFor(current, {
            trigger,
            unavailableEquipmentIds: ['pull-up-bar'],
            reason: 'The pull-up bar is unavailable',
          }),
        ),
      );
      expect(result.scope).toBe('partial');
      moves(result.workout).forEach((move) => {
        expect(
          exerciseById.get(move.exerciseId)?.equipment.required,
        ).not.toContain('pull-up-bar');
      });
    },
  );

  it('handles Equipment Busy as one session-only local substitution', () => {
    const current = generated();
    const target = moves(current).find((move) =>
      exerciseById
        .get(move.exerciseId)
        ?.equipment.required.includes('pull-up-bar'),
    )!;
    const beforeIds = moves(current).map((move) => move.exerciseId);
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'equipment-busy',
          affectedExerciseId: target.exerciseId,
          sessionBusyEquipmentIds: ['pull-up-bar'],
          reason: 'The pull-up bar is busy',
        }),
      ),
    );
    const afterIds = moves(result.workout).map((move) => move.exerciseId);
    expect(result.scope).toBe('local');
    expect(result.summary.substitutedExercises).toBe(1);
    expect(
      beforeIds.filter((exerciseId) => !afterIds.includes(exerciseId)),
    ).toEqual([target.exerciseId]);
    expect(result.sessionOnly).toEqual({
      equipmentBusyIds: ['pull-up-bar'],
      persisted: false,
    });
  });

  it('applies an accepted alternative to one slot without a full rebuild', () => {
    const current = generated();
    const target = moves(current)[0];
    const before = moves(current);
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'exercise-replaced',
          affectedExerciseId: target.exerciseId,
          replacementExerciseId: 'one-arm-dumbbell-row',
          reason: 'The athlete accepted a safe alternative',
        }),
      ),
    );
    expect(result.scope).toBe('local');
    expect(result.workout.blocks).toHaveLength(current.blocks.length);
    expect(result.summary.substitutedExercises).toBe(1);
    before.slice(1).forEach((move) => {
      expect(
        moves(result.workout).find(
          (candidate) => candidate.exerciseId === move.exerciseId,
        )?.prescriptionId,
      ).toBe(move.prescriptionId);
    });
  });

  it('recalculates future priorities after an exercise is skipped', () => {
    const current = generated();
    const skipped = moves(current)[1];
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'exercise-skipped',
          affectedExerciseId: skipped.exerciseId,
          reason: `${skipped.exerciseName} was skipped`,
        }),
      ),
    );
    expect(result.scope).toBe('partial');
    expect(moves(result.workout).map((move) => move.exerciseId)).not.toContain(
      skipped.exerciseId,
    );
  });

  it.each(['pain-reported', 'discomfort-reported'] as const)(
    'applies shoulder guardrails during %s',
    (trigger) => {
      const current = generated();
      const result = successful(
        recalibrateWorkout(
          requestFor(current, {
            trigger,
            painFlags: ['shoulder pain'],
            reason: 'Shoulder pain was reported',
          }),
        ),
      );
      moves(result.workout).forEach((move) => {
        expect(exerciseById.get(move.exerciseId)?.considerations.shoulder).toBe(
          'neutral',
        );
      });
    },
  );

  it('disables and re-enables supersets through the central engine', () => {
    const current = generated();
    const disabled = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'supersets-change',
          settingOverrides: { allowSupersets: false },
          reason: 'Supersets were disabled',
        }),
      ),
    );
    expect(
      disabled.workout.blocks.some((block) => block.kind === 'superset'),
    ).toBe(false);

    const reenableRequest = requestFor(disabled.workout, {
      trigger: 'supersets-change',
      settingOverrides: { allowSupersets: true },
      reason: 'Supersets were enabled',
    });
    reenableRequest.generationInput.settings = {
      ...reenableRequest.generationInput.settings,
      allowSupersets: false,
    };
    const enabled = successful(recalibrateWorkout(reenableRequest));
    expect(
      enabled.workout.blocks.some((block) => block.kind === 'superset'),
    ).toBe(true);
  });

  it('enables only a catalog-safe optional drop set', () => {
    const current = generated();
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'drop-sets-change',
          settingOverrides: { allowDropSets: true },
          reason: 'Drop sets were enabled',
        }),
      ),
    );
    const dropMoves = moves(result.workout).filter((move) => move.dropSet);
    expect(dropMoves.length).toBeLessThanOrEqual(1);
    dropMoves.forEach((move) => {
      expect(exerciseById.get(move.exerciseId)?.dropSet.support).toBe('safe');
    });
  });

  it('can disable drop sets again without leaving stale prescriptions', () => {
    const current = generated();
    const enabled = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'drop-sets-change',
          settingOverrides: { allowDropSets: true },
        }),
      ),
    );
    const disableRequest = requestFor(enabled.workout, {
      trigger: 'drop-sets-change',
      settingOverrides: { allowDropSets: false },
    });
    disableRequest.generationInput.settings = {
      ...disableRequest.generationInput.settings,
      allowDropSets: true,
    };
    const disabled = successful(recalibrateWorkout(disableRequest));
    expect(moves(disabled.workout).every((move) => move.dropSet === null)).toBe(
      true,
    );
  });

  it('updates only future target guidance while preserving logged sets', () => {
    const current = generated();
    const target = moves(current)[0];
    const record = completedSet(current, target);
    const beforeIds = moves(current).map((move) => move.prescriptionId);
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'target-load-change',
          affectedExerciseId: target.exerciseId,
          currentExerciseId: target.exerciseId,
          completedWork: { ...emptyCompletedWork, sets: [record] },
          performanceChanges: [
            {
              exerciseId: target.exerciseId,
              expectedRepMax: 8,
              actualReps: 8,
              targetLoad: 47.5,
            },
          ],
          reason: 'The athlete accepted a new target load',
        }),
      ),
    );
    expect(result.completedWork.sets).toEqual([record]);
    expect(moves(result.workout).map((move) => move.prescriptionId)).toEqual(
      beforeIds,
    );
    expect(
      moves(result.workout).find(
        (move) => move.exerciseId === target.exerciseId,
      )?.loadGuidance,
    ).toMatch(/47\.5.*future unlogged sets/i);
  });

  it('rolls back a substitution that targets pinned work', () => {
    const current = generated();
    const target = moves(current)[0];
    const result = recalibrateWorkout(
      requestFor(current, {
        trigger: 'exercise-replaced',
        affectedExerciseId: target.exerciseId,
        replacementExerciseId: 'one-arm-dumbbell-row',
        pinnedExerciseIds: [target.exerciseId],
      }),
    );
    expect(result.status).toBe('rolled-back');
    expect(result.workout).toEqual(current);
    if (result.status === 'rolled-back') {
      expect(result.errorMessage).toMatch(/locked exercise/i);
    }
  });

  it.each([
    ['performance-over-target', 14],
    ['performance-under-target', 3],
  ] as const)(
    'protects actual completed truth during %s recalibration',
    (trigger, actualReps) => {
      const current = generated();
      const target = moves(current)[0];
      const record = { ...completedSet(current, target), reps: actualReps };
      const result = successful(
        recalibrateWorkout(
          requestFor(current, {
            trigger,
            currentExerciseId: target.exerciseId,
            completedWork: { ...emptyCompletedWork, sets: [record] },
            performanceChanges: [
              {
                exerciseId: target.exerciseId,
                expectedRepMax: 8,
                actualReps,
                targetLoad: 45,
              },
            ],
            reason: 'Actual performance changed the remaining plan',
          }),
        ),
      );
      expect(result.scope).toBe('partial');
      expect(result.completedWork.sets[0]).toEqual(record);
      expect(result.lockedExerciseIds).toContain(target.exerciseId);
    },
  );

  it('rechecks only the remaining plan after a long interruption', () => {
    const current = generated();
    const target = moves(current)[0];
    const record = completedSet(current, target);
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'resume-after-interruption',
          currentExerciseId: target.exerciseId,
          elapsedSeconds: 20 * 60,
          completedWork: { ...emptyCompletedWork, sets: [record] },
          reason: 'The workout resumed after a long interruption',
        }),
      ),
    );
    expect(result.scope).toBe('partial');
    expect(result.completedWork.sets).toEqual([record]);
    expect(result.evaluationMessages.join(' ')).toMatch(/interruption/i);
  });

  it('shows the closest realistic plan when locked work cannot fit', () => {
    const current = generated();
    const allMoves = moves(current);
    const result = successful(
      recalibrateWorkout(
        requestFor(current, {
          requestedDuration: '15',
          elapsedSeconds: 14 * 60,
          lockedExerciseIds: allMoves.map((move) => move.exerciseId),
          endByExactTime: true,
          reason: 'The athlete requested an exact 15-minute finish',
        }),
      ),
    );
    expect(result.exactTimeImpossible).toBe(true);
    allMoves.forEach((move) => {
      expect(moves(result.workout).map((item) => item.exerciseId)).toContain(
        move.exerciseId,
      );
    });
    expect(result.summary.compact).toMatch(/may run a few minutes over/i);
  });

  it('rolls back atomically when recalibration fails', () => {
    const current = generated();
    const original = structuredClone(current);
    const result = recalibrateWorkout(requestFor(current), {
      generate: () => {
        throw new Error('Synthetic generator failure');
      },
    });
    expect(result.status).toBe('rolled-back');
    expect(result.workout).toEqual(original);
    expect(result.snapshot.workout).toEqual(original);
    expect(current).toEqual(original);
    if (result.status === 'rolled-back') {
      expect(result.errorMessage).toMatch(/previous valid workout/i);
    }
  });

  it('meets local and full recalibration performance targets', () => {
    const current = generated();
    const local = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'exercise-replaced',
          affectedExerciseId: moves(current)[0].exerciseId,
          replacementExerciseId: 'one-arm-dumbbell-row',
        }),
      ),
    );
    const full = successful(
      recalibrateWorkout(
        requestFor(current, {
          trigger: 'duration-change',
          requestedDuration: '30',
        }),
      ),
    );
    expect(local.elapsedMilliseconds).toBeLessThan(250);
    expect(full.elapsedMilliseconds).toBeLessThan(700);
  });
});
