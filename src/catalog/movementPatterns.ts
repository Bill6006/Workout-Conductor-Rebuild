import { MovementPatternSchema, movementPatternIds } from './schema';

const patternDetails = {
  'horizontal-press': [
    'Horizontal press',
    'push',
    'horizontal',
    'Press resistance away from the torso.',
  ],
  'incline-press': [
    'Incline press',
    'push',
    'sagittal',
    'Press on an upward diagonal to bias the upper chest.',
  ],
  'vertical-press': [
    'Vertical press',
    'push',
    'vertical',
    'Press resistance overhead.',
  ],
  'horizontal-pull': [
    'Horizontal pull',
    'pull',
    'horizontal',
    'Pull resistance toward the torso.',
  ],
  'vertical-pull': [
    'Vertical pull',
    'pull',
    'vertical',
    'Pull from overhead toward the torso.',
  ],
  squat: [
    'Squat',
    'lower',
    'sagittal',
    'Coordinate knee and hip flexion with an upright torso.',
  ],
  lunge: [
    'Lunge',
    'lower',
    'sagittal',
    'Train the lower body from a split or single-leg stance.',
  ],
  hinge: [
    'Hip hinge',
    'lower',
    'sagittal',
    'Load hip extension with limited knee travel.',
  ],
  'knee-flexion': [
    'Knee flexion',
    'lower',
    'sagittal',
    'Flex the knee against resistance.',
  ],
  'knee-extension': [
    'Knee extension',
    'lower',
    'sagittal',
    'Extend the knee against resistance.',
  ],
  'hip-extension': [
    'Hip extension',
    'lower',
    'sagittal',
    'Extend the hip against resistance with a stable trunk.',
  ],
  'plantar-flexion': [
    'Plantar flexion',
    'lower',
    'sagittal',
    'Raise the heel by pressing through the forefoot.',
  ],
  'elbow-flexion': [
    'Elbow flexion',
    'arms',
    'sagittal',
    'Curl resistance by flexing the elbow.',
  ],
  'elbow-extension': [
    'Elbow extension',
    'arms',
    'sagittal',
    'Extend the elbow against resistance.',
  ],
  'shoulder-abduction': [
    'Shoulder abduction',
    'push',
    'frontal',
    'Raise the upper arm away from the torso.',
  ],
  'scapular-retraction': [
    'Scapular retraction',
    'pull',
    'horizontal',
    'Draw the shoulder blades back under control.',
  ],
  'anti-extension': [
    'Anti-extension',
    'core',
    'sagittal',
    'Resist excessive spinal extension.',
  ],
  'anti-rotation': [
    'Anti-rotation',
    'core',
    'transverse',
    'Resist rotation through the torso.',
  ],
  'trunk-flexion': [
    'Trunk flexion',
    'core',
    'sagittal',
    'Shorten the front of the torso under abdominal control.',
  ],
  'lateral-flexion': [
    'Lateral trunk stability',
    'core',
    'frontal',
    'Resist or control side bending through the torso.',
  ],
  'loaded-carry': [
    'Loaded carry',
    'core',
    'frontal',
    'Carry external load while maintaining stacked posture and gait.',
  ],
} as const;

export const movementPatterns = movementPatternIds.map((id) => {
  const [name, category, plane, description] = patternDetails[id];
  return MovementPatternSchema.parse({
    id,
    name,
    category,
    plane,
    description,
  });
});

export const movementPatternById = new Map(
  movementPatterns.map((pattern) => [pattern.id, pattern]),
);
