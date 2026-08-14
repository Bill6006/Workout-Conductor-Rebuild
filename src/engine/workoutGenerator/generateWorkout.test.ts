import { describe, expect, it } from 'vitest';
import { exerciseById } from '../../catalog/exercises';
import { createDemoBundle } from '../../domain/defaults';
import { validateExerciseSelection } from '../conflicts/validateConflicts';
import type { ConflictContext } from '../conflicts/types';
import { resolveTrainingLocation } from './equipmentAdapter';
import {
  generateWorkout,
  generationInputFromBundle,
  workoutDurationOptions,
} from './generateWorkout';
import type { ExercisePrescription, WorkoutBlock } from './schema';
import { estimateWorkoutTime } from './timeEstimator';
import { calculatePlannedVolume, rankMusclePriorities } from './weeklyVolume';

const generatedAt = '2026-08-10T14:00:00.000Z';

function demoInput(duration: '15' | '30' | '45' | '60' | 'default') {
  return generationInputFromBundle(createDemoBundle(), duration, {
    date: generatedAt,
  });
}

function prescriptions(blocks: WorkoutBlock[]): ExercisePrescription[] {
  return blocks.flatMap((block) =>
    block.kind === 'exercise' ? [block.prescription] : block.moves,
  );
}

describe('Phase 3 deterministic workout generation', () => {
  it('offers exactly one 15/30/45/60/Default duration model', () => {
    expect(workoutDurationOptions.map((option) => option.value)).toEqual([
      '15',
      '30',
      '45',
      '60',
      'default',
    ]);
  });

  it('returns the same plan for the same local inputs', () => {
    const input = demoInput('30');
    expect(generateWorkout(input)).toEqual(generateWorkout(input));
  });

  it('enforces explicit straight, superset, and drop-set structures through engine constraints', () => {
    const straight = generateWorkout({ ...demoInput('45'), mode: 'straight' });
    expect(straight.mode).toBe('straight');
    expect(straight.blocks.every((block) => block.kind === 'exercise')).toBe(
      true,
    );
    expect(
      prescriptions(straight.blocks).every((move) => move.dropSet === null),
    ).toBe(true);

    const superset = generateWorkout({ ...demoInput('45'), mode: 'superset' });
    expect(superset.mode).toBe('superset');
    expect(superset.blocks.some((block) => block.kind === 'superset')).toBe(
      true,
    );
    expect(
      prescriptions(superset.blocks).every((move) => move.dropSet === null),
    ).toBe(true);

    const drop = generateWorkout({ ...demoInput('60'), mode: 'drop-set' });
    expect(drop.mode).toBe('drop-set');
    expect(drop.blocks.every((block) => block.kind === 'exercise')).toBe(true);
    expect(prescriptions(drop.blocks).some((move) => move.dropSet)).toBe(true);
  });

  it.each(['15', '30', '45', '60', 'default'] as const)(
    'generates a %s plan inside its time ceiling',
    (duration) => {
      const workout = generateWorkout(demoInput(duration));
      expect(workout.blocks.length).toBeGreaterThanOrEqual(2);
      expect(workout.estimatedSeconds).toBeLessThanOrEqual(
        workout.targetSeconds + 45,
      );
      expect(workout.estimatedSeconds).toBe(
        estimateWorkoutTime(workout.blocks).totalSeconds,
      );
    },
  );

  it('preserves the progression anchor while expanding longer plans', () => {
    const workouts = (['15', '30', '45', '60', 'default'] as const).map(
      (duration) => generateWorkout(demoInput(duration)),
    );
    expect(
      workouts.map((workout) => prescriptions(workout.blocks)[0].exerciseId),
    ).toEqual(Array(5).fill(prescriptions(workouts[0].blocks)[0].exerciseId));
    expect(workouts[0].blocks.length).toBeLessThan(workouts[4].blocks.length);
    expect(
      prescriptions(workouts[4].blocks).reduce(
        (total, prescription) => total + prescription.sets,
        0,
      ),
    ).toBeGreaterThan(
      prescriptions(workouts[0].blocks).reduce(
        (total, prescription) => total + prescription.sets,
        0,
      ),
    );
  });

  it('materially reduces demand when readiness is low', () => {
    const readyInput = demoInput('default');
    const lowInput = { ...demoInput('default'), readiness: 'low' as const };
    const ready = generateWorkout(readyInput);
    const low = generateWorkout(lowInput);
    const readyMoves = prescriptions(ready.blocks);
    const lowMoves = prescriptions(low.blocks);
    const readySets = ready.blocks.reduce(
      (total, block) =>
        total +
        (block.kind === 'exercise'
          ? block.prescription.sets
          : block.rounds * block.moves.length),
      0,
    );
    const lowSets = low.blocks.reduce(
      (total, block) =>
        total +
        (block.kind === 'exercise'
          ? block.prescription.sets
          : block.rounds * block.moves.length),
      0,
    );

    expect(low.blocks.length).toBeLessThan(ready.blocks.length);
    expect(lowSets).toBeLessThan(readySets);
    expect(Math.min(...lowMoves.map((move) => move.targetRir))).toBeGreaterThan(
      Math.min(...readyMoves.map((move) => move.targetRir)),
    );
    expect(lowMoves.every((move) => move.dropSet === null)).toBe(true);
    expect(low.compromises.join(' ')).toContain('reduced set demand');
  });

  it('treats a short profile default as the same hard time ceiling', () => {
    const input = demoInput('default');
    input.profile = { ...input.profile, typicalDuration: 15 };
    const workout = generateWorkout(input);
    expect(workout.targetSeconds).toBe(15 * 60);
    expect(workout.estimatedSeconds).toBeLessThanOrEqual(
      workout.targetSeconds + 45,
    );
  });

  it('keeps every warm-up outside progression, PR, and working-volume counts', () => {
    const workout = generateWorkout(demoInput('default'));
    const warmups = prescriptions(workout.blocks).flatMap(
      (prescription) => prescription.warmupSets,
    );
    expect(warmups.length).toBeGreaterThan(0);
    warmups.forEach((warmup) => {
      expect(warmup.countsTowardProgression).toBe(false);
      expect(warmup.countsTowardPr).toBe(false);
      expect(warmup.countsTowardWorkingVolume).toBe(false);
    });
  });

  it('computes direct and indirect planned weekly volume from working sets', () => {
    const workout = generateWorkout(demoInput('30'));
    const volume = calculatePlannedVolume(workout.blocks);
    const anchor = prescriptions(workout.blocks)[0];
    const anchorExercise = exerciseById.get(anchor.exerciseId)!;
    expect(volume[anchorExercise.primaryMuscles[0]]).toBeGreaterThanOrEqual(
      anchor.sets,
    );
    expect(volume[anchorExercise.secondaryMuscles[0]]).toBeGreaterThan(0);
  });

  it('down-ranks a recently trained muscle even when its weekly deficit is large', () => {
    const profile = createDemoBundle().profile!;
    const baseline = rankMusclePriorities({
      profile,
      currentWeeklyVolume: {},
      recentExposure: [],
      now: new Date(generatedAt),
    });
    const exposedMuscle = baseline[0].muscle;
    const adjusted = rankMusclePriorities({
      profile,
      currentWeeklyVolume: {},
      recentExposure: [
        { muscle: exposedMuscle, trainedAt: generatedAt, hardSets: 8 },
      ],
      now: new Date(generatedAt),
    });
    expect(
      adjusted.findIndex((item) => item.muscle === exposedMuscle),
    ).toBeGreaterThan(0);
    expect(
      adjusted.find((item) => item.muscle === exposedMuscle)?.recoveryRemaining,
    ).toBe(100);
  });

  it('moves completed weekly volume behind muscles with larger deficits', () => {
    const profile = createDemoBundle().profile!;
    const baseline = rankMusclePriorities({
      profile,
      currentWeeklyVolume: {},
      recentExposure: [],
      now: new Date(generatedAt),
    });
    const completedMuscle = baseline[0].muscle;
    const adjusted = rankMusclePriorities({
      profile,
      currentWeeklyVolume: {
        [completedMuscle]: baseline[0].targetSets,
      },
      recentExposure: [],
      now: new Date(generatedAt),
    });
    expect(adjusted[0].muscle).not.toBe(completedMuscle);
    expect(
      adjusted.find((item) => item.muscle === completedMuscle)?.deficitSets,
    ).toBe(0);
  });

  it('combines a progression anchor with hypertrophy and specialization roles', () => {
    const roles = prescriptions(
      generateWorkout(demoInput('default')).blocks,
    ).map((move) => move.progressionRole);
    expect(roles).toContain('strength-anchor');
    expect(roles).toContain('hypertrophy-builder');
    expect(roles).toContain('specialization');
  });

  it('uses only equipment available at the selected location', () => {
    const bundle = createDemoBundle();
    const location = resolveTrainingLocation(bundle);
    const workout = generateWorkout(demoInput('default'));
    prescriptions(workout.blocks).forEach((prescription) => {
      const exercise = exerciseById.get(prescription.exerciseId)!;
      exercise.equipment.required.forEach((equipment) => {
        expect(
          equipment === 'bodyweight' || location.equipment.includes(equipment),
        ).toBe(true);
      });
    });
  });

  it('applies shoulder guardrails before exercise scoring', () => {
    const input = demoInput('45');
    input.profile = { ...input.profile, shoulderLimitations: true };
    const workout = generateWorkout(input);
    prescriptions(workout.blocks).forEach((prescription) => {
      expect(
        exerciseById.get(prescription.exerciseId)?.considerations.shoulder,
      ).toBe('neutral');
    });
  });

  it('models each smart superset as one row with two durable prescriptions', () => {
    const input = demoInput('30');
    const workout = generateWorkout(input);
    const block = workout.blocks.find((item) => item.kind === 'superset');
    expect(block?.kind).toBe('superset');
    if (block?.kind !== 'superset') throw new Error('Expected a superset.');
    expect(block.moves).toHaveLength(2);
    expect(new Set(block.moves.map((move) => move.prescriptionId)).size).toBe(
      2,
    );
    expect(block.canonicalRow).toContain(' + ');

    const context = {
      availableEquipment: input.location.equipment,
      location: input.location.kind,
      blockedJointStress: [],
      fatiguedMuscles: [],
      shoulderSensitive: false,
      avoidBarbellSquat: false,
      timeBudgetSeconds: input.profile.typicalDuration * 60,
      supersetPairs: [
        {
          firstExerciseId: block.moves[0].exerciseId,
          secondExerciseId: block.moves[1].exerciseId,
        },
      ],
    } satisfies ConflictContext;
    expect(
      validateExerciseSelection(
        block.moves.map((move) => move.exerciseId),
        context,
      ).blocking,
    ).toHaveLength(0);
  });

  it('adds at most one safe final drop set only when enabled', () => {
    const disabled = generateWorkout(demoInput('default'));
    expect(
      prescriptions(disabled.blocks).filter((move) => move.dropSet),
    ).toHaveLength(0);

    const enabledInput = demoInput('default');
    enabledInput.settings = { ...enabledInput.settings, allowDropSets: true };
    const enabled = generateWorkout(enabledInput);
    const dropMoves = prescriptions(enabled.blocks).filter(
      (move) => move.dropSet,
    );
    expect(dropMoves).toHaveLength(1);
    expect(exerciseById.get(dropMoves[0].exerciseId)?.dropSet.support).toBe(
      'safe',
    );
  });

  it('keeps optional techniques inside a short time ceiling', () => {
    const input = demoInput('15');
    input.settings = { ...input.settings, allowDropSets: true };
    const workout = generateWorkout(input);
    expect(workout.estimatedSeconds).toBeLessThanOrEqual(
      workout.targetSeconds + 45,
    );
    expect(
      prescriptions(workout.blocks).filter((move) => move.dropSet).length,
    ).toBeLessThanOrEqual(1);
  });

  it('uses circuits only for compatible general-fitness sessions', () => {
    const buildMuscleInput = demoInput('15');
    buildMuscleInput.settings = {
      ...buildMuscleInput.settings,
      allowCircuits: true,
    };
    expect(
      generateWorkout(buildMuscleInput).blocks.some(
        (block) => block.kind === 'circuit',
      ),
    ).toBe(false);

    const fitnessInput = demoInput('15');
    fitnessInput.profile = {
      ...fitnessInput.profile,
      primaryGoal: 'General Fitness',
      secondaryGoal: 'Balanced Development',
    };
    fitnessInput.settings = { ...fitnessInput.settings, allowCircuits: true };
    const circuit = generateWorkout(fitnessInput).blocks.find(
      (block) => block.kind === 'circuit',
    );
    expect(circuit?.kind).toBe('circuit');
    if (circuit?.kind !== 'circuit') throw new Error('Expected a circuit.');
    expect(
      circuit.moves.some((move) => move.catalogRole === 'primary-strength'),
    ).toBe(false);
  });
});
