import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CustomExerciseSchema } from '../catalog/schema';
import { CustomExerciseGuide } from './CustomExerciseGuide';

const customExercise = CustomExerciseSchema.parse({
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
});

describe('Phase 5 custom exercise display', () => {
  it('renders user-owned instructions and local-media ownership without hotlinking', () => {
    render(<CustomExerciseGuide exercise={customExercise} />);
    const guide = screen.getByRole('region', {
      name: 'Custom guide for My Supported Row',
    });
    expect(guide).toHaveTextContent('User-owned instructions and media');
    expect(guide).toHaveTextContent('custom-media/custom-media-1');
    expect(guide).toHaveTextContent('Exhale through the pull.');
    expect(guide.querySelector('img, video')).toBeNull();
  });
});
