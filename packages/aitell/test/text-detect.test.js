import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const aitell = require('../src/index.js');
const { lintText, defaultCorpus, hasColourEmoji, colourEmojis, stripMarkupAndCode, isCJK, flattenCorpus } = aitell;

describe('lintText — regex AI-tell blocklist', () => {
  it('flags a known filler phrase', () => {
    const r = lintText('Let us delve into the details.', defaultCorpus);
    expect(r.violations.some(v => /delve/i.test(v.match))).toBe(true);
  });

  it('reports clean prose with zero violations', () => {
    const r = lintText('The cat sat on the warm windowsill and watched the rain.', defaultCorpus);
    expect(r.violations.length).toBe(0);
    expect(r.blocked).toBe(0);
  });

  it('separates blocking (high) from warnings (medium)', () => {
    const r = lintText('This is a testament to our commitment, a nuanced tapestry.', defaultCorpus);
    expect(r.blocked + r.warned).toBe(r.violations.filter(v => v.severity !== 'low').length);
  });

  it('strips HTML comments before scanning by default', () => {
    const r = lintText('<!-- delve into this -->Plain clean copy here.', defaultCorpus);
    expect(r.violations.length).toBe(0);
  });

  it('can be told NOT to strip comments', () => {
    const r = lintText('<!-- delve into this -->ok', defaultCorpus, { stripComments: false });
    expect(r.violations.some(v => /delve/i.test(v.match))).toBe(true);
  });

  it('reports a line number for each violation', () => {
    const r = lintText('line one\nlet us delve into line two', defaultCorpus);
    const hit = r.violations.find(v => /delve/i.test(v.match));
    expect(hit.line).toBe(2);
  });
});

describe('flattenCorpus', () => {
  it('flattens rules[].patterns[] into one list', () => {
    const flat = flattenCorpus({
      rules: [
        { id: 'A', lang: 'en', severity: 'high', patterns: ['x', 'y'] },
        { id: 'B', lang: 'en', severity: 'low', patterns: ['z'] },
      ],
    });
    expect(flat).toHaveLength(3);
    expect(flat[0]).toMatchObject({ id: 'A', pattern: 'x' });
  });

  it('tolerates an empty / missing corpus', () => {
    expect(flattenCorpus(null)).toEqual([]);
    expect(flattenCorpus({})).toEqual([]);
  });
});

describe('colour-emoji detection', () => {
  it('high-plane emoji is a tell', () => {
    expect(hasColourEmoji('Launch 🚀')).toBe(true);
    expect(hasColourEmoji('🎯')).toBe(true);
  });

  it('VS16-carrying BMP symbol is a colour emoji', () => {
    expect(hasColourEmoji('Warning \u2757\uFE0F')).toBe(true);
  });

  it('monochrome dingbats are spared', () => {
    expect(hasColourEmoji('Done \u2713')).toBe(false);
    expect(hasColourEmoji('Next \u2192')).toBe(false);
    expect(hasColourEmoji('Rating \u2605')).toBe(false);
  });

  it('extracts only the colour emoji', () => {
    expect(colourEmojis('Close \u2715 then 🎉')).toEqual(['🎉']);
  });
});

describe('stripMarkupAndCode + isCJK', () => {
  it('strips script/style contents', () => {
    const out = stripMarkupAndCode('Hi <style>.a{x:1}</style><script>z()</script> there');
    expect(out).not.toContain('x:1');
    expect(out).not.toContain('z()');
    expect(out).toContain('Hi');
    expect(out).toContain('there');
  });

  it('flags predominantly CJK text', () => {
    expect(isCJK('這是一個繁體中文句子')).toBe(true);
    expect(isCJK('Ordinary English sentence here')).toBe(false);
  });
});
