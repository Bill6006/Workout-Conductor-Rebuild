import { z } from 'zod';
import { weekDays } from '../../domain/models';

export const PlanRevisionSchema = z.object({
  id: z.string().min(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeZone: z.string().min(1),
  weeklyFrequency: z.number().int().min(1).max(7),
  availableDays: z.array(z.enum(weekDays)).min(1),
  createdAt: z.string().datetime(),
  source: z.enum(['onboarding', 'settings', 'migration']),
});

export type PlanRevision = z.infer<typeof PlanRevisionSchema>;

export function localDateKey(
  value: Date | string,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function createPlanRevision(
  plan: {
    weeklyFrequency: number;
    availableDays: PlanRevision['availableDays'];
  },
  source: PlanRevision['source'],
  now = new Date(),
): PlanRevision {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const createdAt = now.toISOString();
  return PlanRevisionSchema.parse({
    id: `plan-${createdAt}`,
    effectiveFrom: localDateKey(now, timeZone),
    timeZone,
    weeklyFrequency: plan.weeklyFrequency,
    availableDays: plan.availableDays,
    createdAt,
    source,
  });
}
