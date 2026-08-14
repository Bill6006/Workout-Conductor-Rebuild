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

  it('saves a per-exercise GIF override and restores it after remount', async () => {
    const exercise = exerciseById.get('dumbbell-bench-press')!;
    const first = render(
      <div id="root">
        <ExerciseGuide exercise={exercise} />
      </div>,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: `Open demonstration for ${exercise.name}`,
      }),
    );
    const input = screen.getByLabelText(
      `Upload a custom GIF for ${exercise.name}`,
    );
    fireEvent.change(input, {
      target: {
        files: [new File(['GIF89a'], 'bench.gif', { type: 'image/gif' })],
      },
    });

    expect(
      await screen.findByText(/Custom GIF saved and verified locally/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Swap GIF' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    first.unmount();

    render(
      <div id="root">
        <ExerciseGuide exercise={exercise} />
      </div>,
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', {
            name: `Open demonstration for ${exercise.name}`,
          })
          .querySelector('img'),
      ).toHaveAttribute('src', expect.stringContaining('data:image/gif')),
    );
  });

  it('rejects a non-GIF exercise override', async () => {
    const exercise = exerciseById.get('dumbbell-bench-press')!;
    render(
      <div id="root">
        <ExerciseGuide exercise={exercise} />
      </div>,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: `Open demonstration for ${exercise.name}`,
      }),
    );
    fireEvent.change(
      screen.getByLabelText(`Upload a custom GIF for ${exercise.name}`),
      {
        target: {
          files: [new File(['not-a-gif'], 'bench.png', { type: 'image/png' })],
        },
      },
    );
    expect(await screen.findByText(/Choose a GIF file/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Use my GIF' }),
    ).toBeInTheDocument();
  });
});
