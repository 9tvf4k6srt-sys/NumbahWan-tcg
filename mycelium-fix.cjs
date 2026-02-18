#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 *   Mycelium Fix — Self-Healing Auto-Fixer
 *   Delegates to the core mycelium.cjs orchestrator.
 *
 *   Runs the fix → verify → confirm loop. Applies known fixes
 *   from breakage history, then re-evaluates to confirm healing.
 *
 *   Commands:
 *     --heal          Full heal cycle (fix + verify + eval)
 *     --check <area>  Check a specific area for known issues
 *     --broke <a> <d> Record a new breakage pattern
 *
 *   Usage:
 *     node mycelium-fix.cjs --heal
 *     node mycelium-fix.cjs --check wallet
 *     node mycelium-fix.cjs --broke cards "rarity sort broken after rebalance"
 * ══════════════════════════════════════════════════════════════════
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const CORE = path.join(__dirname, 'mycelium.cjs');

const argMap = {
  '--heal':   ['--heal'],
  '--check':  ['--check'],
  '--broke':  ['--broke'],
};

const arg = process.argv[2] || '--heal';
if (!argMap[arg]) {
  console.log('Mycelium Fix — Self-Healing Auto-Fixer');
  console.log('Usage: node mycelium-fix.cjs [command] [args]');
  console.log('Commands: --heal (default), --check <area>, --broke <area> <desc>');
  process.exit(0);
}

const coreArgs = [...argMap[arg], ...process.argv.slice(3)];
try {
  execSync(`node "${CORE}" ${coreArgs.join(' ')}`, { stdio: 'inherit', cwd: __dirname });
} catch (e) {
  process.exit(e.status || 1);
}
