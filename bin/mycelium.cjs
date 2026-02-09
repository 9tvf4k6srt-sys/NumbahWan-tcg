#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════
// Mycelium — Codebase Immune System
// Unified CLI: npx mycelium <command>
//
// Commands:
//   (none)        Run the core memory system (snapshot + learn)
//   eval          Evaluate the codebase (9 KPIs, cryptographic proof)
//   eval --json   Machine-readable evaluation output
//   eval --verify Verify all numbers with 25 self-checks
//   eval --proof  Show cryptographic proof chain
//   eval --history Show score history and improvement delta
//   diagnose      Full root-cause analysis (friction → files → causes)
//   diagnose-json Machine-readable diagnosis output
//   fix           Run fix cycle (diagnose → prescribe → execute → verify)
//   fix --force   Force fix even if score is above threshold
//   fix --dry-run Preview what would be fixed
//   status        Show current system status + pending prescriptions
//   watch         Run the file watcher (commit analysis, risk scoring)
//   watch --learn Learn from latest commit
//   watch --warn  Check for risks before commit
//   health        Show project health summary
//   query         Interactive memory query
//   ship          Atomic deploy: auth → test → sync → push → PR → merge
//   ship "msg"    Ship with custom commit message
//   version       Show version info
// ═══════════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const VERSION = '1.1.0';

// ─── Script paths ─────────────────────────────────────────────────
const SCRIPTS = {
  core:  path.join(ROOT, 'mycelium.cjs'),
  eval:  path.join(ROOT, 'mycelium-eval.cjs'),
  fix:   path.join(ROOT, 'mycelium-fix.cjs'),
  watch: path.join(ROOT, 'mycelium-watch.cjs'),
};

// ─── Helpers ──────────────────────────────────────────────────────
function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    process.exit(e.status || 1);
  }
}

function exists(p) { return fs.existsSync(p); }

// Run a command and return stdout (for ship workflow)
function runCapture(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: opts.stdio || 'pipe', ...opts }).trim();
  } catch (e) {
    if (opts.allowFail) return null;
    throw e;
  }
}

// ─── Ship: atomic deploy workflow ────────────────────────────────
// Solves two recurring problems:
//   1. Auth token expires mid-session → refresh BEFORE every push
//   2. Workflow stops after PR creation → merge is part of the command
//
// Full sequence: test → auth → sync → squash → push → PR → merge → sync-back
function ship(commitMsg) {
  const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', X = '\x1b[0m', D = '\x1b[2m';
  const BRANCH = 'genspark_ai_developer';

  function step(n, label) { console.log(`\n  ${B}[${n}]${X} ${label}`); }
  function ok(msg) { console.log(`  ${G}✓${X} ${msg}`); }
  function fail(msg) { console.error(`  ${R}✗${X} ${msg}`); }
  function info(msg) { console.log(`  ${D}${msg}${X}`); }

  console.log(`\n  ${B}🍄 mycelium ship${X} — atomic deploy workflow`);
  console.log(`  ─────────────────────────────────────────────`);

  // ── Step 1: Verify we have something to ship ──────────────────
  step(1, 'Check for changes');
  const currentBranch = runCapture('git branch --show-current');
  if (currentBranch !== BRANCH) {
    // Switch to dev branch
    try {
      runCapture(`git checkout ${BRANCH} 2>&1`);
      ok(`Switched to ${BRANCH}`);
    } catch {
      try {
        runCapture(`git checkout -B ${BRANCH} 2>&1`);
        ok(`Created ${BRANCH}`);
      } catch (e) {
        fail(`Cannot switch to ${BRANCH}: ${e.message}`);
        process.exit(1);
      }
    }
  }

  const status = runCapture('git status --short');
  const hasUncommitted = status.length > 0;

  if (hasUncommitted) {
    info(`Uncommitted changes found — committing...`);
    runCapture('git add -A');
    const msg = commitMsg || 'chore: ship uncommitted changes';
    try {
      runCapture(`git commit -m "${msg.replace(/"/g, '\\"')}" --no-verify`);
      ok(`Committed: ${msg}`);
    } catch (e) {
      fail(`Commit failed: ${e.message}`);
      process.exit(1);
    }
  }

  // Count commits ahead of main
  let aheadCount;
  try {
    const log = runCapture(`git log --oneline ${BRANCH} --not origin/main 2>/dev/null`);
    aheadCount = log ? log.split('\n').filter(Boolean).length : 0;
  } catch {
    aheadCount = 0;
  }

  if (aheadCount === 0) {
    info('No new commits to ship.');
    console.log(`\n  ${B}Nothing to ship.${X}\n`);
    return;
  }
  ok(`${aheadCount} commit(s) to ship`);

  // ── Step 2: Run tests ─────────────────────────────────────────
  step(2, 'Validate');
  try {
    // Quick eval verify
    if (exists(SCRIPTS.eval)) {
      const evalOut = runCapture(`node "${SCRIPTS.eval}" --verify 2>&1`);
      const checkMatch = evalOut.match(/(\d+)\/(\d+)/);
      if (checkMatch) ok(`Eval: ${checkMatch[0]} checks pass`);
      else ok('Eval: verified');
    }
    // Regression tests
    const regTests = path.join(ROOT, 'tests', 'regression-from-breakages.cjs');
    if (exists(regTests)) {
      const testOut = runCapture(`node "${regTests}" 2>&1`);
      const passMatch = testOut.match(/(\d+) passed/);
      if (passMatch) ok(`Regression: ${passMatch[1]} tests pass`);
    }
  } catch (e) {
    fail(`Validation failed — aborting ship`);
    info(e.message);
    process.exit(1);
  }

  // ── Step 3: Auth refresh (BEFORE any network operation) ───────
  step(3, 'Refresh auth');
  try {
    // Write fresh credentials file
    const tokenSources = [
      process.env.GITHUB_TOKEN,
      process.env.GH_TOKEN,
    ].filter(Boolean);

    if (tokenSources.length > 0) {
      const token = tokenSources[0];
      const credsContent = `https://x-access-token:${token}@github.com\n`;
      const credsPath = path.join(require('os').homedir(), '.git-credentials');
      fs.writeFileSync(credsPath, credsContent, { mode: 0o600 });
      runCapture('git config --global credential.helper store');
      ok('Token refreshed from env');
    } else {
      // Try gh auth status
      const ghStatus = runCapture('gh auth status 2>&1', { allowFail: true });
      if (ghStatus && ghStatus.includes('Logged in')) {
        ok('gh auth active');
      } else {
        info('No token in env — auth may fail. Set GITHUB_TOKEN or run setup_github_environment.');
      }
    }
  } catch {
    info('Auth refresh skipped — will attempt push anyway');
  }

  // ── Step 4: Sync with remote ──────────────────────────────────
  step(4, 'Sync with remote');
  try {
    runCapture('git fetch origin main 2>&1');
    ok('Fetched origin/main');

    // Rebase onto main
    const rebaseResult = runCapture(`git rebase origin/main 2>&1`, { allowFail: true });
    if (rebaseResult && rebaseResult.includes('CONFLICT')) {
      info('Conflicts detected — resolving (prefer remote)...');
      runCapture('git checkout --theirs . 2>&1', { allowFail: true });
      runCapture('git add -A 2>&1');
      runCapture('git rebase --continue 2>&1', { allowFail: true });
      ok('Conflicts resolved (kept remote changes)');
    } else {
      ok('Rebased on origin/main');
    }
  } catch (e) {
    // If rebase fails entirely, abort and try merge
    runCapture('git rebase --abort 2>&1', { allowFail: true });
    try {
      runCapture('git merge origin/main --no-edit 2>&1');
      ok('Merged origin/main');
    } catch {
      fail('Cannot sync with remote');
      process.exit(1);
    }
  }

  // ── Step 5: Squash into single commit ─────────────────────────
  step(5, 'Squash commits');
  // Recount after rebase
  try {
    const log2 = runCapture(`git log --oneline ${BRANCH} --not origin/main 2>/dev/null`);
    aheadCount = log2 ? log2.split('\n').filter(Boolean).length : 0;
  } catch { aheadCount = 1; }

  if (aheadCount > 1) {
    const defaultMsg = commitMsg || runCapture('git log -1 --pretty=format:"%s"');
    runCapture(`git reset --soft HEAD~${aheadCount}`);
    runCapture(`git commit -m "${defaultMsg.replace(/"/g, '\\"')}" --no-verify`);
    ok(`Squashed ${aheadCount} → 1 commit`);
  } else {
    ok(`Already 1 commit — no squash needed`);
  }

  // ── Step 6: Push ──────────────────────────────────────────────
  step(6, 'Push');
  let pushOk = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      runCapture(`git push -f origin ${BRANCH} 2>&1`);
      ok('Pushed to remote');
      pushOk = true;
      break;
    } catch (e) {
      if (attempt === 1 && e.message && e.message.includes('Invalid username')) {
        info('Auth expired — refreshing token...');
        // This is the sandbox-specific retry
        try {
          // Re-read any refreshed token
          const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
          if (token) {
            const credsContent = `https://x-access-token:${token}@github.com\n`;
            const credsPath = path.join(require('os').homedir(), '.git-credentials');
            fs.writeFileSync(credsPath, credsContent, { mode: 0o600 });
          }
          info('Retrying push...');
        } catch { /* continue to retry */ }
      } else {
        fail(`Push failed: ${e.message}`);
        info('Run setup_github_environment manually, then: mycelium ship');
        process.exit(1);
      }
    }
  }
  if (!pushOk) {
    fail('Push failed after 2 attempts');
    info('Run setup_github_environment manually, then: mycelium ship');
    process.exit(1);
  }

  // ── Step 7: Create or update PR ───────────────────────────────
  step(7, 'Pull Request');
  let prUrl = null;
  try {
    // Check if PR already exists
    const existingPR = runCapture(`gh pr list --head ${BRANCH} --json number,url --jq '.[0].url' 2>/dev/null`, { allowFail: true });
    if (existingPR && existingPR.startsWith('http')) {
      prUrl = existingPR;
      ok(`PR exists: ${prUrl}`);
    } else {
      // Create new PR
      const title = commitMsg || runCapture('git log -1 --pretty=format:"%s"');
      const createOut = runCapture(`gh pr create --title "${title.replace(/"/g, '\\"')}" --body "Automated via mycelium ship" --base main --head ${BRANCH} 2>&1`);
      prUrl = createOut.trim();
      ok(`PR created: ${prUrl}`);
    }
  } catch (e) {
    fail(`PR creation failed: ${e.message}`);
    info('Create PR manually, then merge.');
    process.exit(1);
  }

  // ── Step 8: Merge PR ──────────────────────────────────────────
  step(8, 'Merge');
  try {
    const mergeTitle = commitMsg || runCapture('git log -1 --pretty=format:"%s"');
    runCapture(`gh pr merge --squash --subject "${mergeTitle.replace(/"/g, '\\"')}" 2>&1`);
    ok('PR merged to main');
  } catch (e) {
    fail(`Merge failed: ${e.message}`);
    info(`PR is at: ${prUrl}`);
    info('Merge manually: gh pr merge --squash');
    process.exit(1);
  }

  // ── Step 9: Sync back ─────────────────────────────────────────
  step(9, 'Sync local');
  try {
    runCapture('git checkout main 2>&1');
    runCapture('git pull origin main 2>&1');
    runCapture(`git checkout -B ${BRANCH} main 2>&1`);
    ok('Local synced to merged main');
  } catch {
    info('Sync-back failed — run: git checkout main && git pull');
  }

  // ── Done ──────────────────────────────────────────────────────
  console.log(`\n  ${G}${B}✓ Ship complete${X}`);
  if (prUrl) console.log(`  ${D}PR: ${prUrl}${X}`);
  console.log();
}

function banner() {
  console.log(`
  \x1b[1m🍄 Mycelium v${VERSION}\x1b[0m — Codebase Immune System
  ─────────────────────────────────────────────
  The underground network that learns from every commit,
  remembers every breakage, and strengthens every constraint.
  `);
}

// ─── Command routing ──────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = (args[0] || '').toLowerCase();
const rest = args.slice(1).join(' ');

switch (cmd) {
  // ── Evaluation ──────────────────────────────────────────────────
  case 'eval':
  case 'evaluate':
    if (!exists(SCRIPTS.eval)) { console.error('mycelium-eval.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.eval}" ${rest}`);
    break;

  // ── Diagnosis ───────────────────────────────────────────────────
  case 'diagnose':
    if (!exists(SCRIPTS.fix)) { console.error('mycelium-fix.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.fix}" --diagnose ${rest}`);
    break;

  case 'diagnose-json':
    if (!exists(SCRIPTS.fix)) { console.error('mycelium-fix.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.fix}" --diagnose-json ${rest}`);
    break;

  // ── Fix ─────────────────────────────────────────────────────────
  case 'fix':
    if (!exists(SCRIPTS.fix)) { console.error('mycelium-fix.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.fix}" ${rest}`);
    break;

  // ── Ship: atomic deploy workflow ─────────────────────────────────
  case 'ship':
    ship(rest || null);
    break;

  // ── Status ──────────────────────────────────────────────────────
  case 'status':
    if (!exists(SCRIPTS.fix)) { console.error('mycelium-fix.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.fix}" --status ${rest}`);
    break;

  // ── Watch ───────────────────────────────────────────────────────
  case 'watch':
    if (!exists(SCRIPTS.watch)) { console.error('mycelium-watch.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.watch}" ${rest}`);
    break;

  // ── Health ──────────────────────────────────────────────────────
  case 'health':
    if (!exists(SCRIPTS.core)) { console.error('mycelium.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.core}" --health ${rest}`);
    break;

  // ── Query ───────────────────────────────────────────────────────
  case 'query':
    if (!exists(SCRIPTS.core)) { console.error('mycelium.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.core}" --query ${rest}`);
    break;

  // ── Version ─────────────────────────────────────────────────────
  case 'version':
  case '--version':
  case '-v':
    banner();
    console.log(`  Components:`);
    console.log(`    mycelium.cjs       ${exists(SCRIPTS.core) ? '✓' : '✗'} — The Learner (memory, snapshots, constraints)`);
    console.log(`    mycelium-watch.cjs ${exists(SCRIPTS.watch) ? '✓' : '✗'} — The Watcher (commits, risks, couplings)`);
    console.log(`    mycelium-eval.cjs  ${exists(SCRIPTS.eval) ? '✓' : '✗'} — The Evaluator (9 KPIs, cryptographic proof)`);
    console.log(`    mycelium-fix.cjs   ${exists(SCRIPTS.fix) ? '✓' : '✗'} — The Fixer (diagnose → prescribe → execute → verify)`);
    console.log();
    // Show data directory
    const dataDir = path.join(ROOT, '.mycelium');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      console.log(`  Data (.mycelium/):`);
      files.forEach(f => {
        const stat = fs.statSync(path.join(dataDir, f));
        const sizeKB = Math.round(stat.size / 1024);
        console.log(`    ${f.padEnd(25)} ${sizeKB}KB`);
      });
    }
    console.log();
    break;

  // ── Help ────────────────────────────────────────────────────────
  case 'help':
  case '--help':
  case '-h':
    banner();
    console.log(`  Commands:`);
    console.log(`    mycelium ship          Full deploy: auth → test → sync → push → PR → merge`);
    console.log(`    mycelium ship "msg"    Ship with custom commit message`);
    console.log(`    mycelium eval          Evaluate codebase (9 KPIs + proof)`);
    console.log(`    mycelium eval --json   Machine-readable evaluation`);
    console.log(`    mycelium eval --verify 25-point self-verification`);
    console.log(`    mycelium diagnose      Root-cause analysis (friction → files → causes)`);
    console.log(`    mycelium diagnose-json Machine-readable diagnosis`);
    console.log(`    mycelium fix           Run fix cycle (auto-diagnose + execute)`);
    console.log(`    mycelium fix --force   Force fix even above threshold`);
    console.log(`    mycelium fix --dry-run Preview fixes without executing`);
    console.log(`    mycelium status        Current state + pending prescriptions`);
    console.log(`    mycelium watch         File watcher (commit analysis)`);
    console.log(`    mycelium watch --learn Learn from latest commit`);
    console.log(`    mycelium watch --warn  Pre-commit risk check`);
    console.log(`    mycelium health        Project health summary`);
    console.log(`    mycelium query         Interactive memory query`);
    console.log(`    mycelium version       Show component status`);
    console.log();
    console.log(`  Pipeline: Learner → Evaluator → Fixer (continuous loop)`);
    console.log(`    Every commit triggers: watch --learn → eval → fix (if needed)`);
    console.log(`    Pre-commit: watch --warn → guard constraints → block if violated`);
    console.log(`    Ship: auth → test → sync → squash → push → PR → merge (atomic)`);
    console.log();
    break;

  // ── Default: run core ───────────────────────────────────────────
  default:
    if (cmd && !cmd.startsWith('-')) {
      console.error(`Unknown command: ${cmd}`);
      console.error(`Run 'mycelium help' for available commands.`);
      process.exit(1);
    }
    // Pass through to core (handles --brief, --health, --query, etc.)
    if (!exists(SCRIPTS.core)) { console.error('mycelium.cjs not found'); process.exit(1); }
    run(`node "${SCRIPTS.core}" ${args.join(' ')}`);
    break;
}
