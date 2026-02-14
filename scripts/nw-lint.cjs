#!/usr/bin/env node
/**
 * NW Pre-Commit Pattern Checker (nw-lint.cjs)
 * Reads mined pattern rules from .mycelium-mined/db/rules-api.json
 * and checks staged files against them.
 *
 * Wired into .husky/pre-commit.
 *
 * HIGH severity rules BLOCK the commit.
 * MEDIUM severity rules WARN.
 * LOW severity rules are INFO only.
 *
 * Usage:
 *   node scripts/nw-lint.cjs              # check staged files
 *   node scripts/nw-lint.cjs --all        # check all HTML/JS files
 *   node scripts/nw-lint.cjs --file=x.html # check specific file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RULES_PATH = path.join(ROOT, '.mycelium-mined/db/rules-api.json');

// ── Parse args ──
const args = process.argv.slice(2);
const CHECK_ALL = args.includes('--all');
const FILE_ARG = args.find(a => a.startsWith('--file='));
const VERBOSE = args.includes('--verbose');

// ── Load mined rules ──
function loadRules() {
  if (!fs.existsSync(RULES_PATH)) {
    console.log('  No mined rules found. Skipping pattern check.');
    return [];
  }
  const data = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
  return data.rules || [];
}

// ── Get staged files and their diffs ──
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getStagedDiff() {
  try {
    return execSync('git diff --cached -U0', { cwd: ROOT, encoding: 'utf8' });
  } catch {
    return '';
  }
}

function getAllFiles() {
  try {
    const output = execSync(
      "find public -name '*.html' -o -name '*.js' | grep -v node_modules | grep -v dist",
      { cwd: ROOT, encoding: 'utf8' }
    );
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// ── Pattern detectors ──
// Each detector gets {file, content, diff} and returns violations[]

const DETECTORS = {
  'MCL-OVERFLOW-HIDDEN-CLIPS-CHILDREN': ({ file, diff }) => {
    if (!file.endsWith('.html')) return [];
    const violations = [];
    if (/overflow\s*:\s*hidden/i.test(diff)) {
      violations.push({
        msg: `overflow:hidden added — verify no child elements are clipped`,
        line: findLineInDiff(diff, /overflow\s*:\s*hidden/i)
      });
    }
    return violations;
  },

  'MCL-SCRIPT-ORDER-DEPENDENCY': ({ file, content }) => {
    if (!file.endsWith('.html')) return [];
    const violations = [];
    // Check shim must come before nav and core
    const shimIdx = content.indexOf('nw-i18n-shim.js');
    const navIdx = content.indexOf('nw-nav.js');
    const coreIdx = content.indexOf('nw-i18n-core.js');
    if (shimIdx > -1 && navIdx > -1 && shimIdx > navIdx) {
      violations.push({ msg: 'nw-i18n-shim.js must load BEFORE nw-nav.js' });
    }
    if (shimIdx > -1 && coreIdx > -1 && shimIdx > coreIdx) {
      violations.push({ msg: 'nw-i18n-shim.js must load BEFORE nw-i18n-core.js' });
    }
    // Check shim is NOT deferred
    const shimLine = content.match(/<script[^>]*nw-i18n-shim\.js[^>]*>/);
    if (shimLine && /defer/i.test(shimLine[0])) {
      violations.push({ msg: 'nw-i18n-shim.js must NOT have defer attribute' });
    }
    return violations;
  },

  'MCL-DEFER-BEFORE-DEPENDENCY': ({ file, content }) => {
    if (!file.endsWith('.html')) return [];
    const violations = [];
    // Find deferred scripts that other inline scripts depend on
    const shimLine = content.match(/<script[^>]*nw-i18n-shim\.js[^>]*>/);
    if (shimLine && /defer/i.test(shimLine[0])) {
      violations.push({ msg: 'nw-i18n-shim.js has defer but is a dependency — remove defer' });
    }
    return violations;
  },

  'MCL-MISSING-NULL-GUARD': ({ file, diff }) => {
    if (!file.endsWith('.html') && !file.endsWith('.js')) return [];
    const violations = [];
    // Check for querySelector without null guard in new lines
    const newLines = extractAddedLines(diff);
    for (const line of newLines) {
      // querySelector(...).something without ?. or if check
      if (/querySelector\([^)]+\)\.\w+/.test(line) && !/\?\.\w+/.test(line)) {
        violations.push({ msg: `querySelector without null guard: ${line.trim().substring(0, 80)}` });
      }
    }
    return violations;
  },

  'MCL-I18N-MISSING-TRANSLATION': ({ file, content }) => {
    if (!file.endsWith('.html')) return [];
    const violations = [];
    // Check for data-i18n keys that start with a digit
    const digitKeys = content.match(/data-i18n="(\d[^"]*)"/g);
    if (digitKeys) {
      violations.push({ msg: `i18n key starting with digit: ${digitKeys[0]} (causes JS errors)` });
    }
    // Check i18n scripts present but no PAGE_I18N (page has data-i18n but no translations)
    const hasDataI18n = /data-i18n=/.test(content);
    const hasPageI18n = /PAGE_I18N|NW_I18N\.register/.test(content);
    const hasShim = /nw-i18n-shim\.js|nw-i18n-core\.js/.test(content);
    if (hasDataI18n && hasShim && !hasPageI18n) {
      // This is a warning, not a block — core translations may cover it
      violations.push({ msg: 'Page has data-i18n attributes but no PAGE_I18N / register() call (core translations may cover it)' });
    }
    return violations;
  },

  'MCL-MISSING-AWAIT': ({ file, diff }) => {
    if (!file.endsWith('.html') && !file.endsWith('.js')) return [];
    const violations = [];
    const newLines = extractAddedLines(diff);
    for (const line of newLines) {
      // Pattern: calling async function and using .then or not awaiting fetch
      if (/fetch\(/.test(line) && !/await\s+fetch/.test(line) && !/\.then\(/.test(line)) {
        violations.push({ msg: `fetch() without await or .then: ${line.trim().substring(0, 80)}` });
      }
    }
    return violations;
  },

  'MCL-USE-BEFORE-DEFINE': ({ file, content }) => {
    if (!file.endsWith('.html')) return [];
    const violations = [];
    // Check for NW_I18N usage without shim or core loaded
    const usesNwI18n = /NW_I18N\.(register|setLang|apply|t\()/.test(content);
    const hasI18nScript = /nw-i18n-shim\.js|nw-i18n-core\.js/.test(content);
    if (usesNwI18n && !hasI18nScript) {
      violations.push({ msg: 'NW_I18N used but neither shim nor core script is loaded' });
    }
    return violations;
  },

  'MCL-MISSING-RESPONSIVE-BREAKPOINT': ({ file, diff }) => {
    if (!file.endsWith('.html')) return [];
    const violations = [];
    const newLines = extractAddedLines(diff);
    // Check for fixed width values in new CSS
    for (const line of newLines) {
      if (/width\s*:\s*\d{4,}px/.test(line)) {
        violations.push({ msg: `Fixed width >999px may break mobile: ${line.trim().substring(0, 80)}` });
      }
    }
    return violations;
  },

  'MCL-INNERHTML-DESTROYS-HANDLERS': ({ file, diff }) => {
    if (!file.endsWith('.html') && !file.endsWith('.js')) return [];
    const violations = [];
    const newLines = extractAddedLines(diff);
    for (const line of newLines) {
      // innerHTML assignment on a container that likely has event handlers
      if (/\.innerHTML\s*=/.test(line) && !/\.innerHTML\s*=\s*['"`]/.test(line)) {
        violations.push({ msg: `innerHTML assignment may destroy handlers: ${line.trim().substring(0, 80)}` });
      }
    }
    return violations;
  },

  'MCL-RACE-CONDITION-NEEDS-DELAY': ({ file, diff }) => {
    if (!file.endsWith('.html') && !file.endsWith('.js')) return [];
    const violations = [];
    const newLines = extractAddedLines(diff);
    for (const line of newLines) {
      if (/setTimeout\(/.test(line) && !/debounce|throttle|animation|scroll/i.test(line)) {
        violations.push({ msg: `setTimeout may hide a race condition: ${line.trim().substring(0, 60)}` });
      }
    }
    return violations;
  },

  'MCL-MISSING-TOUCH-SUPPORT': ({ file, diff }) => {
    if (!file.endsWith('.js')) return [];
    const violations = [];
    const newLines = extractAddedLines(diff);
    // Check for mouseenter/mouseleave without touch equivalents
    for (const line of newLines) {
      if (/addEventListener\s*\(\s*['"]mouse/.test(line)) {
        violations.push({ msg: `Mouse-only event handler — needs touch support: ${line.trim().substring(0, 80)}` });
      }
    }
    return violations;
  },

  'MCL-OBJECT-FIT-CROPS-CONTENT': ({ file, diff }) => {
    if (!file.endsWith('.html')) return [];
    const violations = [];
    const newLines = extractAddedLines(diff);
    for (const line of newLines) {
      if (/object-fit\s*:\s*cover/.test(line)) {
        violations.push({ msg: `object-fit:cover may crop important content (card art, logos)` });
      }
    }
    return violations;
  },
};

// ── Helpers ──
function extractAddedLines(diff) {
  if (!diff) return [];
  return diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1));
}

function findLineInDiff(diff, regex) {
  const lines = diff.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i;
  }
  return null;
}

// ── Main ──
function main() {
  const rules = loadRules();
  if (rules.length === 0) process.exit(0);

  // Build severity map from rules
  const severityMap = {};
  for (const rule of rules) {
    severityMap[rule.id] = rule.severity;
  }

  let filesToCheck;
  if (FILE_ARG) {
    filesToCheck = [FILE_ARG.split('=')[1]];
  } else if (CHECK_ALL) {
    filesToCheck = getAllFiles();
  } else {
    filesToCheck = getStagedFiles();
  }

  if (filesToCheck.length === 0) {
    if (VERBOSE) console.log('  No files to check.');
    process.exit(0);
  }

  const diff = CHECK_ALL ? '' : getStagedDiff();

  const allViolations = { high: [], medium: [], low: [] };

  for (const file of filesToCheck) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;

    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    // Extract file-specific diff
    const fileRe = new RegExp(`diff --git a/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=diff --git|$)`);
    const fileDiff = diff.match(fileRe)?.[0] || '';

    for (const [ruleId, detector] of Object.entries(DETECTORS)) {
      const severity = severityMap[ruleId] || 'medium';
      try {
        const violations = detector({ file, content, diff: fileDiff });
        for (const v of violations) {
          allViolations[severity].push({ ruleId, file, ...v });
        }
      } catch (err) {
        // Don't crash on detector errors
        if (VERBOSE) console.error(`  Detector ${ruleId} error on ${file}: ${err.message}`);
      }
    }
  }

  // Report
  const totalHigh = allViolations.high.length;
  const totalMedium = allViolations.medium.length;
  const totalLow = allViolations.low.length;
  const total = totalHigh + totalMedium + totalLow;

  if (total === 0) {
    if (VERBOSE) console.log('  NW Pattern Checker: all clear');
    process.exit(0);
  }

  console.log('');
  console.log(`  NW Pattern Checker — ${total} finding(s) from mined rules`);
  console.log('');

  if (totalHigh > 0) {
    console.log(`  BLOCK (${totalHigh}):`);
    for (const v of allViolations.high) {
      console.log(`    [${v.ruleId}] ${v.file}`);
      console.log(`      ${v.msg}`);
    }
  }

  if (totalMedium > 0) {
    console.log(`  WARN (${totalMedium}):`);
    for (const v of allViolations.medium) {
      console.log(`    [${v.ruleId}] ${v.file}`);
      console.log(`      ${v.msg}`);
    }
  }

  if (VERBOSE && totalLow > 0) {
    console.log(`  INFO (${totalLow}):`);
    for (const v of allViolations.low) {
      console.log(`    [${v.ruleId}] ${v.file}`);
      console.log(`      ${v.msg}`);
    }
  }

  console.log('');

  // Exit code: 1 if HIGH violations (block commit)
  if (totalHigh > 0) {
    console.log(`  COMMIT BLOCKED: ${totalHigh} high-severity pattern violation(s).`);
    console.log('  These patterns caused breakages in the past.');
    console.log('  Bypass: git commit --no-verify');
    console.log('');
    process.exit(1);
  }

  process.exit(0);
}

main();
