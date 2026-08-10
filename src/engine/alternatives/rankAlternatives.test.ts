import { describe, expect, it } from 'vitest';
import { rankAlternatives, replaceExerciseSlot } from './rankAlternatives';
import type { ConflictContext } from '../conflicts/types';

const homeContext: ConflictContext = {
  availableEquipment: [
    'bodyweight',
    'dumbbells',
    'adjustable-bench',
    'pull-up-bar',
    'resistance-band',
  ],
  location: 'home',
  blockedJointStress: [],
  fatiguedMuscles: [],
  shoulderSensitive: false,
  avoidBarbellSquat: true,
  timeBudgetSeconds: 120,
  supersetPairs: [],
};

describe('deterministic alternative ranking foundation', () => {
  it('ranks a safe same-muscle home alternative first', () => {
    const result = rankAlternatives({
      currentExerciseId: 'dumbbell-bench-press',
      selectedExerciseIds: ['dumbbell-bench-press', 'pull-up', 'goblet-squat'],
      context: homeContext,
    });
    expect(result.ranked[0].exercise.id).toBe('push-up');
    expect(result.ranked[0].preservesProgression).toBe(true);
  });

  it('excludes unavailable, wrong-muscle, and disliked candidates', () => {
    const result = rankAlternatives({
      currentExerciseId: 'dumbbell-bench-press',
      selectedExerciseIds: ['dumbbell-bench-press'],
      dislikedExerciseIds: ['push-up'],
      context: homeContext,
    });
    const excluded = new Map(
      result.excluded.map((item) => [item.exercise.id, item.reasons]),
    );
    expect(excluded.get('machine-chest-press')?.join(' ')).toMatch(
      /equipment|location/i,
    );
    expect(excluded.get('dumbbell-curl')?.join(' ')).toMatch(/primary muscle/i);
    expect(excluded.get('push-up')?.join(' ')).toMatch(/disliked/i);
  });

  it('is deterministic for identical inputs', () => {
    const request = {
      currentExerciseId: 'dumbbell-curl',
      selectedExerciseIds: ['dumbbell-curl', 'goblet-squat'],
      context: homeContext,
    };
    expect(
      rankAlternatives(request).ranked.map((item) => item.exercise.id),
    ).toEqual(rankAlternatives(request).ranked.map((item) => item.exercise.id));
  });

  it('keeps local alternative ranking well below the 200ms target', () => {
    const started = performance.now();
    for (let iteration = 0; iteration < 100; iteration += 1) {
      rankAlternatives({
        currentExerciseId: 'dumbbell-bench-press',
        selectedExerciseIds: [
          'dumbbell-bench-press',
          'pull-up',
          'goblet-squat',
        ],
        context: homeContext,
      });
    }
    const averageMilliseconds = (performance.now() - started) / 100;
    expect(averageMilliseconds).toBeLessThan(200);
  });

  it('replaces only the selected exercise slot', () => {
    const slots = [
      {
        slotId: 'a',
        exerciseId: 'dumbbell-bench-press',
        order: 0,
        setCount: 3,
      },
      {
        slotId: 'b',
        exerciseId: 'pull-up',
        order: 1,
        setCount: 4,
        note: 'Keep',
      },
    ];
    const next = replaceExerciseSlot(slots, 'a', 'push-up');
    expect(next[0]).toEqual({
      slotId: 'a',
      exerciseId: 'push-up',
      order: 0,
      setCount: 3,
    });
    expect(next[1]).toBe(slots[1]);
  });
});
