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
//   version       Show version info
// ═══════════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const VERSION = '1.0.0';

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
