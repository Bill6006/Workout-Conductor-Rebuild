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

describe('Phase 3 local workout generation', () => {
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

    expect(screen.getByText('Phase 3 live')).toBeInTheDocument();
    expect(screen.getByText('WC-P3-0810')).toBeInTheDocument();
    expect(screen.getByText('Generated locally')).toBeInTheDocument();
    const duration = screen.getByRole('combobox', { name: 'Workout length' });
    expect(duration).toHaveValue('default');
    expect(
      Array.from((duration as HTMLSelectElement).options).map(
        (option) => option.value,
      ),
    ).toEqual(['15', '30', '45', 'default']);
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeInTheDocument();
  });

  it('opens the workout preview and navigates to saved profiles', async () => {
    await openSyntheticDemo();

    fireEvent.click(
      screen.getByRole('button', { name: 'Review generated workout' }),
    );
    expect(screen.getByText('strength anchor')).toBeInTheDocument();
    expect(screen.getByText('2-move superset')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
    expect(
      await screen.findByRole('heading', { name: 'Plan', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Demo Home Gym')).toBeInTheDocument();
  });

  it('regenerates immediately from the single duration dropdown', async () => {
    await openSyntheticDemo();
    const duration = screen.getByRole('combobox', { name: 'Workout length' });
    fireEvent.change(duration, { target: { value: '15' } });
    expect(screen.getByText(/Generated for 15 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/estimated 14 min/)).toBeInTheDocument();
    fireEvent.change(duration, { target: { value: '45' } });
    expect(screen.getByText(/Generated for 45 minutes/)).toBeInTheDocument();
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
