// learn-loop — the wire that closes the defect → lesson → gate flywheel. These
// tests pin the two pure functions that decide (a) what category a gate failure
// belongs to and (b) the honest repeat-rate from real defect recurrence. The
// classifier must be stable — a wrong category sends the lesson to the wrong
// bucket and the auto-gate never fires.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { classify, recurrenceStats, GATE_MAP } = require('../../bin/learn-loop.cjs');

describe('classify — gate → defect category', () => {
  it('maps the aitell gate to the ai-tell category with a prevention rule', () => {
    const c = classify('ai-tell copy');
    expect(c.category).toBe('ai-tell');
    expect(c.rule).toMatch(/aitell|human voice/i);
  });
  it('maps layout / render / pagesize / tsc to their categories', () => {
    expect(classify('visual layout').category).toBe('layout');
    expect(classify('render risk').category).toBe('render');
    expect(classify('page-size baseline').category).toBe('perf');
    expect(classify('tsc').category).toBe('types');
  });
  it('is case-insensitive and matches on substrings', () => {
    expect(classify('AITELL').category).toBe('ai-tell');
    expect(classify('RENDER-RISK').category).toBe('render');
  });
  it('falls back to a safe unknown category (never throws, always has a rule)', () => {
    const c = classify('some-brand-new-gate');
    expect(c.category).toBe('unknown');
    expect(typeof c.rule).toBe('string');
    expect(c.rule.length).toBeGreaterThan(0);
  });
  it('every mapped gate carries a non-empty prevention rule', () => {
    for (const k of Object.keys(GATE_MAP)) {
      expect(GATE_MAP[k].rule.length).toBeGreaterThan(0);
      expect(typeof GATE_MAP[k].category).toBe('string');
    }
  });
});

describe('recurrenceStats — the honest repeat-rate', () => {
  const mk = (cat, desc) => ({ category: cat, description: desc });

  it('returns null repeat-rate when there are no defects (never a fake number)', () => {
    const s = recurrenceStats({ defects: [] });
    expect(s.total).toBe(0);
    expect(s.repeatRate).toBe(null);
    expect(s.recurring).toEqual([]);
  });

  it('counts a repeat only when category AND description match', () => {
    const s = recurrenceStats({
      defects: [mk('layout', 'nav overflow'), mk('layout', 'nav overflow'), mk('layout', 'different bug')],
    });
    expect(s.total).toBe(3);
    expect(s.distinct).toBe(2);
    expect(s.repeats).toBe(1);
    expect(s.repeatRate).toBeCloseTo(1 / 3, 3);
  });

  it('does not treat same description in different categories as a repeat', () => {
    const s = recurrenceStats({ defects: [mk('layout', 'overflow'), mk('render', 'overflow')] });
    expect(s.repeats).toBe(0);
    expect(s.distinct).toBe(2);
  });

  it('surfaces recurring defects sorted by how often they came back', () => {
    const s = recurrenceStats({
      defects: [
        mk('ai-tell', 'buzzword'),
        mk('ai-tell', 'buzzword'),
        mk('ai-tell', 'buzzword'),
        mk('layout', 'shadow'),
        mk('layout', 'shadow'),
      ],
    });
    expect(s.recurring[0]).toMatchObject({ category: 'ai-tell', occurrences: 3 });
    expect(s.recurring[1]).toMatchObject({ category: 'layout', occurrences: 2 });
  });

  it('drives toward 0 — a clean log of distinct defects has repeat-rate 0', () => {
    const s = recurrenceStats({ defects: [mk('a', '1'), mk('b', '2'), mk('c', '3')] });
    expect(s.repeatRate).toBe(0);
  });
});
