import { describe, expect, it } from 'vitest';
import { createDemoBundle } from '../../domain/defaults';
import {
  generateWorkout,
  generationInputFromBundle,
} from '../../engine/workoutGenerator/generateWorkout';
import { ActiveSessionSchema } from '../activeWorkout/schema';
import { createActiveSession } from '../activeWorkout/session';
import { monthCalendar } from './calendar';
import type { PlanRevision } from './schema';

function completedSession(completedAt: string) {
  const workout = generateWorkout(
    generationInputFromBundle(createDemoBundle(), '15', { date: completedAt }),
  );
  return ActiveSessionSchema.parse({
    ...createActiveSession(workout, completedAt),
    status: 'completed',
    completedAt,
    updatedAt: completedAt,
  });
}

describe('date-effective training calendar', () => {
  it('marks completed days, elapsed scheduled misses, neutral rest days, and neutral future dates', () => {
    const revisions: PlanRevision[] = [
      {
        id: 'plan-1',
        effectiveFrom: '2026-08-01',
        timeZone: 'America/New_York',
        weeklyFrequency: 3,
        availableDays: ['Monday', 'Wednesday', 'Friday'],
        createdAt: '2026-08-01T12:00:00.000Z',
        source: 'settings',
      },
    ];
    const calendar = monthCalendar({
      year: 2026,
      month: 7,
      revisions,
      sessions: [
        completedSession('2026-08-03T23:30:00.000Z'),
        completedSession('2026-08-04T02:30:00.000Z'),
      ],
      now: new Date('2026-08-14T16:00:00.000Z'),
    });
    expect(calendar.find((item) => item.dateKey === '2026-08-03')?.status).toBe(
      'completed',
    );
    expect(calendar.find((item) => item.dateKey === '2026-08-05')?.status).toBe(
      'missed',
    );
    expect(calendar.find((item) => item.dateKey === '2026-08-06')?.status).toBe(
      'unscheduled',
    );
    expect(calendar.find((item) => item.dateKey === '2026-08-17')?.status).toBe(
      'scheduled',
    );
  });

  it('uses the revision effective on each historical date', () => {
    const revisions: PlanRevision[] = [
      {
        id: 'old',
        effectiveFrom: '2026-08-01',
        timeZone: 'UTC',
        weeklyFrequency: 1,
        availableDays: ['Monday'],
        createdAt: '2026-08-01T00:00:00.000Z',
        source: 'migration',
      },
      {
        id: 'new',
        effectiveFrom: '2026-08-10',
        timeZone: 'UTC',
        weeklyFrequency: 1,
        availableDays: ['Friday'],
        createdAt: '2026-08-10T00:00:00.000Z',
        source: 'settings',
      },
    ];
    const calendar = monthCalendar({
      year: 2026,
      month: 7,
      revisions,
      sessions: [],
      now: new Date('2026-08-20T12:00:00.000Z'),
    });
    expect(calendar.find((item) => item.dateKey === '2026-08-03')?.status).toBe(
      'missed',
    );
    expect(calendar.find((item) => item.dateKey === '2026-08-07')?.status).toBe(
      'unscheduled',
    );
    expect(calendar.find((item) => item.dateKey === '2026-08-14')?.status).toBe(
      'missed',
    );
  });
});
