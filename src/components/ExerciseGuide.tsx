import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise } from '../catalog/schema';
import { mediaById } from '../catalog/mediaManifest';
import { muscleById } from '../catalog/muscles';
import { recommendTempo } from '../features/activeWorkout/tempo';
import {
  loadCustomMedia,
  removeCustomMediaVerified,
  saveCustomMediaVerified,
} from '../storage/database';
import type { CustomMediaBlob } from '../storage/userContent';
import { TempoIndicator } from './TempoIndicator';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

function assetPath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export function ExerciseGuide({ exercise }: { exercise: Exercise }) {
  const reducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(() => !reducedMotion);
  const [customMedia, setCustomMedia] = useState<CustomMediaBlob | null>(null);
  const [mediaStatus, setMediaStatus] = useState('');
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const media = mediaById.get(exercise.mediaId);
  const tempo = recommendTempo(exercise);
  const guidePlaying = playing && !reducedMotion;

  useEffect(() => {
    let active = true;
    void loadCustomMedia().then((items) => {
      if (!active) return;
      setCustomMedia(
        items.find(
          (item) =>
            item.exerciseId === exercise.id &&
            item.purpose === 'exercise-demonstration',
        ) ?? null,
      );
    });
    return () => {
      active = false;
    };
  }, [exercise.id]);

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
  const demonstrationSource =
    customMedia?.dataUrl ?? assetPath(demonstrationPath);
  async function handleGifUpload(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'image/gif') {
      setMediaStatus(
        'Choose a GIF file. Other image and video types are not accepted here.',
      );
      return;
    }
    if (file.size < 1 || file.size > 50_000_000) {
      setMediaStatus(
        'The GIF must be larger than 0 bytes and no more than 50 MB.',
      );
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(reader.error ?? new Error('GIF could not be read.'));
        reader.readAsDataURL(file);
      });
      const timestamp = new Date().toISOString();
      const verified = await saveCustomMediaVerified({
        id: `exercise-demo-${exercise.id}`,
        blobKey: `custom-media/exercise-demo-${exercise.id}`,
        mimeType: 'image/gif',
        dataUrl,
        byteSize: file.size,
        exerciseId: exercise.id,
        purpose: 'exercise-demonstration',
        createdAt: timestamp,
      });
      setCustomMedia(verified);
      setPlaying(true);
      setMediaStatus(
        'Custom GIF saved and verified locally. It will stay assigned until you replace it.',
      );
    } catch {
      setMediaStatus(
        'The GIF could not be saved. Your existing guide was kept.',
      );
    }
  }

  async function handleGifRemoval() {
    if (!customMedia) return;
    try {
      await removeCustomMediaVerified(customMedia.id);
      setCustomMedia(null);
      setMediaStatus(
        'Custom GIF removed and verified. The packaged movement guide is active again.',
      );
    } catch {
      setMediaStatus(
        'The custom GIF could not be removed. Your existing guide was kept.',
      );
    }
  }

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="exercise-guide-thumb"
        aria-label={`Open demonstration for ${exercise.name}`}
        onClick={() => setOpen(true)}
      >
        <span
          className={guidePlaying ? 'guide-frame is-playing' : 'guide-frame'}
        >
          <img
            src={
              guidePlaying ? demonstrationSource : assetPath(media.posterPath)
            }
            alt=""
            width="92"
            height="70"
            loading="eager"
          />
          <TempoIndicator tempo={tempo} playing={guidePlaying} compact />
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
                className={
                  guidePlaying ? 'guide-stage is-playing' : 'guide-stage'
                }
              >
                <img
                  src={
                    guidePlaying
                      ? demonstrationSource
                      : assetPath(media.reducedMotionPosterPath)
                  }
                  alt={`${exercise.name} movement guide`}
                />
              </div>
              <TempoIndicator tempo={tempo} playing={guidePlaying} />
              <div className="guide-media-actions">
                <button
                  className="guide-play-button"
                  type="button"
                  aria-pressed={guidePlaying}
                  disabled={reducedMotion}
                  onClick={() => setPlaying(!guidePlaying)}
                >
                  {reducedMotion
                    ? 'Motion reduced'
                    : guidePlaying
                      ? 'Pause guide'
                      : 'Play guide'}
                </button>
                <button
                  className="guide-swap-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {customMedia ? 'Swap GIF' : 'Use my GIF'}
                </button>
                {customMedia && (
                  <button
                    className="guide-remove-button"
                    type="button"
                    onClick={() => void handleGifRemoval()}
                  >
                    Use packaged guide
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/gif,.gif"
                  aria-label={`Upload a custom GIF for ${exercise.name}`}
                  onChange={(event) => {
                    void handleGifUpload(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
              </div>
              <p
                className="guide-media-status"
                role="status"
                aria-live="polite"
              >
                {mediaStatus}
              </p>
              <div className="guide-facts">
                <span>
                  Primary:{' '}
                  {exercise.primaryMuscles
                    .map((muscle) => muscleById.get(muscle)?.name ?? muscle)
                    .join(', ')}
                </span>
                <span>Breathing: exhale through the working phase</span>
                <span>Recommended tempo: {tempo.code}</span>
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
                {customMedia
                  ? 'Your custom GIF is stored only in this app profile and included in protected backups.'
                  : 'Project-owned movement diagram. Packaged with the offline app and cleared for redistribution.'}
              </p>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
