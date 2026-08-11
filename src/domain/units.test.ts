import { describe, expect, it } from 'vitest';
import { comparableWeight, convertWeight, roundedWeight } from './units';

describe('weight-unit conversion', () => {
  it('round-trips physical loads without relabeling their numeric value', () => {
    const kilograms = convertWeight(185, 'lb', 'kg');
    expect(kilograms).toBeCloseTo(83.91, 2);
    expect(convertWeight(kilograms, 'kg', 'lb')).toBeCloseTo(185, 8);
    expect(roundedWeight(43, 'lb', 'kg')).toBe(19.5);
  });

  it('normalizes equivalent lb and kg records for comparisons', () => {
    expect(comparableWeight(100, 'lb')).toBe(comparableWeight(45.359237, 'kg'));
  });
});
