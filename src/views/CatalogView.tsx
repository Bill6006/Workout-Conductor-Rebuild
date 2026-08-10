import { useMemo, useState } from 'react';
import { equipmentById } from '../catalog/equipment';
import { exerciseById, exerciseCatalog } from '../catalog/exercises';
import { mediaById } from '../catalog/mediaManifest';
import { movementPatternById } from '../catalog/movementPatterns';
import { muscleById } from '../catalog/muscles';
import type { Exercise } from '../catalog/schema';
import { Icon } from '../components/Icon';
import { rankAlternatives } from '../engine/alternatives/rankAlternatives';
import type { ConflictContext } from '../engine/conflicts/types';

const filters = ['all', 'push', 'pull', 'lower', 'arms', 'core'] as const;
type CatalogFilter = (typeof filters)[number];

const previewContext: ConflictContext = {
  availableEquipment: [
    'bodyweight',
    'dumbbells',
    'adjustable-bench',
    'pull-up-bar',
    'resistance-band',
  ],
  location: 'home',
  blockedJointStress: [],
  fatiguedMuscles: [],
  shoulderSensitive: false,
  avoidBarbellSquat: true,
  timeBudgetSeconds: 180,
  supersetPairs: [],
};

function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

function equipmentLabel(exercise: Exercise): string {
  return exercise.equipment.required
    .map((id) => equipmentById.get(id)?.name ?? id)
    .join(' + ');
}

export function CatalogView() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [inspectedId, setInspectedId] = useState('dumbbell-bench-press');
  const [previewSlotExerciseId, setPreviewSlotExerciseId] = useState(
    'dumbbell-bench-press',
  );
  const [swapMessage, setSwapMessage] = useState('');

  const inspected = exerciseById.get(inspectedId) ?? exerciseCatalog[0];
  const inspectedMedia = mediaById.get(inspected.mediaId);
  const pattern = movementPatternById.get(inspected.movementPattern);

  const visibleExercises = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exerciseCatalog.filter((exercise) => {
      const exerciseCategory = movementPatternById.get(
        exercise.movementPattern,
      )?.category;
      const matchesFilter = filter === 'all' || exerciseCategory === filter;
      const matchesSearch =
        !normalized ||
        [exercise.name, exercise.id, ...exercise.aliases]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [filter, query]);

  const alternatives = useMemo(
    () =>
      rankAlternatives({
        currentExerciseId: previewSlotExerciseId,
        selectedExerciseIds: [
          previewSlotExerciseId,
          'pull-up',
          'goblet-squat',
          'dumbbell-curl',
        ],
        context: previewContext,
      }),
    [previewSlotExerciseId],
  );

  const previewExercise =
    exerciseById.get(previewSlotExerciseId) ?? exerciseCatalog[0];

  return (
    <>
      <header className="page-header page-header--catalog">
        <div>
          <p className="eyebrow">Exercise intelligence</p>
          <h1>Catalog</h1>
        </div>
        <div className="avatar" aria-label="Validated exercise catalog">
          <Icon name="shield" size={21} />
        </div>
      </header>

      <section className="catalog-hero" aria-labelledby="catalog-hero-title">
        <div className="catalog-hero__status">
          <span className="status-pill">
            <span /> Phase 2 validated
          </span>
          <span className="build-label">WC-P4-0810</span>
        </div>
        <p className="overline">One structured source of truth</p>
        <h2 id="catalog-hero-title">
          28 movements. Every decision has metadata.
        </h2>
        <p>
          Muscles, equipment, limitations, joint stress, warm-ups, Plate Math,
          and progression continuity now share one validated catalog.
        </p>
        <div className="catalog-stats" aria-label="Catalog coverage">
          <div>
            <strong>19</strong>
            <span>muscles</span>
          </div>
          <div>
            <strong>15</strong>
            <span>patterns</span>
          </div>
          <div>
            <strong>15</strong>
            <span>equipment</span>
          </div>
          <div>
            <strong>13</strong>
            <span>conflicts</span>
          </div>
        </div>
      </section>

      <section className="swap-lab" aria-labelledby="swap-lab-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Safe swap preview</p>
            <h2 id="swap-lab-title">Ranked for Demo Home Gym</h2>
          </div>
          <span className="foundation-badge">Foundation</span>
        </div>
        {swapMessage && (
          <button
            type="button"
            className="inline-confirmation"
            onClick={() => setSwapMessage('')}
          >
            <Icon name="check" size={15} /> {swapMessage}
          </button>
        )}
        <div className="current-slot">
          <span className="current-slot__order">01</span>
          <div>
            <small>Selected preview slot</small>
            <strong>{previewExercise.name}</strong>
            <span>{equipmentLabel(previewExercise)}</span>
          </div>
          <Icon name="arrow" size={18} />
        </div>
        <div className="alternative-stack">
          {alternatives.ranked.slice(0, 3).map((candidate, index) => (
            <article className="alternative-card" key={candidate.exercise.id}>
              <div className="alternative-card__rank">#{index + 1}</div>
              <div className="alternative-card__content">
                <div>
                  <h3>{candidate.exercise.name}</h3>
                  <span className="match-score">{candidate.score}% match</span>
                </div>
                <p>{candidate.primaryReason}</p>
                <small>{candidate.keyDifference}</small>
                <div className="alternative-meta">
                  <span>{candidate.equipmentLabel}</span>
                  <span>{candidate.setupTimeSeconds}s setup</span>
                  <span>
                    {candidate.preservesProgression
                      ? 'Progression kept'
                      : 'New progression line'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Use ${candidate.exercise.name} in preview slot`}
                onClick={() => {
                  const previous = previewExercise.name;
                  setPreviewSlotExerciseId(candidate.exercise.id);
                  setSwapMessage(
                    `${previous} → ${candidate.exercise.name}. Only this preview slot changed.`,
                  );
                }}
              >
                <Icon name="arrow" size={18} />
              </button>
            </article>
          ))}
        </div>
        <div className="conflict-summary">
          <Icon name="shield" size={18} />
          <p>
            <strong>
              {alternatives.excluded.length} incompatible options hidden
            </strong>
            <span>
              Wrong muscle, unavailable equipment, location, limits, and time
              are excluded before ranking.
            </span>
          </p>
        </div>
        <p className="phase-boundary-note">
          Preview only. Applying alternatives to an active workout remains in
          its approved workout phase.
        </p>
      </section>

      <section className="exercise-inspector" aria-labelledby="inspector-title">
        <div className="exercise-inspector__media">
          {inspectedMedia && (
            <img
              src={assetPath(inspectedMedia.posterPath)}
              alt={`${inspected.name} original development diagram`}
            />
          )}
          <span>Original development media</span>
        </div>
        <div className="exercise-inspector__content">
          <p className="eyebrow">Selected movement</p>
          <h2 id="inspector-title">{inspected.name}</h2>
          <p>{pattern?.description}</p>
          <div className="metadata-chips">
            <span>{pattern?.name}</span>
            <span>{inspected.trainingRole.replaceAll('-', ' ')}</span>
            <span>
              {inspected.typicalRepRange.min}–{inspected.typicalRepRange.max}{' '}
              reps
            </span>
            <span>{inspected.plateMath.loadType.replaceAll('-', ' ')}</span>
          </div>
          <dl className="exercise-metadata-list">
            <div>
              <dt>Primary</dt>
              <dd>
                {inspected.primaryMuscles
                  .map((id) => muscleById.get(id)?.name ?? id)
                  .join(', ')}
              </dd>
            </div>
            <div>
              <dt>Equipment</dt>
              <dd>{equipmentLabel(inspected)}</dd>
            </div>
            <div>
              <dt>Drop set</dt>
              <dd>{inspected.dropSet.support}</dd>
            </div>
            <div>
              <dt>Warm-up</dt>
              <dd>{inspected.warmup.protocol.replaceAll('-', ' ')}</dd>
            </div>
          </dl>
          <details className="instruction-panel">
            <summary>Original form instructions</summary>
            <ol>
              {inspected.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </details>
        </div>
      </section>

      <section className="catalog-browser" aria-labelledby="catalog-list-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Curated locally</p>
            <h2 id="catalog-list-title">Browse exercises</h2>
          </div>
          <span>{visibleExercises.length} shown</span>
        </div>
        <label className="catalog-search">
          <span className="sr-only">Search catalog</span>
          <Icon name="spark" size={18} />
          <input
            type="search"
            value={query}
            placeholder="Search name or alias"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="catalog-filters" aria-label="Catalog categories">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              className={filter === item ? 'is-active' : undefined}
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div className="catalog-list">
          {visibleExercises.map((exercise) => {
            const itemPattern = movementPatternById.get(
              exercise.movementPattern,
            );
            const media = mediaById.get(exercise.mediaId);
            return (
              <button
                key={exercise.id}
                type="button"
                className={
                  inspected.id === exercise.id
                    ? 'catalog-row catalog-row--selected'
                    : 'catalog-row'
                }
                aria-label={`Inspect ${exercise.name}`}
                onClick={() => setInspectedId(exercise.id)}
              >
                {media && (
                  <img
                    src={assetPath(media.posterPath)}
                    alt=""
                    loading="lazy"
                  />
                )}
                <span className="catalog-row__body">
                  <small>
                    {itemPattern?.category} · {itemPattern?.name}
                  </small>
                  <strong>{exercise.name}</strong>
                  <span>
                    {exercise.primaryMuscles
                      .map((id) => muscleById.get(id)?.name ?? id)
                      .join(' · ')}
                  </span>
                </span>
                <span className="catalog-row__meta">
                  {exercise.setupTimeSeconds}s
                  <Icon name="chevron" size={16} />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
