import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../domain/defaults';
import { ActiveSessionSchema } from '../features/activeWorkout/schema';
import {
  blockMoves,
  createActiveSession,
} from '../features/activeWorkout/session';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../engine/workoutGenerator/generateWorkout';
import { ProgressView } from './ProgressView';

const bundle = createDemoBundle();
const completedAt = '2026-08-10T12:30:00.000Z';
const workout = generateWorkout(
  generationInputFromBundle(bundle, '30', {
    date: '2026-08-10T12:00:00.000Z',
  }),
);
const move = blockMoves(workout.blocks[0])[0];

function completedSession(
  records: Array<{ weight: number; reps: number; weightUnit: 'lb' | 'kg' }>,
) {
  const session = createActiveSession(workout, '2026-08-10T12:00:00.000Z');
  return ActiveSessionSchema.parse({
    ...session,
    status: 'completed',
    completedAt,
    updatedAt: completedAt,
    records: records.map((record, index) => ({
      id: `${session.id}:rendered-volume:${index}`,
      sessionId: session.id,
      blockId: workout.blocks[0].blockId,
      prescriptionId: move.prescriptionId,
      exerciseId: move.exerciseId,
      exerciseName: move.exerciseName,
      kind: 'working' as const,
      setIndex: index,
      roundIndex: null,
      moveIndex: 0,
      weight: record.weight,
      weightUnit: record.weightUnit,
      reps: record.reps,
      rir: 2,
      completedAt,
      editedAt: null,
      countsTowardProgression: true,
      countsTowardPr: true,
      countsTowardWorkingVolume: true,
    })),
  });
}

function historyCard() {
  const card = screen.getByText(workout.title).closest('.history-card');
  expect(card).not.toBeNull();
  return card as HTMLElement;
}

function displayBundle(units: 'lb' | 'kg') {
  return { ...bundle, settings: { ...bundle.settings, units } };
}

describe('Progress completed-session history volume', () => {
  it('converts 43 lb × 9 to approximately 176 kg instead of relabeling 387', () => {
    render(
      <ProgressView
        bundle={displayBundle('kg')}
        sessionHistory={[
          completedSession([{ weight: 43, reps: 9, weightUnit: 'lb' }]),
        ]}
      />,
    );

    expect(within(historyCard()).getByText('176 kg')).toBeInTheDocument();
    expect(within(historyCard()).queryByText('387 kg')).not.toBeInTheDocument();
  });

  it('converts kilogram history to pounds in the rendered card', () => {
    render(
      <ProgressView
        bundle={displayBundle('lb')}
        sessionHistory={[
          completedSession([{ weight: 20, reps: 10, weightUnit: 'kg' }]),
        ]}
      />,
    );

    expect(within(historyCard()).getByText('441 lb')).toBeInTheDocument();
    expect(within(historyCard()).queryByText('200 lb')).not.toBeInTheDocument();
  });

  it('converts each mixed-unit record before summing and round-trips the display', () => {
    const history = [
      completedSession([
        { weight: 43, reps: 9, weightUnit: 'lb' },
        { weight: 20, reps: 10, weightUnit: 'kg' },
      ]),
    ];
    const { rerender } = render(
      <ProgressView bundle={displayBundle('lb')} sessionHistory={history} />,
    );
    expect(within(historyCard()).getByText('828 lb')).toBeInTheDocument();

    rerender(
      <ProgressView bundle={displayBundle('kg')} sessionHistory={history} />,
    );
    expect(within(historyCard()).getByText('376 kg')).toBeInTheDocument();

    rerender(
      <ProgressView bundle={displayBundle('lb')} sessionHistory={history} />,
    );
    expect(within(historyCard()).getByText('828 lb')).toBeInTheDocument();
  });
});
