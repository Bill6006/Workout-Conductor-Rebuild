import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import type { AppBundle } from '../domain/models';
import {
  analyzeProgress,
  sumRecordVolume,
} from '../engine/analytics/analyzeProgress';
import type { ActiveSession } from '../features/activeWorkout/schema';

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function ProgressView({
  bundle,
  sessionHistory,
}: {
  bundle: AppBundle;
  sessionHistory: ActiveSession[];
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const analytics = useMemo(
    () =>
      analyzeProgress(
        sessionHistory,
        bundle.profile!,
        new Date(),
        bundle.settings.units,
      ),
    [bundle, sessionHistory],
  );
  const units = bundle.settings.units;
  const completed = sessionHistory
    .filter((session) => session.status === 'completed')
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Training evidence</p>
          <h1>Progress</h1>
        </div>
        <span
          className={`confidence-chip confidence-chip--${analytics.confidence}`}
        >
          {analytics.confidence} confidence
        </span>
      </header>

      {completed.length === 0 ? (
        <section className="analytics-empty">
          <div className="analytics-empty__icon">
            <Icon name="progress" size={30} />
          </div>
          <p className="overline">Clean slate</p>
          <h2>Your first completed workout starts the evidence.</h2>
          <p>
            No demo history is mixed into real results. Strength, records,
            coverage, and consistency will appear here after you finish a
            session.
          </p>
        </section>
      ) : (
        <>
          <section className="analytics-hero" aria-label="Progress overview">
            <div>
              <span>4-week consistency</span>
              <strong>{analytics.consistencyPercent}%</strong>
              <small>
                {analytics.fourWeekSessions} of{' '}
                {bundle.profile!.weeklyFrequency * 4} planned sessions
              </small>
            </div>
            <div>
              <span>Working volume</span>
              <strong>
                {Math.round(analytics.totalWorkingVolume).toLocaleString()}
              </strong>
              <small>{units} · warm-ups excluded</small>
            </div>
            <div>
              <span>Duration efficiency</span>
              <strong>{analytics.durationEfficiencyPercent}%</strong>
              <small>
                {analytics.averageDurationMinutes} min average ·{' '}
                {analytics.workingSetsPerMinute} sets/min
              </small>
            </div>
          </section>

          <div className="section-heading">
            <div>
              <p className="eyebrow">This week</p>
              <h2>Muscle coverage</h2>
            </div>
            <span className="quiet-chip">direct + indirect</span>
          </div>
          <section className="coverage-card">
            {analytics.coverage.length === 0 ? (
              <p className="analytics-inline-empty">
                No completed working sets in the last 7 days.
              </p>
            ) : (
              analytics.coverage.slice(0, 10).map((row) => {
                const width = Math.min(
                  100,
                  (row.effectiveSets / row.targetMax) * 100,
                );
                return (
                  <div className="coverage-row" key={row.muscle}>
                    <div className="coverage-row__label">
                      <strong>
                        {row.name}
                        {row.priority && <span>Priority</span>}
                      </strong>
                      <small>
                        {row.directSets} direct + {row.indirectSets} indirect ·
                        target {row.targetMin}–{row.targetMax}
                      </small>
                    </div>
                    <div
                      className="coverage-track"
                      aria-label={`${row.name} ${row.effectiveSets} effective sets`}
                    >
                      <span style={{ width: `${width}%` }} />
                    </div>
                    <b>{row.effectiveSets}</b>
                  </div>
                );
              })
            )}
          </section>

          <div className="section-heading">
            <div>
              <p className="eyebrow">Ranked by evidence</p>
              <h2>Exercise progress</h2>
            </div>
            <span className="quiet-chip">{analytics.exercises.length}</span>
          </div>
          <div className="exercise-progress-list">
            {analytics.exercises.slice(0, 8).map((exercise, index) => (
              <article
                className="exercise-progress-card"
                key={exercise.exerciseId}
              >
                <span className="rank-badge">#{index + 1}</span>
                <div className="exercise-progress-card__main">
                  <strong>{exercise.exerciseName}</strong>
                  <small>
                    {exercise.sessionCount} sessions · {exercise.workingSets}{' '}
                    working sets
                  </small>
                  {exercise.note && <p>“{exercise.note}”</p>}
                </div>
                <div className="exercise-progress-card__metric">
                  <strong>
                    {exercise.estimatedStrength
                      ? `${exercise.estimatedStrength} ${units}`
                      : '—'}
                  </strong>
                  <small>estimated strength</small>
                  {exercise.strengthChangePercent !== null && (
                    <span
                      className={
                        exercise.strengthChangePercent >= 0
                          ? 'trend-up'
                          : 'trend-down'
                      }
                    >
                      {exercise.strengthChangePercent >= 0 ? '+' : ''}
                      {exercise.strengthChangePercent}%
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="section-heading">
            <div>
              <p className="eyebrow">Personal records</p>
              <h2>Recent milestones</h2>
            </div>
            <span className="quiet-chip">
              {analytics.personalRecords.length}
            </span>
          </div>
          {analytics.personalRecords.length ? (
            <div className="pr-grid">
              {analytics.personalRecords.slice(0, 8).map((record) => (
                <article className="pr-card" key={record.id}>
                  <span className="pr-badge">PR</span>
                  <div>
                    <strong>{record.exerciseName}</strong>
                    <p>
                      {record.label} · {record.detail}
                    </p>
                    <small>{shortDate(record.achievedAt)}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="analytics-inline-empty">
              Complete a comparable session to establish the first record.
            </p>
          )}

          <div className="section-heading">
            <div>
              <p className="eyebrow">Workout history</p>
              <h2>Completed sessions</h2>
            </div>
            <span className="quiet-chip">{completed.length}</span>
          </div>
          <div className="history-list">
            {completed.slice(0, 10).map((session) => {
              const working = session.records.filter(
                (record) => record.countsTowardWorkingVolume,
              );
              return (
                <article className="history-card" key={session.id}>
                  <div className="history-card__date">
                    <strong>{shortDate(session.completedAt!)}</strong>
                    <span>{new Date(session.completedAt!).getFullYear()}</span>
                  </div>
                  <div>
                    <strong>{session.workout.title}</strong>
                    <p>
                      {working.length} working sets ·{' '}
                      {new Set(working.map((record) => record.exerciseId)).size}{' '}
                      exercises
                    </p>
                  </div>
                  <span>
                    {Math.round(
                      sumRecordVolume(working, units),
                    ).toLocaleString()}{' '}
                    {units}
                  </span>
                </article>
              );
            })}
          </div>
        </>
      )}

      <section className="evidence-panel">
        <button
          type="button"
          onClick={() => setShowEvidence((value) => !value)}
          aria-expanded={showEvidence}
        >
          <span>
            <Icon name="signal" size={18} /> How these numbers are calculated
          </span>
          <small>
            {analytics.sampleLabel} · {analytics.confidence} confidence
          </small>
        </button>
        {showEvidence && (
          <ul>
            {analytics.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="build-card">
        <p className="eyebrow">Current visible build</p>
        <strong>WC-P8UXR3-0814</strong>
        <span>Phase 8 · Data safety, offline readiness, and acceptance</span>
      </section>
    </>
  );
}
