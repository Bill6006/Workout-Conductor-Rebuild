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
      units="kg"
      initialValues={{ weight: 40, reps: 8, rir: 2 }}
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

describe('Phase 8 set submission hardening', () => {
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
