import type { Exercise } from '../../catalog/schema';

export type PlateMathResult = {
  label: string;
  platesPerSide: number[];
  remainder: number;
};

export function calculatePlateMath(
  exercise: Exercise,
  totalWeight: number,
  barWeight = 45,
  inventory = [45, 25, 10, 5, 2.5],
): PlateMathResult {
  if (!Number.isFinite(totalWeight) || totalWeight < 0) {
    return {
      label: 'Enter a nonnegative target weight.',
      platesPerSide: [],
      remainder: 0,
    };
  }
  if (exercise.plateMath.eachHand) {
    return {
      label: `${totalWeight} per hand`,
      platesPerSide: [],
      remainder: 0,
    };
  }
  if (!exercise.plateMath.barWeightCompatible) {
    return {
      label:
        exercise.plateMath.loadType === 'bodyweight'
          ? 'Bodyweight movement'
          : `${totalWeight} total on the selected implement`,
      platesPerSide: [],
      remainder: 0,
    };
  }
  let remaining = Math.max(0, (totalWeight - barWeight) / 2);
  const plates: number[] = [];
  for (const plate of inventory) {
    while (remaining + 0.001 >= plate) {
      plates.push(plate);
      remaining -= plate;
    }
  }
  const remainder = Math.round(remaining * 100) / 100;
  return {
    label:
      plates.length === 0
        ? `${barWeight} lb bar only`
        : `${plates.join(' + ')} lb per side on a ${barWeight} lb bar`,
    platesPerSide: plates,
    remainder,
  };
}
