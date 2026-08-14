import { EquipmentDefinitionSchema, equipmentIds } from './schema';

const equipmentDetails = {
  bodyweight: [
    'Bodyweight',
    'bodyweight',
    ['home', 'gym', 'travel'],
    false,
    false,
  ],
  dumbbells: [
    'Dumbbells',
    'free-weight',
    ['home', 'gym', 'travel'],
    false,
    false,
  ],
  'adjustable-bench': [
    'Adjustable bench',
    'accessory',
    ['home', 'gym'],
    false,
    false,
  ],
  barbell: ['Barbell', 'free-weight', ['home', 'gym'], false, true],
  'weight-plates': [
    'Weight plates',
    'free-weight',
    ['home', 'gym'],
    false,
    true,
  ],
  'squat-rack': ['Squat rack', 'station', ['home', 'gym'], true, true],
  'pull-up-bar': [
    'Pull-up bar',
    'station',
    ['home', 'gym', 'travel'],
    true,
    false,
  ],
  'cable-station': ['Cable station', 'station', ['gym'], true, false],
  'lat-pulldown': ['Lat pulldown', 'machine', ['gym'], true, false],
  'seated-row': ['Seated row', 'machine', ['gym'], true, false],
  'chest-press-machine': [
    'Chest press machine',
    'machine',
    ['gym'],
    true,
    false,
  ],
  'leg-press': ['Leg press', 'machine', ['gym'], true, false],
  'leg-curl': ['Leg curl', 'machine', ['gym'], true, false],
  'leg-extension': ['Leg extension', 'machine', ['gym'], true, false],
  'pec-deck': ['Pec deck / reverse fly', 'machine', ['gym'], true, false],
  'shoulder-press-machine': [
    'Shoulder press machine',
    'machine',
    ['gym'],
    true,
    false,
  ],
  'assisted-pullup-dip': [
    'Assisted pull-up / dip machine',
    'machine',
    ['gym'],
    true,
    false,
  ],
  'dip-station': ['Dip station', 'station', ['home', 'gym'], true, false],
  'calf-raise-machine': ['Calf raise machine', 'machine', ['gym'], true, false],
  'resistance-band': [
    'Resistance band',
    'accessory',
    ['home', 'gym', 'travel'],
    false,
    false,
  ],
  'exercise-mat': [
    'Exercise mat',
    'accessory',
    ['home', 'gym', 'travel'],
    false,
    false,
  ],
} as const;

export const equipment = equipmentIds.map((id) => {
  const [name, category, locations, scarceStation, supportsPlateMath] =
    equipmentDetails[id];
  return EquipmentDefinitionSchema.parse({
    id,
    name,
    category,
    locations,
    scarceStation,
    supportsPlateMath,
  });
});

export const equipmentById = new Map(equipment.map((item) => [item.id, item]));
