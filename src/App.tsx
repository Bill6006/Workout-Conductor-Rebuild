import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Icon, type IconName } from './components/Icon';
import { Onboarding } from './components/Onboarding';
import { createEmptyBundle } from './domain/defaults';
import type { AppBundle } from './domain/models';
import type { GeneratedWorkout } from './engine/workoutGenerator/schema';
import { createActiveSession } from './features/activeWorkout/session';
import type {
  ActiveSession,
  ReadinessCheck,
} from './features/activeWorkout/schema';
import {
  restoreBackup,
  rollbackLastRestore,
  type BackupPreview,
} from './storage/backup';
import {
  loadBundle,
  loadSessionHistory,
  loadSavedWorkouts,
  migrateWeightBearingRecords,
  saveActiveSessionVerified,
  saveBundleVerified,
  saveWorkoutVerified,
} from './storage/database';
import { saveSettingsVerified } from './storage/settings';
import { CatalogView } from './views/CatalogView';
import { ProgressView } from './views/ProgressView';
import { PlanView } from './views/PlanView';
import { SettingsView } from './views/SettingsView';
import { TodayView } from './views/TodayView';
import { ActiveWorkoutView } from './views/ActiveWorkoutView';
import {
  createSavedWorkout,
  type SavedWorkout,
} from './features/savedWorkouts/schema';
import {
  PWA_APPLY_UPDATE_EVENT,
  PWA_OFFLINE_READY_EVENT,
  PWA_UPDATE_READY_EVENT,
} from './pwaEvents';

type TabId = 'today' | 'workout' | 'catalog' | 'progress' | 'plan' | 'settings';

const navItems: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'workout', label: 'Workout', icon: 'workout' },
  { id: 'catalog', label: 'Catalog', icon: 'catalog' },
  { id: 'progress', label: 'Progress', icon: 'progress' },
  { id: 'plan', label: 'Plan', icon: 'plan' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

async function loadLocalState() {
  const storedBundle = await loadBundle();
  await migrateWeightBearingRecords(storedBundle.settings.units);
  const [storedHistory, storedSaved] = await Promise.all([
    loadSessionHistory(storedBundle.settings.units),
    loadSavedWorkouts(),
  ]);
  const storedSession =
    storedHistory.find((session) => session.status !== 'completed') ?? null;
  return { storedBundle, storedSession, storedHistory, storedSaved };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [bundle, setBundle] = useState<AppBundle>(createEmptyBundle());
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storageStatus, setStorageStatus] = useState(
    'Opening durable local storage…',
  );
  const [announcement, setAnnouncement] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    null,
  );
  const [sessionHistory, setSessionHistory] = useState<ActiveSession[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [storageEpoch, setStorageEpoch] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const activeSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const activeSaveSequence = useRef(0);
  const savedWorkoutLocks = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    void loadLocalState()
      .then(({ storedBundle, storedSession, storedHistory, storedSaved }) => {
        if (!active) return;
        setBundle(storedBundle);
        setActiveSession(storedSession);
        setSessionHistory(storedHistory);
        setSavedWorkouts(storedSaved);
        setShowOnboarding(!storedBundle.profile?.onboardingComplete);
        setStorageStatus(
          storedSession
            ? 'Active workout restored from verified local storage.'
            : 'IndexedDB and local settings are available. Critical saves use read-back verification.',
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setShowOnboarding(true);
        setStorageStatus(
          error instanceof Error
            ? error.message
            : 'Local storage could not be opened.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const showUpdate = () => setUpdateReady(true);
    const showOffline = () => setOfflineReady(true);
    window.addEventListener(PWA_UPDATE_READY_EVENT, showUpdate);
    window.addEventListener(PWA_OFFLINE_READY_EVENT, showOffline);
    return () => {
      window.removeEventListener(PWA_UPDATE_READY_EVENT, showUpdate);
      window.removeEventListener(PWA_OFFLINE_READY_EVENT, showOffline);
    };
  }, []);

  async function saveCompleteBundle(nextBundle: AppBundle) {
    const settings = saveSettingsVerified(nextBundle.settings);
    const verified = await saveBundleVerified({ ...nextBundle, settings });
    setBundle({ ...verified, settings });
    setStorageStatus(
      'Latest profile save was written, read back, schema-validated, and verified.',
    );
    setAnnouncement(
      'Profile, settings, and saved locations were written and verified.',
    );
  }

  async function completeOnboarding(nextBundle: AppBundle) {
    await saveCompleteBundle(nextBundle);
    setShowOnboarding(false);
    setActiveTab('today');
    setAnnouncement(
      nextBundle.profile?.isDemo
        ? 'Synthetic demo profile saved locally.'
        : 'Setup saved and verified locally.',
    );
  }

  async function refreshFromStorage() {
    const { storedBundle, storedSession, storedHistory, storedSaved } =
      await loadLocalState();
    setBundle(storedBundle);
    setActiveSession(storedSession);
    setSessionHistory(storedHistory);
    setSavedWorkouts(storedSaved);
    setStorageEpoch((current) => current + 1);
  }

  async function importCompleteBackup(text: string): Promise<BackupPreview> {
    const preview = await restoreBackup(text);
    await refreshFromStorage();
    setStorageStatus(
      'Restore was previewed, confirmed, schema-validated, read back, and verified. Rollback is available.',
    );
    setAnnouncement(
      preview.kind === 'complete'
        ? 'Exact local restore verified.'
        : 'Legacy profile migration verified; protected history was preserved.',
    );
    return preview;
  }

  async function rollbackImport() {
    await rollbackLastRestore();
    await refreshFromStorage();
    setStorageStatus('Pre-import rollback was restored and verified locally.');
    setAnnouncement('Rollback complete. Pre-import local data restored.');
  }

  async function startWorkout(
    workout: GeneratedWorkout,
    readiness: ReadinessCheck,
  ) {
    if (activeSession && activeSession.status !== 'completed') {
      setActiveTab('workout');
      setAnnouncement('Active workout resumed at the saved position.');
      return;
    }
    const location =
      bundle.locations.find((item) => item.isDefault) ?? bundle.locations[0];
    const equipment = bundle.equipmentProfiles.find(
      (item) => item.id === location?.equipmentProfileId,
    );
    const created = createActiveSession(
      workout,
      new Date(),
      readiness,
      {
        locationId: location?.id ?? null,
        locationKind: location?.kind ?? null,
        equipmentIds: equipment?.items ?? [],
      },
      bundle.settings.units,
    );
    const verified = await saveActiveSessionVerified(created);
    setActiveSession(verified);
    setActiveTab('workout');
    setStorageStatus(
      'Active workout created, read back, and verified locally.',
    );
    setAnnouncement('Workout started and protected by verified local saves.');
  }

  async function saveWorkout(
    workout: GeneratedWorkout,
    source: SavedWorkout['source'],
    sourceSessionId: string | null = null,
  ) {
    const logicalKey = `${source}:${sourceSessionId ?? workout.id}`;
    if (savedWorkoutLocks.current.has(logicalKey)) return;
    savedWorkoutLocks.current.add(logicalKey);
    try {
      const saved = await saveWorkoutVerified(
        createSavedWorkout(workout, source, sourceSessionId),
      );
      setSavedWorkouts((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setStorageStatus(
        'Saved workout was written, read back, and verified locally.',
      );
      setAnnouncement(`${workout.title} saved for reuse in Plan.`);
    } finally {
      savedWorkoutLocks.current.delete(logicalKey);
    }
  }

  function updateActiveSession(next: ActiveSession, message?: string) {
    const previous = activeSession;
    const sequence = ++activeSaveSequence.current;
    setActiveSession(next);
    if (next.status === 'completed') {
      setSessionHistory((current) => [
        next,
        ...current.filter((item) => item.id !== next.id),
      ]);
    }
    if (message) setAnnouncement(message);
    const verification = activeSaveQueue.current
      .catch(() => undefined)
      .then(() => saveActiveSessionVerified(next));
    activeSaveQueue.current = verification.then(
      () => undefined,
      () => undefined,
    );
    return verification
      .then(() => {
        setStorageStatus(
          'Latest active-workout change was written, read back, schema-validated, and verified.',
        );
      })
      .catch((error: unknown) => {
        if (sequence !== activeSaveSequence.current) return;
        setActiveSession(previous);
        const detail =
          error instanceof Error
            ? error.message
            : 'Active workout save failed.';
        setAnnouncement(`${detail} Previous verified session restored.`);
      });
  }

  if (loading) {
    return (
      <div className="loading-screen" role="status">
        <div className="brand-mark">
          <Icon name="workout" size={30} />
        </div>
        <span className="loading-pulse" />
        <p>Opening your private training space…</p>
        <small>WC-P8R2-0811</small>
      </div>
    );
  }

  if (showOnboarding || !bundle.profile) {
    return (
      <Onboarding
        onComplete={completeOnboarding}
        onCancel={bundle.profile ? () => setShowOnboarding(false) : undefined}
      />
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {updateReady && (
        <section className="pwa-update-banner" role="status">
          <div>
            <strong>Safe update ready</strong>
            <span>
              {activeSession && activeSession.status !== 'completed'
                ? 'Finish this verified workout before installing the new app shell.'
                : 'Local data stays in place. Install when you are ready.'}
            </span>
          </div>
          {(!activeSession || activeSession.status === 'completed') && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new Event(PWA_APPLY_UPDATE_EVENT))
              }
            >
              Update app
            </button>
          )}
        </section>
      )}
      {offlineReady && !updateReady && (
        <button
          className="offline-ready-banner"
          type="button"
          onClick={() => setOfflineReady(false)}
        >
          <Icon name="check" size={16} /> Offline app shell ready
        </button>
      )}
      {announcement && (
        <button
          className="app-announcement"
          type="button"
          onClick={() => setAnnouncement('')}
        >
          <Icon name="check" size={16} /> {announcement}
        </button>
      )}
      <main className="page-content" id="main-content">
        {activeTab === 'today' && (
          <TodayView
            bundle={bundle}
            activeSession={activeSession}
            sessionHistory={sessionHistory}
            onStartWorkout={startWorkout}
            onSaveWorkout={(workout) => saveWorkout(workout, 'generated')}
          />
        )}
        {activeTab === 'workout' &&
          (activeSession ? (
            <ActiveWorkoutView
              session={activeSession}
              bundle={bundle}
              sessionHistory={sessionHistory}
              onSessionChange={updateActiveSession}
              onSaveWorkout={(workout, sessionId) =>
                saveWorkout(workout, 'completed', sessionId)
              }
            />
          ) : (
            <CatalogView />
          ))}
        {activeTab === 'progress' && (
          <ProgressView bundle={bundle} sessionHistory={sessionHistory} />
        )}
        {activeTab === 'catalog' && <CatalogView />}
        {activeTab === 'plan' && (
          <PlanView
            bundle={bundle}
            sessionHistory={sessionHistory}
            savedWorkouts={savedWorkouts}
            onStartSaved={startWorkout}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView
            key={`${bundle.profile.updatedAt}-${bundle.locations.length}-${storageEpoch}`}
            bundle={bundle}
            storageStatus={storageStatus}
            onSave={saveCompleteBundle}
            onImport={importCompleteBackup}
            onRollback={rollbackImport}
            onRestartOnboarding={() => setShowOnboarding(true)}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              activeTab === item.id ? 'nav-item nav-item--active' : 'nav-item'
            }
            aria-current={activeTab === item.id ? 'page' : undefined}
            onClick={() => {
              setActiveTab(item.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="nav-item__icon">
              <Icon name={item.icon} size={21} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
