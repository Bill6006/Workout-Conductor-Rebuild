import { exerciseCatalog } from './exercises';
import { mediaById } from './mediaManifest';
import type { Exercise } from './schema';

export type CatalogIntegrityIssue = {
  exerciseId: string;
  field: 'media' | 'substitution';
  message: string;
};

export function validateCatalogIntegrity(
  catalog: Exercise[] = exerciseCatalog,
): CatalogIntegrityIssue[] {
  const ids = new Set(catalog.map((exercise) => exercise.id));
  const issues: CatalogIntegrityIssue[] = [];

  catalog.forEach((exercise) => {
    const media = mediaById.get(exercise.mediaId);
    if (!media) {
      issues.push({
        exerciseId: exercise.id,
        field: 'media',
        message: `Unknown media manifest id: ${exercise.mediaId}`,
      });
    } else if (
      exercise.productionEnabled &&
      (media.status !== 'production-ready' || !media.demonstrationPath)
    ) {
      issues.push({
        exerciseId: exercise.id,
        field: 'media',
        message:
          'Production-enabled exercises require licensed poster and demonstration assets.',
      });
    }

    exercise.commonSubstitutions.forEach((substitutionId) => {
      if (!ids.has(substitutionId)) {
        issues.push({
          exerciseId: exercise.id,
          field: 'substitution',
          message: `Unknown substitution id: ${substitutionId}`,
        });
      }
    });
  });

  return issues;
}
