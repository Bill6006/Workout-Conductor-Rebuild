import { describe, expect, it } from 'vitest';
import { equipmentIds } from '../../catalog/schema';
import { validateExerciseSelection } from './validateConflicts';
import type { ConflictContext } from './types';

function context(overrides: Partial<ConflictContext> = {}): ConflictContext {
  return {
    availableEquipment: [...equipmentIds],
    location: 'gym',
    blockedJointStress: [],
    fatiguedMuscles: [],
    shoulderSensitive: false,
    avoidBarbellSquat: false,
    timeBudgetSeconds: null,
    supersetPairs: [],
    ...overrides,
  };
}

describe('reusable conflict validation', () => {
  it('blocks duplicate exercises', () => {
    const result = validateExerciseSelection(
      ['dumbbell-bench-press', 'dumbbell-bench-press'],
      context(),
    );
    expect(result.valid).toBe(false);
    expect(result.blocking.map((item) => item.type)).toContain(
      'duplicate-exercise',
    );
  });

  it('blocks unavailable equipment and incompatible locations', () => {
    const result = validateExerciseSelection(
      ['cable-curl'],
      context({ availableEquipment: ['dumbbells'], location: 'home' }),
    );
    expect(result.blocking.map((item) => item.type)).toEqual(
      expect.arrayContaining(['equipment', 'location']),
    );
  });

  it('respects explicit limitation and shoulder guardrails', () => {
    const result = validateExerciseSelection(
      ['dumbbell-shoulder-press', 'barbell-back-squat'],
      context({
        shoulderSensitive: true,
        avoidBarbellSquat: true,
        blockedJointStress: ['lumbar-loading'],
      }),
    );
    expect(
      result.blocking.filter((item) => item.type === 'limitation').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('flags recovery and impossible setup-time pressure', () => {
    const result = validateExerciseSelection(
      ['barbell-bench-press'],
      context({ fatiguedMuscles: ['chest'], timeBudgetSeconds: 60 }),
    );
    expect(result.conflicts.map((item) => item.type)).toEqual(
      expect.arrayContaining(['recovery', 'time']),
    );
  });

  it('detects movement, muscle, and progression-role concentration', () => {
    const result = validateExerciseSelection(
      [
        'barbell-bench-press',
        'dumbbell-bench-press',
        'push-up',
        'machine-chest-press',
        'pull-up',
        'barbell-back-squat',
      ],
      context(),
    );
    expect(result.warnings.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        'duplicate-pattern',
        'muscle-overlap',
        'progression-role',
      ]),
    );
  });

  it('blocks grip-heavy and high-stability superset pairings', () => {
    const result = validateExerciseSelection(
      ['pull-up', 'romanian-deadlift'],
      context({
        supersetPairs: [
          { firstExerciseId: 'pull-up', secondExerciseId: 'romanian-deadlift' },
        ],
      }),
    );
    expect(result.blocking.map((item) => item.type)).toEqual(
      expect.arrayContaining(['grip', 'superset']),
    );
  });

  it('blocks competing use of one scarce station', () => {
    const result = validateExerciseSelection(
      ['cable-curl', 'cable-triceps-pressdown'],
      context({
        supersetPairs: [
          {
            firstExerciseId: 'cable-curl',
            secondExerciseId: 'cable-triceps-pressdown',
          },
        ],
      }),
    );
    expect(result.blocking.map((item) => item.type)).toContain('station');
  });

  it('warns when a superset repeats joint stress', () => {
    const result = validateExerciseSelection(
      ['dumbbell-curl', 'hammer-curl'],
      context({
        supersetPairs: [
          { firstExerciseId: 'dumbbell-curl', secondExerciseId: 'hammer-curl' },
        ],
      }),
    );
    expect(result.warnings.map((item) => item.type)).toContain('joint-stress');
  });
});
