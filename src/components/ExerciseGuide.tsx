import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise } from '../catalog/schema';
import { mediaById } from '../catalog/mediaManifest';
import { muscleById } from '../catalog/muscles';

function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export function ExerciseGuide({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const media = mediaById.get(exercise.mediaId);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const root = document.getElementById('root');
    const rootWasInert = root?.hasAttribute('inert') ?? false;
    const previousOverflow = document.body.style.overflow;
    root?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), summary, a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!rootWasInert) root?.removeAttribute('inert');
      opener?.focus();
    };
  }, [open]);

  if (!media) return null;
  const demonstrationPath = media.demonstrationPath ?? media.posterPath;

  return (
    <>
      <button
        ref={openerRef}
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
      {open &&
        createPortal(
          <div
            className="sheet-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section
              ref={dialogRef}
              className="native-sheet exercise-guide-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
            >
              <div className="sheet-handle" />
              <div className="sheet-heading">
                <div>
                  <p className="eyebrow">Original diagram guide</p>
                  <h2 id={titleId}>{exercise.name}</h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
              <div
                className={playing ? 'guide-stage is-playing' : 'guide-stage'}
              >
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
                Project-owned movement diagram. Packaged with the offline app
                and cleared for redistribution.
              </p>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
