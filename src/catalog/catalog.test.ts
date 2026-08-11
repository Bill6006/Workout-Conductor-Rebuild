import { describe, expect, it } from 'vitest';
import { equipment } from './equipment';
import { exerciseCatalog, findExercises } from './exercises';
import { mediaManifest } from './mediaManifest';
import { movementPatterns } from './movementPatterns';
import { muscles } from './muscles';
import { progressionFamilies } from './progressionFamilies';
import { ExerciseCatalogSchema } from './schema';
import { validateCatalogIntegrity } from './validateCatalog';

describe('Phase 2 exercise catalog', () => {
  it('validates the complete structured catalog', () => {
    expect(() => ExerciseCatalogSchema.parse(exerciseCatalog)).not.toThrow();
    expect(exerciseCatalog).toHaveLength(28);
    expect(new Set(exerciseCatalog.map((exercise) => exercise.id)).size).toBe(
      exerciseCatalog.length,
    );
  });

  it('covers the muscle, movement, equipment, and progression registries', () => {
    expect(muscles).toHaveLength(19);
    expect(movementPatterns).toHaveLength(15);
    expect(equipment).toHaveLength(15);
    expect(progressionFamilies).toHaveLength(16);
  });

  it('contains complete safety and future-engine metadata', () => {
    exerciseCatalog.forEach((exercise) => {
      expect(exercise.instructions.length).toBeGreaterThanOrEqual(3);
      expect(exercise.dropSet.reason.length).toBeGreaterThan(10);
      expect(exercise.warmup.protocol).toBeTruthy();
      expect(exercise.plateMath.loadType).toBeTruthy();
      expect(exercise.progressionFamily).toBeTruthy();
    });
  });

  it('cross-validates substitutions and media references', () => {
    expect(validateCatalogIntegrity()).toEqual([]);
    expect(
      mediaManifest.every(
        (item) => item.status === 'production-ready' && item.demonstrationPath,
      ),
    ).toBe(true);
    expect(
      exerciseCatalog.every((exercise) => exercise.productionEnabled),
    ).toBe(true);
  });

  it('finds exercises by names and aliases without an external API', () => {
    expect(findExercises('RDL').map((exercise) => exercise.id)).toContain(
      'romanian-deadlift',
    );
    expect(findExercises('curl')).toHaveLength(4);
  });
});
