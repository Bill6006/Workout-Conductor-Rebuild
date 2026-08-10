import type { CustomExercise } from '../catalog/schema';

export function CustomExerciseGuide({
  exercise,
  mediaUrl,
}: {
  exercise: CustomExercise;
  mediaUrl?: string | null;
}) {
  const demonstration = exercise.media.find(
    (media) => media.kind === 'demonstration',
  );
  const poster = exercise.media.find((media) => media.kind === 'poster');
  const media = demonstration ?? poster;
  return (
    <section
      className="custom-guide-card"
      aria-label={`Custom guide for ${exercise.name}`}
    >
      <div className="custom-guide-card__heading">
        <span>Custom exercise</span>
        <strong>{exercise.name}</strong>
        <small>User-owned instructions and media</small>
      </div>
      {mediaUrl && media?.mimeType.startsWith('video/') ? (
        <video
          src={mediaUrl}
          muted
          loop
          controls
          playsInline
          preload="metadata"
          aria-label={`${exercise.name} user-owned demonstration`}
        />
      ) : mediaUrl && media?.mimeType.startsWith('image/') ? (
        <img src={mediaUrl} alt={`${exercise.name} user-owned demonstration`} />
      ) : (
        <div className="custom-guide-card__offline">
          {media
            ? `${media.kind === 'demonstration' ? 'Demonstration' : 'Poster'} is stored locally under ${media.blobKey}.`
            : 'No custom media attached. Written instructions remain available offline.'}
        </div>
      )}
      <p>{exercise.instructions.setup}</p>
      <ol>
        {exercise.instructions.execution.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ol>
      <strong>{exercise.instructions.breathingCue}</strong>
    </section>
  );
}
