import { MediaManifestEntrySchema } from './schema';

export const mediaManifest = [
  ['press-placeholder', '/exercise-media/posters/press.svg'],
  ['pull-placeholder', '/exercise-media/posters/pull.svg'],
  ['lower-placeholder', '/exercise-media/posters/lower.svg'],
  ['arms-placeholder', '/exercise-media/posters/arms.svg'],
  ['core-placeholder', '/exercise-media/posters/core.svg'],
].map(([id, posterPath]) =>
  MediaManifestEntrySchema.parse({
    id,
    posterPath,
    demonstrationPath: posterPath,
    status: 'production-ready',
    source: 'Workout Conductor original',
    license: 'Project-owned; redistribution permitted',
    author: 'Workout Conductor project',
    reducedMotionPosterPath: posterPath,
  }),
);

export const mediaById = new Map(
  mediaManifest.map((media) => [media.id, media]),
);
