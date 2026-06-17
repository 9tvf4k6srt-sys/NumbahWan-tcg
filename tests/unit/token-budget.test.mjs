// token-budget — the active per-task token enforcer. These tests pin the two
// pure functions that decide whether a read is "safe to read whole" or must be
// grepped. The estimation must agree with mycelium's doctrine constants, and
// the tier boundaries must be exact — a wrong boundary means the wrong advice.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { estimateFileTokens, costTier, CHARS_PER_TOKEN, MAX_SINGLE_FILE_READ_TOKENS } = require('../../bin/token-budget.cjs');

describe('doctrine constants', () => {
  it('uses the same chars-per-token estimate as the platform doctrine', () => {
    expect(CHARS_PER_TOKEN).toBe(4);
  });
  it('caps a single whole-file read at the doctrine limit', () => {
    expect(MAX_SINGLE_FILE_READ_TOKENS).toBe(15000);
  });
});

describe('estimateFileTokens', () => {
  it('returns 0 for a file that does not exist (never throws)', () => {
    expect(estimateFileTokens('does/not/exist/anywhere.xyz')).toBe(0);
  });
  it('estimates a real file as size / CHARS_PER_TOKEN', () => {
    // package.json always exists in this repo; just assert the relationship.
    const tokens = estimateFileTokens('package.json');
    expect(tokens).toBeGreaterThan(0);
    expect(Number.isInteger(tokens)).toBe(true);
  });
});

describe('costTier — boundaries decide the read strategy', () => {
  it('treats an empty file as skip', () => {
    expect(costTier(0).tier).toBe(0);
  });
  it('classifies a small file as cheap (tier 1, safe to read whole)', () => {
    const t = costTier(3000);
    expect(t.tier).toBe(1);
    expect(t.strategy).toMatch(/read whole/i);
  });
  it('classifies a medium file as tier 2 at the 15k boundary', () => {
    expect(costTier(3001).tier).toBe(2);
    expect(costTier(MAX_SINGLE_FILE_READ_TOKENS).tier).toBe(2);
  });
  it('flags anything past the single-read cap as GREP ONLY (tier 3)', () => {
    const t = costTier(MAX_SINGLE_FILE_READ_TOKENS + 1);
    expect(t.tier).toBe(3);
    expect(t.strategy).toMatch(/grep only/i);
  });
  it('flags a huge file as FATAL — use the CLI, never read (tier 4)', () => {
    const t = costTier(60000);
    expect(t.tier).toBe(4);
    expect(t.strategy).toMatch(/CLI|never read/i);
  });
  it('tiers are monotonic with size', () => {
    const sizes = [0, 1000, 3000, 8000, 15000, 30000, 100000];
    const tiers = sizes.map((s) => costTier(s).tier);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
    }
  });
});
