import { registerSW } from 'virtual:pwa-register';
import {
  PWA_APPLY_UPDATE_EVENT,
  PWA_OFFLINE_READY_EVENT,
  PWA_UPDATE_READY_EVENT,
} from './pwaEvents';

export function registerWorkoutConductorServiceWorker() {
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event(PWA_UPDATE_READY_EVENT));
    },
    onOfflineReady() {
      window.dispatchEvent(new Event(PWA_OFFLINE_READY_EVENT));
    },
  });

  window.addEventListener(PWA_APPLY_UPDATE_EVENT, () => {
    void updateServiceWorker(true);
  });
}
