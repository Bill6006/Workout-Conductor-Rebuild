import type { Exercise } from '../../catalog/schema';

export type TempoRecommendation = {
  code: string;
  cue: string;
  cycleSeconds: number;
  evidenceNote: string;
};

const evidenceNote =
  'Evidence-informed starting point. Research supports a range of controlled repetition durations rather than one uniquely optimal tempo.';

export function recommendTempo(exercise: Exercise): TempoRecommendation {
  if (
    exercise.movementPattern === 'anti-extension' ||
    exercise.movementPattern === 'anti-rotation'
  ) {
    return {
      code: '2–1–2–1',
      cue: '2 sec into position · 1 sec brace · 2 sec return · 1 sec reset',
      cycleSeconds: 6,
      evidenceNote,
    };
  }

  if (
    exercise.trainingRole === 'primary-strength' ||
    exercise.trainingRole === 'secondary-strength'
  ) {
    return {
      code: '2–0–1–1',
      cue: '2 sec lower · no pause · 1 sec lift · 1 sec reset',
      cycleSeconds: 4,
      evidenceNote,
    };
  }

  if (
    exercise.mechanics === 'isolation' ||
    exercise.trainingRole === 'specialization'
  ) {
    return {
      code: '2–1–1–1',
      cue: '2 sec lower · 1 sec stretch · 1 sec lift · 1 sec squeeze',
      cycleSeconds: 5,
      evidenceNote,
    };
  }

  return {
    code: '3–0–1–0',
    cue: '3 sec lower · no pause · 1 sec lift · smooth turnaround',
    cycleSeconds: 4,
    evidenceNote,
  };
}
