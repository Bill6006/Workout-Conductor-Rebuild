import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { exerciseById } from '../catalog/exercises';
import { ExerciseGuide } from './ExerciseGuide';

describe('Phase 8 exercise-guide accessibility', () => {
  it('moves focus into the modal, closes with Escape, and restores focus', async () => {
    const exercise = exerciseById.get('dumbbell-bench-press')!;
    render(
      <div id="root">
        <ExerciseGuide exercise={exercise} />
      </div>,
    );
    const opener = screen.getByRole('button', {
      name: `Open demonstration for ${exercise.name}`,
    });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: exercise.name });
    const close = screen.getByRole('button', { name: 'Close' });

    await waitFor(() => expect(close).toHaveFocus());
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.getElementById('root')).toHaveAttribute('inert');
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: exercise.name })).toBeNull();
    expect(opener).toHaveFocus();
    expect(document.getElementById('root')).not.toHaveAttribute('inert');
  });
});
