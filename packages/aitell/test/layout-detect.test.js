import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const aitell = require('../src/index.js');
const {
  lintLayout,
  checkEmojiIcon,
  checkGenericGradient,
  checkDefaultShadow,
  checkOpacityOnlyMotion,
  checkCookieCutter,
  checkDeadCenter,
} = aitell;

describe('L1 EMOJI-AS-ICON', () => {
  it('fires when emoji sit inside a button', () => {
    const f = checkEmojiIcon('<button>🚀 Launch</button>');
    expect(f.some(x => x.id === 'L1 EMOJI-AS-ICON')).toBe(true);
    expect(f[0].blocking).toBe(true);
  });

  it('fires on an emoji-prefixed heading', () => {
    const f = checkEmojiIcon('<h1>🎯 Features</h1>');
    expect(f.some(x => x.id === 'L1 EMOJI-AS-ICON')).toBe(true);
  });

  it('does not fire on plain prose emoji', () => {
    const f = checkEmojiIcon('<p>We shipped it 🎉 last week.</p>');
    expect(f).toHaveLength(0);
  });

  it('does not fire on a monochrome icon glyph in a button', () => {
    const f = checkEmojiIcon('<button>\u2713 Done</button>');
    expect(f).toHaveLength(0);
  });
});

describe('L2 GENERIC-GRADIENT', () => {
  it('fires on the indigo→purple stock gradient', () => {
    const f = checkGenericGradient('background: linear-gradient(135deg, #6366f1, #8b5cf6);');
    expect(f[0].id).toBe('L2 GENERIC-GRADIENT');
    expect(f[0].blocking).toBe(true);
  });

  it('does not fire on a single tell hex', () => {
    expect(checkGenericGradient('color: #6366f1;')).toHaveLength(0);
  });

  it('does not fire on a bespoke gradient', () => {
    expect(checkGenericGradient('background: linear-gradient(#0a3d2e, #f4c430);')).toHaveLength(0);
  });
});

describe('L3 DEFAULT-SHADOW', () => {
  it('fires when the framework shadow is pasted 3+ times', () => {
    const css = '.a{box-shadow:0 1px 3px rgba(0,0,0,0.1)} .b{box-shadow:0 1px 3px rgba(0,0,0,0.1)} .c{box-shadow:0 1px 3px rgba(0,0,0,0.1)}';
    expect(checkDefaultShadow(css)[0].id).toBe('L3 DEFAULT-SHADOW');
  });

  it('tolerates one or two stray uses', () => {
    expect(checkDefaultShadow('.a{box-shadow:0 1px 3px rgba(0,0,0,0.1)}')).toHaveLength(0);
  });
});

describe('L4 OPACITY-ONLY-MOTION (advisory)', () => {
  it('fires on 2+ opacity-only transitions, advisory not blocking', () => {
    const css = '.a{transition:opacity .3s} .b{transition:opacity .2s}';
    const f = checkOpacityOnlyMotion(css);
    expect(f[0].id).toBe('L4 OPACITY-ONLY-MOTION');
    expect(f[0].blocking).toBe(false);
  });

  it('does not fire when transform is also animated', () => {
    expect(checkOpacityOnlyMotion('.a{transition:opacity .3s, transform .3s}')).toHaveLength(0);
  });
});

describe('L5 COOKIE-CUTTER (advisory)', () => {
  it('fires on 8+ identical class signatures', () => {
    const block = '<div class="card shadow">x</div>';
    const f = checkCookieCutter(block.repeat(8));
    expect(f[0].id).toBe('L5 COOKIE-CUTTER');
    expect(f[0].blocking).toBe(false);
  });

  it('does not fire below the threshold', () => {
    expect(checkCookieCutter('<div class="card">x</div>'.repeat(3))).toHaveLength(0);
  });
});

describe('L6 DEAD-CENTER (advisory)', () => {
  it('fires when centering is pervasive relative to structure', () => {
    const css = 'div{text-align:center} '.repeat(13) + 'div{margin:0 auto} '.repeat(9);
    const body = '<section></section>';
    const f = checkDeadCenter(body, css);
    expect(f[0].id).toBe('L6 DEAD-CENTER');
  });

  it('does not fire on a normally-composed page', () => {
    expect(checkDeadCenter('<section></section>', 'div{text-align:center}')).toHaveLength(0);
  });
});

describe('lintLayout — orchestration', () => {
  it('aggregates blocking and advisory counts', () => {
    const html = '<button>🚀 Go</button><style>.h{background:linear-gradient(#6366f1,#a855f7)}</style>';
    const r = lintLayout(html);
    expect(r.blocking).toBeGreaterThanOrEqual(2);
    expect(r.findings.map(f => f.id)).toContain('L1 EMOJI-AS-ICON');
  });

  it('emoji detector can be disabled', () => {
    const r = lintLayout('<button>🚀 Go</button>', { emoji: false });
    expect(r.findings.map(f => f.id)).not.toContain('L1 EMOJI-AS-ICON');
  });

  it('a clean document returns no findings', () => {
    const r = lintLayout('<main><p>Handwritten copy with a real SVG icon.</p></main>');
    expect(r.findings).toHaveLength(0);
  });
});
