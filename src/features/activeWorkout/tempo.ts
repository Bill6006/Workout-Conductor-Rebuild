import type { Exercise } from '../../catalog/schema';

export type TempoRecommendation = {
  code: string;
  cue: string;
  cycleSeconds: number;
  phases: TempoPhases;
  evidenceNote: string;
};

export type TempoPhases = {
  eccentric: number;
  bottomPause: number;
  concentric: number;
  topPause: number;
};

export type TempoPhaseKey = keyof TempoPhases;

export type TempoFrame = {
  phase: TempoPhaseKey;
  phaseLabel: string;
  fill: number;
  elapsedInPhase: number;
  remainingInPhase: number;
};

export const tempoPhaseOrder: readonly TempoPhaseKey[] = [
  'eccentric',
  'bottomPause',
  'concentric',
  'topPause',
];

export const tempoPhaseLabels: Record<TempoPhaseKey, string> = {
  eccentric: 'Lower',
  bottomPause: 'Hold low',
  concentric: 'Lift',
  topPause: 'Hold high',
};

const evidenceNote =
  'Evidence-informed starting point. Research supports a range of controlled repetition durations rather than one uniquely optimal tempo.';

function createRecommendation(
  phases: TempoPhases,
  cue: string,
): TempoRecommendation {
  const values = tempoPhaseOrder.map((phase) => phases[phase]);
  return {
    code: values.join('–'),
    cue,
    cycleSeconds: values.reduce((total, seconds) => total + seconds, 0),
    phases,
    evidenceNote,
  };
}

export function describeTempo(phases: TempoPhases): string {
  return tempoPhaseOrder
    .map((phase) => `${tempoPhaseLabels[phase]} ${phases[phase]} sec`)
    .join(' · ');
}

export function getTempoFrame(
  phases: TempoPhases,
  elapsedMilliseconds: number,
): TempoFrame {
  const durations = tempoPhaseOrder.map((phase) => {
    const duration = phases[phase];
    return Number.isFinite(duration) && duration >= 0 ? duration : 0;
  });
  const cycleSeconds = durations.reduce(
    (total, duration) => total + duration,
    0,
  );
  if (cycleSeconds <= 0) {
    return {
      phase: 'eccentric',
      phaseLabel: tempoPhaseLabels.eccentric,
      fill: 1,
      elapsedInPhase: 0,
      remainingInPhase: 0,
    };
  }

  const safeElapsed = Number.isFinite(elapsedMilliseconds)
    ? Math.max(0, elapsedMilliseconds) / 1000
    : 0;
  let cyclePosition = safeElapsed % cycleSeconds;

  for (let index = 0; index < tempoPhaseOrder.length; index += 1) {
    const phase = tempoPhaseOrder[index];
    const duration = durations[index];
    if (duration === 0) continue;
    if (cyclePosition < duration) {
      const progress = cyclePosition / duration;
      const fill =
        phase === 'eccentric'
          ? 1 - progress
          : phase === 'bottomPause'
            ? 0
            : phase === 'concentric'
              ? progress
              : 1;
      return {
        phase,
        phaseLabel: tempoPhaseLabels[phase],
        fill,
        elapsedInPhase: cyclePosition,
        remainingInPhase: duration - cyclePosition,
      };
    }
    cyclePosition -= duration;
  }

  return {
    phase: 'eccentric',
    phaseLabel: tempoPhaseLabels.eccentric,
    fill: 1,
    elapsedInPhase: 0,
    remainingInPhase: phases.eccentric,
  };
}

export function recommendTempo(exercise: Exercise): TempoRecommendation {
  if (
    exercise.movementPattern === 'anti-extension' ||
    exercise.movementPattern === 'anti-rotation'
  ) {
    return createRecommendation(
      { eccentric: 2, bottomPause: 1, concentric: 2, topPause: 1 },
      '2 sec into position · 1 sec brace · 2 sec return · 1 sec reset',
    );
  }

  if (
    exercise.trainingRole === 'primary-strength' ||
    exercise.trainingRole === 'secondary-strength'
  ) {
    return createRecommendation(
      { eccentric: 2, bottomPause: 0, concentric: 1, topPause: 1 },
      '2 sec lower · no pause · 1 sec lift · 1 sec reset',
    );
  }

  if (
    exercise.mechanics === 'isolation' ||
    exercise.trainingRole === 'specialization'
  ) {
    return createRecommendation(
      { eccentric: 2, bottomPause: 1, concentric: 1, topPause: 1 },
      '2 sec lower · 1 sec stretch · 1 sec lift · 1 sec squeeze',
    );
  }

  return createRecommendation(
    { eccentric: 3, bottomPause: 0, concentric: 1, topPause: 0 },
    '3 sec lower · no pause · 1 sec lift · smooth turnaround',
  );
}
