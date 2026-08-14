import { useEffect, useRef, useState } from 'react';
import {
  describeTempo,
  getTempoFrame,
  tempoPhaseLabels,
  type TempoPhaseKey,
  type TempoRecommendation,
} from '../features/activeWorkout/tempo';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export function TempoIndicator({
  tempo,
  playing,
  compact = false,
}: {
  tempo: TempoRecommendation;
  playing: boolean;
  compact?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const fillRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<TempoPhaseKey>('eccentric');
  const [phase, setPhase] = useState<TempoPhaseKey>('eccentric');
  const { eccentric, bottomPause, concentric, topPause } = tempo.phases;
  const tempoKey = [eccentric, bottomPause, concentric, topPause].join('-');
  const description = describeTempo(tempo.phases);

  useEffect(() => {
    elapsedRef.current = 0;
    lastPhaseRef.current = 'eccentric';
  }, [tempoKey]);

  useEffect(() => {
    const phases = { eccentric, bottomPause, concentric, topPause };
    const applyFrame = (elapsed: number) => {
      const frame = getTempoFrame(phases, elapsed);
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${frame.fill})`;
      }
      if (progressRef.current) {
        progressRef.current.setAttribute(
          'aria-valuenow',
          String(Math.round(frame.fill * 100)),
        );
        progressRef.current.setAttribute(
          'aria-valuetext',
          `${frame.phaseLabel}, ${frame.remainingInPhase.toFixed(1)} seconds remaining`,
        );
        progressRef.current.dataset.phase = frame.phase;
      }
      if (frame.phase !== lastPhaseRef.current) {
        lastPhaseRef.current = frame.phase;
        setPhase(frame.phase);
      }
    };

    applyFrame(elapsedRef.current);
    if (!playing || reducedMotion) return;

    const startedAt = performance.now() - elapsedRef.current;
    const update = (now: number) => {
      elapsedRef.current = now - startedAt;
      applyFrame(elapsedRef.current);
      animationFrameRef.current = window.requestAnimationFrame(update);
    };
    animationFrameRef.current = window.requestAnimationFrame(update);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    playing,
    reducedMotion,
    tempoKey,
    eccentric,
    bottomPause,
    concentric,
    topPause,
  ]);

  return (
    <div
      className={`tempo-indicator${compact ? ' tempo-indicator--compact' : ''}${
        reducedMotion ? ' is-reduced-motion' : ''
      }`}
      role={compact ? undefined : 'group'}
      aria-hidden={compact ? 'true' : undefined}
      aria-label={compact ? undefined : `Tempo ${tempo.code}. ${description}`}
    >
      {!compact && (
        <div className="tempo-indicator__heading">
          <strong>
            {reducedMotion ? 'Tempo overview' : tempoPhaseLabels[phase]}
          </strong>
          <span>{tempo.code}</span>
        </div>
      )}
      <div
        ref={progressRef}
        className="tempo-indicator__track"
        role={compact ? undefined : 'progressbar'}
        aria-label={compact ? undefined : 'Movement tempo phase'}
        aria-valuemin={compact ? undefined : 0}
        aria-valuemax={compact ? undefined : 100}
      >
        <span ref={fillRef} className="tempo-indicator__fill" />
      </div>
      {!compact && reducedMotion && (
        <p className="tempo-indicator__summary">{description}</p>
      )}
      {!compact && !reducedMotion && !playing && (
        <p className="tempo-indicator__summary">Paused · {description}</p>
      )}
    </div>
  );
}
