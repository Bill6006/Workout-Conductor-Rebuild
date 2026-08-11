export type WeightUnit = 'lb' | 'kg';

const KILOGRAMS_PER_POUND = 0.45359237;

export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return value;
  return from === 'lb'
    ? value * KILOGRAMS_PER_POUND
    : value / KILOGRAMS_PER_POUND;
}

export function roundedWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  return Number(convertWeight(value, from, to).toFixed(2));
}

export function comparableWeight(value: number, unit: WeightUnit): number {
  return Number(convertWeight(value, unit, 'kg').toFixed(4));
}
