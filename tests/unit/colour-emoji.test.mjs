// Colour-emoji detection — the single rarest piece of the AI-tell linter.
// The whole point is to tell a COLOUR emoji (the "an AI assembled this" tell)
// apart from a monochrome typographic dingbat (legitimate). These tests pin
// that boundary down so a future regex tweak cannot silently break it.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { hasColourEmoji, colourEmojis } = require('../../tools/lib/aitell-common.cjs');

describe('hasColourEmoji — fires on colour emoji', () => {
  it('high-plane emoji is a tell', () => {
    expect(hasColourEmoji('Buy now 🚀')).toBe(true);   // U+1F680
    expect(hasColourEmoji('🎯 Features')).toBe(true);   // U+1F3AF
    expect(hasColourEmoji('Save 💾')).toBe(true);       // U+1F4BE
  });

  it('BMP symbol carrying VS16 (U+FE0F) is a colour emoji, so a tell', () => {
    expect(hasColourEmoji('Warning \u2757\uFE0F')).toBe(true);  // ❗️ with VS16
    expect(hasColourEmoji('Heart \u2764\uFE0F')).toBe(true);    // ❤️ with VS16
  });

  // Documented boundary: a bare U+2B50 (⭐) without VS16 is NOT caught. It sits
  // outside the matched BMP ranges and carries no variation selector. This is a
  // known, accepted gap, recorded here so a future change to it is a deliberate
  // decision, not an accident.
  it('known gap: bare U+2B50 without VS16 is not flagged', () => {
    expect(hasColourEmoji('Star \u2B50')).toBe(false);
  });
});

describe('hasColourEmoji — spares monochrome dingbats (NOT a tell)', () => {
  it('close / check / cross dingbats without VS16 are legitimate icons', () => {
    expect(hasColourEmoji('Close \u2715')).toBe(false); // ✕ U+2715
    expect(hasColourEmoji('Done \u2713')).toBe(false);  // ✓ U+2713
    expect(hasColourEmoji('No \u2717')).toBe(false);    // ✗ U+2717
  });

  it('arrows and stars used as typography are not tells', () => {
    expect(hasColourEmoji('Next \u2192')).toBe(false);  // → U+2192
    expect(hasColourEmoji('Rating \u2605')).toBe(false);// ★ U+2605
    expect(hasColourEmoji('\u2666 diamonds')).toBe(false); // ♦ U+2666
  });

  it('plain prose with no symbols is clean', () => {
    expect(hasColourEmoji('A perfectly ordinary headline')).toBe(false);
    expect(hasColourEmoji('')).toBe(false);
    expect(hasColourEmoji(null)).toBe(false);
  });
});

describe('colourEmojis — extracts every colour emoji, skips dingbats', () => {
  it('returns the colour emoji it finds', () => {
    expect(colourEmojis('🚀 launch 🎯 target')).toEqual(['🚀', '🎯']);
  });

  it('returns empty for dingbat-only strings', () => {
    expect(colourEmojis('\u2715 \u2713 \u2192')).toEqual([]);
  });

  it('mixes correctly: keeps colour emoji, drops the monochrome cross', () => {
    const found = colourEmojis('Close \u2715 then celebrate 🎉');
    expect(found).toEqual(['🎉']);
  });
});
