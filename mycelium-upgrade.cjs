#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 *   Mycelium Upgrade — Test Generator & Autopsy Engine
 *   Delegates to the core mycelium.cjs orchestrator.
 *
 *   Generates regression tests from breakage history, runs
 *   test-gap analysis, and performs post-mortem autopsies.
 *
 *   Commands:
 *     --gen-tests     Generate regression tests from breakage DB
 *     --testgap       Identify untested areas (test-gap analysis)
 *     --autopsy       Post-mortem autopsy of recent failures
 *     --premortem <a> Pre-mortem risk analysis for an area
 *
 *   Usage:
 *     node mycelium-upgrade.cjs --gen-tests
 *     node mycelium-upgrade.cjs --testgap
 *     node mycelium-upgrade.cjs --autopsy
 *     node mycelium-upgrade.cjs --premortem wallet
 * ══════════════════════════════════════════════════════════════════
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const CORE = path.join(__dirname, 'mycelium.cjs');

const argMap = {
  '--gen-tests':  ['--gen-tests'],
  '--testgap':    ['--check', 'test-gap'],
  '--autopsy':    ['--check', 'autopsy'],
  '--premortem':  ['--premortem'],
};

const arg = process.argv[2];
if (!arg || !argMap[arg]) {
  console.log('Mycelium Upgrade — Test Generator & Autopsy Engine');
  console.log('Usage: node mycelium-upgrade.cjs <command> [args]');
  console.log('Commands: --gen-tests, --testgap, --autopsy, --premortem <area>');
  process.exit(0);
}

const coreArgs = [...argMap[arg], ...process.argv.slice(3)];
try {
  execSync(`node "${CORE}" ${coreArgs.join(' ')}`, { stdio: 'inherit', cwd: __dirname });
} catch (e) {
  process.exit(e.status || 1);
}
