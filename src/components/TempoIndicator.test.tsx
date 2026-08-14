import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TempoRecommendation } from '../features/activeWorkout/tempo';
import { TempoIndicator } from './TempoIndicator';

const tempo: TempoRecommendation = {
  code: '3–1–1–0',
  cue: '3 sec lower · 1 sec hold · 1 sec lift · no pause',
  cycleSeconds: 5,
  phases: {
    eccentric: 3,
    bottomPause: 1,
    concentric: 1,
    topPause: 0,
  },
  evidenceNote: 'Evidence-informed starting point.',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('phase-accurate movement tempo indicator', () => {
  it('exposes the complete four-phase meaning without color-only communication', () => {
    render(<TempoIndicator tempo={tempo} playing={false} />);
    expect(
      screen.getByRole('group', {
        name: /Tempo 3–1–1–0.*Lower 3 sec.*Hold low 1 sec.*Lift 1 sec.*Hold high 0 sec/,
      }),
    ).toBeVisible();
    expect(screen.getByText(/Paused · Lower 3 sec/)).toBeVisible();
  });

  it('cancels its animation frame when paused and unmounted', () => {
    const request = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockReturnValue(17);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const view = render(<TempoIndicator tempo={tempo} playing />);
    expect(request).toHaveBeenCalledOnce();

    view.rerender(<TempoIndicator tempo={tempo} playing={false} />);
    expect(cancel).toHaveBeenCalledWith(17);
    view.rerender(<TempoIndicator tempo={tempo} playing />);
    expect(request).toHaveBeenCalledTimes(2);
    view.unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('switches at runtime to a nonanimated reduced-motion overview', () => {
    let matches = false;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matches;
        },
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => listeners.add(listener),
        removeEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => listeners.delete(listener),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const request = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockReturnValue(23);

    render(<TempoIndicator tempo={tempo} playing />);
    expect(request).toHaveBeenCalledOnce();
    matches = true;
    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(screen.getByText('Tempo overview')).toBeVisible();
    expect(
      screen.getByText(
        'Lower 3 sec · Hold low 1 sec · Lift 1 sec · Hold high 0 sec',
      ),
    ).toBeVisible();
    expect(request).toHaveBeenCalledOnce();
  });
});
