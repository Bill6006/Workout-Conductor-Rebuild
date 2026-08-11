import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateServiceWorker = vi.fn();
let callbacks: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
};

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn((options) => {
    callbacks = options;
    return updateServiceWorker;
  }),
}));

import { registerWorkoutConductorServiceWorker } from './pwa';
import {
  PWA_APPLY_UPDATE_EVENT,
  PWA_OFFLINE_READY_EVENT,
  PWA_UPDATE_READY_EVENT,
} from './pwaEvents';

describe('controlled service-worker updates', () => {
  beforeEach(() => {
    callbacks = {};
    updateServiceWorker.mockClear();
  });

  it('announces offline readiness and waits for an explicit update action', () => {
    const updates = vi.fn();
    const offline = vi.fn();
    window.addEventListener(PWA_UPDATE_READY_EVENT, updates, { once: true });
    window.addEventListener(PWA_OFFLINE_READY_EVENT, offline, { once: true });

    registerWorkoutConductorServiceWorker();
    callbacks.onNeedRefresh?.();
    callbacks.onOfflineReady?.();

    expect(updates).toHaveBeenCalledOnce();
    expect(offline).toHaveBeenCalledOnce();
    expect(updateServiceWorker).not.toHaveBeenCalled();

    window.dispatchEvent(new Event(PWA_APPLY_UPDATE_EVENT));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
