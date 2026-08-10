import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Phase 0 app shell', () => {
  it('shows the current phase and visible build marker', () => {
    render(<App />);

    expect(screen.getByText('Phase 0 live')).toBeInTheDocument();
    expect(screen.getByText('Build WC-P0-0810')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
  });

  it('navigates between all five app areas', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByText('WC-P0-0810')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(
      screen.getByRole('heading', { name: 'Ready when you are.' }),
    ).toBeInTheDocument();
  });

  it('keeps the unavailable workout action safely disabled', () => {
    render(<App />);

    expect(
      screen.getByRole('button', { name: /start workout/i }),
    ).toBeDisabled();
  });
});
