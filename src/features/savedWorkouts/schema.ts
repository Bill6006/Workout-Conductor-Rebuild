import { z } from 'zod';
import { generatedWorkoutSchema } from '../../engine/workoutGenerator/schema';

export const SavedWorkoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  workout: generatedWorkoutSchema,
  source: z.enum(['generated', 'completed']),
  sourceSessionId: z.string().min(1).nullable(),
  savedAt: z.string().datetime(),
});

export type SavedWorkout = z.infer<typeof SavedWorkoutSchema>;

export function createSavedWorkout(
  workout: z.infer<typeof generatedWorkoutSchema>,
  source: SavedWorkout['source'],
  sourceSessionId: string | null = null,
  now: Date = new Date(),
): SavedWorkout {
  const savedAt = now.toISOString();
  return SavedWorkoutSchema.parse({
    id: `saved-${workout.id}-${savedAt}`,
    name: workout.title,
    workout,
    source,
    sourceSessionId,
    savedAt,
  });
}
