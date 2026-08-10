import { useEffect, useRef, useState } from 'react';
import type { RestTimer as RestTimerState } from '../features/activeWorkout/schema';

function remainingSeconds(timer: RestTimerState) {
  const elapsed = Math.floor(
    (Date.now() - new Date(timer.startedAt).getTime()) / 1000,
  );
  return Math.max(0, timer.durationSeconds - elapsed);
}

function timeLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function RestTimer({
  timer,
  nextTarget,
  onAdjust,
  onSkip,
  onComplete,
}: {
  timer: RestTimerState;
  nextTarget: string;
  onAdjust: (seconds: number) => void;
  onSkip: () => void;
  onComplete: () => void;
}) {
  const [remaining, setRemaining] = useState(() => remainingSeconds(timer));
  const completionSignaledFor = useRef<string | null>(null);

  useEffect(() => {
    const update = () => {
      const next = remainingSeconds(timer);
      setRemaining(next);
      if (next === 0 && completionSignaledFor.current !== timer.startedAt) {
        completionSignaledFor.current = timer.startedAt;
        // Haptics are deliberately best-effort: unsupported browsers and denied
        // permissions stay silent, while Android can provide a brief completion cue.
        navigator.vibrate?.([120, 80, 120]);
        onComplete();
      }
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [onComplete, timer]);

  return (
    <section
      className={`rest-timer${remaining === 0 ? ' rest-timer--complete' : ''}`}
      aria-label="Rest timer"
      aria-live="polite"
    >
      <div>
        <span>
          {remaining === 0 ? 'Rest complete' : 'Recover for next set'}
        </span>
        <strong>{timeLabel(remaining)}</strong>
        <small>Next: {nextTarget}</small>
      </div>
      <div className="rest-timer__actions">
        <button type="button" onClick={() => onAdjust(-15)}>
          −15s
        </button>
        <button type="button" onClick={() => onAdjust(15)}>
          +15s
        </button>
        <button type="button" onClick={onSkip}>
          Skip
        </button>
      </div>
    </section>
  );
}
