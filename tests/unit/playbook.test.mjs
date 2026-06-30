// playbook — Move 3 of the grounded RCOF work: the "Knowledge Federation / ACE"
// layer, made honest. It distils the repo's PROVEN knowledge (standing rules,
// recorded lessons, per-task technique evidence) into a versioned, loadable
// artifact a fresh clone can carry to another repo.
//
// These tests pin the properties that keep it trustworthy rather than theatre:
//   1. HONESTY — when there is no technique evidence, the playbook reports the
//      recommendation as empty/insufficient (null), NEVER a fabricated rate.
//   2. DETERMINISM — identical inputs produce an identical contentHash, so two
//      exports of the same knowledge are byte-stable and diffable.
//   3. INTEGRITY — the contentHash is over the knowledge block, so any hand-edit
//      of the artifact is detectable (the basis of `distill verify`).
//   4. NO RAW-SHAPE LEAK — a structured lesson is mapped to named fields, never
//      JSON.stringify'd into an opaque text blob.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  buildPlaybook, distillRules, distillLessons, distillTechniques, checksum, deriveVersion, SCHEMA,
} = require('../../bin/playbook.cjs');

describe('playbook — honesty about evidence', () => {
  it('reports technique recommendations as empty when the log is empty', () => {
    // distillTechniques reads the real (currently empty) technique-log. With no
    // observations, recommended MUST be {} — not an invented winner.
    const t = distillTechniques();
    expect(t.totalObservations).toBe(0);
    expect(t.recommended).toEqual({});
    expect(t.note).toMatch(/insufficient|null/i);
  });

  it('never fabricates a successRate for a thin technique cell', () => {
    const t = distillTechniques();
    for (const row of t.grid) {
      if (!row.sufficient) expect(row.successRate).toBeNull();
    }
  });

  it('marks an all-empty playbook as empty rather than hiding it', () => {
    // built from a deliberately empty memory shape
    const rules = distillRules({ patterns: { required_checks: [] } });
    const lessons = distillLessons({ lessons: [] });
    expect(rules).toEqual([]);
    expect(lessons).toEqual([]);
  });
});

describe('playbook — determinism + integrity', () => {
  it('produces an identical contentHash for identical knowledge', () => {
    const a = buildPlaybook();
    const b = buildPlaybook();
    expect(a.contentHash).toBe(b.contentHash);
  });

  it('contentHash covers the knowledge block (tamper is detectable)', () => {
    const pb = buildPlaybook();
    const recomputed = checksum(pb.knowledge);
    expect(recomputed).toBe(pb.contentHash);
    // mutate a copy of the knowledge and confirm the hash changes
    const tampered = JSON.parse(JSON.stringify(pb.knowledge));
    tampered.rules.push({ description: 'INJECTED', category: 'evil' });
    expect(checksum(tampered)).not.toBe(pb.contentHash);
  });

  it('derives a version from content, not wall-clock', () => {
    const v = deriveVersion('1.0', 'sha256:abcdef0123456789');
    expect(v).toBe('1.0+abcdef01');
  });

  it('stamps a stable schema id', () => {
    expect(buildPlaybook().schema).toBe(SCHEMA);
  });
});

describe('playbook — lesson mapping (no raw-shape leak)', () => {
  it('maps a structured lesson to named fields, not a JSON blob', () => {
    const mem = {
      lessons: [{
        id: 'L0001',
        type: 'defect',
        data: {
          description: 'empty PAGE_I18N objects',
          rootCause: 'hardcoded empty objects',
          fix: 'buildPageI18n()',
          preventionRule: 'verify PAGE_I18N non-empty',
          category: 'i18n',
          severity: 'critical',
        },
        applied: false,
      }],
    };
    const [l] = distillLessons(mem);
    expect(l.text).toBe('empty PAGE_I18N objects');
    expect(l.rootCause).toBe('hardcoded empty objects');
    expect(l.preventionRule).toBe('verify PAGE_I18N non-empty');
    expect(l.category).toBe('i18n');
    expect(l.applied).toBe(false);
    // it must NOT have stringified the whole object into text
    expect(l.text).not.toMatch(/[{}]/);
  });

  it('carries a plain string lesson through unchanged', () => {
    const [l] = distillLessons({ lessons: ['just a sentence'] });
    expect(l.text).toBe('just a sentence');
  });
});
