#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 *   Mycelium Eval — Codebase Health Evaluator
 *   Delegates to the core mycelium.cjs orchestrator.
 *
 *   Runs 9 KPI checks, generates SHA-256 proof, and produces
 *   a composite health score (0-100) with per-module breakdown.
 *
 *   Commands:
 *     --eval          Run full evaluation (9 KPIs, SHA-256 proof)
 *     --status        Quick status summary
 *     --health        Health dashboard
 *     --reflect       Force deep reflection cycle
 *
 *   Usage:
 *     node mycelium-eval.cjs --eval
 *     node mycelium-eval.cjs --status
 * ══════════════════════════════════════════════════════════════════
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const CORE = path.join(__dirname, 'mycelium.cjs');

const argMap = {
  '--eval':     ['--eval'],
  '--status':   ['--status'],
  '--health':   ['--health'],
  '--reflect':  ['--reflect'],
};

const arg = process.argv[2] || '--eval';
if (!argMap[arg]) {
  console.log('Mycelium Eval — Codebase Health Evaluator');
  console.log('Usage: node mycelium-eval.cjs [command]');
  console.log('Commands: --eval (default), --status, --health, --reflect');
  process.exit(0);
}

const coreArgs = [...argMap[arg], ...process.argv.slice(3)];
try {
  execSync(`node "${CORE}" ${coreArgs.join(' ')}`, { stdio: 'inherit', cwd: __dirname });
} catch (e) {
  process.exit(e.status || 1);
}
