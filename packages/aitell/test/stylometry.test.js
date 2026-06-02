import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const aitell = require('../src/index.js');
const { analyzeStylometry, band } = aitell;

// A passage engineered with even sentence lengths, heavy connectives, and
// repeated openings — the structural machine-rhythm tells.
const MACHINE = `
Moreover, the platform is robust and scalable for teams.
Furthermore, the platform is fast and reliable for users.
Additionally, the platform is secure and modern for all.
Consequently, the platform is the best choice for everyone.
Therefore, the platform will help you grow your business now.
Ultimately, the platform delivers value across every use case.
`.trim();

// Genuinely irregular human prose: varied lengths, no connective scaffolding.
const HUMAN = `
I almost missed the train. The platform smelled of wet iron and old coffee, and a busker
two pillars down was murdering a song I half-loved. Then the doors hissed shut on someone's
scarf — bright red, caught like a flag — and the whole carriage laughed before the owner even
noticed. That's the part I keep thinking about. Not the delay. The scarf.
`.trim();

describe('analyzeStylometry — machine rhythm', () => {
  it('scores connective-heavy, even prose as machine-like', () => {
    const r = analyzeStylometry(MACHINE);
    expect(r.score).not.toBeNull();
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it('scores irregular human prose lower than the machine sample', () => {
    const human = analyzeStylometry(HUMAN);
    const machine = analyzeStylometry(MACHINE);
    expect(human.score).toBeLessThan(machine.score);
  });

  it('returns null score when there is not enough prose', () => {
    const r = analyzeStylometry('Hi.');
    expect(r.score).toBeNull();
    expect(r.reasons[0]).toMatch(/not enough/i);
  });

  it('detects CJK and labels the language', () => {
    const r = analyzeStylometry('這是一個測試。我們需要更多的句子來分析。語言偵測應該要正確運作才對。');
    expect(r.lang).toBe('cjk');
  });

  it('reports a connective-density reason on the machine sample', () => {
    const r = analyzeStylometry(MACHINE);
    expect(r.reasons.join(' ')).toMatch(/connective|opening|even/i);
  });
});

describe('band — score labelling', () => {
  it('labels high scores as strong machine rhythm', () => {
    expect(band(80).label).toMatch(/strong machine/);
  });

  it('labels low scores as natural', () => {
    expect(band(10).label).toMatch(/natural/);
  });

  it('handles a null score', () => {
    expect(band(null).label).toBe('n/a');
  });
});
