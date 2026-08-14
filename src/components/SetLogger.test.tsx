import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SetLogger } from './SetLogger';

function renderLogger(onSubmit = vi.fn()) {
  render(
    <SetLogger
      loggerKey="set-1"
      exerciseName="Synthetic Press"
      setLabel="Set 1"
      targetReps="8–12"
      targetRir={2}
      tempo={{
        code: '3–0–1–0',
        cue: '3 sec lower · no pause · 1 sec lift · smooth turnaround',
        cycleSeconds: 4,
        phases: {
          eccentric: 3,
          bottomPause: 0,
          concentric: 1,
          topPause: 0,
        },
        evidenceNote: 'Evidence-informed starting point.',
      }}
      units="kg"
      initialValues={{ weight: 40, reps: 8, rir: 2 }}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

describe('Phase 8 set submission hardening', () => {
  it('shows the recommended tempo above the working target', () => {
    renderLogger();
    const tempo = screen.getByText(/Recommended tempo/);
    const target = screen.getByText('Target 8–12 · 2 RIR');
    expect(tempo).toBeVisible();
    expect(
      tempo.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('rejects zero repetitions before persistence', () => {
    const onSubmit = renderLogger();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Reps' }), {
      target: { value: '0' },
    });
    expect(screen.getByRole('button', { name: 'Log set' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts at most one submission from a rapid double click', () => {
    const onSubmit = renderLogger();
    const submit = screen.getByRole('button', { name: 'Log set' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Saving set…' })).toBeDisabled();
  });

  it('rejects repetitions above the documented 200-rep boundary', () => {
    const onSubmit = renderLogger();
    const reps = screen.getByRole('spinbutton', { name: 'Reps' });
    expect(reps).toHaveAttribute('max', '200');
    fireEvent.change(reps, { target: { value: '999' } });
    expect(screen.getByText('Reps must be between 1 and 200.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Log set' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
