import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../domain/defaults';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../engine/workoutGenerator/generateWorkout';
import type { ActiveSession } from '../features/activeWorkout/schema';
import {
  createActiveSession,
  deferCurrentExercise,
  logSet,
  nextSetSlot,
} from '../features/activeWorkout/session';
import { ActiveWorkoutView } from './ActiveWorkoutView';

const startedAt = '2026-08-14T12:00:00.000Z';

function session() {
  const bundle = createDemoBundle();
  return createActiveSession(
    generateWorkout(
      generationInputFromBundle(bundle, '15', { date: startedAt }),
    ),
    startedAt,
  );
}

function fullyDeferred() {
  let current = session();
  while (nextSetSlot(current))
    current = deferCurrentExercise(current, startedAt);
  return current;
}

function Harness({ initial }: { initial: ActiveSession }) {
  const [current, setCurrent] = useState(initial);
  return (
    <ActiveWorkoutView
      session={current}
      bundle={createDemoBundle()}
      sessionHistory={[]}
      onSessionChange={async (next) => {
        setCurrent(next);
        return true;
      }}
      onSaveWorkout={async () => undefined}
    />
  );
}

describe('Phase 8 active-workout navigation enhancement', () => {
  it('opens icon shortcuts and returns to a skipped exercise with records intact', async () => {
    let initial = session();
    const slot = nextSetSlot(initial)!;
    initial = logSet(initial, slot, { weight: 40, reps: 8, rir: 2 }, startedAt);
    render(<Harness initial={initial} />);

    const shortcuts = screen.getByRole('navigation', {
      name: 'Workout shortcuts',
    });
    expect(within(shortcuts).getAllByRole('button')).toHaveLength(5);
    fireEvent.click(within(shortcuts).getByRole('button', { name: 'Note' }));
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: /Grip, seat height/ }),
      ).toHaveFocus(),
    );
    const noteDialog = screen.getByRole('dialog', { name: 'Exercise note' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(noteDialog).not.toBeInTheDocument();
    fireEvent.click(within(shortcuts).getByRole('button', { name: 'Plates' }));
    await waitFor(() =>
      expect(
        screen.getByRole('spinbutton', { name: 'Target weight' }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole('dialog', { name: 'Plate Math' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    const currentName = document.getElementById(
      'active-exercise-title',
    )!.textContent!;
    fireEvent.click(
      within(shortcuts).getByRole('button', { name: 'Skip for now' }),
    );
    await screen.findByRole('button', {
      name: new RegExp(`${currentName} skipped for now`),
    });
    await waitFor(() =>
      expect(
        within(shortcuts).getByRole('button', { name: 'Queue' }),
      ).toBeEnabled(),
    );
    fireEvent.click(within(shortcuts).getByRole('button', { name: 'Queue' }));
    const queue = screen.getByRole('dialog', { name: 'Exercise queue' });
    expect(within(queue).getByText('skipped')).toBeInTheDocument();
    fireEvent.click(within(queue).getByRole('button', { name: 'Return' }));
    expect(
      await screen.findByText(/returned to the current position/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
  });

  it('skips one set from Set options without duplicating exercise skip controls', async () => {
    render(<Harness initial={session()} />);
    expect(screen.queryByText('Workout list')).not.toBeInTheDocument();
    expect(screen.queryByText('Swipe-free preview')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Workout started and protected by verified local saves.',
      ),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Set options' }));
    const options = screen.getByRole('dialog', { name: 'Set options' });
    expect(
      within(options).queryByRole('button', { name: 'Skip exercise for now' }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(options).getByRole('button', { name: 'Skip set' }));
    expect(
      await screen.findByText(/No completed record was created/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument();
  });

  it('lists unfinished exercises and records confirmed omissions before celebrating once', async () => {
    render(<Harness initial={fullyDeferred()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Finish workout' }));
    const warning = screen.getByRole('alertdialog', {
      name: 'Finish without these exercises?',
    });
    expect(within(warning).getAllByRole('listitem').length).toBeGreaterThan(1);
    expect(
      within(warning).getByRole('button', {
        name: 'Return to missed exercises',
      }),
    ).toHaveFocus();
    fireEvent.click(
      within(warning).getByRole('button', { name: 'Finish without them' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Workout complete!',
    );
    expect(
      screen.getByText('Strong work. Logged locally.'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/intentionally omitted/i).length,
    ).toBeGreaterThan(0);
    expect(document.querySelectorAll('.completion-confetti i')).toHaveLength(
      18,
    );
  });

  it('closes the keyboard-accessible queue with Escape', () => {
    render(<Harness initial={session()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Queue' }));
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Exercise queue' }),
    ).not.toBeInTheDocument();
  });
});
