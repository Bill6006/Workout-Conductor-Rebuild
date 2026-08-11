import { z } from 'zod';

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
  targetReps: z.number().int().min(1).max(1000),
  targetRir: z.number().int().min(0).max(10),
  rationale: z.string().min(1).max(500),
  updatedAt: z.string().datetime(),
});

export type CustomMediaBlob = z.infer<typeof CustomMediaBlobSchema>;
export type CoachTarget = z.infer<typeof CoachTargetSchema>;
