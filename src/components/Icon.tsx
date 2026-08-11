import type { ReactNode } from 'react';

export type IconName =
  | 'today'
  | 'workout'
  | 'progress'
  | 'plan'
  | 'settings'
  | 'spark'
  | 'arrow'
  | 'clock'
  | 'pin'
  | 'signal'
  | 'shield'
  | 'check'
  | 'chevron'
  | 'database'
  | 'download'
  | 'upload'
  | 'undo'
  | 'plus';

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
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
    shield: (
      <path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    database: (
      <>
        <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
        <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
      </>
    ),
    download: <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />,
    upload: <path d="M12 21V9m0 0 5 5m-5-5-5 5M5 3h14" />,
    undo: (
      <>
        <path d="M9 7H4V2" />
        <path d="M4.5 7.5A8 8 0 1 1 4 16" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
