// Shared linter plumbing — the pure helpers the stylometry stage relies on.
// stripMarkupAndCode in particular is load-bearing: if it stops stripping inline
// CSS/JS, machine rhythm leaks into the prose score and the AI-tell signal goes
// noisy. These tests keep that shape byte-stable.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { stripMarkupAndCode, isCJK, tryParseJSON, colors, argFlag, hasFlag, repoRoot } = require('../../tools/lib/aitell-common.cjs');

describe('stripMarkupAndCode — keeps prose, drops machine text', () => {
  it('removes <style> blocks and their contents', () => {
    const out = stripMarkupAndCode('Hello <style>.a{color:red}</style> world');
    expect(out).not.toContain('color');
    expect(out).toContain('Hello');
    expect(out).toContain('world');
  });

  it('removes <script> blocks and their contents', () => {
    const out = stripMarkupAndCode('Read <script>let x=1;alert(x)</script> this');
    expect(out).not.toContain('alert');
    expect(out).toContain('Read');
    expect(out).toContain('this');
  });

  it('removes inline <svg> blocks', () => {
    const out = stripMarkupAndCode('Logo <svg><path d="M0 0"/></svg> here');
    expect(out).not.toContain('path');
    expect(out).toContain('Logo');
  });

  it('strips remaining tags but keeps the words between them', () => {
    const out = stripMarkupAndCode('<p>A <b>bold</b> claim</p>');
    expect(out.replace(/\s+/g, ' ').trim()).toBe('A bold claim');
  });

  it('keeps the link text from markdown links, drops the URL', () => {
    const out = stripMarkupAndCode('See [the docs](https://example.com/x)');
    expect(out).toContain('the docs');
    expect(out).not.toContain('example.com');
  });

  it('strips fenced and inline code', () => {
    const out = stripMarkupAndCode('Run ```npm install``` then `node x` now');
    expect(out).not.toContain('npm install');
    expect(out).not.toContain('node x');
    expect(out).toContain('Run');
    expect(out).toContain('now');
  });
});

describe('isCJK — flags predominantly CJK text', () => {
  it('a mostly-Chinese string is CJK', () => {
    expect(isCJK('這是一個繁體中文句子')).toBe(true);
  });

  it('a mostly-Japanese string is CJK', () => {
    expect(isCJK('これは日本語の文章です')).toBe(true);
  });

  it('plain English is not CJK', () => {
    expect(isCJK('This is an ordinary English sentence')).toBe(false);
  });

  it('a tiny CJK sprinkle under the 20% threshold is not CJK', () => {
    expect(isCJK('A long English sentence with one 字 only here')).toBe(false);
  });

  it('empty / null input is not CJK', () => {
    expect(isCJK('')).toBe(false);
    expect(isCJK(null)).toBe(false);
  });
});

describe('tryParseJSON — parses or returns null, never throws', () => {
  it('parses valid JSON', () => {
    expect(tryParseJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null on malformed JSON instead of throwing', () => {
    expect(tryParseJSON('{not json')).toBeNull();
  });

  it('returns null on empty input', () => {
    expect(tryParseJSON('')).toBeNull();
  });
});

// This is the regression guard for a real bug: ~18 tools used to hardcode ANSI
// escapes that were NOT TTY-aware, so piping their output (CI, scripts, JSON
// consumers) got corrupted with raw `\x1b[` codes. colors() is the one home for
// the palette; these tests pin its contract so the leak can't come back.
describe('colors — TTY-aware palette (no raw escapes in pipes)', () => {
  const SAVED = { NO_COLOR: process.env.NO_COLOR, FORCE_COLOR: process.env.FORCE_COLOR };
  const clearEnv = () => { delete process.env.NO_COLOR; delete process.env.FORCE_COLOR; };
  const restore = () => {
    if (SAVED.NO_COLOR === undefined) delete process.env.NO_COLOR; else process.env.NO_COLOR = SAVED.NO_COLOR;
    if (SAVED.FORCE_COLOR === undefined) delete process.env.FORCE_COLOR; else process.env.FORCE_COLOR = SAVED.FORCE_COLOR;
  };

  it('returns empty strings for a non-TTY stream (clean pipes)', () => {
    clearEnv();
    const c = colors({ isTTY: false });
    expect(c.red).toBe('');
    expect(c.b).toBe('');
    restore();
  });

  it('returns real escape codes for a TTY stream', () => {
    clearEnv();
    const c = colors({ isTTY: true });
    expect(c.red).toContain('[31m');
    expect(c.r).toContain('[0m');
    restore();
  });

  it('NO_COLOR wins even on a TTY', () => {
    clearEnv();
    process.env.NO_COLOR = '1';
    expect(colors({ isTTY: true }).red).toBe('');
    restore();
  });

  it('FORCE_COLOR colors even a non-TTY (for CI logs that want color)', () => {
    clearEnv();
    process.env.FORCE_COLOR = '1';
    expect(colors({ isTTY: false }).green).toContain('[32m');
    restore();
  });

  it('exposes all 8 documented color keys', () => {
    clearEnv();
    const c = colors({ isTTY: true });
    for (const k of ['r', 'b', 'dim', 'cyan', 'green', 'yellow', 'red', 'mag']) {
      expect(typeof c[k]).toBe('string');
      expect(c[k].length).toBeGreaterThan(0);
    }
    restore();
  });
});

describe('argFlag / hasFlag — the arg parser 3+ tools had copy-pasted', () => {
  it('reads --name=value from a supplied argv', () => {
    expect(argFlag('budget', null, ['--budget=8000'])).toBe('8000');
  });
  it('returns the default when the flag is absent', () => {
    expect(argFlag('budget', '500', ['--other=1'])).toBe('500');
  });
  it('handles values containing = signs (only splits on the first)', () => {
    expect(argFlag('q', null, ['--q=a=b=c'])).toBe('a=b=c');
  });
  it('hasFlag detects a bare switch and a valued one', () => {
    expect(hasFlag('json', ['--json'])).toBe(true);
    expect(hasFlag('budget', ['--budget=1'])).toBe(true);
    expect(hasFlag('json', ['--other'])).toBe(false);
  });
});

describe('repoRoot — single source of truth for the repo root', () => {
  it('resolves to a directory that contains package.json', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    expect(fs.existsSync(path.join(repoRoot(), 'package.json'))).toBe(true);
  });
});
