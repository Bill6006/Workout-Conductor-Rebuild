import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import {
  equipmentOptions,
  experienceLevels,
  listFromText,
  listToText,
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
import { createBackupFoundation, downloadBackup } from '../storage/backup';

type SettingsViewProps = {
  bundle: AppBundle;
  storageStatus: string;
  onSave: (bundle: AppBundle) => Promise<void>;
  onImport: (text: string) => Promise<void>;
  onRestartOnboarding: () => void;
};

function cloneBundle(bundle: AppBundle): AppBundle {
  return structuredClone(bundle);
}

export function SettingsView({
  bundle,
  storageStatus,
  onSave,
  onImport,
  onRestartOnboarding,
}: SettingsViewProps) {
  const [draft, setDraft] = useState(() => cloneBundle(bundle));
  const [preferredText, setPreferredText] = useState(() =>
    listToText(bundle.profile?.preferredExercises ?? []),
  );
  const [dislikedText, setDislikedText] = useState(() =>
    listToText(bundle.profile?.dislikedExercises ?? []),
  );
  const [limitationsText, setLimitationsText] = useState(() =>
    listToText(bundle.profile?.limitations ?? []),
  );
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [message, setMessage] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const profile = draft.profile!;

  function updateProfile(changes: Partial<Profile>) {
    setSaveState('idle');
    setDraft({ ...draft, profile: { ...profile, ...changes } });
  }

  function updateSettings(changes: Partial<AppSettings>) {
    setSaveState('idle');
    setDraft({ ...draft, settings: { ...draft.settings, ...changes } });
  }

  function updateLocation(
    locationId: string,
    changes: { name?: string; kind?: 'home' | 'gym' | 'travel' },
  ) {
    setSaveState('idle');
    const updatedAt = new Date().toISOString();
    const location = draft.locations.find((item) => item.id === locationId);
    if (!location) return;
    setDraft({
      ...draft,
      locations: draft.locations.map((item) =>
        item.id === locationId ? { ...item, ...changes, updatedAt } : item,
      ),
      equipmentProfiles: draft.equipmentProfiles.map((item) =>
        item.id === location.equipmentProfileId
          ? {
              ...item,
              name: changes.name ? `${changes.name} Equipment` : item.name,
              kind: changes.kind ?? item.kind,
              updatedAt,
            }
          : item,
      ),
    });
  }

  function toggleEquipment(locationId: string, equipmentItem: string) {
    setSaveState('idle');
    const location = draft.locations.find((item) => item.id === locationId);
    if (!location) return;
    setDraft({
      ...draft,
      equipmentProfiles: draft.equipmentProfiles.map((equipmentProfile) => {
        if (equipmentProfile.id !== location.equipmentProfileId)
          return equipmentProfile;
        const selected = equipmentProfile.items.includes(equipmentItem);
        return {
          ...equipmentProfile,
          items: selected
            ? equipmentProfile.items.filter((item) => item !== equipmentItem)
            : [...equipmentProfile.items, equipmentItem],
          updatedAt: new Date().toISOString(),
        };
      }),
    });
  }

  function addLocation() {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const equipmentProfileId = `equipment-${unique}`;
    const updatedAt = new Date().toISOString();
    setDraft({
      ...draft,
      equipmentProfiles: [
        ...draft.equipmentProfiles,
        {
          id: equipmentProfileId,
          name: 'New Location Equipment',
          kind: 'home',
          items: [],
          updatedAt,
        },
      ],
      locations: [
        ...draft.locations,
        {
          id: `location-${unique}`,
          name: 'New Location',
          kind: 'home',
          equipmentProfileId,
          isDefault: draft.locations.length === 0,
          updatedAt,
        },
      ],
    });
    setSaveState('idle');
  }

  function setDefaultLocation(locationId: string) {
    setDraft({
      ...draft,
      locations: draft.locations.map((location) => ({
        ...location,
        isDefault: location.id === locationId,
        updatedAt: new Date().toISOString(),
      })),
    });
    setSaveState('idle');
  }

  async function saveChanges() {
    setSaveState('saving');
    setMessage('');
    try {
      await onSave({
        ...draft,
        profile: {
          ...profile,
          preferredExercises: listFromText(preferredText),
          dislikedExercises: listFromText(dislikedText),
          limitations: listFromText(limitationsText),
          updatedAt: new Date().toISOString(),
        },
      });
      setSaveState('saved');
      setMessage(
        'Profile, settings, and saved locations were written and verified.',
      );
    } catch (error) {
      setSaveState('error');
      setMessage(
        error instanceof Error ? error.message : 'Unable to save settings.',
      );
    }
  }

  async function exportBackup() {
    setMessage('Preparing local export…');
    try {
      const backup = await createBackupFoundation();
      downloadBackup(backup);
      setMessage(
        'Backup foundation exported from this browser. Keep it private.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to export backup.',
      );
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setMessage('Validating and verifying import…');
    try {
      await onImport(await file.text());
      setMessage('Validated profile foundation imported and verified locally.');
      setSaveState('saved');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Import was rejected.',
      );
      setSaveState('error');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Local control</p>
          <h1>Settings</h1>
        </div>
        <div className="avatar" aria-label="Verified local profile">
          <Icon name="shield" size={21} />
        </div>
      </header>

      <section className="settings-summary">
        <div>
          <span className="status-pill">
            <span /> Profile active
          </span>
          <span className="build-label">WC-P4-0810</span>
        </div>
        <h2>{profile.displayName}</h2>
        <p>
          {profile.primaryGoal} · {profile.experience} ·{' '}
          {profile.weeklyFrequency} days/week
        </p>
        <div className="summary-tags">
          <span>{draft.settings.programmingStyle}</span>
          <span>{draft.settings.units}</span>
          <span>
            {draft.locations.length} saved{' '}
            {draft.locations.length === 1 ? 'location' : 'locations'}
          </span>
        </div>
      </section>

      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          void saveChanges();
        }}
      >
        <details className="settings-section" open>
          <summary>
            <span>
              <Icon name="signal" size={20} />
              <span>
                <strong>Profile & goals</strong>
                <small>Direction, schedule, and experience</small>
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </summary>
          <div className="settings-section__body">
            <label className="field-label">
              Profile name
              <input
                value={profile.displayName}
                maxLength={40}
                onChange={(event) =>
                  updateProfile({ displayName: event.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label className="field-label">
                Primary goal
                <select
                  value={profile.primaryGoal}
                  onChange={(event) =>
                    updateProfile({
                      primaryGoal: event.target.value as Profile['primaryGoal'],
                    })
                  }
                >
                  {primaryGoals.map((goal) => (
                    <option key={goal}>{goal}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Secondary goal
                <select
                  value={profile.secondaryGoal}
                  onChange={(event) =>
                    updateProfile({
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
              <label className="field-label">
                Experience
                <select
                  value={profile.experience}
                  onChange={(event) =>
                    updateProfile({
                      experience: event.target.value as Profile['experience'],
                    })
                  }
                >
                  {experienceLevels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Days per week
                <select
                  value={profile.weeklyFrequency}
                  onChange={(event) =>
                    updateProfile({
                      weeklyFrequency: Number(event.target.value),
                    })
                  }
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Default duration
                <input
                  type="number"
                  min="15"
                  max="180"
                  value={profile.typicalDuration}
                  onChange={(event) =>
                    updateProfile({
                      typicalDuration: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="field-label">
                Bodyweight ({draft.settings.units})
                <input
                  type="number"
                  min="1"
                  max="1000"
                  inputMode="decimal"
                  value={profile.bodyweight ?? ''}
                  placeholder="Optional"
                  onChange={(event) =>
                    updateProfile({
                      bodyweight: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
              </label>
            </div>
            <fieldset className="field-group">
              <legend>Available days</legend>
              <div className="day-grid">
                {weekDays.map((day) => {
                  const selected = profile.availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      className={
                        selected
                          ? 'choice-chip choice-chip--selected'
                          : 'choice-chip'
                      }
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        updateProfile({
                          availableDays: selected
                            ? profile.availableDays.filter(
                                (item) => item !== day,
                              )
                            : [...profile.availableDays, day],
                        })
                      }
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </details>

        <details className="settings-section" open>
          <summary>
            <span>
              <Icon name="spark" size={20} />
              <span>
                <strong>Training style</strong>
                <small>Optional techniques and pacing</small>
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </summary>
          <div className="settings-section__body">
            <label className="field-label">
              Programming style
              <select
                value={draft.settings.programmingStyle}
                onChange={(event) =>
                  updateSettings({
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
              ['allowSupersets', 'Allow supersets'],
              ['allowDropSets', 'Allow drop sets'],
              ['allowCircuits', 'Allow circuits'],
            ].map(([key, label]) => (
              <label className="toggle-row" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>Available to the future engine when appropriate</small>
                </span>
                <input
                  type="checkbox"
                  checked={
                    draft.settings[
                      key as keyof Pick<
                        AppSettings,
                        'allowSupersets' | 'allowDropSets' | 'allowCircuits'
                      >
                    ]
                  }
                  onChange={(event) =>
                    updateSettings({ [key]: event.target.checked })
                  }
                />
              </label>
            ))}
            <div className="form-grid">
              <label className="field-label">
                Rest style
                <select
                  value={draft.settings.restStyle}
                  onChange={(event) =>
                    updateSettings({
                      restStyle: event.target.value as AppSettings['restStyle'],
                    })
                  }
                >
                  {restStyles.map((style) => (
                    <option key={style}>{style}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Units
                <select
                  value={draft.settings.units}
                  onChange={(event) =>
                    updateSettings({
                      units: event.target.value as AppSettings['units'],
                    })
                  }
                >
                  {unitSystems.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </details>

        <details className="settings-section" open>
          <summary>
            <span>
              <Icon name="pin" size={20} />
              <span>
                <strong>Locations & equipment</strong>
                <small>Saved local profiles</small>
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </summary>
          <div className="settings-section__body">
            <div className="saved-profile-list">
              {draft.locations.map((location) => {
                const equipmentProfile = draft.equipmentProfiles.find(
                  (item) => item.id === location.equipmentProfileId,
                );
                return (
                  <article className="saved-profile-card" key={location.id}>
                    <div className="saved-profile-card__heading">
                      <span className="profile-kind">{location.kind}</span>
                      {location.isDefault && (
                        <span className="default-badge">Default</span>
                      )}
                    </div>
                    <label className="field-label">
                      Location name
                      <input
                        value={location.name}
                        onChange={(event) =>
                          updateLocation(location.id, {
                            name: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="field-label">
                      Type
                      <select
                        value={location.kind}
                        onChange={(event) =>
                          updateLocation(location.id, {
                            kind: event.target.value as typeof location.kind,
                          })
                        }
                      >
                        <option value="home">Home</option>
                        <option value="gym">Gym</option>
                        <option value="travel">Travel</option>
                      </select>
                    </label>
                    <div className="equipment-grid">
                      {equipmentOptions.map((item) => {
                        const selected =
                          equipmentProfile?.items.includes(item) ?? false;
                        return (
                          <button
                            key={item}
                            className={
                              selected
                                ? 'choice-chip choice-chip--selected'
                                : 'choice-chip'
                            }
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleEquipment(location.id, item)}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                    {!location.isDefault && (
                      <button
                        className="small-text-button"
                        type="button"
                        onClick={() => setDefaultLocation(location.id)}
                      >
                        Make default
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            <button
              className="outline-button"
              type="button"
              onClick={addLocation}
            >
              <Icon name="plus" size={18} /> Add saved location
            </button>
          </div>
        </details>

        <details className="settings-section">
          <summary>
            <span>
              <Icon name="shield" size={20} />
              <span>
                <strong>Preferences & limitations</strong>
                <small>Exercises, pain, and movement guardrails</small>
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </summary>
          <div className="settings-section__body">
            <label className="field-label">
              Preferred exercises
              <input
                value={preferredText}
                placeholder="Comma separated"
                onChange={(event) => {
                  setPreferredText(event.target.value);
                  setSaveState('idle');
                }}
              />
            </label>
            <label className="field-label">
              Disliked exercises
              <input
                value={dislikedText}
                placeholder="Comma separated"
                onChange={(event) => {
                  setDislikedText(event.target.value);
                  setSaveState('idle');
                }}
              />
            </label>
            <label className="field-label">
              Pain or movement limitations
              <textarea
                value={limitationsText}
                placeholder="Comma separated"
                onChange={(event) => {
                  setLimitationsText(event.target.value);
                  setSaveState('idle');
                }}
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Gym access</strong>
                <small>Available beyond the default location</small>
              </span>
              <input
                type="checkbox"
                checked={profile.gymAccess}
                onChange={(event) =>
                  updateProfile({ gymAccess: event.target.checked })
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Shoulder limitations</strong>
                <small>Flag shoulder-sensitive movement choices</small>
              </span>
              <input
                type="checkbox"
                checked={profile.shoulderLimitations}
                onChange={(event) =>
                  updateProfile({ shoulderLimitations: event.target.checked })
                }
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Avoid barbell squats</strong>
                <small>Prefer other lower-body patterns</small>
              </span>
              <input
                type="checkbox"
                checked={profile.avoidBarbellSquats}
                onChange={(event) =>
                  updateProfile({ avoidBarbellSquats: event.target.checked })
                }
              />
            </label>
          </div>
        </details>

        <details className="settings-section">
          <summary>
            <span>
              <Icon name="database" size={20} />
              <span>
                <strong>Backup & diagnostics</strong>
                <small>Validated local data controls</small>
              </span>
            </span>
            <Icon name="chevron" size={18} />
          </summary>
          <div className="settings-section__body">
            <div className="diagnostic-card">
              <span className="diagnostic-card__mark">
                <Icon name="check" size={18} />
              </span>
              <div>
                <strong>Storage ready</strong>
                <p>{storageStatus}</p>
              </div>
            </div>
            <div className="data-action-grid">
              <button
                className="outline-button"
                type="button"
                onClick={() => void exportBackup()}
              >
                <Icon name="download" size={18} /> Export JSON
              </button>
              <button
                className="outline-button"
                type="button"
                onClick={() => importInputRef.current?.click()}
              >
                <Icon name="upload" size={18} /> Import JSON
              </button>
              <input
                ref={importInputRef}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                aria-label="Import backup JSON"
                onChange={(event) => void importFile(event.target.files?.[0])}
              />
            </div>
            <p className="foundation-note">
              Phase 1 validates and verifies profile foundations. Exact restore,
              rollback, migrations, and unknown-field preservation remain owned
              by Phase 8.
            </p>
            <button
              className="small-text-button"
              type="button"
              onClick={onRestartOnboarding}
            >
              Review onboarding flow
            </button>
          </div>
        </details>

        {message && (
          <p
            className={
              saveState === 'error'
                ? 'save-message save-message--error'
                : 'save-message'
            }
            role="status"
          >
            {message}
          </p>
        )}
        <button
          className="sticky-save-button"
          type="submit"
          disabled={saveState === 'saving'}
        >
          {saveState === 'saving'
            ? 'Writing and verifying…'
            : saveState === 'saved'
              ? 'Saved and verified'
              : 'Save local profile'}
          <Icon name={saveState === 'saved' ? 'check' : 'database'} size={19} />
        </button>
      </form>
    </>
  );
}
