import { describe, expect, it } from 'vitest';
import { CustomExerciseSchema } from './schema';

const customExercise = {
  id: 'custom-supported-row',
  name: 'My Supported Row',
  primaryMuscles: ['upper-back'],
  secondaryMuscles: ['lats', 'biceps'],
  movementPattern: 'horizontal-pull',
  equipment: ['dumbbells'],
  progressionFamily: 'horizontal-pull',
  instructions: {
    setup: 'Set the bench to the saved support angle.',
    execution: ['Pull both elbows toward the saved torso marker.'],
    breathingCue: 'Exhale through the pull.',
    safetyNotes: ['Stop if the shoulder moves into an uncomfortable path.'],
  },
  media: [
    {
      id: 'custom-media-1',
      kind: 'poster',
      mimeType: 'image/webp',
      blobKey: 'custom-media/custom-media-1',
      byteSize: 142_000,
      ownership: 'user-owned',
      createdAt: '2026-08-10T17:00:00.000Z',
    },
  ],
  jointStress: ['shoulder-extension'],
  createdAt: '2026-08-10T17:00:00.000Z',
  updatedAt: '2026-08-10T17:00:00.000Z',
};

describe('custom exercise ownership schemas', () => {
  it('accepts local user-owned instructions and media metadata', () => {
    expect(CustomExerciseSchema.parse(customExercise).media[0].ownership).toBe(
      'user-owned',
    );
  });

  it('rejects undeclared remote media URLs', () => {
    expect(() =>
      CustomExerciseSchema.parse({
        ...customExercise,
        media: [
          {
            ...customExercise.media[0],
            remoteUrl: 'https://example.com/video',
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects oversized custom media before durable storage', () => {
    expect(() =>
      CustomExerciseSchema.parse({
        ...customExercise,
        media: [{ ...customExercise.media[0], byteSize: 50_000_001 }],
      }),
    ).toThrow();
  });
});
