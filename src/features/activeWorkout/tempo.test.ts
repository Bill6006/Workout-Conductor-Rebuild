import { describe, expect, it } from 'vitest';
import { exerciseById } from '../../catalog/exercises';
import { describeTempo, getTempoFrame, recommendTempo } from './tempo';

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

  it('maps 3-1-1-0 to drain, low hold, refill, and immediate restart', () => {
    const phases = {
      eccentric: 3,
      bottomPause: 1,
      concentric: 1,
      topPause: 0,
    };
    expect(getTempoFrame(phases, 0)).toMatchObject({
      phase: 'eccentric',
      fill: 1,
    });
    expect(getTempoFrame(phases, 1500)).toMatchObject({
      phase: 'eccentric',
      fill: 0.5,
    });
    expect(getTempoFrame(phases, 3000)).toMatchObject({
      phase: 'bottomPause',
      fill: 0,
    });
    expect(getTempoFrame(phases, 4000)).toMatchObject({
      phase: 'concentric',
      fill: 0,
    });
    expect(getTempoFrame(phases, 4500)).toMatchObject({
      phase: 'concentric',
      fill: 0.5,
    });
    expect(getTempoFrame(phases, 5000)).toMatchObject({
      phase: 'eccentric',
      fill: 1,
    });
    expect(describeTempo(phases)).toBe(
      'Lower 3 sec · Hold low 1 sec · Lift 1 sec · Hold high 0 sec',
    );
  });

  it('skips zero-duration phases in every position without an artificial delay', () => {
    expect(
      getTempoFrame(
        { eccentric: 0, bottomPause: 1, concentric: 1, topPause: 0 },
        0,
      ).phase,
    ).toBe('bottomPause');
    expect(
      getTempoFrame(
        { eccentric: 1, bottomPause: 0, concentric: 1, topPause: 0 },
        1000,
      ).phase,
    ).toBe('concentric');
    expect(
      getTempoFrame(
        { eccentric: 1, bottomPause: 0, concentric: 0, topPause: 1 },
        1000,
      ).phase,
    ).toBe('topPause');
    expect(
      getTempoFrame(
        { eccentric: 1, bottomPause: 0, concentric: 1, topPause: 0 },
        2000,
      ).phase,
    ).toBe('eccentric');
  });
});
