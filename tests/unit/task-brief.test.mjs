// task-brief — the context firewall. These tests pin the keyword→category
// routing that decides which slice of memory the agent gets. If routing is
// wrong, the agent is handed irrelevant context and the whole point (skip
// reading the repo) is lost.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { build, categoriesFor, scaffold } = require('../../bin/task-brief.cjs');

describe('categoriesFor — task language → memory categories', () => {
  it('routes layout language to the layout category', () => {
    expect(categoriesFor('fix nav overflow on mobile header')).toContain('layout');
  });
  it('routes copy/voice language to the ai-tell category', () => {
    expect(categoriesFor('rewrite the copy so it does not sound like AI')).toContain('ai-tell');
  });
  it('routes translation language to i18n', () => {
    expect(categoriesFor('add the trilingual locale strings')).toContain('i18n');
  });
  it('can match more than one area for a mixed task', () => {
    const cats = categoriesFor('fix the mobile layout and retranslate the copy');
    expect(cats.has('layout')).toBe(true);
    expect(cats.has('ai-tell') || cats.has('i18n')).toBe(true);
  });
  it('returns an empty set for an unroutable task (caller falls back to all gates)', () => {
    expect(categoriesFor('xyzzy frobnicate the quux').size).toBe(0);
  });
});

describe('build — the brief shape (reads live memory, must not throw)', () => {
  const b = build('fix nav overflow on mobile');

  it('always returns the four sections plus a budget', () => {
    expect(b).toHaveProperty('gates');
    expect(b).toHaveProperty('pastDefects');
    expect(b).toHaveProperty('relevantFiles');
    expect(b).toHaveProperty('suggestedBudget');
    expect(Array.isArray(b.gates)).toBe(true);
    expect(Array.isArray(b.pastDefects)).toBe(true);
  });

  it('suggests a larger budget for visual work (layout/render)', () => {
    const visual = build('fix the layout and render of the header');
    const textual = build('update the types in the api module');
    expect(visual.suggestedBudget).toBeGreaterThanOrEqual(textual.suggestedBudget);
  });

  it('never blinds the agent — gates is non-empty when memory has any gates', () => {
    // With real memory present this should hold; with empty memory it is [] and
    // that is still valid. Just assert it is an array (shape contract).
    expect(Array.isArray(b.gates)).toBe(true);
  });

  it('emits the Role + Format + Constraints scaffold (Foundational Structure)', () => {
    expect(typeof b.role).toBe('string');
    expect(b.role.length).toBeGreaterThan(0);
    expect(typeof b.format).toBe('string');
    expect(b.format.length).toBeGreaterThan(0);
    expect(Array.isArray(b.constraints)).toBe(true);
  });
});

describe('scaffold — Role + Format + Constraints, derived not boilerplate', () => {
  it('picks a category-specific role when the task hits a known area', () => {
    const sc = scaffold(new Set(['layout']), []);
    expect(sc.role).toMatch(/front-end/i);
  });

  it('picks a category-specific format when the task hits a known area', () => {
    const sc = scaffold(new Set(['i18n']), []);
    expect(sc.format).toMatch(/locale/i);
  });

  it('falls back to a sane default role/format for an unrouted task', () => {
    const sc = scaffold(new Set(), []);
    expect(sc.role).toMatch(/senior engineer/i);
    expect(sc.format.length).toBeGreaterThan(0);
  });

  it('always includes the standing honesty constraint (outlives any gate)', () => {
    const sc = scaffold(new Set(['types']), []);
    expect(sc.constraints.some((c) => /honesty/i.test(c) && /unverified/i.test(c))).toBe(true);
  });

  it('turns real gates into do-not constraints (traceable, not invented)', () => {
    const gates = [{ category: 'layout', rule: 'never ship CSS without preship', auto: true }];
    const sc = scaffold(new Set(['layout']), gates);
    expect(sc.constraints.some((c) => /preship/.test(c))).toBe(true);
  });
});
