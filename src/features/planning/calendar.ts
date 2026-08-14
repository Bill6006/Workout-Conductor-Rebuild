import type { ActiveSession } from '../activeWorkout/schema';
import { localDateKey, type PlanRevision } from './schema';

export type CalendarDayStatus =
  'completed' | 'missed' | 'scheduled' | 'unscheduled';

const weekdayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function revisionForDate(revisions: PlanRevision[], dateKey: string) {
  return (
    [...revisions]
      .filter((revision) => revision.effectiveFrom <= dateKey)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
  );
}

export function monthCalendar(args: {
  year: number;
  month: number;
  revisions: PlanRevision[];
  sessions: ActiveSession[];
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const days = new Date(args.year, args.month + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const localDate = new Date(args.year, args.month, day, 12);
    const dateKey = `${args.year}-${String(args.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const revision = revisionForDate(args.revisions, dateKey);
    const scheduledDays = revision
      ? revision.availableDays.slice(0, revision.weeklyFrequency)
      : [];
    const scheduled = scheduledDays.includes(weekdayNames[localDate.getDay()]);
    const completed = args.sessions.some(
      (session) =>
        session.status === 'completed' &&
        session.completedAt &&
        localDateKey(session.completedAt, revision?.timeZone) === dateKey,
    );
    const todayKey = localDateKey(now, revision?.timeZone);
    const status: CalendarDayStatus = completed
      ? 'completed'
      : scheduled && dateKey < todayKey
        ? 'missed'
        : scheduled
          ? 'scheduled'
          : 'unscheduled';
    return { day, dateKey, status, scheduled };
  });
}
