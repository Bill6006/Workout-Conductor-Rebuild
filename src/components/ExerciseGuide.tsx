import { useState } from 'react';
import type { Exercise } from '../catalog/schema';
import { mediaById } from '../catalog/mediaManifest';
import { muscleById } from '../catalog/muscles';

function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export function ExerciseGuide({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const media = mediaById.get(exercise.mediaId);
  if (!media) return null;
  const demonstrationPath = media.demonstrationPath ?? media.posterPath;

  return (
    <>
      <button
        type="button"
        className="exercise-guide-thumb"
        aria-label={`Open demonstration for ${exercise.name}`}
        onClick={() => setOpen(true)}
      >
        <span className={playing ? 'guide-frame is-playing' : 'guide-frame'}>
          <img
            src={assetPath(playing ? demonstrationPath : media.posterPath)}
            alt=""
            width="92"
            height="70"
            loading="eager"
          />
          <i aria-hidden="true" />
        </span>
        <span>
          <strong>Movement guide</strong>
          <small>Tap for setup and form</small>
        </span>
      </button>
      {open && (
        <div className="sheet-backdrop" role="presentation">
          <section
            className="native-sheet exercise-guide-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-guide-title"
          >
            <div className="sheet-handle" />
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">Original diagram guide</p>
                <h2 id="exercise-guide-title">{exercise.name}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className={playing ? 'guide-stage is-playing' : 'guide-stage'}>
              <img
                src={assetPath(
                  playing ? demonstrationPath : media.reducedMotionPosterPath,
                )}
                alt={`${exercise.name} movement guide`}
              />
              <i aria-hidden="true" />
            </div>
            <button
              className="guide-play-button"
              type="button"
              aria-pressed={playing}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? 'Pause guide' : 'Play guide'}
            </button>
            <div className="guide-facts">
              <span>
                Primary:{' '}
                {exercise.primaryMuscles
                  .map((muscle) => muscleById.get(muscle)?.name ?? muscle)
                  .join(', ')}
              </span>
              <span>Breathing: exhale through the working phase</span>
            </div>
            <ol className="guide-instructions">
              {exercise.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
            <details className="guide-mistakes">
              <summary>Common mistakes</summary>
              <ul>
                {exercise.commonMistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </details>
            <p className="guide-license">
              Project-owned movement diagram. Packaged with the offline app and
              cleared for redistribution.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
