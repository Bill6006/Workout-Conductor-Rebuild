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
    expect(exerciseCatalog).toHaveLength(50);
    expect(new Set(exerciseCatalog.map((exercise) => exercise.id)).size).toBe(
      exerciseCatalog.length,
    );
  });

  it('covers the muscle, movement, equipment, and progression registries', () => {
    expect(muscles).toHaveLength(19);
    expect(movementPatterns).toHaveLength(21);
    expect(equipment).toHaveLength(21);
    expect(progressionFamilies).toHaveLength(22);
  });

  it('covers every registered muscle, movement pattern, equipment family, and progression line', () => {
    const usedMuscles = new Set(
      exerciseCatalog.flatMap((exercise) => [
        ...exercise.primaryMuscles,
        ...exercise.secondaryMuscles,
      ]),
    );
    const usedPatterns = new Set(
      exerciseCatalog.map((exercise) => exercise.movementPattern),
    );
    const usedEquipment = new Set(
      exerciseCatalog.flatMap((exercise) => exercise.equipment.required),
    );
    const usedFamilies = new Set(
      exerciseCatalog.map((exercise) => exercise.progressionFamily),
    );
    muscles.forEach((item) => expect(usedMuscles).toContain(item.id));
    movementPatterns.forEach((item) => expect(usedPatterns).toContain(item.id));
    equipment.forEach((item) => expect(usedEquipment).toContain(item.id));
    progressionFamilies.forEach((item) =>
      expect(usedFamilies).toContain(item.id),
    );
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
