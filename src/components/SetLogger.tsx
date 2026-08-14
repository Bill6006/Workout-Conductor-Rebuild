import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { MAX_SET_REPS } from '../features/activeWorkout/schema';
import type { TempoRecommendation } from '../features/activeWorkout/tempo';

type SetValues = { weight: number; reps: number; rir: number };

type SetLoggerProps = {
  loggerKey: string;
  exerciseName: string;
  setLabel: string;
  targetReps: string;
  targetRir: number;
  tempo?: TempoRecommendation;
  units: 'lb' | 'kg';
  initialValues: SetValues;
  submitLabel?: string;
  bodyweightRegression?: boolean;
  disabled?: boolean;
  onSubmit: (values: SetValues, responseMilliseconds: number) => void;
};

export function SetLogger({
  loggerKey,
  exerciseName,
  setLabel,
  targetReps,
  targetRir,
  tempo,
  units,
  initialValues,
  submitLabel = 'Log set',
  bodyweightRegression = false,
  disabled = false,
  onSubmit,
}: SetLoggerProps) {
  const [weight, setWeight] = useState(String(initialValues.weight));
  const [reps, setReps] = useState(String(initialValues.reps));
  const [rir, setRir] = useState(String(initialValues.rir));
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);
  const values = {
    weight: Number(weight),
    reps: Number(reps),
    rir: Number(rir),
  };
  const valid =
    Number.isFinite(values.weight) &&
    values.weight >= 0 &&
    Number.isInteger(values.reps) &&
    values.reps > 0 &&
    values.reps <= MAX_SET_REPS &&
    Number.isInteger(values.rir) &&
    values.rir >= 0 &&
    values.rir <= 10;

  return (
    <form
      className="set-logger"
      data-logger-key={loggerKey}
      aria-label={`${setLabel} logger for ${exerciseName}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || disabled || submittedRef.current) return;
        submittedRef.current = true;
        setSubmitted(true);
        onSubmit(values, 0);
      }}
    >
      <div className="set-logger__heading">
        <div>
          <span className="set-logger__current">Current</span>
          <strong>{setLabel}</strong>
        </div>
        <div className="set-logger__targets">
          {tempo && (
            <span className="set-logger__tempo" title={tempo.evidenceNote}>
              Recommended tempo · <strong>{tempo.code}</strong>
              <small>{tempo.cue}</small>
            </span>
          )}
          <span>
            Target {targetReps} · {targetRir} RIR
          </span>
        </div>
      </div>
      <div className="set-logger__fields">
        {bodyweightRegression ? (
          <div
            className="set-logger__technique"
            aria-label="Load method: easier bodyweight leverage"
          >
            <span>Load method</span>
            <strong>Easier leverage</strong>
          </div>
        ) : (
          <label>
            <span>Weight</span>
            <div className="set-logger__input-wrap">
              <input
                aria-label="Weight"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.5"
                value={weight}
                disabled={disabled}
                onChange={(event) => setWeight(event.target.value)}
              />
              <small>{units}</small>
            </div>
          </label>
        )}
        <label>
          <span>Reps</span>
          <input
            aria-label="Reps"
            inputMode="numeric"
            type="number"
            min="1"
            max={MAX_SET_REPS}
            step="1"
            value={reps}
            disabled={disabled}
            onChange={(event) => setReps(event.target.value)}
          />
        </label>
        <label>
          <span>RIR</span>
          <input
            aria-label="RIR"
            inputMode="numeric"
            type="number"
            min="0"
            max="10"
            step="1"
            value={rir}
            disabled={disabled}
            onChange={(event) => setRir(event.target.value)}
          />
        </label>
      </div>
      <button
        className="log-set-button"
        type="submit"
        disabled={!valid || disabled || submitted}
      >
        <Icon name="check" size={21} />{' '}
        {submitted ? 'Saving set…' : submitLabel}
      </button>
      <p className="set-logger__hint">
        {Number.isFinite(values.reps) && values.reps > MAX_SET_REPS
          ? `Reps must be between 1 and ${MAX_SET_REPS}.`
          : 'Prefilled from the target or last set. A normal set takes one tap.'}
      </p>
    </form>
  );
}
