import { Icon } from '../components/Icon';
import type { AppBundle } from '../domain/models';

export function PlanView({ bundle }: { bundle: AppBundle }) {
  const profile = bundle.profile!;

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
          Generation and weekly-volume decisions arrive in Phase 3. Your
          planning inputs are already saved locally.
        </p>
      </section>

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
            <small>Foundation ready for future evidence</small>
          </span>
        </div>
      </section>
    </>
  );
}
