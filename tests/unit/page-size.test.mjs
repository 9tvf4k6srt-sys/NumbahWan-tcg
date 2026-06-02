// Page-size guardrail — the monolith detector (PR #66). It is advisory and
// never blocks, so its only job is to MEASURE honestly and raise the right
// note at the right threshold. These tests pin the measurement maths and the
// soft-cap boundaries so a future tweak cannot quietly drift them.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { measure, findingsFor, LIMITS } = require('../../tools/page-size-lint.cjs');

describe('measure — counts total lines', () => {
  it('counts newline-separated lines', () => {
    expect(measure('<a>\n<b>\n<c>').total).toBe(3);
  });

  it('an empty source is zero lines', () => {
    expect(measure('')).toEqual({ total: 0, inlineCSS: 0, inlineJS: 0 });
  });

  it('a single line with no newline is one line', () => {
    expect(measure('<html></html>').total).toBe(1);
  });
});

describe('measure — inline <style> weight', () => {
  it('counts lines inside a style block', () => {
    // The captured inner text is "\n.a{color:red}\n.b{color:blue}\n", which
    // split on \n yields 4 segments (the two trailing/leading empties count).
    const src = '<style>\n.a{color:red}\n.b{color:blue}\n</style>';
    expect(measure(src).inlineCSS).toBe(4);
  });

  it('ignores markup outside the style block for the CSS count', () => {
    // Inner text "\nx{}\n" -> ["", "x{}", ""] -> 3 segments.
    const src = '<head>\n<style>\nx{}\n</style>\n</head>';
    expect(measure(src).inlineCSS).toBe(3);
  });
});

describe('measure — inline <script> weight (src= excluded)', () => {
  it('counts lines inside an inline script', () => {
    // Inner text "\nconsole.log(1)\nconsole.log(2)\n" -> 4 segments.
    const src = '<script>\nconsole.log(1)\nconsole.log(2)\n</script>';
    expect(measure(src).inlineJS).toBe(4);
  });

  it('an external <script src=...> carries no inline weight', () => {
    const src = '<script src="/static/app.js"></script>';
    expect(measure(src).inlineJS).toBe(0);
  });

  it('mixes correctly: external script ignored, inline script counted', () => {
    // External block carries 0; inline inner "\nlet x=1\n" -> 3 segments.
    const src = '<script src="/a.js"></script>\n<script>\nlet x=1\n</script>';
    expect(measure(src).inlineJS).toBe(3);
  });
});

describe('findingsFor — soft-cap boundaries', () => {
  it('a lean page raises nothing', () => {
    const cur = { total: 100, inlineCSS: 10, inlineJS: 10 };
    expect(findingsFor('public/p.html', cur, null)).toEqual([]);
  });

  it('PS1-MONOLITH fires only ABOVE the total cap', () => {
    const atCap = { total: LIMITS.total, inlineCSS: 0, inlineJS: 0 };
    expect(findingsFor('p.html', atCap, null).map(f => f.id)).not.toContain('PS1-MONOLITH');

    const over = { total: LIMITS.total + 1, inlineCSS: 0, inlineJS: 0 };
    expect(findingsFor('p.html', over, null).map(f => f.id)).toContain('PS1-MONOLITH');
  });

  it('PS2-INLINE-JS fires above the inline-JS cap', () => {
    const over = { total: 50, inlineCSS: 0, inlineJS: LIMITS.inlineJS + 1 };
    expect(findingsFor('public/page.html', over, null).map(f => f.id)).toContain('PS2-INLINE-JS');
  });

  it('PS3-INLINE-CSS fires above the inline-CSS cap', () => {
    const over = { total: 50, inlineCSS: LIMITS.inlineCSS + 1, inlineJS: 0 };
    expect(findingsFor('p.html', over, null).map(f => f.id)).toContain('PS3-INLINE-CSS');
  });
});

describe('findingsFor — ballooning growth (PS4)', () => {
  it('a big single-change jump is flagged when a baseline exists', () => {
    const prev = { total: 100, inlineCSS: 0, inlineJS: 0 };
    const cur = { total: 100 + LIMITS.growthLines + 1, inlineCSS: 0, inlineJS: 0 };
    expect(findingsFor('p.html', cur, prev).map(f => f.id)).toContain('PS4-BALLOONING');
  });

  it('no baseline means no growth note (cannot compare)', () => {
    const cur = { total: 5000, inlineCSS: 0, inlineJS: 0 };
    const ids = findingsFor('p.html', cur, null).map(f => f.id);
    expect(ids).not.toContain('PS4-BALLOONING');
    // it is still a monolith though
    expect(ids).toContain('PS1-MONOLITH');
  });

  it('modest growth under the cap is not flagged', () => {
    const prev = { total: 100, inlineCSS: 0, inlineJS: 0 };
    const cur = { total: 100 + LIMITS.growthLines, inlineCSS: 0, inlineJS: 0 };
    expect(findingsFor('p.html', cur, prev).map(f => f.id)).not.toContain('PS4-BALLOONING');
  });
});
