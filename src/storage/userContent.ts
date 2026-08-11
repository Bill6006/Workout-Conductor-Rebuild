import { z } from 'zod';
import {
  MAX_SET_REPS,
  WeightUnitSchema,
} from '../features/activeWorkout/schema';

const customMediaTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
] as const;

export const CustomMediaBlobSchema = z.object({
  id: z.string().min(1),
  blobKey: z.string().min(1),
  mimeType: z.enum(customMediaTypes),
  dataUrl: z.string().startsWith('data:'),
  byteSize: z.number().int().positive().max(50_000_000),
  createdAt: z.string().datetime(),
});

export const CoachTargetSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  targetWeight: z.number().min(0).max(5000),
  weightUnit: WeightUnitSchema,
  targetReps: z.number().int().min(1).max(MAX_SET_REPS),
  targetRir: z.number().int().min(0).max(10),
  rationale: z.string().min(1).max(500),
  updatedAt: z.string().datetime(),
});

export const CoachTargetImportSchema = CoachTargetSchema.extend({
  weightUnit: WeightUnitSchema.optional(),
});

export function migrateCoachTarget(
  value: unknown,
  fallbackUnit: 'lb' | 'kg',
): CoachTarget {
  const parsed = CoachTargetImportSchema.parse(value);
  return CoachTargetSchema.parse({
    ...parsed,
    weightUnit: parsed.weightUnit ?? fallbackUnit,
  });
}

export type CustomMediaBlob = z.infer<typeof CustomMediaBlobSchema>;
export type CoachTarget = z.infer<typeof CoachTargetSchema>;
