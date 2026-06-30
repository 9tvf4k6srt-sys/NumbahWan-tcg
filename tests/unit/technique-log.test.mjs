// technique-log — turns "which reasoning approach works" from folklore into
// evidence. The whole point is HONESTY about evidence: a success-rate must be
// null until a cell has enough data, and "best so far" must only ever pick a
// technique that has enough data. These tests pin exactly that, so the score
// can never silently start quoting confidence it hasn't earned.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { score, MIN_EVIDENCE, TASK_CLASSES, TECHNIQUES, OUTCOMES } = require('../../bin/technique-log.cjs');

const rec = (taskClass, technique, outcome) => ({ taskClass, technique, outcome });

describe('score — honesty about evidence (the core invariant)', () => {
  it('reports null successRate until a cell reaches MIN_EVIDENCE', () => {
    const below = Array.from({ length: MIN_EVIDENCE - 1 }, () => rec('design', 'tot', 'clean'));
    const s = score(below);
    expect(s.rows[0].sufficient).toBe(false);
    expect(s.rows[0].successRate).toBeNull();
  });

  it('reports a real rate once a cell reaches MIN_EVIDENCE', () => {
    const recs = [
      rec('design', 'tot', 'clean'),
      rec('design', 'tot', 'clean'),
      rec('design', 'tot', 'fail'),
    ];
    const s = score(recs);
    expect(s.rows[0].sufficient).toBe(true);
    expect(s.rows[0].successRate).toBeCloseTo(2 / 3, 3);
    expect(s.rows[0].n).toBe(3);
    expect(s.rows[0].clean).toBe(2);
  });

  it('counts only outcome==="clean" as success', () => {
    const recs = [
      rec('action', 'react', 'clean'),
      rec('action', 'react', 'rework'),
      rec('action', 'react', 'fail'),
    ];
    const s = score(recs);
    expect(s.rows[0].clean).toBe(1);
    expect(s.rows[0].successRate).toBeCloseTo(1 / 3, 3);
  });
});

describe('score — best-per-class never picks an under-evidenced technique', () => {
  it('omits a class from byClass when no technique has enough data', () => {
    const recs = [rec('design', 'tot', 'clean'), rec('design', 'cot', 'clean')]; // n=1 each
    const s = score(recs);
    expect(s.byClass.design).toBeUndefined();
  });

  it('picks the highest-rate technique among those WITH enough evidence', () => {
    const recs = [
      // tot: 3 obs, 1 clean => 0.333 (sufficient)
      rec('design', 'tot', 'clean'),
      rec('design', 'tot', 'fail'),
      rec('design', 'tot', 'fail'),
      // cot: 3 obs, 3 clean => 1.0 (sufficient) — should win
      rec('design', 'cot', 'clean'),
      rec('design', 'cot', 'clean'),
      rec('design', 'cot', 'clean'),
      // react: 1 obs clean => insufficient, must be ignored even though 100%
      rec('design', 'react', 'clean'),
    ];
    const s = score(recs);
    expect(s.byClass.design.technique).toBe('cot');
    expect(s.byClass.design.successRate).toBe(1);
  });
});

describe('score — shape & totals', () => {
  it('returns total = number of records and one row per class×technique cell', () => {
    const recs = [
      rec('design', 'tot', 'clean'),
      rec('design', 'cot', 'clean'),
      rec('reasoning', 'cot', 'rework'),
    ];
    const s = score(recs);
    expect(s.total).toBe(3);
    expect(s.rows).toHaveLength(3); // three distinct cells
  });

  it('handles an empty log without throwing', () => {
    const s = score([]);
    expect(s.total).toBe(0);
    expect(s.rows).toHaveLength(0);
    expect(s.byClass).toEqual({});
  });
});

describe('vocabularies are sane (kept small + aligned with the protocol)', () => {
  it('MIN_EVIDENCE is a small positive integer', () => {
    expect(Number.isInteger(MIN_EVIDENCE)).toBe(true);
    expect(MIN_EVIDENCE).toBeGreaterThanOrEqual(2);
  });
  it('exposes the known task-class / technique / outcome sets', () => {
    expect(TASK_CLASSES).toContain('design');
    expect(TECHNIQUES).toContain('tot');
    expect(OUTCOMES).toEqual(['clean', 'rework', 'fail']);
  });
});
