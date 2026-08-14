import { describe, expect, it } from 'vitest';
import { exerciseById } from '../../catalog/exercises';
import { recommendTempo } from './tempo';

describe('evidence-informed exercise tempo guidance', () => {
  it('uses metadata to distinguish strength, isolation, and bracing tempos', () => {
    expect(recommendTempo(exerciseById.get('barbell-bench-press')!).code).toBe(
      '2–0–1–1',
    );
    expect(recommendTempo(exerciseById.get('cable-lateral-raise')!).code).toBe(
      '2–1–1–1',
    );
    expect(recommendTempo(exerciseById.get('plank')!).code).toBe('2–1–2–1');
  });

  it('keeps every displayed cycle inside the supported controlled range', () => {
    for (const exercise of exerciseById.values()) {
      const recommendation = recommendTempo(exercise);
      expect(recommendation.cycleSeconds).toBeGreaterThanOrEqual(4);
      expect(recommendation.cycleSeconds).toBeLessThanOrEqual(6);
      expect(recommendation.evidenceNote).toContain('range');
    }
  });
});
