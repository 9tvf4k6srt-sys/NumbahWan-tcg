// Mined-data quality gates. These two detectors are what make the breakage
// dataset worth anything: one rejects raw diff dumps at mine time, the other
// is the validator's gate that makes an "A+" grade mean the rootCauses actually
// EXPLAIN rather than just being non-empty. Both are pure string judgements, so
// they are cheap to lock down and expensive to get wrong silently.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { isLowQualityRootCause } = require('../../tools/mycelium-miner.cjs');
const { isMeaningfulRootCause } = require('../../tools/validate-mined-data.cjs');

describe('isLowQualityRootCause — rejects diff dumps and pasted subjects', () => {
  it('flags a raw diff dump with a value arrow', () => {
    expect(isLowQualityRootCause('Changed opacity: .28 → .22', 'fix: x')).toBe(true);
    expect(isLowQualityRootCause('Changed height: 120px → 100%', 'fix: y')).toBe(true);
  });

  it('flags an "Also: Changed" atom chain', () => {
    expect(isLowQualityRootCause('Added touch handling. Also: Changed pointer-events', 'fix: z')).toBe(true);
  });

  it('flags a rootCause that is just the commit subject verbatim', () => {
    const msg = 'fix(invest): remove ambient audio system';
    expect(isLowQualityRootCause('remove ambient audio system', msg)).toBe(true);
  });

  it('flags fragments (leading paren, trailing colon, too few words)', () => {
    expect(isLowQualityRootCause('(visible on iPhone):', 'fix: a')).toBe(true);
    expect(isLowQualityRootCause('too short', 'fix: b')).toBe(true);
    expect(isLowQualityRootCause('', 'fix: c')).toBe(true);
  });

  it('accepts a real causal explanation', () => {
    const good = 'Desktop flex-direction column persisted into the mobile viewport, so the photo expanded past its cap and overlapped the title text';
    expect(isLowQualityRootCause(good, 'fix: merch overlap')).toBe(false);
  });
});

describe('isMeaningfulRootCause — the A+ meaning gate', () => {
  it('passes a sentence that reads as causal analysis', () => {
    const good = 'AI-generated video trailer contained discrepancies that violated quality standards, requiring a fallback to a static image asset';
    expect(isMeaningfulRootCause(good, 'revert: trailer')).toBe(true);
  });

  it('rejects a diff dump even though every field would be "filled"', () => {
    expect(isMeaningfulRootCause('Changed opacity: .28 → .22. Also: Changed resource path', 'fix: x')).toBe(false);
  });

  it('rejects a pasted commit subject', () => {
    const msg = 'fix(invest): proportional ship speeds calibrated to photo geometry';
    expect(isMeaningfulRootCause('proportional ship speeds calibrated to photo geometry', msg)).toBe(false);
  });

  it('rejects fragments and over-short strings', () => {
    expect(isMeaningfulRootCause('(visible on iPhone):', 'fix: y')).toBe(false);
    expect(isMeaningfulRootCause('too short', 'fix: z')).toBe(false);
    expect(isMeaningfulRootCause(null, 'fix: q')).toBe(false);
  });
});
