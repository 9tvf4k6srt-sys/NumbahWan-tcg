// Shared linter plumbing — the pure helpers the stylometry stage relies on.
// stripMarkupAndCode in particular is load-bearing: if it stops stripping inline
// CSS/JS, machine rhythm leaks into the prose score and the AI-tell signal goes
// noisy. These tests keep that shape byte-stable.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { stripMarkupAndCode, isCJK, tryParseJSON } = require('../../tools/lib/aitell-common.cjs');

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
