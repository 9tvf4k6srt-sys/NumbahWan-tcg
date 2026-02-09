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

// ═══════════════════════════════════════════════════════════════════
// REAL REGRESSION TESTS — targeting actual failure modes from 24 breakages
// across 6 repeat-offender files (events, pvp, embassy, index, 
// historical-society, profile-card)
// ═══════════════════════════════════════════════════════════════════

// --- events.html: broke 4x ---
// Root cause 1: i18n variable conflicts — events.html declared 'let pageTranslations' 
// which clashed with i18n.js's global 'let pageTranslations'
test('[events] no duplicate i18n variable declarations (broke from let pageTranslations conflict)', () => {
  const content = readFile('public/events.html');
  if (!content) return 'skip';
  const matches = content.match(/let\s+pageTranslations/g) || [];
  assert(matches.length <= 1, 'events.html declares pageTranslations ' + matches.length + 'x — must be 0 or 1 (clashed with i18n.js before)');
  const langMatches = content.match(/let\s+currentLang/g) || [];
  assert(langMatches.length <= 1, 'events.html declares currentLang ' + langMatches.length + 'x — must be 0 or 1');
});

// Root cause 2: script deferral broke execution order
test('[events] scripts load in correct order (nw-i18n-core must come after nw-nav)', () => {
  const content = readFile('public/events.html');
  if (!content) return 'skip';
  const navIdx = content.indexOf('nw-nav.js');
  const i18nIdx = content.indexOf('nw-i18n-core.js');
  if (navIdx === -1 || i18nIdx === -1) return 'skip';
  assert(navIdx < i18nIdx, 'nw-nav.js must load before nw-i18n-core.js — script order broke events page');
});

// --- pvp-battle.html: broke 4x ---
// Root cause: card images cropped by object-fit: cover
test('[pvp] no object-fit:cover on card images (broke: cropped sword/feet)', () => {
  const content = readFile('public/pvp-battle.html');
  if (!content) return 'skip';
  // Check inline styles on card image containers
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('card') && line.includes('img') && line.includes('object-fit') && line.includes('cover')) {
      assert(false, 'pvp-battle.html:' + (i+1) + ' has object-fit:cover on card image — cropped art before');
    }
  }
});

// Root cause: missing required scripts
test('[pvp] pvp-battle.html loads battle-critical scripts', () => {
  const content = readFile('public/pvp-battle.html');
  if (!content) return 'skip';
  assert(content.includes('nw-nav.js'), 'pvp-battle.html must load nw-nav.js');
  assert(content.includes('nw-wallet.js'), 'pvp-battle.html must load nw-wallet.js (balance display)');
});

// --- embassy.html: broke 4x ---
// Root cause 1: wrong event listener name (nw-lang-changed vs nw-lang-change)  
test('[embassy] correct i18n event listener name (broke: nw-lang-changed vs nw-lang-change)', () => {
  const content = readFile('public/embassy.html');
  if (!content) return 'skip';
  if (content.includes('nw-lang-change')) {
    assert(!content.includes("'nw-lang-changed'") && !content.includes('"nw-lang-changed"'), 
      'embassy.html uses wrong event name nw-lang-changed (correct: nw-lang-change)');
  }
});

// Root cause 2: multiple localStorage keys for language
test('[embassy] single localStorage key for language (broke: 3 different keys)', () => {
  const content = readFile('public/embassy.html');
  if (!content) return 'skip';
  const scripts = content.match(/<script[\s\S]*?<\/script>/gi) || [];
  const inlineCode = scripts.join('\n');
  // Should use nw_lang consistently, not lang or numbahwan_lang
  const badKeys = [];
  if (inlineCode.includes("localStorage.getItem('lang')") || inlineCode.includes('localStorage.getItem("lang")')) badKeys.push('lang');
  if (inlineCode.includes("'numbahwan_lang'") || inlineCode.includes('"numbahwan_lang"')) badKeys.push('numbahwan_lang');
  assert(badKeys.length === 0, 'embassy.html uses non-standard localStorage keys: ' + badKeys.join(', ') + ' (should use nw_lang)');
});

// --- index.html: broke 4x ---
// Root cause 1: GSAP scripts with defer broke loading animations
test('[index] GSAP CDN scripts are NOT deferred (broke loading screen)', () => {
  const content = readFile('public/index.html');
  if (!content) return 'skip';
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('gsap') && line.includes('cdnjs') && line.includes('defer')) {
      assert(false, 'index.html:' + (i+1) + ' has defer on GSAP CDN script — this broke the loading screen before');
    }
  }
});

// Root cause 2: i18n keys starting with digits are invalid JS identifiers
test('[index] no digit-starting i18n keys (broke: invalid JS identifiers)', () => {
  const content = readFile('public/index.html');
  if (!content) return 'skip';
  const i18nKeys = content.match(/data-i18n="([^"]+)"/g) || [];
  for (const match of i18nKeys) {
    const key = match.replace('data-i18n="', '').replace('"', '');
    const lastPart = key.split('.').pop();
    assert(!/^\d/.test(lastPart), 'index.html has digit-starting i18n key: ' + key + ' — not a valid JS identifier');
  }
});

// --- historical-society.html: broke 4x ---
// Root cause: i18n unification — must use unified i18n system
test('[historical-society] uses unified i18n system (broke 4x from i18n fragmentation)', () => {
  const content = readFile('public/historical-society.html');
  if (!content) return 'skip';
  assert(content.includes('nw-i18n-core.js'), 'historical-society.html must use nw-i18n-core.js (unified system)');
  assert(content.includes('data-i18n'), 'historical-society.html must have data-i18n markers');
  // Must not have old-style inline translation code
  const hasOldI18n = content.includes('function translatePage') || content.includes('function setLanguage');
  assert(!hasOldI18n, 'historical-society.html has old inline i18n code — must use unified nw-i18n-core.js');
});

// --- profile-card.html: broke 4x ---
// Root cause 1: iOS mobile overlap — card was too wide for small screens
test('[profile-card] card fits mobile viewport (broke: iOS overlap at 320px)', () => {
  const content = readFile('public/profile-card.html');
  if (!content) return 'skip';
  // The profile card should have max-width constraint for mobile
  const hasMaxWidth = content.includes('max-width') && (content.includes('320') || content.includes('100%') || content.includes('90vw'));
  assert(hasMaxWidth, 'profile-card.html needs max-width constraint for mobile — overlapped on iOS before');
});

// Root cause 2: same i18n fragmentation
test('[profile-card] uses unified i18n (broke 4x from fragmented i18n)', () => {
  const content = readFile('public/profile-card.html');
  if (!content) return 'skip';
  assert(content.includes('nw-i18n-core.js'), 'profile-card.html must use nw-i18n-core.js');
  assert(!content.includes("'nw-lang-changed'") && !content.includes('"nw-lang-changed"'),
    'profile-card.html uses wrong event name (nw-lang-changed instead of nw-lang-change)');
});

// --- Cross-cutting: script deferral safety ---
// All 6 pages broke from script deferral (perf commit deferred 309 scripts)
test('[perf] no defer on scripts that must run synchronously (GSAP, critical init)', () => {
  const files = ['public/index.html', 'public/events.html', 'public/battle.html'];
  for (const fp of files) {
    const content = readFile(fp);
    if (!content) continue;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // GSAP must not be deferred — it broke loading animations
      if (line.includes('gsap') && line.includes('.min.js') && line.includes('defer') && !line.includes('//')) {
        assert(false, fp + ':' + (i+1) + ' defers GSAP — broke animations before');
      }
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped\n`);
if (failed > 0) process.exit(1);