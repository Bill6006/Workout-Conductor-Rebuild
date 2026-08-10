import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetDatabaseForTests } from '../storage/database';

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

afterEach(async () => {
  cleanup();
  localStorage.clear();
  await resetDatabaseForTests();
});
