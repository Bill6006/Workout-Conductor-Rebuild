import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { PWA_UPDATE_READY_EVENT } from './pwaEvents';

async function openSyntheticDemo() {
  render(<App />);
  const demoButton = await screen.findByRole('button', {
    name: 'Explore with a synthetic demo profile',
  });
  fireEvent.click(demoButton);
  await screen.findByRole('heading', { name: 'Ready, Demo.' });
}

async function startActiveWorkout() {
  await openSyntheticDemo();
  fireEvent.click(screen.getByRole('button', { name: 'Start workout' }));
  await screen.findByRole('heading', {
    name: 'Biceps + Triceps hybrid',
    level: 1,
  });
}

describe('Phase 8 final acceptance', () => {
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

    expect(screen.getByText('Phase 8 UX enhancement')).toBeInTheDocument();
    expect(screen.getByText('WC-P8UX-0814')).toBeInTheDocument();
    expect(screen.getByText('Adaptive Coach')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Catalog' })).toBeVisible();
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

  it('shows the blocking calibration state and recalibrates from one duration dropdown', async () => {
    await openSyntheticDemo();
    const duration = screen.getByRole('combobox', { name: 'Workout length' });
    fireEvent.change(duration, { target: { value: '15' } });
    expect(
      screen.getByRole('status', { name: 'Recalibrating workout' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Workout length changed')).toBeInTheDocument();
    expect(duration).toBeDisabled();
    await waitFor(() => {
      expect(screen.getByText(/Recalibrated to 15 min/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Generated for 15 minutes/)).toBeInTheDocument();
    expect(duration).toBeEnabled();
    fireEvent.change(duration, { target: { value: '45' } });
    await waitFor(() => {
      expect(screen.getByText(/Recalibrated to 45 min/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Generated for 45 minutes/)).toBeInTheDocument();
  });

  it('uses Equipment Busy as a session-only one-slot recalibration', async () => {
    await openSyntheticDemo();
    fireEvent.click(
      screen.getByRole('button', { name: 'Review generated workout' }),
    );
    const equipment = screen.getByRole('combobox', {
      name: 'Equipment status',
    });
    fireEvent.change(equipment, { target: { value: 'pull-up-bar' } });
    expect(screen.getByText('Equipment busy')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/1 exercise substituted/)).toBeInTheDocument();
    });
    expect(screen.getByText('Session only')).toBeInTheDocument();
    expect(screen.getByText(/local recalibration/)).toBeInTheDocument();
  });

  it('cancels safely before a pending recalibration mutates the workout', async () => {
    await openSyntheticDemo();
    const duration = screen.getByRole('combobox', { name: 'Workout length' });
    fireEvent.change(duration, { target: { value: '15' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Keep current workout' }),
    );
    expect(duration).toHaveValue('default');
    expect(screen.getByText(/Generated for default time/)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 190));
    expect(
      screen.queryByText(/Recalibrated to 15 min/),
    ).not.toBeInTheDocument();
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

  it('keeps Catalog directly reachable while a workout is active', async () => {
    await startActiveWorkout();
    const catalog = screen.getByRole('button', { name: 'Catalog' });
    catalog.focus();
    expect(catalog).toHaveFocus();
    fireEvent.click(catalog);
    expect(
      await screen.findByRole('heading', { name: 'Catalog', level: 1 }),
    ).toBeInTheDocument();
    expect(catalog).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Workout' })).toBeVisible();
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

  it('saves unrelated Settings edits with a decimal bodyweight', async () => {
    await openSyntheticDemo();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const bodyweight = await screen.findByRole('spinbutton', {
      name: 'Bodyweight (lb)',
    });
    expect(bodyweight).toHaveAttribute('step', 'any');
    fireEvent.change(bodyweight, { target: { value: '182.5' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Profile name' }), {
      target: { value: 'Decimal Athlete' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save local profile' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Profile, settings, and saved locations were written and verified.',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('stores one reusable workout after a rapid double click', async () => {
    await openSyntheticDemo();
    const save = screen.getByRole('button', { name: 'Save workout' });
    fireEvent.click(save);
    fireEvent.click(save);
    await screen.findByRole('button', {
      name: /saved for reuse in Plan/,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
    await screen.findByRole('heading', { name: 'Reusable sessions' });
    expect(screen.getAllByRole('button', { name: 'Start' })).toHaveLength(1);
  });

  it('starts a premium active workout and logs a one-tap prefilled set', async () => {
    await startActiveWorkout();
    expect(screen.getByText('Active workout')).toBeInTheDocument();
    expect(screen.getByText('WC-P8UX-0814')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Weight' })).toHaveValue(40);
    expect(screen.getByRole('spinbutton', { name: 'Reps' })).toHaveValue(8);
    expect(screen.getByRole('spinbutton', { name: 'RIR' })).toHaveValue(2);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log set' }));
    expect(
      await screen.findByRole('region', { name: 'Rest timer' }),
    ).toBeInTheDocument();
    expect(screen.getByText('40 lb × 8 · 2 RIR')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Set saved and verified locally/).length,
    ).toBeGreaterThan(0);
  });

  it('keeps the next working set locked across a rapid click-through', async () => {
    await startActiveWorkout();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log set' }));
    await screen.findByRole('region', { name: 'Rest timer' });
    const nextSet = screen.getByRole('button', { name: 'Log set' });
    expect(nextSet).toBeDisabled();
    fireEvent.click(nextSet);
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    await waitFor(() => expect(nextSet).toBeEnabled(), { timeout: 1000 });
  });

  it('preserves an active workout load unit when preferences change', async () => {
    await startActiveWorkout();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    const firstLogger = screen.getByRole('form', {
      name: /Set 1 logger/,
    });
    expect(within(firstLogger).getByText('lb')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Units' }), {
      target: { value: 'kg' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save local profile' }));
    await screen.findByText(
      'Profile, settings, and saved locations were written and verified.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Workout' }));
    const resumedLogger = await screen.findByRole('form', {
      name: /Set 1 logger/,
    });
    expect(within(resumedLogger).getByText('lb')).toBeInTheDocument();
    expect(
      within(resumedLogger).getByRole('spinbutton', { name: 'Weight' }),
    ).toHaveValue(40);
  });

  it('defers a waiting app-shell update while a verified workout is active', async () => {
    await startActiveWorkout();
    fireEvent(window, new Event(PWA_UPDATE_READY_EVENT));

    expect(screen.getByText('Safe update ready')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Finish this verified workout before installing the new app shell.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Update app' }),
    ).not.toBeInTheDocument();
  });

  it('corrects a completed set inline without adding a record or timer', async () => {
    await startActiveWorkout();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log set' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const editForm = screen.getByRole('form', {
      name: /Edit working set logger/,
    });
    fireEvent.change(
      within(editForm).getByRole('spinbutton', { name: 'Weight' }),
      {
        target: { value: '42.5' },
      },
    );
    fireEvent.click(
      within(editForm).getByRole('button', { name: 'Save correction' }),
    );
    expect(screen.getByText('42.5 lb × 8 · 2 RIR')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    expect(
      screen.getAllByText(
        /Completed set corrected without adding a set or rest timer/,
      ).length,
    ).toBeGreaterThan(0);
  });

  it('opens instructions, ranked alternatives, and replaces only the current exercise', async () => {
    await startActiveWorkout();
    fireEvent.click(
      screen.getByRole('button', { name: /Open demonstration for Pull-Up/ }),
    );
    const guide = screen.getByRole('dialog', { name: 'Pull-Up' });
    expect(
      within(guide).getByText('Original diagram guide'),
    ).toBeInTheDocument();
    expect(
      within(guide).getByRole('button', { name: 'Pause guide' }),
    ).toBeEnabled();
    fireEvent.click(within(guide).getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Alternatives' }));
    const alternatives = screen.getByRole('dialog', { name: 'Alternatives' });
    expect(within(alternatives).getAllByText(/% match/).length).toBeGreaterThan(
      0,
    );
    fireEvent.click(
      within(alternatives).getAllByRole('button', {
        name: 'Use this exercise',
      })[0],
    );
    expect(
      screen.getAllByText(/Only this exercise changed/).length,
    ).toBeGreaterThan(0);
  });

  it('pauses and resumes at the exact saved workout position', async () => {
    await startActiveWorkout();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    const dialog = screen.getByRole('dialog', { name: 'Your place is saved.' });
    expect(
      within(dialog).getByText(/Completed records remain verified locally/),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Resume workout' }),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Your place is saved.' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  });
});
