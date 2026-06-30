// route-task — complexity-aware routing (the cheat sheet's highest-leverage
// buildable idea: simple tasks → fast path, complex → full reasoning).
//
// These tests pin the two things that make this trustworthy rather than a toy:
//   1. classification is DELIBERATION-AWARE — a task that asks us to *decide*
//      routes to design/reasoning even when an incidental imperative ("build",
//      "run") is in the sentence. Misrouting a design call to the cheap path is
//      the exact failure mode complexity-aware routing is meant to prevent.
//   2. the technique pick is HONEST about evidence — and crucially, when the
//      fast path downgrades an expensive technique (tot→cot), it must NOT keep
//      showing the original technique's success-rate. The downgraded pick has no
//      evidence behind it, so techniqueEvidence MUST be null and the source MUST
//      say so. This is the invariant a recent bug violated; it is pinned here.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { classify, complexity, pickTechnique, route, DEFAULT_TECHNIQUE, CLASS_SIGNALS } =
  require('../../bin/route-task.cjs');

describe('classify — deliberation beats incidental imperative', () => {
  it('routes "refactor … and decide whether …" to design, not action', () => {
    // "build" appears in the sentence but the task is a decision → design wins.
    expect(classify('refactor the build pipeline and decide whether to split the worker')).toBe('design');
  });

  it('routes a pure imperative to action', () => {
    expect(classify('deploy the worker to production')).toBe('action');
  });

  it('routes a narrow fact question to lookup', () => {
    expect(classify('what is the default budget')).toBe('lookup');
  });

  it('routes a repo-wide review to synthesis', () => {
    expect(classify('audit all the recent defects across the repo')).toBe('synthesis');
  });

  it('falls back to reasoning when no signal matches (never cheapest, never priciest)', () => {
    expect(classify('the quux frobnicates the wibble')).toBe('reasoning');
  });

  it('only ever returns one of the five known classes', () => {
    const known = new Set(['lookup', 'reasoning', 'design', 'action', 'synthesis']);
    for (const [cls] of CLASS_SIGNALS) expect(known.has(cls)).toBe(true);
    expect(known.has(classify('anything at all'))).toBe(true);
  });
});

describe('complexity — auditable score from measurable signals', () => {
  it('returns 0..100 and an explanation for every signal it adds', () => {
    const c = complexity('design a system across the whole repo and decide the technique and wire it up');
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
    // every point added must carry a human-readable reason (no hidden scoring)
    expect(c.signals.every((s) => /^\+\d+ /.test(s))).toBe(true);
    expect(c.signals.length).toBeGreaterThan(0);
  });

  it('scores a genuine design decision higher than a trivial lookup', () => {
    const decision = complexity('decide whether we should restructure the worker and choose an approach');
    const lookup = complexity('what is the budget');
    expect(decision.score).toBeGreaterThan(lookup.score);
  });

  it('charges the visual/CSS surcharge (the repo #1 token sink)', () => {
    const visual = complexity('fix the nav css overflow and restyle the header layout');
    expect(visual.signals.some((s) => /visual\/CSS/.test(s))).toBe(true);
    expect(visual.categories).toContain('layout');
  });

  it('discounts a narrow lookup so it stays on the fast path', () => {
    const c = complexity('what is x');
    expect(c.signals.some((s) => /narrow lookup/.test(s))).toBe(true);
  });
});

describe('route — the fast/standard/full decision + budget', () => {
  it('sends a trivial lookup to the fast path with the smallest budget', () => {
    const r = route('what is the default budget');
    expect(r.path).toBe('fast');
    expect(r.suggestedBudget).toBe(5000);
  });

  it('sends a big sprawling design task off the fast path', () => {
    const r = route(
      'design a complexity-aware routing system across the whole repo and decide the technique per task class and wire it into the cli',
    );
    expect(r.path).not.toBe('fast');
    expect(r.suggestedBudget).toBeGreaterThan(5000);
  });

  it('adds the visual surcharge to whatever the base budget is', () => {
    const r = route('redesign the entire header layout and restyle every css gradient across the whole site');
    expect(r.categories).toContain('layout');
    // budget = base + 3000 visual surcharge
    expect(r.suggestedBudget % 1000).toBe(0);
    expect(r.suggestedBudget).toBeGreaterThanOrEqual(8000);
  });

  it('always emits a plan that references tools we own', () => {
    const r = route('deploy the worker');
    expect(Array.isArray(r.plan)).toBe(true);
    expect(r.plan[0]).toMatch(/^ai task /);
    expect(r.plan.some((s) => /ai technique log/.test(s))).toBe(true);
  });
});

describe('technique honesty — the invariant a real bug once violated', () => {
  it('never attaches evidence to a default (unearned) pick', () => {
    // with no log, every pick is a default → evidence must be null
    const r = route('what is x');
    expect(r.techniqueSource).toMatch(/default/);
    expect(r.techniqueEvidence).toBeNull();
  });

  it('when the fast path downgrades an expensive technique, evidence is dropped to null', () => {
    // a SHORT design task: design defaults to tot, but the fast path can't afford
    // tot → it downgrades to cot. The cot pick has NO evidence of its own, so we
    // must NOT keep showing tot's rate. source says "downgraded", evidence is null.
    const r = route('refactor and decide whether to split');
    if (r.path === 'fast') {
      expect(r.technique).not.toBe('tot');
      expect(r.techniqueSource).toBe('default-downgraded');
      expect(r.techniqueEvidence).toBeNull();
    } else {
      // if scoring put it on standard/full, it may legitimately keep tot —
      // but then it must NOT be labelled "downgraded"
      expect(r.techniqueSource).not.toBe('default-downgraded');
    }
  });

  it('a full-reasoning design task keeps tot (no downgrade)', () => {
    const r = route(
      'design a complexity-aware routing system across the whole repo and decide the technique per task class and wire it everywhere',
    );
    expect(r.path).not.toBe('fast');
    expect(r.technique).toBe('tot');
    expect(r.techniqueSource).not.toBe('default-downgraded');
  });

  it('pickTechnique returns a sane default for every known class with no log', () => {
    for (const cls of Object.keys(DEFAULT_TECHNIQUE)) {
      const p = pickTechnique(cls);
      expect(p.source).toBe('default');
      expect(p.successRate).toBeNull();
      expect(p.technique).toBe(DEFAULT_TECHNIQUE[cls]);
    }
  });
});
