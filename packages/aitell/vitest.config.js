import { defineConfig } from 'vitest/config';

// The package is self-contained CommonJS. Its tests live in test/ and load the
// modules via createRequire, so they exercise the exact published entry points.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.js'],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 80,
        lines: 75,
      },
    },
  },
});
