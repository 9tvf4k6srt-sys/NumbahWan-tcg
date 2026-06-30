// optimize-loop — the evaluator-optimizer (the OPRO half, on disk). It scores
// the repo's standing rules by REAL defect recurrence per category, then
// proposes sharper rules for the weak/uncovered ones. These tests pin the pure
// functions so the signal stays honest (null when no evidence), the classifier
// trusts an entry's own category, weak/proven verdicts track recurrence, and
// the candidate ranking always prefers a concrete, measurable rule.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  categoryStats,
  ruleCategory,
  scoreRule,
  specificity,
  proposeForCategory,
  CATEGORY_PLAYBOOK,
} = require('../../bin/optimize-loop.cjs');

// a tiny memory fixture: layout recurred (same desc twice), ai-tell did not.
const mem = {
  defects: [
    { category: 'layout', description: 'emoji used as icon' },
    { category: 'layout', description: 'emoji used as icon' }, // repeat
    { category: 'layout', description: 'default gradient shipped' },
    { category: 'ai-tell', description: 'em-dash pile-up' },
  ],
  patterns: { required_checks: [] },
};

describe('categoryStats — per-category recurrence is the performance signal', () => {
  const s = categoryStats(mem);
  it('counts totals and repeats per category', () => {
    expect(s.layout.total).toBe(3);
    expect(s.layout.repeats).toBe(1); // one defect was a repeat of an earlier one
    expect(s['ai-tell'].total).toBe(1);
    expect(s['ai-tell'].repeats).toBe(0);
  });
  it('computes an honest repeat-rate per category', () => {
    expect(s.layout.repeatRate).toBeCloseTo(1 / 3, 3);
    expect(s['ai-tell'].repeatRate).toBe(0);
  });
  it('returns null repeat-rate (not a fake number) when a category has no defects', () => {
    const empty = categoryStats({ defects: [] });
    expect(Object.keys(empty)).toHaveLength(0);
  });
});

describe('ruleCategory — trust the entry, then the text', () => {
  it('uses an objects own category field when present (authoritative)', () => {
    expect(ruleCategory({ description: 'anything at all', category: 'perf' })).toBe('perf');
  });
  it('classifies a bare string by its language when no category field', () => {
    expect(ruleCategory('run aitell, keep a human voice')).toBe('ai-tell');
    expect(ruleCategory('no emoji as icon, fix the gradient')).toBe('layout');
    expect(ruleCategory('tsc --noEmit must be clean')).toBe('types');
  });
  it('falls back to uncategorized, never throws', () => {
    expect(ruleCategory('completely novel rule text')).toBe('uncategorized');
    expect(ruleCategory(undefined)).toBe('uncategorized');
  });
});

describe('scoreRule — proven / weak / unproven track real recurrence', () => {
  const stats = categoryStats(mem);
  it('marks a rule WEAK when its category keeps recurring', () => {
    const r = scoreRule({ description: 'layout rule', category: 'layout' }, stats);
    expect(r.verdict).toBe('weak');
    expect(r.repeatRate).toBeCloseTo(1 / 3, 3);
  });
  it('marks a rule PROVEN when its category has defects but no repeats', () => {
    const r = scoreRule({ description: 'ai-tell rule', category: 'ai-tell' }, stats);
    expect(r.verdict).toBe('proven');
  });
  it('marks a rule UNPROVEN (null rate) when there is no evidence in its category', () => {
    const r = scoreRule({ description: 'perf rule', category: 'perf' }, stats);
    expect(r.verdict).toBe('unproven');
    expect(r.repeatRate).toBeNull();
  });
});

describe('specificity — ranking prefers concrete, measurable rules', () => {
  it('scores a rule with a command + measurable bar above a vague one', () => {
    const concrete = specificity('Run `ai aitell`; 0 flags before ship');
    const vague = specificity('try to write nicely');
    expect(concrete).toBeGreaterThan(vague);
  });
  it('never returns NaN', () => {
    expect(Number.isNaN(specificity('x'))).toBe(false);
    expect(Number.isNaN(specificity(''))).toBe(false);
  });
});

describe('proposeForCategory — OPRO-style candidate set with a best winner', () => {
  it('returns ranked candidates and picks the most specific as winner', () => {
    const p = proposeForCategory('ai-tell', categoryStats(mem));
    expect(p.candidates.length).toBeGreaterThan(0);
    // winner has the highest specificity score in the set
    const maxScore = Math.max(...p.candidates.map((c) => c.score));
    expect(p.winner.score).toBe(maxScore);
  });
  it('always yields a usable rule even for an unknown category', () => {
    const p = proposeForCategory('totally-new-category', categoryStats(mem));
    expect(typeof p.winner.rule).toBe('string');
    expect(p.winner.rule.length).toBeGreaterThan(0);
  });
  it('every playbook category lists at least one candidate rule', () => {
    for (const cat of Object.keys(CATEGORY_PLAYBOOK)) {
      expect(CATEGORY_PLAYBOOK[cat].length).toBeGreaterThan(0);
    }
  });
});
