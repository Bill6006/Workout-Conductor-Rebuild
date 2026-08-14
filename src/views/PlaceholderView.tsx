import { Icon, type IconName } from '../components/Icon';

type PlaceholderViewProps = {
  tab: 'progress';
};

const content: Record<
  PlaceholderViewProps['tab'],
  {
    eyebrow: string;
    title: string;
    heading: string;
    copy: string;
    phase: string;
  }
> = {
  progress: {
    eyebrow: 'Clear evidence',
    title: 'Progress',
    heading: 'Your clean slate starts here.',
    copy: 'No synthetic history is mixed with real results. Trends and records will appear only after the analytics phase is approved.',
    phase: 'Final acceptance · Phase 8',
  },
};

export function PlaceholderView({ tab }: PlaceholderViewProps) {
  const item = content[tab];
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{item.eyebrow}</p>
          <h1>{item.title}</h1>
        </div>
        <div className="avatar" aria-label={`${item.title} navigation`}>
          <Icon name={tab as IconName} size={21} />
        </div>
      </header>
      <section className="placeholder-card placeholder-card--phase-one">
        <div className="placeholder-card__icon">
          <Icon name={tab as IconName} size={29} />
        </div>
        <p className="overline">Phase-owned space</p>
        <h2>{item.heading}</h2>
        <p>{item.copy}</p>
        <div className="coming-soon">
          <span /> {item.phase}
        </div>
      </section>
      <section className="build-card">
        <p className="eyebrow">Current visible build</p>
        <strong>WC-P8UXR4-0814</strong>
        <span>Phase 8 · Data safety, offline readiness, and acceptance</span>
      </section>
    </>
  );
}
