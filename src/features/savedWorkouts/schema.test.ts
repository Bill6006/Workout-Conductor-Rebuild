import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../../domain/defaults';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../../engine/workoutGenerator/generateWorkout';
import { createSavedWorkout } from './schema';

describe('Phase 8 saved-workout idempotency', () => {
  it('uses one stable durable identity for repeated saves of the same source', () => {
    const workout = generateWorkout(
      generationInputFromBundle(createDemoBundle(), '30', {
        date: '2026-08-11T12:00:00.000Z',
      }),
    );
    const first = createSavedWorkout(
      workout,
      'completed',
      'session-1',
      new Date('2026-08-11T12:30:00.000Z'),
    );
    const repeated = createSavedWorkout(
      workout,
      'completed',
      'session-1',
      new Date('2026-08-11T12:31:00.000Z'),
    );

    expect(repeated.id).toBe(first.id);
    expect(repeated.savedAt).not.toBe(first.savedAt);
  });
});
