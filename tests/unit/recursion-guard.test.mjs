// recursion-guard — the one pure-engineering part of the RCOF "Safeguards"
// layer that is real for a frozen model: a bounded recursion guard with an
// explicit escape valve and an audit trail.
//
// These tests pin the invariants that make it a safeguard rather than decoration:
//   1. DEPTH CEILING — enter() must throw a typed GuardTripped past maxDepth, so
//      an unbounded self-call cannot run away silently.
//   2. ESCAPE VALVE — shouldEscape() must trip after maxStaleSteps of identical
//      "progress" (noise-to-meaning: spinning without new information is a stop
//      condition), and must NOT trip while progress keeps changing.
//   3. BALANCE — enter()/exit() must net to zero depth so a healthy loop leaves
//      no residue.
// The guard must never crash the loop it protects; auditing is best-effort.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { RecursionGuard, GuardTripped, DEFAULTS } = require('../../tools/lib/recursion-guard.cjs');

describe('recursion-guard — depth ceiling', () => {
  it('trips with a typed GuardTripped past maxDepth', () => {
    const g = new RecursionGuard({ maxDepth: 3, label: 'test-depth' });
    expect(() => { g.enter(); g.enter(); g.enter(); }).not.toThrow(); // 1,2,3 ok
    let err;
    try { g.enter(); } catch (e) { err = e; } // 4 > 3 → trip
    expect(err).toBeInstanceOf(GuardTripped);
    expect(err.info).toBeTruthy();
    expect(err.info.maxDepth).toBe(3);
  });

  it('reports the depth it reached when it tripped', () => {
    const g = new RecursionGuard({ maxDepth: 2, label: 'test-reach' });
    g.enter(); g.enter();
    let info;
    try { g.enter(); } catch (e) { info = e.info; }
    expect(info.depth).toBeGreaterThan(2);
  });
});

describe('recursion-guard — escape valve (noise-to-meaning)', () => {
  it('escapes after maxStaleSteps of identical progress', () => {
    const g = new RecursionGuard({ maxStaleSteps: 3, label: 'test-stale' });
    // The first call only RECORDS the baseline (lastProgress was null), so it is
    // never stale. Staleness counts CONSECUTIVE repeats after that baseline:
    expect(g.shouldEscape('same')).toBe(false); // baseline recorded, staleSteps=0
    expect(g.shouldEscape('same')).toBe(false); // staleSteps=1
    expect(g.shouldEscape('same')).toBe(false); // staleSteps=2
    expect(g.shouldEscape('same')).toBe(true);  // staleSteps=3 → escape
  });

  it('never escapes while progress keeps changing', () => {
    const g = new RecursionGuard({ maxStaleSteps: 2, label: 'test-progress' });
    for (let i = 0; i < 10; i++) {
      expect(g.shouldEscape(`step-${i}`)).toBe(false);
    }
  });

  it('resets the stale counter when progress changes', () => {
    const g = new RecursionGuard({ maxStaleSteps: 3, label: 'test-reset' });
    g.shouldEscape('a'); // 1 stale
    g.shouldEscape('a'); // 2 stale
    expect(g.shouldEscape('b')).toBe(false); // changed → reset
    expect(g.shouldEscape('b')).toBe(false); // 1 stale again
    expect(g.shouldEscape('b')).toBe(false); // 2 stale
    expect(g.shouldEscape('b')).toBe(true);  // 3 stale → escape
  });
});

describe('recursion-guard — balance + state', () => {
  it('enter/exit nets back to zero depth', () => {
    const g = new RecursionGuard({ maxDepth: 5, label: 'test-balance' });
    g.enter(); g.enter();
    expect(g.state().depth).toBe(2);
    g.exit(); g.exit();
    expect(g.state().depth).toBe(0);
  });

  it('exposes sane defaults', () => {
    expect(DEFAULTS.maxDepth).toBeGreaterThan(0);
    expect(DEFAULTS.maxStaleSteps).toBeGreaterThan(0);
  });

  it('a guard with no opts uses the defaults and does not trip on shallow use', () => {
    const g = new RecursionGuard();
    expect(() => { g.enter(); g.exit(); }).not.toThrow();
    expect(g.state().depth).toBe(0);
  });
});
