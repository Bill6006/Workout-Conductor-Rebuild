import { useState, type ReactNode } from 'react';
import './App.css';

type TabId = 'today' | 'workout' | 'progress' | 'plan' | 'settings';

type IconName =
  | 'today'
  | 'workout'
  | 'progress'
  | 'plan'
  | 'settings'
  | 'spark'
  | 'arrow'
  | 'clock'
  | 'pin'
  | 'signal';

const navItems: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'workout', label: 'Workout', icon: 'workout' },
  { id: 'progress', label: 'Progress', icon: 'progress' },
  { id: 'plan', label: 'Plan', icon: 'plan' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  const paths: Record<IconName, ReactNode> = {
    today: (
      <>
        <path d="M3.5 10.4 12 3.5l8.5 6.9" />
        <path d="M5.5 9.4v10.1h13V9.4M9.4 19.5v-6h5.2v6" />
      </>
    ),
    workout: (
      <>
        <path d="M4 9v6M7 6.5v11M17 6.5v11M20 9v6M7 12h10" />
        <path d="M2.5 10.5v3M21.5 10.5v3" />
      </>
    ),
    progress: (
      <>
        <path d="M4 19V11M10 19V5M16 19v-7M22 19V8" />
        <path d="m3 8 6-5 6 5 6-5" />
      </>
    ),
    plan: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h2M14 13h2M8 17h2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    spark: (
      <path d="m12 2 1.4 6.6L20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4L12 2ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" />
    ),
    arrow: <path d="m9 5 7 7-7 7" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    signal: <path d="M4 18v-3M9 18v-6M14 18V9M19 18V5" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="avatar" aria-label="Local profile placeholder">
        WC
      </div>
    </header>
  );
}

function TodayView() {
  return (
    <>
      <Header eyebrow="Monday · August 10" title="Ready when you are." />

      <section className="phase-card" aria-labelledby="phase-heading">
        <div className="phase-card__glow" />
        <div className="phase-card__topline">
          <span className="status-pill">
            <span /> Phase 0 live
          </span>
          <span className="build-label">Build WC-P0-0810</span>
        </div>
        <div className="phase-card__icon">
          <Icon name="spark" size={24} />
        </div>
        <p className="overline">Your intelligent training system</p>
        <h2 id="phase-heading">Built to conduct every rep.</h2>
        <p className="phase-card__copy">
          A private, adaptive workout coach is taking shape. Your real training
          data will stay on this device.
        </p>
        <div className="phase-progress" aria-label="Phase 0 of 8">
          <span className="phase-progress__fill" />
        </div>
        <p className="phase-progress__label">Foundation · Phase 0 of 8</p>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Next session</p>
          <h2>Today&apos;s workout</h2>
        </div>
        <span className="quiet-chip">Preview</span>
      </div>

      <section className="workout-card" aria-labelledby="workout-title">
        <div className="workout-card__accent" />
        <div className="workout-card__heading">
          <div>
            <p className="overline">Recommended focus</p>
            <h3 id="workout-title">Your first session</h3>
          </div>
          <div className="score-ring" aria-label="Setup not started">
            —
          </div>
        </div>

        <div className="metrics-row">
          <div>
            <Icon name="clock" size={18} />
            <span>
              <strong>Default</strong> time
            </span>
          </div>
          <div>
            <Icon name="pin" size={18} />
            <span>
              <strong>Choose</strong> location
            </span>
          </div>
          <div>
            <Icon name="signal" size={18} />
            <span>
              <strong>Fresh</strong> start
            </span>
          </div>
        </div>

        <p className="empty-note">
          Complete setup in Phase 1 to unlock your adaptive workout preview.
        </p>
        <button className="primary-button" type="button" disabled>
          Start workout <Icon name="arrow" size={20} />
        </button>
      </section>

      <section className="privacy-strip">
        <span className="privacy-strip__mark">✓</span>
        <div>
          <strong>Private by design</strong>
          <p>No account, analytics, or cloud workout history.</p>
        </div>
      </section>
    </>
  );
}

const placeholderContent: Record<
  Exclude<TabId, 'today'>,
  { eyebrow: string; title: string; heading: string; copy: string }
> = {
  workout: {
    eyebrow: 'Session space',
    title: 'Workout',
    heading: 'Your active workout lives here.',
    copy: 'Fast set logging, timers, alternatives, and live recalibration arrive in later approved phases.',
  },
  progress: {
    eyebrow: 'Clear evidence',
    title: 'Progress',
    heading: 'See the work add up.',
    copy: 'Workout history, strength trends, weekly volume, and personal records will stay understandable and local.',
  },
  plan: {
    eyebrow: 'Your training map',
    title: 'Plan',
    heading: 'A plan that adapts with you.',
    copy: 'Upcoming sessions, muscle targets, saved workouts, recovery, and equipment profiles will come together here.',
  },
  settings: {
    eyebrow: 'Local control',
    title: 'Settings',
    heading: 'Your goals. Your rules.',
    copy: 'Phase 1 adds onboarding, preferences, equipment, limitations, and local data controls.',
  },
};

function PlaceholderView({ tab }: { tab: Exclude<TabId, 'today'> }) {
  const content = placeholderContent[tab];
  return (
    <>
      <Header eyebrow={content.eyebrow} title={content.title} />
      <section className="placeholder-card">
        <div className="placeholder-card__icon">
          <Icon name={tab} size={30} />
        </div>
        <p className="overline">Phase 0 app shell</p>
        <h2>{content.heading}</h2>
        <p>{content.copy}</p>
        <div className="coming-soon">
          <span /> Planned and ready for its phase
        </div>
      </section>
      <section className="build-card">
        <p className="eyebrow">Visible build marker</p>
        <strong>WC-P0-0810</strong>
        <span>Phase 0 · YELLOW after verification</span>
      </section>
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('today');

  return (
    <div className="app-shell">
      <main className="page-content" id="main-content">
        {activeTab === 'today' ? (
          <TodayView />
        ) : (
          <PlaceholderView tab={activeTab} />
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
