import { ProgressionFamilySchema, progressionFamilyIds } from './schema';

export const progressionFamilies = progressionFamilyIds.map((id) =>
  ProgressionFamilySchema.parse({
    id,
    name: id
      .split('-')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' '),
    defaultMethod:
      id === 'anti-extension' || id === 'anti-rotation'
        ? 'time-progression'
        : 'double-progression',
    continuityKey: id,
    incrementHint:
      id === 'anti-extension' || id === 'anti-rotation'
        ? 'Add controlled time before resistance.'
        : 'Reach the top of the rep range before adding the smallest practical load.',
  }),
);

export const progressionFamilyById = new Map(
  progressionFamilies.map((family) => [family.id, family]),
);
