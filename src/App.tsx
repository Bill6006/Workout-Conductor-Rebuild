import { useEffect, useState } from 'react';
import './App.css';
import { Icon, type IconName } from './components/Icon';
import { Onboarding } from './components/Onboarding';
import { createEmptyBundle } from './domain/defaults';
import type { AppBundle } from './domain/models';
import type { GeneratedWorkout } from './engine/workoutGenerator/schema';
import { createActiveSession } from './features/activeWorkout/session';
import type { ActiveSession } from './features/activeWorkout/schema';
import { importBackupFoundation } from './storage/backup';
import {
  loadActiveSession,
  loadBundle,
  saveActiveSessionVerified,
  saveBundleVerified,
} from './storage/database';
import { saveSettingsVerified } from './storage/settings';
import { CatalogView } from './views/CatalogView';
import { PlaceholderView } from './views/PlaceholderView';
import { PlanView } from './views/PlanView';
import { SettingsView } from './views/SettingsView';
import { TodayView } from './views/TodayView';
import { ActiveWorkoutView } from './views/ActiveWorkoutView';

type TabId = 'today' | 'workout' | 'progress' | 'plan' | 'settings';

const navItems: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'workout', label: 'Workout', icon: 'workout' },
  { id: 'progress', label: 'Progress', icon: 'progress' },
  { id: 'plan', label: 'Plan', icon: 'plan' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

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

  useEffect(() => {
    let active = true;
    void Promise.all([loadBundle(), loadActiveSession()])
      .then(([storedBundle, storedSession]) => {
        if (!active) return;
        setBundle(storedBundle);
        setActiveSession(storedSession);
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

  async function importFoundation(text: string) {
    const imported = await importBackupFoundation(text);
    setBundle(imported);
    setStorageStatus(
      'Latest import was schema-validated and read-back verified.',
    );
    setAnnouncement('Validated profile foundation imported locally.');
  }

  async function startWorkout(workout: GeneratedWorkout) {
    if (activeSession && activeSession.status !== 'completed') {
      setActiveTab('workout');
      setAnnouncement('Active workout resumed at the saved position.');
      return;
    }
    const created = createActiveSession(workout);
    const verified = await saveActiveSessionVerified(created);
    setActiveSession(verified);
    setActiveTab('workout');
    setStorageStatus(
      'Active workout created, read back, and verified locally.',
    );
    setAnnouncement('Workout started and protected by verified local saves.');
  }

  function updateActiveSession(next: ActiveSession, message?: string) {
    const previous = activeSession;
    setActiveSession(next);
    if (message) setAnnouncement(message);
    void saveActiveSessionVerified(next)
      .then(() => {
        setStorageStatus(
          'Latest active-workout change was written, read back, schema-validated, and verified.',
        );
      })
      .catch((error: unknown) => {
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
        <small>WC-P5-0810</small>
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
            onStartWorkout={startWorkout}
          />
        )}
        {activeTab === 'workout' &&
          (activeSession ? (
            <ActiveWorkoutView
              session={activeSession}
              bundle={bundle}
              onSessionChange={updateActiveSession}
            />
          ) : (
            <CatalogView />
          ))}
        {activeTab === 'progress' && <PlaceholderView tab="progress" />}
        {activeTab === 'plan' && <PlanView bundle={bundle} />}
        {activeTab === 'settings' && (
          <SettingsView
            key={`${bundle.profile.updatedAt}-${bundle.locations.length}`}
            bundle={bundle}
            storageStatus={storageStatus}
            onSave={saveCompleteBundle}
            onImport={importFoundation}
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
