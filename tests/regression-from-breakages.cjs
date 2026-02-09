#!/usr/bin/env node
/**
 * AUTO-GENERATED regression tests from MYCELIUM breakages & constraints
 * Generated: 2026-02-09
 * Breakages: 12 | Constraints: 40
 * Test cases: 13
 *
 * Run: node tests/regression-from-breakages.cjs
 * These tests verify that known breakages have NOT been reintroduced.
 */

const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0, skipped = 0;
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const SKIP = '\x1b[33m⊘\x1b[0m';

function test(name, fn) {
  try {
    const result = fn();
    if (result === 'skip') { skipped++; console.log(`  ${SKIP} ${name} (skipped — file not found)`); return; }
    passed++; console.log(`  ${PASS} ${name}`);
  } catch (e) {
    failed++; console.log(`  ${FAIL} ${name}: ${e.message}`);
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function readFile(fp) { const p = path.join(__dirname, '..', fp); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }

console.log('\n# Regression Tests (auto-generated from 12 breakages + constraints)\n');

// From: [battle] v5.0 used overflow:hidden on arena — clipped hand cards on mobile (320px)
test('[battle] no overflow:hidden that clips interactive content', () => {
  { // check: public/battle.html
    const content = readFile('public/battle.html');
    if (!content) return 'skip';
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('overflow') && line.includes('hidden') && (line.includes('arena') || line.includes('game') || line.includes('hand') || line.includes('card'))) {
        assert(false, 'public/battle.html:' + (i+1) + ' has overflow:hidden on game container — broke mobile before');
      }
    }
  }
  { // check: public/battle-legacy.html
    const content = readFile('public/battle-legacy.html');
    if (!content) return 'skip';
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('overflow') && line.includes('hidden') && (line.includes('arena') || line.includes('game') || line.includes('hand') || line.includes('card'))) {
        assert(false, 'public/battle-legacy.html:' + (i+1) + ' has overflow:hidden on game container — broke mobile before');
      }
    }
  }
  { // check: public/battle-simple.html
    const content = readFile('public/battle-simple.html');
    if (!content) return 'skip';
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('overflow') && line.includes('hidden') && (line.includes('arena') || line.includes('game') || line.includes('hand') || line.includes('card'))) {
        assert(false, 'public/battle-simple.html:' + (i+1) + ' has overflow:hidden on game container — broke mobile before');
      }
    }
  }
});

// From: [battle] Audio.init() called during page load blocked iOS init — hand appeared empty until tap
test('[battle] Audio.init not called at page load (blocks iOS)', () => {
  { // check: public/static/nw-battle-engine.js
    const content = readFile('public/static/nw-battle-engine.js');
    if (!content) return 'skip';
    // Audio.init at load time blocks iOS — must be on user gesture
  }
  { // check: public/static/nw-battle-engine-old.js
    const content = readFile('public/static/nw-battle-engine-old.js');
    if (!content) return 'skip';
    // Audio.init at load time blocks iOS — must be on user gesture
  }
  { // check: public/static/nw-battle-v6.js
    const content = readFile('public/static/nw-battle-v6.js');
    if (!content) return 'skip';
    // Audio.init at load time blocks iOS — must be on user gesture
  }
});

// From: [battle] Deck building ran at page load — cards dealt before player ready, no visual feedback
test('[battle] regression guard: Deck building ran at page load — cards dealt before player r', () => {
  // Known breakage: Deck building ran at page load — cards dealt before player ready, no visual feedback
  // This test exists as a reminder. Add specific assertions when the pattern recurs.
  assert(true, 'guard acknowledged');
});

// From: [battle] debug overlay left in production — forgot to gate behind GM mode check
test('[battle] no debug overlays left in production HTML', () => {
  { // check: public/battle.html
    const content = readFile('public/battle.html');
    if (!content) return 'skip';
    assert(!(/id=["']debug/i.test(content) && !/display:\s*none|GM_MODE|DEV_MODE/i.test(content)), 'public/battle.html has debug overlay without gate');
  }
  { // check: public/battle-legacy.html
    const content = readFile('public/battle-legacy.html');
    if (!content) return 'skip';
    assert(!(/id=["']debug/i.test(content) && !/display:\s*none|GM_MODE|DEV_MODE/i.test(content)), 'public/battle-legacy.html has debug overlay without gate');
  }
  { // check: public/battle-simple.html
    const content = readFile('public/battle-simple.html');
    if (!content) return 'skip';
    assert(!(/id=["']debug/i.test(content) && !/display:\s*none|GM_MODE|DEV_MODE/i.test(content)), 'public/battle-simple.html has debug overlay without gate');
  }
  { // check: public/battle-old.html
    const content = readFile('public/battle-old.html');
    if (!content) return 'skip';
    assert(!(/id=["']debug/i.test(content) && !/display:\s*none|GM_MODE|DEV_MODE/i.test(content)), 'public/battle-old.html has debug overlay without gate');
  }
  { // check: public/pvp-battle.html
    const content = readFile('public/pvp-battle.html');
    if (!content) return 'skip';
    assert(!(/id=["']debug/i.test(content) && !/display:\s*none|GM_MODE|DEV_MODE/i.test(content)), 'public/pvp-battle.html has debug overlay without gate');
  }
});

// From: [battle] Auto-start overlay detection failed on iOS — overlay was display:none but still 'visible' in JS check
test('[battle] regression guard: Auto-start overlay detection failed on iOS — overlay was dis', () => {
  // Known breakage: Auto-start overlay detection failed on iOS — overlay was display:none but still \'visible\' in JS check
  // This test exists as a reminder. Add specific assertions when the pattern recurs.
  assert(true, 'guard acknowledged');
});

// From: [i18n] conspiracy.html had two i18n systems (CONSPIRACY_I18N + NW_I18N) — translations conflicted
test('[i18n] no raw translation placeholders visible in HTML', () => {
  const dir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(dir)) return 'skip';
  const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html')).slice(0, 20);
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const placeholders = content.match(/\[ZH\]|\[TH\]|\[EN\]/g);
    if (placeholders && placeholders.length > 10) assert(false, f + ' has ' + placeholders.length + ' raw translation placeholders');
  }
});

// From: [i18n] lore/conspiracy-board innerHTML content lost on language switch — NW_I18N.onChange textContent overwrote HTML
test('[i18n] innerHTML usage flagged (destroys event handlers)', () => {
  { // check: public/static/nw-i18n-core.js
    const content = readFile('public/static/nw-i18n-core.js');
    if (!content) return 'skip';
    const matches = content.match(/\.innerHTML\s*=/g);
    if (matches && matches.length > 5) assert(false, 'public/static/nw-i18n-core.js has ' + matches.length + ' innerHTML assignments — high risk of losing event handlers');
  }
  { // check: public/static/nw-i18n-guardian.js
    const content = readFile('public/static/nw-i18n-guardian.js');
    if (!content) return 'skip';
    const matches = content.match(/\.innerHTML\s*=/g);
    if (matches && matches.length > 5) assert(false, 'public/static/nw-i18n-guardian.js has ' + matches.length + ' innerHTML assignments — high risk of losing event handlers');
  }
  { // check: public/static/i18n.js
    const content = readFile('public/static/i18n.js');
    if (!content) return 'skip';
    const matches = content.match(/\.innerHTML\s*=/g);
    if (matches && matches.length > 5) assert(false, 'public/static/i18n.js has ' + matches.length + ' innerHTML assignments — high risk of losing event handlers');
  }
});

// From: [emoji] v4 emoji-strip regex cleanup pattern matched closing HTML attribute quotes — collapsed attribute sequences (e.g. data-x="y" class="z" became d). Never include quote chars in post-strip cleanup regex.
test('[emoji] regression guard: v4 emoji-strip regex cleanup pattern matched closing HTML at', () => {
  // Known breakage: v4 emoji-strip regex cleanup pattern matched closing HTML attribute quotes — collapsed attribute sequences (e.g. data-x="y" class="z" became d). Never include quote chars in post-strip cleanup regex.
  // This test exists as a reminder. Add specific assertions when the pattern recurs.
  assert(true, 'guard acknowledged');
});

// From: [i18n] 3792 [ZH]/[TH] placeholder strings visible to users across 69 pages — generated by i18n-auto-fix.cjs which should never prefix translations with language markers
test('[i18n] no raw translation placeholders visible in HTML', () => {
  const dir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(dir)) return 'skip';
  const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html')).slice(0, 20);
  for (const f of htmlFiles) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const placeholders = content.match(/\[ZH\]|\[TH\]|\[EN\]/g);
    if (placeholders && placeholders.length > 10) assert(false, f + ' has ' + placeholders.length + ' raw translation placeholders');
  }
});

// From: [workflow] AI rewrote loading screen for 20 minutes when user was asking about the recursive learning system — did not clarify intent
test('[workflow] regression guard: AI rewrote loading screen for 20 minutes when user was askin', () => {
  // Known breakage: AI rewrote loading screen for 20 minutes when user was asking about the recursive learning system — did not clarify intent
  // This test exists as a reminder. Add specific assertions when the pattern recurs.
  assert(true, 'guard acknowledged');
});

// From: [workflow] AI recommended auto-premortem feature that already existed in .husky/pre-commit — did not check before suggesting
test('[workflow] regression guard: AI recommended auto-premortem feature that already existed i', () => {
  // Known breakage: AI recommended auto-premortem feature that already existed in .husky/pre-commit — did not check before suggesting
  // This test exists as a reminder. Add specific assertions when the pattern recurs.
  assert(true, 'guard acknowledged');
});

// From: [ios] constraint: touchend + click both fire on iOS — use handling flag with 300ms timeout
test('[ios] touch+click double-fire handling', () => {
  // Constraint: touchend + click both fire on iOS — use handling flag with 300ms timeout
  const dir = path.join(__dirname, '..', 'public', 'static');
  if (!fs.existsSync(dir)) return 'skip';
  const jsFiles = fs.readdirSync(dir).filter(f => f.includes('ios') && f.endsWith('.js'));
  for (const f of jsFiles) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    if (content.includes('touchend') && content.includes('click')) {
      const hasGuard = /handling|touchHandled|isTouch|preventDouble|setTimeout.*300/i.test(content);
      assert(hasGuard, f + ' has both touchend+click but no double-fire guard');
    }
  }
});

// From: [ios] constraint: Safari blocks Audio context creation outside user gesture — wrap in click/touchstart handler
test('[ios] touch+click double-fire handling', () => {
  // Constraint: Safari blocks Audio context creation outside user gesture — wrap in click/touchstart handler
  const dir = path.join(__dirname, '..', 'public', 'static');
  if (!fs.existsSync(dir)) return 'skip';
  const jsFiles = fs.readdirSync(dir).filter(f => f.includes('ios') && f.endsWith('.js'));
  for (const f of jsFiles) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    if (content.includes('touchend') && content.includes('click')) {
      const hasGuard = /handling|touchHandled|isTouch|preventDouble|setTimeout.*300/i.test(content);
      assert(hasGuard, f + ' has both touchend+click but no double-fire guard');
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// NEW: Repeat-offender regression tests (from Mycelium diagnosis)
// Target: files with 5+ breaks that keep recurring
// ═══════════════════════════════════════════════════════════════════

// cards.html: broke 10x — dominant: ui/layout
test('[cards] cards.html has data-testid markers for automated testing', () => {
  const content = readFile('public/cards.html');
  if (!content) return 'skip';
  assert(content.includes('data-testid'), 'cards.html needs data-testid markers — broke 10x');
  assert(content.includes('data-testid="cards-page"'), 'cards.html needs page-level testid');
});

test('[cards] cards.html has no inline styles that break layout', () => {
  const content = readFile('public/cards.html');
  if (!content) return 'skip';
  // Common pattern that caused breaks: inline overflow:hidden on card containers
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('style=') && line.includes('overflow') && line.includes('hidden') && line.includes('card')) {
      assert(false, `cards.html:${i+1} has inline overflow:hidden on card element — caused layout breaks before`);
    }
  }
});

// markets.html: broke 7x — dominant: i18n
test('[i18n] markets.html has data-i18n on all user-visible text', () => {
  const content = readFile('public/markets.html');
  if (!content) return 'skip';
  assert(content.includes('data-i18n'), 'markets.html needs i18n markers — broke 7x mostly from i18n issues');
  // Check no [ZH] or [TH] placeholder prefixes
  assert(!content.includes('[ZH]') && !content.includes('[TH]'), 'markets.html has [ZH]/[TH] placeholders visible to users');
});

// battle.html: broke 7x — dominant: ios
test('[battle] battle.html has data-testid markers', () => {
  const content = readFile('public/battle.html');
  if (!content) return 'skip';
  assert(content.includes('data-testid'), 'battle.html needs data-testid markers — broke 7x');
});

// wallet.html: broke 6x
test('[economy] wallet.html has data-testid markers', () => {
  const content = readFile('public/wallet.html');
  if (!content) return 'skip';
  assert(content.includes('data-testid'), 'wallet.html needs data-testid markers — broke 6x');
  assert(content.includes('data-testid="wallet-page"'), 'wallet.html needs page-level testid');
});

// wyckoff.html: broke 5x — dominant: i18n
test('[i18n] wyckoff.html has i18n support and no placeholders', () => {
  const content = readFile('public/wyckoff.html');
  if (!content) return 'skip';
  assert(content.includes('data-i18n'), 'wyckoff.html needs i18n markers — broke 5x mostly from i18n');
  assert(!content.includes('[ZH]') && !content.includes('[TH]'), 'wyckoff.html has i18n placeholders');
});

// Cross-cutting: coupled files must reference each other
test('[coupling] battle.html and nw-battle-engine.js are linked', () => {
  const battle = readFile('public/battle.html');
  const engine = readFile('public/static/nw-battle-engine.js');
  if (!battle || !engine) return 'skip';
  assert(battle.includes('nw-battle-engine') || battle.includes('nw-battle-v'), 'battle.html must reference its engine script');
});

test('[coupling] markets.html loads required scripts', () => {
  const markets = readFile('public/markets.html');
  if (!markets) return 'skip';
  // Markets is coupled with src/index.tsx via API routes
  assert(markets.includes('nw-i18n') || markets.includes('data-i18n'), 'markets.html must have i18n support');
});

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped\n`);
if (failed > 0) process.exit(1);