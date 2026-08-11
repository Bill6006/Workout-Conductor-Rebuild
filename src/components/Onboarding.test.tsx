import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Onboarding } from './Onboarding';

async function reachGuardrails() {
  fireEvent.click(screen.getByRole('button', { name: 'Set up my coach' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mon' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(
    screen.getByRole('heading', { name: 'Preferences and guardrails' }),
  ).toBeInTheDocument();
}

describe('Phase 8 onboarding hardening', () => {
  it('shows actionable bodyweight validation instead of raw schema JSON', async () => {
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);
    await reachGuardrails();
    const bodyweight = screen.getByRole('spinbutton', {
      name: 'Optional bodyweight (lb)',
    });
    fireEvent.change(bodyweight, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bodyweight must be greater than 0 and no more than 1000.',
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('origin');
    expect(bodyweight).toHaveFocus();
    expect(bodyweight).toHaveAttribute('aria-invalid', 'true');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('accepts a decimal bodyweight consistently', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    render(<Onboarding onComplete={onComplete} />);
    await reachGuardrails();
    const bodyweight = screen.getByRole('spinbutton', {
      name: 'Optional bodyweight (lb)',
    });
    expect(bodyweight).toHaveAttribute('step', 'any');
    fireEvent.change(bodyweight, { target: { value: '82.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(onComplete.mock.calls[0][0].profile.bodyweight).toBe(82.5);
  });
});
