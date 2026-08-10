import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/exercise-media/posters/press.svg',
  'dist/exercise-media/posters/pull.svg',
  'dist/exercise-media/posters/lower.svg',
  'dist/exercise-media/posters/arms.svg',
  'dist/exercise-media/posters/core.svg',
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length > 0) {
  throw new Error(`Build verification failed; missing: ${missing.join(', ')}`);
}

const index = readFileSync('dist/index.html', 'utf8');
if (!index.includes('/Workout-Conductor-Rebuild/')) {
  throw new Error(
    'Build verification failed; repository base path is missing.',
  );
}

if (index.includes('file://')) {
  throw new Error('Build verification failed; local file URL found in output.');
}

console.log(
  `Build verification passed for ${requiredFiles.length} required files.`,
);
