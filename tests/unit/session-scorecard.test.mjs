// Session Scorecard — the math that turns the "you're improving" claim into a
// number. These tests pin the two pure functions that decide the headline
// score, with special attention to the honesty rules: no data must never
// produce a flattering score, and partial data must weight only what's real.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { median, magnification } = require('../../bin/session-scorecard.cjs');

describe('median', () => {
  it('returns null for an empty list', () => {
    expect(median([])).toBe(null);
  });
  it('returns the middle of an odd-length list', () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  it('rounds the mean of the two middles for an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(3); // (2+3)/2 = 2.5 → round → 3
  });
  it('is order-independent', () => {
    expect(median([9, 1, 7, 3, 5])).toBe(median([1, 3, 5, 7, 9]));
  });
});

describe('magnification — honesty rules', () => {
  const noEff = { medianLeanness: null, slicesConsidered: 0, waste: { wasteRate: 0 } };
  const noCatch = { catchRate: null };
  const noLearn = { recentAvg: null };

  it('returns null when there is no real signal (never a fake 100)', () => {
    expect(magnification(noEff, noCatch, noLearn)).toBe(null);
  });

  it('does not count "no waste" as a win when there are zero slices', () => {
    // Only catch-rate is real here; the empty waste signal must be ignored.
    const r = magnification(noEff, { catchRate: 0.5 }, noLearn);
    expect(r).toBe(50);
  });

  it('blends all four signals with documented weights', () => {
    // leanness 80 (w .35), waste 0 → 100 (w .2), catch 100% (w .3), learn 60 (w .15)
    const eff = { medianLeanness: 80, slicesConsidered: 10, waste: { wasteRate: 0 } };
    const r = magnification(eff, { catchRate: 1 }, { recentAvg: 60 });
    // (80*.35 + 100*.2 + 100*.3 + 60*.15) / 1 = 28 + 20 + 30 + 9 = 87
    expect(r).toBe(87);
  });

  it('penalises waste — a high waste rate drags the score down', () => {
    const clean = { medianLeanness: 90, slicesConsidered: 10, waste: { wasteRate: 0 } };
    const wasteful = { medianLeanness: 90, slicesConsidered: 10, waste: { wasteRate: 0.8 } };
    const a = magnification(clean, { catchRate: 0.9 }, { recentAvg: 80 });
    const b = magnification(wasteful, { catchRate: 0.9 }, { recentAvg: 80 });
    expect(b).toBeLessThan(a);
  });

  it('clamps to the 0–100 range', () => {
    const eff = { medianLeanness: 100, slicesConsidered: 10, waste: { wasteRate: 0 } };
    const r = magnification(eff, { catchRate: 1 }, { recentAvg: 100 });
    expect(r).toBeLessThanOrEqual(100);
    expect(r).toBeGreaterThanOrEqual(0);
  });
});
