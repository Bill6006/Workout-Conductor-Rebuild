import { Icon } from '../components/Icon';
import type { AppBundle } from '../domain/models';
import { analyzeProgress } from '../engine/analytics/analyzeProgress';
import type {
  ActiveSession,
  ReadinessCheck,
} from '../features/activeWorkout/schema';
import type { SavedWorkout } from '../features/savedWorkouts/schema';

export function PlanView({
  bundle,
  sessionHistory,
  savedWorkouts,
  onStartSaved,
}: {
  bundle: AppBundle;
  sessionHistory: ActiveSession[];
  savedWorkouts: SavedWorkout[];
  onStartSaved: (
    workout: SavedWorkout['workout'],
    readiness: ReadinessCheck,
  ) => void;
}) {
  const profile = bundle.profile!;
  const analytics = analyzeProgress(
    sessionHistory,
    profile,
    new Date(),
    bundle.settings.units,
  );
  const readiness: ReadinessCheck = {
    energy: 3,
    soreness: 2,
    sleep: 3,
    jointDiscomfort: 'none',
    motivation: 3,
    timePressure: 'none',
    checkedAt: new Date().toISOString(),
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Your training map</p>
          <h1>Plan</h1>
        </div>
        <div className="avatar" aria-label="Plan foundation">
          <Icon name="plan" size={21} />
        </div>
      </header>

      <section className="plan-hero">
        <p className="overline">Weekly rhythm</p>
        <h2>
          {profile.weeklyFrequency} sessions built around real availability.
        </h2>
        <div className="day-strip">
          {profile.availableDays.map((day) => (
            <span key={day}>{day.slice(0, 3)}</span>
          ))}
        </div>
        <p>
          {analytics.fourWeekSessions} sessions completed in the last four weeks
          · {analytics.consistencyPercent}% of your planned rhythm.
        </p>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Upcoming sessions</p>
          <h2>Weekly training map</h2>
        </div>
        <span className="quiet-chip">{profile.weeklyFrequency}/week</span>
      </div>
      <div className="upcoming-grid">
        {profile.availableDays
          .slice(0, profile.weeklyFrequency)
          .map((day, index) => (
            <article key={day} className="upcoming-card">
              <span>{index + 1}</span>
              <div>
                <strong>{day}</strong>
                <p>
                  {index === 0
                    ? 'Next adaptive session'
                    : 'Planned training day'}
                </p>
              </div>
            </article>
          ))}
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Weekly muscle targets</p>
          <h2>Coverage balance</h2>
        </div>
        <span className="quiet-chip">effective sets</span>
      </div>
      <section className="planning-targets">
        {analytics.coverage.length ? (
          analytics.coverage.slice(0, 6).map((row) => (
            <div key={row.muscle}>
              <span>
                <strong>{row.name}</strong>
                <small>{row.priority ? 'Priority band' : 'Support band'}</small>
              </span>
              <b>
                {row.effectiveSets} / {row.targetMin}–{row.targetMax}
              </b>
            </div>
          ))
        ) : (
          <p>
            Complete your first session to compare weekly coverage with planning
            bands.
          </p>
        )}
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Saved workouts</p>
          <h2>Reusable sessions</h2>
        </div>
        <span className="quiet-chip">{savedWorkouts.length}</span>
      </div>
      {savedWorkouts.length ? (
        <div className="saved-workout-list">
          {savedWorkouts.map((saved) => (
            <article className="saved-workout-card" key={saved.id}>
              <div>
                <span className="saved-workout-card__icon">
                  <Icon name="workout" size={19} />
                </span>
                <span>
                  <strong>{saved.name}</strong>
                  <small>
                    {saved.workout.estimatedMinutes} min ·{' '}
                    {saved.workout.blocks.length} blocks · saved{' '}
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                    }).format(new Date(saved.savedAt))}
                  </small>
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onStartSaved(saved.workout, {
                    ...readiness,
                    checkedAt: new Date().toISOString(),
                  })
                }
              >
                Start
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="analytics-inline-empty">
          Save a generated or completed workout to reuse it here.
        </p>
      )}

      <div className="section-heading">
        <div>
          <p className="eyebrow">Saved profiles</p>
          <h2>Training locations</h2>
        </div>
        <span className="quiet-chip">{bundle.locations.length}</span>
      </div>

      <div className="location-list">
        {bundle.locations.map((location) => {
          const equipment = bundle.equipmentProfiles.find(
            (item) => item.id === location.equipmentProfileId,
          );
          return (
            <article className="location-card" key={location.id}>
              <div className="location-card__icon">
                <Icon name="pin" size={20} />
              </div>
              <div>
                <strong>{location.name}</strong>
                <p>
                  {equipment?.items.length ?? 0} equipment choices ·{' '}
                  {location.kind}
                </p>
              </div>
              {location.isDefault && <span>Default</span>}
            </article>
          );
        })}
      </div>

      <section className="plan-foundation-card">
        <div>
          <Icon name="signal" size={21} />
          <span>
            <strong>Priority direction</strong>
            <small>
              {profile.primaryGoal} · {profile.secondaryGoal}
            </small>
          </span>
        </div>
        <div>
          <Icon name="clock" size={21} />
          <span>
            <strong>Default session</strong>
            <small>{profile.typicalDuration} minutes</small>
          </span>
        </div>
        <div>
          <Icon name="shield" size={21} />
          <span>
            <strong>Recovery balance</strong>
            <small>
              {analytics.averageDurationMinutes
                ? `${analytics.averageDurationMinutes} min actual average`
                : 'Awaiting completed-session evidence'}
            </small>
          </span>
        </div>
      </section>
      <section className="evidence-callout">
        <Icon name="shield" size={20} />
        <div>
          <strong>Planning stays local and explainable</strong>
          <p>
            Target bands are planning guides: 10–16 effective sets for current
            priorities and 6–12 for support muscles. Readiness and recovery can
            lower the next session.
          </p>
          <small>
            {analytics.sampleLabel} · {analytics.confidence} confidence
          </small>
        </div>
      </section>
    </>
  );
}
