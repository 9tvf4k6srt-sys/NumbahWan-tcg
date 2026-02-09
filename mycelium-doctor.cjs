#!/usr/bin/env node
/**
 * mycelium-doctor — pre-flight health check for Mycelium
 *
 * Usage: node mycelium-doctor.cjs
 *        mycelium doctor
 *
 * Checks everything a dev needs before Mycelium works:
 *   ✓ Node version   ✓ Git available   ✓ Git repo exists
 *   ✓ Hooks installed ✓ Memory readable ✓ Watch data exists
 *   ✓ Session marker  ✓ Scripts present ✓ Permissions OK
 *
 * Zero dependencies. One file. Drop it anywhere.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Colors ──────────────────────────────────────────────────────────
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m';
const D = '\x1b[2m', C = '\x1b[36m', X = '\x1b[0m';

// ─── Helpers ─────────────────────────────────────────────────────────
function findGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8', timeout: 5000 }).trim();
  } catch { return null; }
}

function shell(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { return null; }
}

function fileExists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function dirExists(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function fileSize(p) { try { return fs.statSync(p).size; } catch { return 0; } }
function isExecutable(p) { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } }

function parseJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

// ─── Check definitions ──────────────────────────────────────────────
// Each check returns { ok: bool, label: string, detail: string, fix?: string }

function checkNodeVersion() {
  const ver = process.version;
  const major = parseInt(ver.slice(1));
  const ok = major >= 18;
  return {
    ok,
    label: `Node.js ${ver}`,
    detail: ok ? `v${major} meets minimum v18` : `v${major} is too old — need v18+`,
    fix: ok ? null : 'Install Node.js 18+: https://nodejs.org',
  };
}

function checkGitAvailable() {
  const ver = shell('git --version');
  return {
    ok: !!ver,
    label: 'Git available',
    detail: ver || 'git not found in PATH',
    fix: ver ? null : 'Install git: https://git-scm.com',
  };
}

function checkGitRepo(root) {
  return {
    ok: !!root,
    label: 'Git repository',
    detail: root ? `Root: ${root}` : 'Not inside a git repository',
    fix: root ? null : 'Run: git init',
  };
}

function checkMyceliumDir(root) {
  const dir = path.join(root, '.mycelium');
  const ok = dirExists(dir);
  return {
    ok,
    label: '.mycelium/ directory',
    detail: ok ? `Exists at ${dir}` : 'Missing — Mycelium not initialized',
    fix: ok ? null : 'Run: node mycelium.cjs --init',
  };
}

function checkMemoryFile(root) {
  const file = path.join(root, '.mycelium', 'memory.json');
  if (!fileExists(file)) {
    return { ok: false, label: 'memory.json', detail: 'Missing', fix: 'Run: node mycelium.cjs --init' };
  }
  const data = parseJSON(file);
  if (!data) {
    return { ok: false, label: 'memory.json', detail: 'Exists but invalid JSON', fix: 'Delete and re-init: rm .mycelium/memory.json && node mycelium.cjs --init' };
  }
  const size = fileSize(file);
  const sizeKB = Math.round(size / 1024);
  const snapCount = (data.snapshots || []).length;
  const breakCount = (data.breakages || []).length;
  const learnCount = (data.learnings || []).length;
  return {
    ok: true,
    label: 'memory.json',
    detail: `${sizeKB}KB — ${snapCount} snapshots, ${breakCount} breakages, ${learnCount} learnings`,
  };
}

function checkWatchFile(root) {
  const file = path.join(root, '.mycelium', 'watch.json');
  if (!fileExists(file)) {
    return { ok: false, label: 'watch.json', detail: 'Missing', fix: 'Run: node mycelium-watch.cjs --install' };
  }
  const data = parseJSON(file);
  if (!data) {
    return { ok: false, label: 'watch.json', detail: 'Exists but invalid JSON', fix: 'Delete and re-install: rm .mycelium/watch.json && node mycelium-watch.cjs --install' };
  }
  const size = fileSize(file);
  const sizeKB = Math.round(size / 1024);
  const commits = (data.commits || []).length;
  const breakages = (data.breakages || []).length;
  return {
    ok: true,
    label: 'watch.json',
    detail: `${sizeKB}KB — ${commits} commits tracked, ${breakages} breakages`,
  };
}

function checkScripts(root) {
  const scripts = [
    { name: 'mycelium.cjs', role: 'Learner' },
    { name: 'mycelium-watch.cjs', role: 'Watcher' },
    { name: 'mycelium-eval.cjs', role: 'Evaluator' },
    { name: 'mycelium-fix.cjs', role: 'Fixer' },
    { name: 'mycelium-upgrade.cjs', role: 'Upgrader' },
  ];
  const found = [];
  const missing = [];
  for (const s of scripts) {
    if (fileExists(path.join(root, s.name))) {
      found.push(s);
    } else {
      missing.push(s);
    }
  }
  const ok = found.length >= 4; // upgrader is optional
  return {
    ok,
    label: `Core scripts (${found.length}/${scripts.length})`,
    detail: ok
      ? found.map(s => `${s.name} (${s.role})`).join(', ')
      : `Missing: ${missing.map(s => s.name).join(', ')}`,
    fix: ok ? null : 'Copy the missing .cjs files into your project root',
  };
}

function checkHooks(root) {
  const results = [];

  // Check pre-commit
  const preCommit = path.join(root, '.husky', 'pre-commit');
  if (fileExists(preCommit)) {
    const content = fs.readFileSync(preCommit, 'utf8');
    const hasMycelium = content.includes('mycelium');
    results.push({
      ok: hasMycelium,
      label: 'Pre-commit hook',
      detail: hasMycelium ? 'Installed with Mycelium guard' : 'Exists but missing Mycelium integration',
      fix: hasMycelium ? null : 'Run: node mycelium.cjs --init',
    });
  } else {
    results.push({
      ok: false,
      label: 'Pre-commit hook',
      detail: 'Not found at .husky/pre-commit',
      fix: 'Run: node mycelium.cjs --init',
    });
  }

  // Check post-commit
  const postCommit = path.join(root, '.husky', 'post-commit');
  if (fileExists(postCommit)) {
    const content = fs.readFileSync(postCommit, 'utf8');
    const hasMycelium = content.includes('mycelium');
    results.push({
      ok: hasMycelium,
      label: 'Post-commit hook',
      detail: hasMycelium ? 'Installed — auto-snapshots on every commit' : 'Exists but missing Mycelium',
      fix: hasMycelium ? null : 'Run: node mycelium.cjs --init',
    });
  } else {
    results.push({
      ok: false,
      label: 'Post-commit hook',
      detail: 'Not found at .husky/post-commit',
      fix: 'Run: node mycelium.cjs --init',
    });
  }

  // Check hooksPath config
  const hooksPath = shell('git config core.hooksPath');
  if (hooksPath) {
    results.push({
      ok: true,
      label: 'Git hooksPath',
      detail: `Set to: ${hooksPath}`,
    });
  } else {
    results.push({
      ok: false,
      label: 'Git hooksPath',
      detail: 'Not configured — hooks may not fire',
      fix: 'Run: git config core.hooksPath .husky',
    });
  }

  return results;
}

function checkSession(root) {
  const file = path.join(root, '.mycelium-session');
  const ok = fileExists(file);
  return {
    ok,
    label: 'Session marker',
    detail: ok ? 'Active — commits are allowed' : 'Missing — commits will be blocked',
    fix: ok ? null : 'Run: echo $(date +%s) > .mycelium-session',
  };
}

function checkConfig(root) {
  const file = path.join(root, '.mycelium', 'config.json');
  if (!fileExists(file)) {
    return { ok: true, label: 'Config', detail: 'No config.json (using defaults)' };
  }
  const data = parseJSON(file);
  if (!data) {
    return { ok: false, label: 'Config', detail: 'config.json exists but invalid JSON', fix: 'Delete and re-init: rm .mycelium/config.json && node mycelium.cjs --init' };
  }
  return { ok: true, label: 'Config', detail: `Loaded — ${Object.keys(data).length} settings` };
}

function checkGitignore(root) {
  const file = path.join(root, '.gitignore');
  if (!fileExists(file)) {
    return { ok: false, label: '.gitignore', detail: 'No .gitignore file', fix: 'Run: node mycelium.cjs --init' };
  }
  const content = fs.readFileSync(file, 'utf8');
  const checks = [
    { pattern: '.mycelium-session', label: 'session marker' },
    { pattern: '.mycelium-context', label: 'context file' },
  ];
  const missing = checks.filter(c => !content.includes(c.pattern));
  if (missing.length === 0) {
    return { ok: true, label: '.gitignore', detail: 'Session + context files ignored' };
  }
  return {
    ok: false,
    label: '.gitignore',
    detail: `Missing entries: ${missing.map(m => m.label).join(', ')}`,
    fix: `Add to .gitignore: ${missing.map(m => m.pattern).join(', ')}`,
  };
}

function checkGitHubAction(root) {
  const file = path.join(root, '.github', 'workflows', 'mycelium-ci.yml');
  if (fileExists(file)) {
    return { ok: true, label: 'GitHub Action', detail: 'mycelium-ci.yml installed — PR comments enabled' };
  }
  return {
    ok: false,
    label: 'GitHub Action',
    detail: 'No CI integration — eval scores won\'t appear on PRs',
    fix: 'Run: mycelium doctor --fix (or copy .github/workflows/mycelium-ci.yml)',
  };
}

// ─── Main ────────────────────────────────────────────────────────────
function doctor(args) {
  const doFix = args.includes('--fix');
  const json = args.includes('--json');

  console.log(`\n  ${B}🍄 mycelium doctor${X} — system health check`);
  console.log(`  ${'─'.repeat(47)}\n`);

  const root = findGitRoot() || process.cwd();
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  const allResults = [];

  function report(check) {
    allResults.push(check);
    if (check.ok) {
      passCount++;
      console.log(`  ${G}✓${X} ${check.label}`);
      console.log(`    ${D}${check.detail}${X}`);
    } else if (check.fix) {
      failCount++;
      console.log(`  ${R}✗${X} ${check.label}`);
      console.log(`    ${check.detail}`);
      console.log(`    ${Y}→ ${check.fix}${X}`);
    } else {
      warnCount++;
      console.log(`  ${Y}!${X} ${check.label}`);
      console.log(`    ${D}${check.detail}${X}`);
    }
    console.log();
  }

  // ── Run all checks ─────────────────────────────────────────────
  console.log(`  ${B}Environment${X}`);
  report(checkNodeVersion());
  report(checkGitAvailable());
  report(checkGitRepo(root));

  if (!findGitRoot()) {
    console.log(`\n  ${R}${B}Cannot continue — not in a git repository.${X}\n`);
    if (json) console.log(JSON.stringify({ ok: false, pass: passCount, fail: failCount, checks: allResults }, null, 2));
    process.exit(1);
  }

  console.log(`  ${B}Installation${X}`);
  report(checkMyceliumDir(root));
  report(checkScripts(root));
  const hookResults = checkHooks(root);
  hookResults.forEach(r => report(r));
  report(checkConfig(root));
  report(checkGitignore(root));
  report(checkGitHubAction(root));

  console.log(`  ${B}Data${X}`);
  report(checkMemoryFile(root));
  report(checkWatchFile(root));
  report(checkSession(root));

  // ── Summary ────────────────────────────────────────────────────
  const total = passCount + failCount + warnCount;
  const score = Math.round((passCount / total) * 100);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const color = score >= 80 ? G : score >= 60 ? Y : R;

  console.log(`  ${'─'.repeat(47)}`);
  console.log(`  ${B}Result: ${color}${passCount}/${total} checks passed${X} ${D}(${score}% — ${grade})${X}`);

  if (failCount > 0) {
    console.log(`  ${R}${failCount} issue(s) need fixing${X}`);
    if (!doFix) {
      console.log(`\n  ${D}Quick fix: run ${B}mycelium doctor --fix${X}${D} to auto-repair what's possible${X}`);
    }
  }

  if (failCount === 0) {
    console.log(`\n  ${G}${B}All systems go.${X} ${D}Your codebase immune system is healthy.${X}\n`);
  } else {
    console.log();
  }

  // ── Auto-fix mode ──────────────────────────────────────────────
  if (doFix && failCount > 0) {
    console.log(`  ${B}Auto-fixing...${X}\n`);
    let fixed = 0;

    // Fix .mycelium directory
    const myceliumDir = path.join(root, '.mycelium');
    if (!dirExists(myceliumDir)) {
      fs.mkdirSync(myceliumDir, { recursive: true });
      console.log(`  ${G}✓${X} Created .mycelium/`);
      fixed++;
    }

    // Fix session marker
    if (!fileExists(path.join(root, '.mycelium-session'))) {
      fs.writeFileSync(path.join(root, '.mycelium-session'), String(Date.now()));
      console.log(`  ${G}✓${X} Created .mycelium-session`);
      fixed++;
    }

    // Fix hooksPath
    if (!shell('git config core.hooksPath')) {
      shell('git config core.hooksPath .husky');
      console.log(`  ${G}✓${X} Set git core.hooksPath = .husky`);
      fixed++;
    }

    // Fix .gitignore entries
    const gitignore = path.join(root, '.gitignore');
    if (fileExists(gitignore)) {
      let content = fs.readFileSync(gitignore, 'utf8');
      let changed = false;
      for (const entry of ['.mycelium-session', '.mycelium-context']) {
        if (!content.includes(entry)) {
          content += `\n${entry}`;
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(gitignore, content);
        console.log(`  ${G}✓${X} Updated .gitignore`);
        fixed++;
      }
    }

    // Try running --init if core script exists
    if (fileExists(path.join(root, 'mycelium.cjs')) && !fileExists(path.join(root, '.mycelium', 'memory.json'))) {
      try {
        execSync('node mycelium.cjs --init', { cwd: root, stdio: 'inherit', timeout: 30000 });
        console.log(`  ${G}✓${X} Ran mycelium --init`);
        fixed++;
      } catch { /* --init may fail, that's OK */ }
    }

    console.log(`\n  ${G}${fixed} fix(es) applied.${X} Run ${B}mycelium doctor${X} again to verify.\n`);
  }

  // ── JSON output ────────────────────────────────────────────────
  if (json) {
    const output = {
      ok: failCount === 0,
      score,
      grade,
      pass: passCount,
      fail: failCount,
      warn: warnCount,
      checks: allResults.map(c => ({ ok: c.ok, label: c.label, detail: c.detail, fix: c.fix || null })),
    };
    console.log(JSON.stringify(output, null, 2));
  }

  process.exit(failCount > 0 ? 1 : 0);
}

// ─── CLI Entry ───────────────────────────────────────────────────────
if (require.main === module) {
  doctor(process.argv.slice(2));
}

module.exports = { doctor };
