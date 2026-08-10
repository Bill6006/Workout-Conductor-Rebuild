import { useState } from 'react';
import { syntheticWorkout } from '../domain/defaults';
import type { AppBundle } from '../domain/models';
import { Icon } from '../components/Icon';

type TodayViewProps = {
  bundle: AppBundle;
};

const durationOptions = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  {
    value: 'default',
    label: `Default time · ${syntheticWorkout.plannedMinutes} min`,
  },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function TodayView({ bundle }: TodayViewProps) {
  const [duration, setDuration] = useState('default');
  const [showWorkout, setShowWorkout] = useState(false);
  const profile = bundle.profile!;
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
          <span /> Phase 1 live
        </span>
        <span className="build-label">WC-P1-0810</span>
      </div>

      <section className="today-hero" aria-labelledby="today-workout-title">
        <div className="today-hero__glow" />
        <div className="today-hero__topline">
          <span className="synthetic-pill">
            <Icon name="spark" size={14} /> Synthetic demo
          </span>
          <span className="readiness-pill">
            <span /> {syntheticWorkout.readiness}
          </span>
        </div>
        <p className="overline">Recommended today</p>
        <h2 id="today-workout-title">{syntheticWorkout.title}</h2>
        <div className="focus-row" aria-label="Muscle focus">
          {syntheticWorkout.focus.map((muscle) => (
            <span key={muscle}>{muscle}</span>
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
              onChange={(event) => setDuration(event.target.value)}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
        <p className="preview-note" id="duration-preview-note">
          Preview selection only. Intelligent duration recalibration arrives
          with the approved generation phase.
        </p>

        <button
          className="primary-button"
          type="button"
          aria-expanded={showWorkout}
          onClick={() => setShowWorkout(!showWorkout)}
        >
          {showWorkout ? 'Hide workout preview' : 'Review workout preview'}
          <Icon name={showWorkout ? 'check' : 'arrow'} size={20} />
        </button>
      </section>

      {showWorkout && (
        <section
          className="exercise-preview"
          aria-label="Synthetic workout exercises"
        >
          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">Preview only</p>
              <h2>Session outline</h2>
            </div>
            <span className="quiet-chip">4 exercises</span>
          </div>
          <div className="exercise-list">
            {syntheticWorkout.exercises.map((exercise, index) => (
              <article className="exercise-row" key={exercise.name}>
                <span className="exercise-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <strong>{exercise.name}</strong>
                  <p>{exercise.detail}</p>
                </div>
                <span>{exercise.role}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="why-card">
        <div className="why-card__icon">
          <Icon name="spark" size={20} />
        </div>
        <div>
          <p className="overline">Why this workout</p>
          <h3>Priority work, then focused volume.</h3>
          <p>{syntheticWorkout.reason}</p>
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
    </>
  );
}
