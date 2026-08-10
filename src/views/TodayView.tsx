import { useMemo, useState } from 'react';
import { muscleById } from '../catalog/muscles';
import type { AppBundle } from '../domain/models';
import { Icon } from '../components/Icon';
import {
  generateWorkoutFromBundle,
  workoutDurationOptions,
} from '../engine/workoutGenerator/generateWorkout';
import type {
  WorkoutBlock,
  WorkoutDuration,
} from '../engine/workoutGenerator/schema';

type TodayViewProps = {
  bundle: AppBundle;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function blockDetail(block: WorkoutBlock) {
  if (block.kind === 'exercise') {
    const move = block.prescription;
    return `${move.sets} sets · ${move.repRange.min}–${move.repRange.max} reps · ${move.targetRir} RIR · ${move.restSeconds}s rest`;
  }
  return `${block.rounds} rounds · ${block.moves
    .map((move) => `${move.repRange.min}–${move.repRange.max}`)
    .join(' / ')} reps · ${block.restAfterRoundSeconds}s between rounds`;
}

function blockRole(block: WorkoutBlock) {
  if (block.kind === 'superset') return '2-move superset';
  if (block.kind === 'circuit') return `${block.moves.length}-move circuit`;
  return block.prescription.progressionRole.replaceAll('-', ' ');
}

function blockMoves(block: WorkoutBlock) {
  return block.kind === 'exercise' ? [block.prescription] : block.moves;
}

export function TodayView({ bundle }: TodayViewProps) {
  const [duration, setDuration] = useState<WorkoutDuration>('default');
  const [showWorkout, setShowWorkout] = useState(false);
  const profile = bundle.profile!;
  const workout = useMemo(
    () => generateWorkoutFromBundle(bundle, duration),
    [bundle, duration],
  );
  const location =
    bundle.locations.find((item) => item.isDefault) ?? bundle.locations[0];
  const dayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <>
      <header className="page-header page-header--phase-one">
        <div>
          <p className="eyebrow">{dayLabel}</p>
          <h1>Ready, {profile.displayName.split(' ')[0]}.</h1>
        </div>
        <div
          className="avatar"
          aria-label={`${profile.displayName} local profile`}
        >
          {initials(profile.displayName)}
        </div>
      </header>

      <div className="phase-banner">
        <span className="status-pill">
          <span /> Phase 3 live
        </span>
        <span className="build-label">WC-P3-0810</span>
      </div>

      <section className="today-hero" aria-labelledby="today-workout-title">
        <div className="today-hero__glow" />
        <div className="today-hero__topline">
          <span className="synthetic-pill">
            <Icon name="spark" size={14} /> Generated locally
          </span>
          <span className="readiness-pill">
            <span /> Ready
          </span>
        </div>
        <p className="overline">Recommended today</p>
        <h2 id="today-workout-title">{workout.title}</h2>
        <p className="generation-goal">{workout.goal}</p>
        <div className="focus-row" aria-label="Muscle focus">
          {workout.priorities.slice(0, 3).map((muscle) => (
            <span key={muscle}>{muscleById.get(muscle)?.name ?? muscle}</span>
          ))}
        </div>

        <div className="today-controls">
          <label className="duration-control">
            <span>
              <Icon name="clock" size={18} /> Workout length
            </span>
            <select
              aria-describedby="duration-preview-note"
              value={duration}
              onChange={(event) =>
                setDuration(event.target.value as WorkoutDuration)
              }
            >
              {workoutDurationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label(profile.typicalDuration)}
                </option>
              ))}
            </select>
          </label>
          <div className="location-control">
            <span>
              <Icon name="pin" size={18} /> Location
            </span>
            <strong>{location?.name ?? 'Choose in Settings'}</strong>
          </div>
        </div>
        <p
          className="preview-note generation-summary"
          id="duration-preview-note"
          aria-live="polite"
        >
          Generated for{' '}
          {duration === 'default' ? 'default time' : `${duration} minutes`} ·
          estimated {workout.estimatedMinutes} min · {workout.blocks.length}{' '}
          plan blocks
        </p>

        <button
          className="primary-button"
          type="button"
          aria-expanded={showWorkout}
          onClick={() => setShowWorkout(!showWorkout)}
        >
          {showWorkout ? 'Hide generated workout' : 'Review generated workout'}
          <Icon name={showWorkout ? 'check' : 'arrow'} size={20} />
        </button>
      </section>

      {showWorkout && (
        <section
          className="exercise-preview"
          aria-label="Generated workout plan"
        >
          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">Pre-workout plan</p>
              <h2>Generated session</h2>
            </div>
            <span className="quiet-chip">{workout.blocks.length} rows</span>
          </div>
          <div className="exercise-list">
            {workout.blocks.map((block, index) => (
              <article className="exercise-row" key={block.blockId}>
                <span className="exercise-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <strong>{block.canonicalRow}</strong>
                  <p>{blockDetail(block)}</p>
                  <div className="block-flags">
                    {blockMoves(block).some(
                      (move) => move.warmupSets.length > 0,
                    ) && <span>Warm-up planned</span>}
                    {blockMoves(block).some((move) => move.dropSet) && (
                      <span>Final drop set</span>
                    )}
                  </div>
                </div>
                <span>{blockRole(block)}</span>
              </article>
            ))}
          </div>
          <p className="warmup-note">{workout.warmupSummary}</p>
        </section>
      )}

      <section className="why-card">
        <div className="why-card__icon">
          <Icon name="spark" size={20} />
        </div>
        <div>
          <p className="overline">Why this workout</p>
          <h3>Progression first. Volume where it is needed.</h3>
          <p>{workout.explanation}</p>
          <div className="confidence-row">
            <span>{workout.confidence} confidence</span>
            <span>Deterministic engine v{workout.metadata.engineVersion}</span>
            {profile.isDemo && <span>Synthetic profile</span>}
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="mini-stat-card">
          <span>
            <Icon name="signal" size={19} />
          </span>
          <p className="eyebrow">Primary goal</p>
          <strong>{profile.primaryGoal}</strong>
          <small>{profile.secondaryGoal}</small>
        </section>
        <section className="mini-stat-card">
          <span>
            <Icon name="plan" size={19} />
          </span>
          <p className="eyebrow">Weekly rhythm</p>
          <strong>{profile.weeklyFrequency} sessions</strong>
          <small>{profile.typicalDuration} min default</small>
        </section>
      </div>

      <section className="local-data-card">
        <Icon name="shield" size={21} />
        <div>
          <strong>Saved and verified locally</strong>
          <p>
            Your profile and locations use durable browser storage. No account
            or cloud history.
          </p>
        </div>
      </section>

      <p className="phase-boundary-note">
        Pre-workout generation is live. In-workout recalibration and logging
        begin in the next approved phases.
      </p>
    </>
  );
}
