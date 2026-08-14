import { useMemo, useState } from 'react';
import {
  equipmentOptions,
  experienceLevels,
  listFromText,
  primaryGoals,
  restStyles,
  secondaryGoals,
  trainingStyles,
  unitSystems,
  weekDays,
  type AppBundle,
  type AppSettings,
  type Profile,
} from '../domain/models';
import { ZodError } from 'zod';
import {
  createDemoBundle,
  defaultSettings,
  onboardingProfileDefaults,
} from '../domain/defaults';
import { Icon } from './Icon';

type OnboardingProps = {
  onComplete: (bundle: AppBundle) => Promise<void>;
  onCancel?: () => void;
};

const stepTitles = ['Goals', 'Schedule', 'Places', 'Style', 'Guardrails'];

function ToggleChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={selected ? 'choice-chip choice-chip--selected' : 'choice-chip'}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      {selected && <Icon name="check" size={15} />}
      {children}
    </button>
  );
}

export function Onboarding({ onComplete, onCancel }: OnboardingProps) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Omit<Profile, 'updatedAt'>>(
    onboardingProfileDefaults,
  );
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [locationName, setLocationName] = useState('Home Gym');
  const [locationKind, setLocationKind] = useState<'home' | 'gym' | 'travel'>(
    'home',
  );
  const [equipment, setEquipment] = useState<string[]>([
    'Adjustable dumbbells',
    'Adjustable bench',
  ]);
  const [preferredText, setPreferredText] = useState('');
  const [dislikedText, setDislikedText] = useState('');
  const [limitationsText, setLimitationsText] = useState('');
  const [bodyweightText, setBodyweightText] = useState('');

  const progress = useMemo(
    () => `${((step + 1) / stepTitles.length) * 100}%`,
    [step],
  );

  async function save(bundle: AppBundle) {
    setSaving(true);
    setError('');
    try {
      await onComplete(bundle);
    } catch (saveError) {
      setError(
        saveError instanceof ZodError
          ? (saveError.issues[0]?.message ?? 'Setup contains an invalid value.')
          : saveError instanceof Error
            ? saveError.message
            : 'Unable to save setup.',
      );
      setSaving(false);
    }
  }

  async function finishSetup() {
    const updatedAt = new Date().toISOString();
    const equipmentProfileId = 'equipment-primary';
    const parsedBodyweight = Number(bodyweightText);
    if (
      bodyweightText.trim() &&
      (!Number.isFinite(parsedBodyweight) ||
        parsedBodyweight <= 0 ||
        parsedBodyweight > 1000)
    ) {
      setError('Bodyweight must be greater than 0 and no more than 1000.');
      document.getElementById('onboarding-bodyweight')?.focus();
      return;
    }
    const completedProfile: Profile = {
      ...profile,
      preferredExercises: listFromText(preferredText),
      dislikedExercises: listFromText(dislikedText),
      limitations: listFromText(limitationsText),
      bodyweight:
        bodyweightText.trim() && Number.isFinite(parsedBodyweight)
          ? parsedBodyweight
          : null,
      onboardingComplete: true,
      isDemo: false,
      updatedAt,
    };

    await save({
      profile: completedProfile,
      settings,
      equipmentProfiles: [
        {
          id: equipmentProfileId,
          name: `${locationName.trim() || 'My Location'} Equipment`,
          kind: locationKind,
          items: equipment,
          updatedAt,
        },
      ],
      locations: [
        {
          id: 'location-primary',
          name: locationName.trim() || 'My Location',
          kind: locationKind,
          equipmentProfileId,
          isDefault: true,
          updatedAt,
        },
      ],
    });
  }

  if (!started) {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-welcome">
          {onCancel && (
            <button
              className="onboarding-close"
              type="button"
              onClick={onCancel}
            >
              Back to app
            </button>
          )}
          <div className="brand-mark">
            <Icon name="workout" size={31} />
          </div>
          <div className="welcome-phase">
            <span /> Phase 1 · Private setup
          </div>
          <p className="overline">Workout Conductor</p>
          <h1>Your training, intelligently arranged.</h1>
          <p className="welcome-copy">
            Five focused steps give your local coach enough context to build
            around your goals, time, equipment, and limits.
          </p>

          <div className="welcome-points">
            <div>
              <Icon name="spark" size={19} />
              <span>Hybrid muscle and strength priorities</span>
            </div>
            <div>
              <Icon name="clock" size={19} />
              <span>Workouts shaped around available time</span>
            </div>
            <div>
              <Icon name="shield" size={19} />
              <span>Your profile stays in this browser</span>
            </div>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => setStarted(true)}
          >
            Set up my coach <Icon name="arrow" size={20} />
          </button>
          <button
            className="text-button"
            type="button"
            disabled={saving}
            onClick={() => void save(createDemoBundle())}
          >
            {saving
              ? 'Saving demo locally…'
              : 'Explore with a synthetic demo profile'}
          </button>
          <p className="demo-disclaimer">
            Demo content is fictional and contains no personal workout data.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-shell">
      <div className="onboarding-panel">
        <header className="setup-header">
          <div>
            <p className="eyebrow">
              Step {step + 1} of {stepTitles.length}
            </p>
            <h1>{stepTitles[step]}</h1>
          </div>
          <span className="build-label">WC-P8UXR2-0814</span>
        </header>
        <div
          className="setup-progress"
          aria-label={`Setup progress: step ${step + 1} of ${stepTitles.length}`}
        >
          <span style={{ width: progress }} />
        </div>

        {step === 0 && (
          <section className="setup-step" aria-labelledby="goals-heading">
            <div className="step-intro">
              <p className="overline">Direction first</p>
              <h2 id="goals-heading">What should training move toward?</h2>
              <p>
                Build Muscle is the product default. You can change every answer
                later.
              </p>
            </div>
            <label className="field-label">
              Profile name
              <input
                value={profile.displayName}
                maxLength={40}
                onChange={(event) =>
                  setProfile({ ...profile, displayName: event.target.value })
                }
              />
            </label>
            <fieldset className="field-group">
              <legend>Primary goal</legend>
              <div className="choice-grid choice-grid--two">
                {primaryGoals.map((goal) => (
                  <ToggleChip
                    key={goal}
                    selected={profile.primaryGoal === goal}
                    onClick={() =>
                      setProfile({ ...profile, primaryGoal: goal })
                    }
                  >
                    {goal}
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
            <label className="field-label">
              Secondary goal
              <select
                value={profile.secondaryGoal}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    secondaryGoal: event.target
                      .value as Profile['secondaryGoal'],
                  })
                }
              >
                {secondaryGoals.map((goal) => (
                  <option key={goal}>{goal}</option>
                ))}
              </select>
            </label>
            <fieldset className="field-group">
              <legend>Training experience</legend>
              <div className="choice-grid choice-grid--three">
                {experienceLevels.map((level) => (
                  <ToggleChip
                    key={level}
                    selected={profile.experience === level}
                    onClick={() =>
                      setProfile({ ...profile, experience: level })
                    }
                  >
                    {level}
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
          </section>
        )}

        {step === 1 && (
          <section className="setup-step" aria-labelledby="schedule-heading">
            <div className="step-intro">
              <p className="overline">Fit real life</p>
              <h2 id="schedule-heading">When does training fit?</h2>
              <p>These are defaults, not rigid promises.</p>
            </div>
            <label className="field-label">
              Workouts per week
              <select
                value={profile.weeklyFrequency}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    weeklyFrequency: Number(event.target.value),
                  })
                }
              >
                {[2, 3, 4, 5, 6].map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency} days
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="field-group">
              <legend>Typical workout duration</legend>
              <div className="choice-grid choice-grid--four">
                {[30, 45, 60, 75].map((duration) => (
                  <ToggleChip
                    key={duration}
                    selected={profile.typicalDuration === duration}
                    onClick={() =>
                      setProfile({ ...profile, typicalDuration: duration })
                    }
                  >
                    {duration} min
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
            <fieldset className="field-group">
              <legend>Available workout days</legend>
              <div className="day-grid">
                {weekDays.map((day) => {
                  const selected = profile.availableDays.includes(day);
                  return (
                    <ToggleChip
                      key={day}
                      selected={selected}
                      onClick={() =>
                        setProfile({
                          ...profile,
                          availableDays: selected
                            ? profile.availableDays.filter(
                                (item) => item !== day,
                              )
                            : [...profile.availableDays, day],
                        })
                      }
                    >
                      {day.slice(0, 3)}
                    </ToggleChip>
                  );
                })}
              </div>
            </fieldset>
          </section>
        )}

        {step === 2 && (
          <section className="setup-step" aria-labelledby="places-heading">
            <div className="step-intro">
              <p className="overline">Know the room</p>
              <h2 id="places-heading">Where will you train?</h2>
              <p>
                Save one starting location now. More can be added in Settings.
              </p>
            </div>
            <label className="field-label">
              Location name
              <input
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
              />
            </label>
            <fieldset className="field-group">
              <legend>Location type</legend>
              <div className="choice-grid choice-grid--three">
                {(['home', 'gym', 'travel'] as const).map((kind) => (
                  <ToggleChip
                    key={kind}
                    selected={locationKind === kind}
                    onClick={() => setLocationKind(kind)}
                  >
                    {kind[0].toUpperCase() + kind.slice(1)}
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
            <label className="toggle-row">
              <span>
                <strong>Gym access</strong>
                <small>
                  Available even if this is not your default location
                </small>
              </span>
              <input
                type="checkbox"
                checked={profile.gymAccess}
                onChange={(event) =>
                  setProfile({ ...profile, gymAccess: event.target.checked })
                }
              />
            </label>
            <fieldset className="field-group">
              <legend>Available equipment</legend>
              <div className="choice-grid choice-grid--two">
                {equipmentOptions.map((item) => {
                  const selected = equipment.includes(item);
                  return (
                    <ToggleChip
                      key={item}
                      selected={selected}
                      onClick={() =>
                        setEquipment(
                          selected
                            ? equipment.filter((value) => value !== item)
                            : [...equipment, item],
                        )
                      }
                    >
                      {item}
                    </ToggleChip>
                  );
                })}
              </div>
            </fieldset>
          </section>
        )}

        {step === 3 && (
          <section className="setup-step" aria-labelledby="style-heading">
            <div className="step-intro">
              <p className="overline">Make it yours</p>
              <h2 id="style-heading">How should sessions feel?</h2>
              <p>
                Advanced techniques stay optional and are never treated as
                separate workout modes.
              </p>
            </div>
            <label className="field-label">
              Programming style
              <select
                value={settings.programmingStyle}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    programmingStyle: event.target
                      .value as AppSettings['programmingStyle'],
                  })
                }
              >
                {trainingStyles.map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </label>
            {[
              [
                'allowSupersets',
                'Allow supersets',
                'Use when they save time without hurting priority work.',
              ],
              [
                'allowDropSets',
                'Allow drop sets',
                'Use selectively for time-efficient hypertrophy.',
              ],
              [
                'allowCircuits',
                'Allow circuits',
                'Use only when the goal and equipment support them.',
              ],
            ].map(([key, label, copy]) => (
              <label className="toggle-row" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>{copy}</small>
                </span>
                <input
                  type="checkbox"
                  checked={
                    settings[
                      key as keyof Pick<
                        AppSettings,
                        'allowSupersets' | 'allowDropSets' | 'allowCircuits'
                      >
                    ]
                  }
                  onChange={(event) =>
                    setSettings({ ...settings, [key]: event.target.checked })
                  }
                />
              </label>
            ))}
            <label className="field-label">
              Rest-time style
              <select
                value={settings.restStyle}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    restStyle: event.target.value as AppSettings['restStyle'],
                  })
                }
              >
                {restStyles.map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </label>
            <fieldset className="field-group">
              <legend>Preferred units</legend>
              <div className="choice-grid choice-grid--two">
                {unitSystems.map((unit) => (
                  <ToggleChip
                    key={unit}
                    selected={settings.units === unit}
                    onClick={() => setSettings({ ...settings, units: unit })}
                  >
                    {unit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                  </ToggleChip>
                ))}
              </div>
            </fieldset>
          </section>
        )}

        {step === 4 && (
          <section className="setup-step" aria-labelledby="guardrails-heading">
            <div className="step-intro">
              <p className="overline">Train around you</p>
              <h2 id="guardrails-heading">Preferences and guardrails</h2>
              <p>
                Use commas for multiple exercises or limitations. Leave anything
                blank that does not apply.
              </p>
            </div>
            <label className="field-label">
              Preferred exercises
              <input
                value={preferredText}
                placeholder="e.g. incline press, curls"
                onChange={(event) => setPreferredText(event.target.value)}
              />
            </label>
            <label className="field-label">
              Disliked exercises
              <input
                value={dislikedText}
                placeholder="e.g. burpees"
                onChange={(event) => setDislikedText(event.target.value)}
              />
            </label>
            <label className="field-label">
              Pain or movement limitations
              <textarea
                value={limitationsText}
                placeholder="e.g. avoid deep knee flexion"
                onChange={(event) => setLimitationsText(event.target.value)}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Shoulder limitations</strong>
                <small>Keep shoulder-sensitive choices out of the way.</small>
              </span>
              <input
                type="checkbox"
                checked={profile.shoulderLimitations}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    shoulderLimitations: event.target.checked,
                  })
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Avoid barbell squats</strong>
                <small>Prefer other lower-body patterns.</small>
              </span>
              <input
                type="checkbox"
                checked={profile.avoidBarbellSquats}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    avoidBarbellSquats: event.target.checked,
                  })
                }
              />
            </label>
            <label className="field-label">
              Optional bodyweight ({settings.units})
              <input
                id="onboarding-bodyweight"
                type="number"
                min="1"
                max="1000"
                step="any"
                inputMode="decimal"
                aria-describedby={error ? 'onboarding-form-error' : undefined}
                aria-invalid={Boolean(error)}
                value={bodyweightText}
                placeholder="Optional"
                onChange={(event) => setBodyweightText(event.target.value)}
              />
            </label>
            <div className="local-save-note">
              <Icon name="database" size={20} />
              <span>
                <strong>Verified local save</strong>Your profile will be
                written, read back, and checked before setup reports success.
              </span>
            </div>
          </section>
        )}

        {error && (
          <p className="form-error" id="onboarding-form-error" role="alert">
            {error}
          </p>
        )}
        <footer className="setup-footer">
          <button
            className="secondary-button"
            type="button"
            onClick={() => (step === 0 ? setStarted(false) : setStep(step - 1))}
          >
            Back
          </button>
          {step < stepTitles.length - 1 ? (
            <button
              className="primary-button"
              type="button"
              disabled={step === 1 && profile.availableDays.length === 0}
              onClick={() => setStep(step + 1)}
            >
              Continue <Icon name="arrow" size={19} />
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              disabled={saving}
              onClick={() => void finishSetup()}
            >
              {saving ? 'Verifying save…' : 'Finish setup'}{' '}
              <Icon name="check" size={19} />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
