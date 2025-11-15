/**
 * Test setup file for vitest
 * Configures global test environment and mocks
 */
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
process.env.LAZY_AUTH = 'true';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock process.exit to prevent tests from actually exiting
vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });