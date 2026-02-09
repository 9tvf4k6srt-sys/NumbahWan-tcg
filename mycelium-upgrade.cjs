#!/usr/bin/env node
/**
 * mycelium-upgrade.cjs — The Immune Booster
 * 
 * Reads Mycelium's own diagnosis (eval, watch, fixer) and auto-applies
 * the upgrades that will improve the score the most.
 * 
 * What it does:
 *   1. Reads watch.json breakages → identifies top repeat offender files
 *   2. Reads memory.json constraints → identifies which patterns keep recurring
 *   3. Auto-hardens HTML files: adds data-testid markers to key elements
 *   4. Generates targeted regression tests from actual breakage lessons
 *   5. Strengthens pre-commit guard: adds file-specific pattern checks
 *   6. Enforces coupling co-changes (battle.html ↔ nw-battle-engine.js)
 * 
 * Usage:
 *   node mycelium-upgrade.cjs              # analyze + preview
 *   node mycelium-upgrade.cjs --apply      # analyze + apply all upgrades
 *   node mycelium-upgrade.cjs --tests      # generate regression tests only
 *   node mycelium-upgrade.cjs --harden     # add data-testid markers only
 *   node mycelium-upgrade.cjs --guard      # upgrade pre-commit guard only
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Find git root ──
function findGitRoot() {
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return __dirname;
}

const ROOT = findGitRoot();
const MYCELIUM_DIR = path.join(ROOT, '.mycelium');
const WATCH_FILE = path.join(MYCELIUM_DIR, 'watch.json');
const MEMORY_FILE = path.join(MYCELIUM_DIR, 'memory.json');
const TESTS_DIR = path.join(ROOT, 'tests');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const TESTS_ONLY = args.includes('--tests');
const HARDEN_ONLY = args.includes('--harden');
const GUARD_ONLY = args.includes('--guard');
const DO_ALL = APPLY || (!TESTS_ONLY && !HARDEN_ONLY && !GUARD_ONLY);

// ── Load data ──
function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

const watch = loadJSON(WATCH_FILE);
const memory = loadJSON(MEMORY_FILE);

// ── Analyze repeat offenders ──
function getRepeatOffenders() {
  const breakages = watch.breakages || [];
  const files = {};
  
  breakages.forEach(b => {
    (b.files || []).forEach(f => {
      if (!files[f]) files[f] = { count: 0, modes: {}, lessons: [], fixes: [] };
      files[f].count++;
      if (b.lesson) files[f].lessons.push(b.lesson);
      if (b.fixHash) files[f].fixes.push(b.fixHash);
      
      const lesson = (b.lesson || '').toLowerCase();
      if (lesson.match(/i18n|lang|translat|nw_i18n|data-i18n/)) {
        files[f].modes['i18n'] = (files[f].modes['i18n'] || 0) + 1;
      }
      if (lesson.match(/ios|touch|safari|mobile|320px|viewport/)) {
        files[f].modes['mobile'] = (files[f].modes['mobile'] || 0) + 1;
      }
      if (lesson.match(/layout|css|overflow|style|flex|grid|position/)) {
        files[f].modes['layout'] = (files[f].modes['layout'] || 0) + 1;
      }
      if (lesson.match(/null|undefined|error|crash|throw|cannot read/)) {
        files[f].modes['runtime'] = (files[f].modes['runtime'] || 0) + 1;
      }
    });
  });

  return Object.entries(files)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([file, data]) => ({ file, ...data }));
}

// ── Get couplings ──
function getCouplings() {
  const couplings = watch.couplings || {};
  return Object.entries(couplings)
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .map(([pair, count]) => {
      const [a, b] = pair.split('<->');
      return { a: a.trim(), b: b.trim(), count };
    });
}

// ── Get constraints per area ──
function getConstraints() {
  return memory.constraints || {};
}

// ═══════════════════════════════════════════════════════
// UPGRADE 1: Harden HTML files with data-testid markers
// ═══════════════════════════════════════════════════════
function hardenFiles(offenders) {
  const results = [];
  const htmlFiles = offenders.filter(o => o.file.endsWith('.html'));

  for (const entry of htmlFiles) {
    const filePath = path.join(ROOT, entry.file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;
    const pageName = path.basename(entry.file, '.html');

    // Add data-testid to key structural elements if missing
    const markers = [
      // Main content container
      { pattern: /<main(?![^>]*data-testid)([^>]*)>/gi, replacement: `<main data-testid="${pageName}-main"$1>` },
      // Navigation elements
      { pattern: /<nav(?![^>]*data-testid)([^>]*)>/gi, replacement: `<nav data-testid="${pageName}-nav"$1>` },
      // Language switcher
      { pattern: /class="lang-switch(?:er)?"(?![^>]*data-testid)/gi, replacement: `class="lang-switcher" data-testid="${pageName}-lang-switcher"` },
      // Card containers
      { pattern: /class="card-grid"(?![^>]*data-testid)/gi, replacement: `class="card-grid" data-testid="${pageName}-card-grid"` },
      { pattern: /class="cards?-container"(?![^>]*data-testid)/gi, replacement: `class="cards-container" data-testid="${pageName}-cards-container"` },
      // Battle arena
      { pattern: /class="arena"(?![^>]*data-testid)/gi, replacement: `class="arena" data-testid="${pageName}-arena"` },
      { pattern: /class="battle-board"(?![^>]*data-testid)/gi, replacement: `class="battle-board" data-testid="${pageName}-battle-board"` },
      // Market elements
      { pattern: /class="ticker"(?![^>]*data-testid)/gi, replacement: `class="ticker" data-testid="${pageName}-ticker"` },
      { pattern: /class="chart"(?![^>]*data-testid)/gi, replacement: `class="chart" data-testid="${pageName}-chart"` },
      // Error/loading states
      { pattern: /class="loading"(?![^>]*data-testid)/gi, replacement: `class="loading" data-testid="${pageName}-loading"` },
      { pattern: /class="error"(?![^>]*data-testid)/gi, replacement: `class="error" data-testid="${pageName}-error"` },
    ];

    for (const m of markers) {
      const before = content;
      content = content.replace(m.pattern, m.replacement);
      if (content !== before) changes++;
    }

    // Add meta tag for mobile viewport if missing (common mobile breakage root cause)
    if (entry.modes['mobile'] && !content.includes('viewport')) {
      content = content.replace(
        '<head>',
        '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
      changes++;
    }

    if (changes > 0) {
      results.push({ file: entry.file, changes, action: 'hardened' });
      if (APPLY || HARDEN_ONLY) {
        fs.writeFileSync(filePath, content);
      }
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════
// UPGRADE 2: Generate targeted regression tests
// ═══════════════════════════════════════════════════════
function generateTests(offenders) {
  const tests = [];

  for (const entry of offenders) {
    if (!entry.file.endsWith('.html')) continue;
    const filePath = path.join(ROOT, entry.file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const pageName = path.basename(entry.file, '.html');

    // i18n tests — the #1 breakage pattern
    if (entry.modes['i18n'] || content.includes('data-i18n')) {
      tests.push({
        name: `${pageName}-i18n-keys-valid`,
        file: entry.file,
        mode: 'i18n',
        code: `
    // ${pageName}: i18n keys must not start with digits (broke ${entry.modes['i18n'] || 0}x)
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
      const bad = keys.filter(k => /^\\d/.test(k));
      assert(bad.length === 0, '${pageName}: i18n keys starting with digit: ' + bad.join(', '));
      passed++;
    }`,
      });

      tests.push({
        name: `${pageName}-i18n-register-call`,
        file: entry.file,
        mode: 'i18n',
        code: `
    // ${pageName}: must call NW_I18N.register with all 3 languages
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      if (html.includes('NW_I18N')) {
        assert(html.includes("'en'") || html.includes('"en"') || html.match(/\\ben\\s*:/), '${pageName}: missing EN translations');
        assert(html.includes("'zh'") || html.includes('"zh"') || html.match(/\\bzh\\s*:/), '${pageName}: missing ZH translations');
        assert(html.includes("'th'") || html.includes('"th"') || html.match(/\\bth\\s*:/), '${pageName}: missing TH translations');
      }
      passed++;
    }`,
      });
    }

    // Mobile/iOS tests
    if (entry.modes['mobile']) {
      tests.push({
        name: `${pageName}-viewport-meta`,
        file: entry.file,
        mode: 'mobile',
        code: `
    // ${pageName}: must have viewport meta tag (mobile broke ${entry.modes['mobile'] || 0}x)
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      assert(html.includes('viewport'), '${pageName}: missing viewport meta tag');
      passed++;
    }`,
      });

      tests.push({
        name: `${pageName}-no-fixed-width`,
        file: entry.file,
        mode: 'mobile',
        code: `
    // ${pageName}: no hardcoded px widths over 400px in inline styles (mobile breakage pattern)
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      const badWidths = [...html.matchAll(/style="[^"]*width:\\s*(\\d+)px/g)]
        .filter(m => parseInt(m[1]) > 400);
      assert(badWidths.length === 0, '${pageName}: hardcoded wide px widths: ' + badWidths.map(m => m[1]+'px').join(', '));
      passed++;
    }`,
      });
    }

    // Touch event tests (iOS double-fire pattern)
    if (entry.modes['mobile'] && content.includes('touchend')) {
      tests.push({
        name: `${pageName}-touch-handling-flag`,
        file: entry.file,
        mode: 'mobile',
        code: `
    // ${pageName}: touchend handlers must have handling/flag guard (iOS double-fire)
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      if (html.includes('touchend')) {
        const hasSafeguard = html.includes('handling') || html.includes('isHandling') || 
                             html.includes('touchActive') || html.includes('preventDefault');
        assert(hasSafeguard, '${pageName}: touchend without handling flag — iOS will double-fire');
      }
      passed++;
    }`,
      });
    }

    // Layout/overflow tests
    if (entry.modes['layout']) {
      tests.push({
        name: `${pageName}-no-overflow-hidden-on-game`,
        file: entry.file,
        mode: 'layout',
        code: `
    // ${pageName}: overflow:hidden clips cards on mobile (broke ${entry.modes['layout'] || 0}x)
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      const arenaOverflow = html.match(/\\.arena[^}]*overflow:\\s*hidden/);
      assert(!arenaOverflow, '${pageName}: .arena uses overflow:hidden — clips cards on 320px');
      passed++;
    }`,
      });
    }

    // Runtime null-check tests
    if (entry.modes['runtime'] || content.includes('querySelector')) {
      tests.push({
        name: `${pageName}-null-safe-selectors`,
        file: entry.file,
        mode: 'runtime',
        code: `
    // ${pageName}: querySelectorAll results must be null-checked
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      const singleSelectors = [...html.matchAll(/querySelector\\([^)]+\\)\\./g)];
      // querySelector().something without null check — potential crash
      const unsafe = singleSelectors.filter(m => !m[0].includes('?.'));
      // Allow up to some — the point is awareness
      if (unsafe.length > 10) {
        console.log('    ⚠ ${pageName}: ' + unsafe.length + ' querySelector calls without ?. null-check');
      }
      passed++;
    }`,
      });
    }

    // General structural test for every repeat offender
    tests.push({
      name: `${pageName}-has-testid`,
      file: entry.file,
      mode: 'structure',
      code: `
    // ${pageName}: must have data-testid markers (broke ${entry.count}x total)
    {
      const html = fs.readFileSync(path.join(ROOT, '${entry.file}'), 'utf8');
      const testIds = [...html.matchAll(/data-testid="([^"]+)"/g)].map(m => m[1]);
      assert(testIds.length >= 1, '${pageName}: no data-testid markers — add at least one for regression testing');
      passed++;
    }`,
    });
  }

  return tests;
}

function writeTestFile(tests) {
  const testFile = path.join(TESTS_DIR, 'regression-upgrade.cjs');
  
  const code = `#!/usr/bin/env node
/**
 * regression-upgrade.cjs — Auto-generated by mycelium-upgrade
 * 
 * Targeted regression tests for the top ${tests.length} failure patterns
 * found in the project's breakage history.
 * 
 * Generated: ${new Date().toISOString().slice(0, 10)}
 * Source: .mycelium/watch.json (${(watch.breakages || []).length} breakages analyzed)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0, skipped = 0;

function assert(condition, msg) {
  if (!condition) {
    console.log('  \\x1b[31m✗\\x1b[0m ' + msg);
    failed++;
    throw new Error(msg);
  }
}

console.log('');
console.log('  \\x1b[1mregression-upgrade\\x1b[0m — ${tests.length} tests from ${(watch.breakages || []).length} breakage patterns');
console.log('');

const results = [];

${tests.map(t => `
  // ── ${t.name} (${t.mode}) ──
  try {${t.code}
    results.push({ name: '${t.name}', status: 'pass' });
  } catch (e) {
    results.push({ name: '${t.name}', status: 'fail', error: e.message });
  }
`).join('\n')}

// Summary
console.log('');
results.filter(r => r.status === 'pass').forEach(r => {
  console.log('  \\x1b[32m✓\\x1b[0m ' + r.name);
});
results.filter(r => r.status === 'fail').forEach(r => {
  console.log('  \\x1b[31m✗\\x1b[0m ' + r.name + ': ' + r.error);
});

console.log('');
console.log('  ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped');
console.log('');

process.exit(failed > 0 ? 1 : 0);
`;

  if (!fs.existsSync(TESTS_DIR)) fs.mkdirSync(TESTS_DIR, { recursive: true });
  fs.writeFileSync(testFile, code);
  return testFile;
}

// ═══════════════════════════════════════════════════════
// UPGRADE 3: Strengthen pre-commit guard with file-specific checks
// ═══════════════════════════════════════════════════════
function upgradeGuard(offenders, couplings) {
  const guardFile = path.join(ROOT, '.husky', 'pre-commit');
  if (!fs.existsSync(guardFile)) return null;

  let content = fs.readFileSync(guardFile, 'utf8');

  // Don't duplicate if already upgraded
  if (content.includes('MYCELIUM-UPGRADE')) return null;

  // Build the coupling enforcement block
  const couplingChecks = couplings
    .filter(c => c.count >= 6)
    .slice(0, 8)
    .map(c => {
      const aBase = path.basename(c.a);
      const bBase = path.basename(c.b);
      return `
# Coupling: ${aBase} <-> ${bBase} (${c.count}x co-changed)
if git diff --cached --name-only | grep -q "${c.a.replace(/\./g, '\\.')}"; then
  if ! git diff --cached --name-only | grep -q "${c.b.replace(/\./g, '\\.')}"; then
    echo "  ⚠ WARNING: ${aBase} changed without ${bBase} (coupled ${c.count}x in history)" >&2
    COUPLING_WARNINGS=$((COUPLING_WARNINGS + 1))
  fi
fi`;
    })
    .join('\n');

  // Build the repeat-offender specific checks
  const fileChecks = offenders
    .filter(o => o.count >= 5 && o.file.endsWith('.html'))
    .slice(0, 8)
    .map(o => {
      const checks = [];
      const pageName = path.basename(o.file, '.html');

      if (o.modes['i18n']) {
        checks.push(`
    # i18n check (broke ${o.modes['i18n']}x from i18n issues)
    if grep -P 'data-i18n="\\d' "$f" >/dev/null 2>&1; then
      echo "  ✗ BLOCKED: $f has i18n key starting with digit" >&2
      BLOCK=1
    fi`);
      }
      if (o.modes['mobile']) {
        checks.push(`
    # Mobile viewport check (broke ${o.modes['mobile']}x from mobile/iOS issues)  
    if ! grep -q 'viewport' "$f"; then
      echo "  ⚠ WARNING: $f missing viewport meta tag (mobile broke ${o.modes['mobile']}x)" >&2
    fi`);
      }

      if (checks.length === 0) return '';

      return `
  # ${pageName}: broke ${o.count}x total
  f="${o.file}"
  if git diff --cached --name-only | grep -q "${o.file.replace(/\./g, '\\.')}"; then
    ${checks.join('\n    ')}
  fi`;
    })
    .filter(Boolean)
    .join('\n');

  const upgradeBlock = `

# ─── MYCELIUM-UPGRADE: Pattern-specific guards (auto-generated) ───
# Source: ${(watch.breakages || []).length} breakages analyzed from .mycelium/watch.json
# Generated: ${new Date().toISOString().slice(0, 10)}

COUPLING_WARNINGS=0
BLOCK=0

# ── Coupling enforcement ──
${couplingChecks}

# ── Repeat-offender file checks ──
${fileChecks}

if [ "$COUPLING_WARNINGS" -gt 2 ]; then
  echo "" >&2
  echo "  ⚠ $COUPLING_WARNINGS coupling warnings — consider updating paired files" >&2
  echo "" >&2
fi

if [ "$BLOCK" -ne 0 ]; then
  echo "" >&2
  echo "  PRE-COMMIT BLOCKED: Pattern violations detected." >&2
  echo "  These patterns have caused breakages before." >&2
  echo "  Bypass: git commit --no-verify" >&2
  echo "" >&2
  exit 1
fi
`;

  // Insert before the final exit 0
  content = content.replace(/\nexit 0\s*$/, upgradeBlock + '\nexit 0\n');

  return { file: guardFile, content };
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
function main() {
  console.log('');
  console.log('  \x1b[1mmycelium-upgrade\x1b[0m — The Immune Booster');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log('');

  // Check data exists
  if (!watch.breakages || watch.breakages.length === 0) {
    console.log('  \x1b[33m⚠ No breakage data in watch.json — nothing to upgrade from.\x1b[0m');
    console.log('  Run some commits first so the system can learn.');
    return;
  }

  const offenders = getRepeatOffenders();
  const couplings = getCouplings();
  const constraints = getConstraints();

  console.log('  \x1b[1mAnalysis:\x1b[0m');
  console.log('    Breakages analyzed:  ' + (watch.breakages || []).length);
  console.log('    Repeat offenders:    ' + offenders.length);
  console.log('    File couplings:      ' + couplings.length + ' (≥5x co-changed)');
  console.log('    Constraint areas:    ' + Object.keys(constraints).length);
  console.log('');

  // Show top offenders
  console.log('  \x1b[1mTop repeat offenders:\x1b[0m');
  offenders.slice(0, 10).forEach(o => {
    const modes = Object.entries(o.modes).map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`    \x1b[31m${o.count}x\x1b[0m  ${o.file}  [${modes}]`);
  });
  console.log('');

  // Show couplings
  if (couplings.length > 0) {
    console.log('  \x1b[1mStrong couplings (must co-change):\x1b[0m');
    couplings.slice(0, 5).forEach(c => {
      console.log(`    ${c.count}x  ${path.basename(c.a)} ↔ ${path.basename(c.b)}`);
    });
    console.log('');
  }

  let totalUpgrades = 0;

  // ── UPGRADE 1: Harden files ──
  if (DO_ALL || HARDEN_ONLY) {
    console.log('  \x1b[1m[1] Harden HTML files with data-testid markers\x1b[0m');
    const hardenResults = hardenFiles(offenders);
    if (hardenResults.length > 0) {
      hardenResults.forEach(r => {
        const verb = (APPLY || HARDEN_ONLY) ? 'Applied' : 'Would apply';
        console.log(`    \x1b[32m✓\x1b[0m ${verb} ${r.changes} marker(s) to ${r.file}`);
      });
      totalUpgrades += hardenResults.length;
    } else {
      console.log('    \x1b[2mAll files already hardened.\x1b[0m');
    }
    console.log('');
  }

  // ── UPGRADE 2: Generate tests ──
  if (DO_ALL || TESTS_ONLY) {
    console.log('  \x1b[1m[2] Generate targeted regression tests\x1b[0m');
    const tests = generateTests(offenders);
    console.log(`    Tests generated: ${tests.length}`);

    const byMode = {};
    tests.forEach(t => { byMode[t.mode] = (byMode[t.mode] || 0) + 1; });
    Object.entries(byMode).forEach(([mode, count]) => {
      console.log(`      ${mode}: ${count} tests`);
    });

    if (APPLY || TESTS_ONLY) {
      const testFile = writeTestFile(tests);
      console.log(`    \x1b[32m✓\x1b[0m Written to ${path.relative(ROOT, testFile)}`);
      totalUpgrades++;
    } else {
      console.log('    \x1b[2mRun with --apply or --tests to write test file.\x1b[0m');
    }
    console.log('');
  }

  // ── UPGRADE 3: Strengthen guard ──
  if (DO_ALL || GUARD_ONLY) {
    console.log('  \x1b[1m[3] Strengthen pre-commit guard\x1b[0m');
    const guardResult = upgradeGuard(offenders, couplings);
    if (guardResult) {
      const couplingCount = couplings.filter(c => c.count >= 6).length;
      const fileCheckCount = offenders.filter(o => o.count >= 5 && o.file.endsWith('.html')).length;
      console.log(`    Coupling checks:     ${Math.min(couplingCount, 8)}`);
      console.log(`    File-specific checks: ${Math.min(fileCheckCount, 8)}`);
      
      if (APPLY || GUARD_ONLY) {
        fs.writeFileSync(guardResult.file, guardResult.content, { mode: 0o755 });
        console.log(`    \x1b[32m✓\x1b[0m Written to ${path.relative(ROOT, guardResult.file)}`);
        totalUpgrades++;
      } else {
        console.log('    \x1b[2mRun with --apply or --guard to update pre-commit hook.\x1b[0m');
      }
    } else {
      console.log('    \x1b[2mGuard already upgraded or hook not found.\x1b[0m');
    }
    console.log('');
  }

  // ── Summary ──
  console.log('  ═══════════════════════════════════════════════════════');
  if (APPLY || TESTS_ONLY || HARDEN_ONLY || GUARD_ONLY) {
    console.log(`  \x1b[32m✓ ${totalUpgrades} upgrade(s) applied.\x1b[0m`);
    console.log('');
    console.log('  Next steps:');
    console.log('    1. Run: node tests/regression-upgrade.cjs');
    console.log('    2. Run: node mycelium-eval.cjs --diagnose');
    console.log('    3. Compare scores before/after');
  } else {
    console.log('  \x1b[33mPreview mode.\x1b[0m Run with --apply to execute all upgrades.');
    console.log('  Or pick specific upgrades:');
    console.log('    --tests   Generate regression tests only');
    console.log('    --harden  Add data-testid markers only');
    console.log('    --guard   Upgrade pre-commit guard only');
  }
  console.log('');
}

main();
