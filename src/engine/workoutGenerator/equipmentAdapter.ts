import type { EquipmentId, LocationKind } from '../../catalog/schema';
import type { AppBundle } from '../../domain/models';

const profileEquipment: Record<string, EquipmentId[]> = {
  'Adjustable dumbbells': ['dumbbells'],
  'Barbell and plates': ['barbell', 'weight-plates'],
  'Adjustable bench': ['adjustable-bench'],
  'Pull-up bar': ['pull-up-bar'],
  'Resistance bands': ['resistance-band'],
  'Cable station': ['cable-station'],
  Machines: [
    'lat-pulldown',
    'seated-row',
    'chest-press-machine',
    'leg-press',
    'leg-curl',
    'leg-extension',
    'pec-deck',
    'shoulder-press-machine',
    'assisted-pullup-dip',
    'calf-raise-machine',
  ],
  'Squat rack': ['squat-rack'],
};

export type ResolvedTrainingLocation = {
  locationId: string;
  name: string;
  kind: LocationKind;
  equipment: EquipmentId[];
};

export function resolveTrainingLocation(
  bundle: AppBundle,
): ResolvedTrainingLocation {
  const location =
    bundle.locations.find((item) => item.isDefault) ?? bundle.locations[0];
  const equipmentProfile = bundle.equipmentProfiles.find(
    (item) => item.id === location?.equipmentProfileId,
  );
  const equipment = new Set<EquipmentId>(['bodyweight', 'exercise-mat']);
  equipmentProfile?.items.forEach((item) => {
    profileEquipment[item]?.forEach((equipmentId) =>
      equipment.add(equipmentId),
    );
  });

  return {
    locationId: location?.id ?? 'fallback-location',
    name: location?.name ?? 'Local setup',
    kind: location?.kind ?? 'home',
    equipment: Array.from(equipment).sort(),
  };
}
