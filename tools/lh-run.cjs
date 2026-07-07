#!/usr/bin/env node
/**
 * lh-run.cjs: run Lighthouse CI (lhci autorun) with the repo config.
 *
 * Why a wrapper: lighthouse needs a Chrome binary. GitHub Actions runners
 * ship one; local sandboxes usually only have the Playwright-managed
 * Chromium. If CHROME_PATH is not set, this finds the newest Playwright
 * chromium and exports it, then execs lhci. Zero npm dependencies.
 *
 * Usage: npm run lh          (server must be running on :3000)
 *        node tools/lh-run.cjs -- collect --url=http://localhost:3000/x
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function findPlaywrightChrome() {
  const roots = [
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    '/root/.cache/ms-playwright',
  ];
  const candidates = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root)) {
      if (!/^chromium-\d+$/.test(dir)) continue;
      const bin = path.join(root, dir, 'chrome-linux64', 'chrome');
      const binOld = path.join(root, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(bin)) candidates.push({ v: parseInt(dir.split('-')[1], 10), bin });
      else if (fs.existsSync(binOld)) candidates.push({ v: parseInt(dir.split('-')[1], 10), bin: binOld });
    }
  }
  candidates.sort((a, b) => b.v - a.v);
  return candidates.length ? candidates[0].bin : null;
}

if (!process.env.CHROME_PATH) {
  const chrome = findPlaywrightChrome();
  if (chrome) {
    process.env.CHROME_PATH = chrome;
    console.log(`[lh-run] CHROME_PATH=${chrome}`);
  } else {
    console.log('[lh-run] no CHROME_PATH and no Playwright chromium found; lighthouse will try system Chrome');
  }
}

const extra = process.argv.slice(2);
const lhciArgs = extra.length ? extra : ['autorun', '--config=lighthouserc.json'];
const r = spawnSync('npx', ['--yes', '@lhci/cli@0.15.x', ...lhciArgs], {
  stdio: 'inherit',
  env: process.env,
  cwd: path.resolve(__dirname, '..'),
});
process.exit(r.status == null ? 1 : r.status);
