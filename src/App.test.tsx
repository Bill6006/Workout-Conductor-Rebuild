import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

async function openSyntheticDemo() {
  render(<App />);
  const demoButton = await screen.findByRole('button', {
    name: 'Explore with a synthetic demo profile',
  });
  fireEvent.click(demoButton);
  await screen.findByRole('heading', { name: 'Ready, Demo.' });
}

describe('Phase 2 exercise intelligence foundation', () => {
  it('starts with the short private onboarding welcome', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: 'Your training, intelligently arranged.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Phase 1 · Private setup')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Set up my coach' }),
    ).toBeEnabled();
  });

  it('saves a synthetic demo and renders the useful Today dashboard', async () => {
    await openSyntheticDemo();

    expect(screen.getByText('Phase 2 live')).toBeInTheDocument();
    expect(screen.getByText('WC-P2-0810')).toBeInTheDocument();
    expect(screen.getByText('Synthetic demo')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Workout length' }),
    ).toHaveValue('default');
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
  });

  it('opens the workout preview and navigates to saved profiles', async () => {
    await openSyntheticDemo();

    fireEvent.click(
      screen.getByRole('button', { name: 'Review workout preview' }),
    );
    expect(screen.getByText('Dumbbell Bench Press')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
    expect(
      await screen.findByRole('heading', { name: 'Plan', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Demo Home Gym')).toBeInTheDocument();
  });

  it('ranks a safe alternative and changes only the preview slot', async () => {
    await openSyntheticDemo();

    fireEvent.click(screen.getByRole('button', { name: 'Workout' }));
    expect(
      await screen.findByRole('heading', { name: 'Catalog', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('28 movements. Every decision has metadata.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/incompatible options hidden/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Use Push-Up in preview slot',
      }),
    );
    expect(
      screen.getByText(
        'Dumbbell Bench Press → Push-Up. Only this preview slot changed.',
      ),
    ).toBeInTheDocument();
  });

  it('edits and verifies the local profile from Settings', async () => {
    await openSyntheticDemo();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const profileName = await screen.findByRole('textbox', {
      name: 'Profile name',
    });
    fireEvent.change(profileName, { target: { value: 'Jordan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save local profile' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Profile, settings, and saved locations were written and verified.',
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', {
        name: 'Profile, settings, and saved locations were written and verified.',
      }),
    ).toBeInTheDocument();
  });
});
