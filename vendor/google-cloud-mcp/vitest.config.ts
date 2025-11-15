import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test-utils/**',
        'vitest.config.ts'
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 60,
          statements: 60
        }
      }
    },
    setupFiles: ['./test/setup.ts']
  }
});