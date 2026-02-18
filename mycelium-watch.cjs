#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 *   Mycelium Watch — Post-commit Risk Watcher
 *   Delegates to the core mycelium.cjs orchestrator.
 *
 *   Commands:
 *     --postfix       Run post-fix analysis on latest commit
 *     --guard [files] Pre-commit guard (constraint + breakage checks)
 *     --danger        Danger-zone report (high-churn hot spots)
 *     --whyfile <f>   Explain why a file matters to the project
 *     --areamap       Show project area classification map
 *
 *   Usage:
 *     node mycelium-watch.cjs --postfix
 *     node mycelium-watch.cjs --guard src/routes/wallet-economy.ts
 *     node mycelium-watch.cjs --danger
 * ══════════════════════════════════════════════════════════════════
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const CORE = path.join(__dirname, 'mycelium.cjs');

const argMap = {
  '--postfix':  ['--postfix'],
  '--guard':    ['--guard'],
  '--danger':   ['--check', 'danger-zone'],
  '--whyfile':  ['--whyfile'],
  '--areamap':  ['--areamap'],
};

const arg = process.argv[2];
if (!arg || !argMap[arg]) {
  console.log('Mycelium Watch — Post-commit Risk Watcher');
  console.log('Usage: node mycelium-watch.cjs <command> [args]');
  console.log('Commands: --postfix, --guard [files], --danger, --whyfile <file>, --areamap');
  process.exit(0);
}

const coreArgs = [...argMap[arg], ...process.argv.slice(3)];
try {
  execSync(`node "${CORE}" ${coreArgs.join(' ')}`, { stdio: 'inherit', cwd: __dirname });
} catch (e) {
  process.exit(e.status || 1);
}
