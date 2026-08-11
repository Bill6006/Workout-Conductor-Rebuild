import { z } from 'zod';

export const CoachActionSchema = z.object({
  kind: z.enum([
    'open-alternatives',
    'reduce-volume',
    'reduce-intensity',
    'increase-rest',
    'micro-deload',
    'add-set',
    'add-drop-set',
  ]),
  label: z.string().min(1),
  requiresConfirmation: z.literal(true),
  exerciseId: z.string().min(1).nullable(),
});

export const CoachRecommendationSchema = z.object({
  priority: z.enum([
    'safety-form',
    'save-storage',
    'recovery-fatigue',
    'plateau',
    'progression',
    'exercise-fit',
    'weekly-coverage',
    'tip',
  ]),
  title: z.string().min(1),
  guidance: z.string().min(1),
  why: z.string().min(1),
  evidence: z.array(z.string().min(1)).max(4),
  nextTarget: z.string().min(1).nullable(),
  action: CoachActionSchema.nullable(),
});

export type CoachAction = z.infer<typeof CoachActionSchema>;
export type CoachRecommendation = z.infer<typeof CoachRecommendationSchema>;
