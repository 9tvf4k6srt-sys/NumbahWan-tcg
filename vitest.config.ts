import { defineConfig } from 'vitest/config'

// Unit tests cover two layers:
//   src/**       — the Hono/TypeScript backend (when tests are added)
//   tests/unit/  — the reusable dev tooling (the AI-tell linters, the mined-data
//                  quality detectors, the page-size guardrail). These are the
//                  pure, deterministic functions worth pinning down so they
//                  never silently regress.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'tests/unit/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      // Only measure coverage of the units we actually have tests for today:
      // the tool detectors. Backend src coverage can be added later without
      // failing CI in the meantime.
      include: ['tools/lib/aitell-common.cjs', 'tools/page-size-lint.cjs'],
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 35,
        lines: 40,
      },
    },
    testTimeout: 10000,
  },
})
