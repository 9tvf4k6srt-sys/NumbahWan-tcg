#!/usr/bin/env node
/**
 * mycelium-watch — your git learns from its own mistakes
 *
 * Install:  node mycelium-watch.cjs --install
 * That's it. You never touch it again.
 *
 * What it does:
 *   post-commit: silently learns from every commit (breakages, couplings, patterns)
 *   pre-commit:  warns if you're about to repeat a known mistake (never blocks)
 *
 * What it needs: Node.js + git. Zero dependencies. Zero config.
 *
 * Philosophy:
 *   1. You install it once. You never think about it again.
 *   2. It learns by watching git. You teach it nothing.
 *   3. It warns before you repeat a mistake. You can ignore it.
 *   4. Zero dependencies. Zero config. One file.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Constants ──────────────────────────────────────────────────────

const MYCELIUM-WATCH_DIR = path.join(findGitRoot(), '.mycelium-watch');
const MEMORY_FILE = path.join(MYCELIUM-WATCH_DIR, '.mycelium/memory.json');
const MAX_MEMORY_KB = 200;
const MAX_ENTRIES = 300;

// Noise — files that change often but teach nothing
const NOISE = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'node_modules/', 'dist/', 'build/', 'out/', '.next/',
  'coverage/', '__pycache__/', '.pytest_cache/', '.nyc_output/',
  '.mycelium-watch/', '.DS_Store', 'Thumbs.db',
  '.ai-files-auto', 'sentinel-report', 'sentinel-history'
];

// ─── Helpers ────────────────────────────────────────────────────────

function findGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    return process.cwd();
  }
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd: findGitRoot(),
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch { return ''; }
}

function isNoise(fp) {
  const lower = fp.toLowerCase();
  return NOISE.some(n => lower.includes(n));
}

function ensureDir() {
  if (!fs.existsSync(MYCELIUM-WATCH_DIR)) fs.mkdirSync(MYCELIUM-WATCH_DIR, { recursive: true });
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch {
    return {
      version: 1,
      commits: [],        // { hash, msg, date, files, isFix }
      breakages: [],       // { pattern, files, date, fixHash, origHash, lesson }
      couplings: {},       // "fileA<->fileB": count
      hotspots: {},        // "file": count
      risks: {},           // "file": { breakCount, lastBreak, lessons[] }
      patterns: [],        // { type, description, evidence, date }
      stats: { totalCommits: 0, totalFixes: 0, lastScan: null }
    };
  }
}

function save(mem) {
  ensureDir();
  // Trim to keep size reasonable
  if (mem.commits.length > MAX_ENTRIES) mem.commits = mem.commits.slice(-MAX_ENTRIES);
  if (mem.breakages.length > 100) mem.breakages = mem.breakages.slice(-100);
  if (mem.patterns.length > 50) mem.patterns = mem.patterns.slice(-50);

  // Trim couplings to top 200
  const couplingEntries = Object.entries(mem.couplings).sort((a, b) => b[1] - a[1]);
  if (couplingEntries.length > 200) {
    mem.couplings = Object.fromEntries(couplingEntries.slice(0, 200));
  }

  // Trim hotspots to top 100
  const hotspotEntries = Object.entries(mem.hotspots).sort((a, b) => b[1] - a[1]);
  if (hotspotEntries.length > 100) {
    mem.hotspots = Object.fromEntries(hotspotEntries.slice(0, 100));
  }

  const json = JSON.stringify(mem, null, 2);

  // Auto-compact if too large
  if (Buffer.byteLength(json) > MAX_MEMORY_KB * 1024) {
    mem.commits = mem.commits.slice(-Math.floor(MAX_ENTRIES / 2));
    mem.breakages = mem.breakages.slice(-50);
    mem.patterns = mem.patterns.slice(-25);
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
  } else {
    fs.writeFileSync(MEMORY_FILE, json);
  }
}

// ─── Core Intelligence ──────────────────────────────────────────────

/**
 * Detect if a commit message indicates a REAL fix (not a typo/doc/version fix).
 * Returns { isFix: true, area, hint } or { isFix: false }
 */
function detectFix(msg) {
  const lower = msg.toLowerCase();

  // Filter out non-real fixes (these aren't breakages worth learning from)
  const falsePositives = [
    /\btypo\b/, /\bspelling\b/, /\bwhitespace\b/, /\bformat\b/,
    /\breadme\b/, /\bdocs?\b/, /\bcomment\b/, /\bversion bump\b/,
    /\bchangelog\b/, /\blint\b/, /\bprettier\b/, /\beslint\b/,
    /\brename\b/, /\bcleanup\b/, /\bclean up\b/, /\bnit\b/,
    /\bchore\b/, /\bmerge\b/
  ];
  if (falsePositives.some(p => p.test(lower))) {
    return { isFix: false };
  }

  // Conventional commit: fix(...): ...
  const conventional = lower.match(/^fix\(?([^)]*)\)?[:\s]/);
  if (conventional) {
    return { isFix: true, area: conventional[1] || '', hint: msg };
  }

  // Common fix patterns (but only if the message suggests a real code fix)
  const fixPatterns = [
    /\bfix(?:e[ds])?\b/i,
    /\bhotfix\b/i,
    /\bbugfix\b/i,
    /\brevert\b/i,
  ];

  if (fixPatterns.some(p => p.test(lower))) {
    return { isFix: true, area: '', hint: msg };
  }

  return { isFix: false };
}

/**
 * Read the full commit body (not just the subject line).
 * This is where root cause analysis lives.
 */
function getCommitBody(hash) {
  return git(`log -1 "--pretty=format:%b" ${hash}`);
}

/**
 * Analyze the actual diff of a fix commit to extract specific changes.
 * Returns { removedLines[], addedLines[], cssChanges[], jsChanges[] }
 */
function analyzeDiff(hash) {
  const result = { removed: [], added: [], cssProps: [], jsPatterns: [] };
  try {
    const diff = git(`show ${hash} --no-commit-id --diff-filter=M -p --unified=1`);
    if (!diff) return result;

    // Only look at actual code changes (not headers)
    const lines = diff.split('\n');
    for (const line of lines) {
      if (line.startsWith('-') && !line.startsWith('---')) {
        const trimmed = line.slice(1).trim();
        if (trimmed.length > 3 && trimmed.length < 200) result.removed.push(trimmed);
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const trimmed = line.slice(1).trim();
        if (trimmed.length > 3 && trimmed.length < 200) result.added.push(trimmed);
      }
    }

    // Extract CSS property changes
    for (const line of result.removed) {
      const cssProp = line.match(/^\s*([a-z-]+)\s*:\s*(.+?)\s*;?\s*$/);
      if (cssProp) result.cssProps.push({ prop: cssProp[1], oldVal: cssProp[2], action: 'removed' });
    }
    for (const line of result.added) {
      const cssProp = line.match(/^\s*([a-z-]+)\s*:\s*(.+?)\s*;?\s*$/);
      if (cssProp) result.cssProps.push({ prop: cssProp[1], newVal: cssProp[2], action: 'added' });
    }

    // Extract JS patterns (function calls, assignments, etc.)
    for (const line of [...result.removed, ...result.added]) {
      if (line.match(/\.innerHTML\s*[+=]/)) result.jsPatterns.push('innerHTML assignment');
      if (line.match(/Audio\.(init|play|context)/i)) result.jsPatterns.push('Audio API usage');
      if (line.match(/addEventListener|removeEventListener/)) result.jsPatterns.push('event listener');
      if (line.match(/touchend|touchstart|touchmove/)) result.jsPatterns.push('touch event');
      if (line.match(/display\s*:\s*none/)) result.jsPatterns.push('display:none toggle');
      if (line.match(/overflow\s*:\s*hidden/)) result.jsPatterns.push('overflow:hidden');
      if (line.match(/position\s*:\s*fixed/)) result.jsPatterns.push('position:fixed');
      if (line.match(/await\s+/)) result.jsPatterns.push('async/await');
    }
    // Deduplicate
    result.jsPatterns = [...new Set(result.jsPatterns)];

  } catch { /* diff analysis is best-effort */ }
  return result;
}

/**
 * Extract a specific, actionable lesson from a fix commit.
 * Priority: 1) commit body (root cause), 2) diff analysis, 3) message parsing
 */
function extractLesson(fixHash, fixMsg, fixFiles, prevCommits) {
  // === Priority 1: Commit body contains root cause ===
  const body = getCommitBody(fixHash);
  if (body && body.length > 20) {
    // Look for explicit root cause / why / because statements
    const bodyLines = body.split('\n').filter(l => l.trim());
    for (const line of bodyLines) {
      const lower = line.toLowerCase();
      if (lower.includes('root cause') || lower.includes('because') ||
          lower.includes('the problem was') || lower.includes('the issue was') ||
          lower.includes('the bug was') || lower.includes('caused by') ||
          lower.includes('broke when') || lower.includes('failed because')) {
        // Found the root cause line — clean it up
        const cleaned = line.replace(/^[\s*-]+/, '').replace(/^root cause:\s*/i, '').trim();
        if (cleaned.length > 15) return cleaned.slice(0, 150);
      }
    }
    // No explicit root cause, but body has useful context — use first substantive line
    const substantive = bodyLines.find(l =>
      l.trim().length > 20 &&
      !l.startsWith('#') &&
      !l.match(/^(signed-off|co-authored|change-id|reviewed)/i)
    );
    if (substantive) {
      return substantive.trim().slice(0, 150);
    }
  }

  // === Priority 2: Diff analysis — what actually changed in the code ===
  const diff = analyzeDiff(fixHash);

  // CSS property changes tell a specific story
  if (diff.cssProps.length > 0) {
    const removed = diff.cssProps.filter(c => c.action === 'removed');
    const added = diff.cssProps.filter(c => c.action === 'added');
    if (removed.length > 0 && added.length > 0) {
      return `changed ${removed[0].prop}: ${removed[0].oldVal} → ${added[0].newVal || 'removed'}`.slice(0, 150);
    }
    if (removed.length > 0) {
      return `removed ${removed[0].prop}: ${removed[0].oldVal} — was causing the issue`.slice(0, 150);
    }
  }

  // JS patterns tell a different story
  if (diff.jsPatterns.length > 0) {
    const pattern = diff.jsPatterns[0];
    const msgClean = fixMsg.replace(/^fix\([^)]*\):\s*/i, '').replace(/^fix:\s*/i, '').slice(0, 80);
    return `${pattern} — ${msgClean}`.slice(0, 150);
  }

  // === Priority 3: Parse the commit message for specifics ===
  const msgClean = fixMsg
    .replace(/^fix\([^)]*\):\s*/i, '')
    .replace(/^fix:\s*/i, '')
    .replace(/^fix\s+/i, '')
    .trim();

  if (msgClean.length > 15) {
    return msgClean.slice(0, 150);
  }

  return fixMsg.slice(0, 100);
}

/**
 * Calculate a danger score for a file based on compound risk factors.
 * Higher = more dangerous to edit.
 */
function dangerScore(file, mem) {
  const risk = mem.risks[file];
  const hotspot = mem.hotspots[file] || 0;

  if (!risk) return 0;

  // Compound factors:
  // - breakCount: how many times this file was in a fix commit
  // - couplingCount: how many files this is coupled with (more = more fragile)
  // - churn: how often it changes (more churn = more risk)
  // - recency: recent breaks are scarier (decay over 30 days)
  const breakWeight = risk.breakCount * 3;

  let couplingCount = 0;
  for (const [pair, count] of Object.entries(mem.couplings)) {
    if (count >= 3 && pair.includes(file)) couplingCount++;
  }
  const couplingWeight = Math.min(couplingCount, 5) * 1.5;

  const churnWeight = Math.min(hotspot / 10, 3);

  let recencyWeight = 0;
  if (risk.lastBreak) {
    const daysSince = Math.max(1, (Date.now() - new Date(risk.lastBreak).getTime()) / 86400000);
    recencyWeight = Math.max(0, 3 - daysSince / 10); // decays over 30 days
  }

  return Math.round((breakWeight + couplingWeight + churnWeight + recencyWeight) * 10) / 10;
}

/**
 * Auto-detect constraint patterns from accumulated commit data.
 * Looks for recurring themes across breakages.
 */
function detectPatterns(mem) {
  const newPatterns = [];

  // 1. Fix-chain detection: files that needed follow-up fixes
  const fixChainFiles = {};
  for (let i = 1; i < mem.commits.length; i++) {
    const curr = mem.commits[i];
    const prev = mem.commits[i - 1];
    if (curr.isFix && prev.isFix) {
      const overlap = curr.files.filter(f => prev.files.includes(f));
      for (const f of overlap) {
        fixChainFiles[f] = (fixChainFiles[f] || 0) + 1;
      }
    }
  }
  const fragileFiles = Object.entries(fixChainFiles).filter(([, c]) => c >= 2);
  for (const [file, count] of fragileFiles) {
    if (!mem.patterns.some(p => p.type === 'fix-chain' && p.description.includes(file))) {
      newPatterns.push({
        type: 'fix-chain',
        description: `${file} has needed ${count + 1}+ consecutive fixes — it's structurally fragile`,
        evidence: `${count} fix-chain occurrences`,
        date: new Date().toISOString().slice(0, 10)
      });
    }
  }

  // 2. Area-level risk: areas with disproportionate fix rates
  const areaCommits = {};
  const areaFixes = {};
  for (const c of mem.commits) {
    for (const f of c.files) {
      const dir = path.dirname(f) || 'root';
      areaCommits[dir] = (areaCommits[dir] || 0) + 1;
      if (c.isFix) areaFixes[dir] = (areaFixes[dir] || 0) + 1;
    }
  }
  for (const [dir, total] of Object.entries(areaCommits)) {
    const fixes = areaFixes[dir] || 0;
    if (total >= 5 && fixes / total > 0.4) {
      if (!mem.patterns.some(p => p.type === 'risky-area' && p.description.includes(dir))) {
        newPatterns.push({
          type: 'risky-area',
          description: `${dir} has a ${Math.round(fixes / total * 100)}% fix rate (${fixes}/${total} commits are fixes)`,
          evidence: `${total} commits, ${fixes} fixes`,
          date: new Date().toISOString().slice(0, 10)
        });
      }
    }
  }

  // 3. Recurring breakage themes
  const themeCount = {};
  const themes = ['mobile', 'ios', 'safari', 'overflow', 'css', 'event', 'handler', 'innerhtml',
    'load order', 'init', 'undefined', 'i18n', 'translation', 'audio', 'touch', 'async'];
  for (const b of mem.breakages) {
    const lower = (b.pattern + ' ' + (b.lesson || '')).toLowerCase();
    for (const theme of themes) {
      if (lower.includes(theme)) {
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      }
    }
  }
  for (const [theme, count] of Object.entries(themeCount)) {
    if (count >= 2) {
      if (!mem.patterns.some(p => p.type === 'recurring-theme' && p.description.includes(theme))) {
        newPatterns.push({
          type: 'recurring-theme',
          description: `"${theme}" appears in ${count} separate breakages — systemic weakness`,
          evidence: `${count} breakages reference ${theme}`,
          date: new Date().toISOString().slice(0, 10)
        });
      }
    }
  }

  return newPatterns;
}

// ─── Sync: Catch up on all commits not yet in memory ────────────────
// Runs after git pull / git merge / PR merge-back.
// Scans recent git log, learns from any commits not already recorded.

function sync() {
  const mem = load();
  const knownHashes = new Set(mem.commits.map(c => c.hash));

  // Get last 50 commits (covers most PR merges)
  const logRaw = git('log "--pretty=format:%h|%s|%ai" --name-only -50');
  if (!logRaw) return;

  const lines = logRaw.split('\n');
  const newCommits = [];
  let current = null;

  for (const line of lines) {
    const commitMatch = line.match(/^([a-f0-9]+)\|(.+)\|(\d{4}-\d{2}-\d{2})/);
    if (commitMatch) {
      if (current && current.files.length > 0 && !knownHashes.has(current.hash)) {
        newCommits.push(current);
      }
      const [, hash, msg, date] = commitMatch;
      const { isFix } = detectFix(msg);
      current = { hash, msg: msg.slice(0, 120), date, files: [], isFix };
    } else if (current && line.trim() && !line.startsWith('|')) {
      const file = line.trim();
      if (!isNoise(file)) current.files.push(file);
    }
  }
  if (current && current.files.length > 0 && !knownHashes.has(current.hash)) {
    newCommits.push(current);
  }

  if (newCommits.length === 0) return;

  // Process newest-first → oldest-first for chronological order
  newCommits.reverse();

  let fixCount = 0;
  for (const c of newCommits) {
    mem.commits.push(c);
    mem.stats.totalCommits++;

    // Hotspots
    for (const f of c.files) {
      mem.hotspots[f] = (mem.hotspots[f] || 0) + 1;
    }

    // Couplings
    if (c.files.length >= 2 && c.files.length <= 15) {
      for (let i = 0; i < c.files.length; i++) {
        for (let j = i + 1; j < c.files.length; j++) {
          const pair = [c.files[i], c.files[j]].sort().join('<->');
          mem.couplings[pair] = (mem.couplings[pair] || 0) + 1;
        }
      }
    }

    // Fix processing
    if (c.isFix) {
      mem.stats.totalFixes++;
      fixCount++;
      const lesson = extractLesson(c.hash, c.msg, c.files, mem.commits.slice(-10));
      const breakage = { pattern: c.msg.slice(0, 100), files: c.files, date: c.date, fixHash: c.hash, lesson };
      mem.breakages.push(breakage);

      for (const f of c.files) {
        if (!mem.risks[f]) mem.risks[f] = { breakCount: 0, lastBreak: '', lessons: [] };
        mem.risks[f].breakCount++;
        mem.risks[f].lastBreak = c.date;
        if (lesson && !mem.risks[f].lessons.includes(lesson) && mem.risks[f].lessons.length < 10) {
          mem.risks[f].lessons.push(lesson);
        }
      }
    }
  }

  // Detect patterns
  const newPatterns = detectPatterns(mem);
  if (newPatterns.length > 0) mem.patterns.push(...newPatterns);

  mem.stats.lastScan = new Date().toISOString();
  save(mem);

  console.log(`  mycelium-watch sync: ${newCommits.length} new commits (${fixCount} fixes) learned`);

  // Delegate to nw-fixer for cross-system fix → verify → confirm
  callFixer();
}

// ─── Post-Commit: Learn ─────────────────────────────────────────────
// Called silently after every commit. Extracts knowledge from git history.

function learn() {
  const mem = load();

  // Get latest commit info
  const hash = git('rev-parse --short HEAD');
  const msg = git('log -1 "--pretty=format:%s"');
  const date = git('log -1 "--pretty=format:%ai"').slice(0, 10);
  const filesRaw = git('diff-tree --no-commit-id --name-only -r HEAD');
  const files = filesRaw ? filesRaw.split('\n').filter(f => f && !isNoise(f)) : [];

  if (!hash || files.length === 0) return;

  // Skip if we already recorded this commit
  if (mem.commits.some(c => c.hash === hash)) return;

  // Detect if this is a fix
  const { isFix, area, hint } = detectFix(msg);

  // Record commit
  const commit = { hash, msg: msg.slice(0, 120), date, files, isFix };
  mem.commits.push(commit);
  mem.stats.totalCommits++;

  // Update hotspots
  for (const f of files) {
    mem.hotspots[f] = (mem.hotspots[f] || 0) + 1;
  }

  // Update file couplings (files that change together)
  if (files.length >= 2 && files.length <= 15) {
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const pair = [files[i], files[j]].sort().join('<->');
        mem.couplings[pair] = (mem.couplings[pair] || 0) + 1;
      }
    }
  }

  // If this is a fix, extract what broke
  if (isFix) {
    mem.stats.totalFixes++;

    const lesson = extractLesson(hash, msg, files, mem.commits.slice(-10));

    // Record breakage
    const breakage = {
      pattern: hint || msg.slice(0, 100),
      files,
      date,
      fixHash: hash,
      lesson
    };

    // Try to find the original commit this fixes
    const recentNonFix = [...mem.commits].reverse().find(c => !c.isFix && c.files.some(f => files.includes(f)));
    if (recentNonFix) {
      breakage.origHash = recentNonFix.hash;
    }

    mem.breakages.push(breakage);

    // Update per-file risk scores
    for (const f of files) {
      if (!mem.risks[f]) mem.risks[f] = { breakCount: 0, lastBreak: '', lessons: [] };
      mem.risks[f].breakCount++;
      mem.risks[f].lastBreak = date;
      if (lesson) {
        if (!mem.risks[f].lessons.includes(lesson) && mem.risks[f].lessons.length < 10) {
          mem.risks[f].lessons.push(lesson);
        }
      }
    }
  }

  // Detect new patterns from accumulated data
  const newPatterns = detectPatterns(mem);
  if (newPatterns.length > 0) {
    mem.patterns.push(...newPatterns);
  }

  mem.stats.lastScan = new Date().toISOString();
  save(mem);

  // Delegate to nw-fixer for cross-system fix → verify → confirm
  callFixer();
}

// ─── Pre-Commit: Warn ───────────────────────────────────────────────
// Called silently before every commit. Shows warnings only when data supports them.
// NEVER blocks. NEVER requires input.

function warn() {
  const mem = load();
  if (mem.commits.length < 3) return; // Not enough data to warn about anything

  // Get staged files
  const stagedRaw = git('diff --cached --name-only');
  if (!stagedRaw) return;
  const staged = stagedRaw.split('\n').filter(f => f && !isNoise(f));
  if (staged.length === 0) return;

  const warnings = [];

  // 1. Files that have broken before — show the best lesson
  for (const f of staged) {
    const risk = mem.risks[f];
    if (risk && risk.breakCount >= 1) {
      const score = dangerScore(f, mem);
      const bestLesson = risk.lessons.length > 0
        ? risk.lessons.reduce((a, b) => a.length > b.length ? a : b)
        : '';
      const lessonStr = bestLesson ? `\n       \x1b[2m↳ ${bestLesson.slice(0, 80)}\x1b[0m` : '';
      // Escalated files get a louder warning
      const escalatedTag = risk.escalated ? ' \x1b[31m[REPEAT OFFENDER]\x1b[0m' : '';
      const volatileTag = risk.volatile ? ' \x1b[33m[VOLATILE]\x1b[0m' : '';
      warnings.push({
        severity: risk.escalated ? 'high' : (score >= 15 ? 'high' : score >= 8 ? 'medium' : 'low'),
        score,
        msg: `${f} — broke ${risk.breakCount}x, danger ${score}${escalatedTag}${volatileTag}${lessonStr}`
      });
    }
  }

  // 2. Coupled files that are missing (uses dynamic threshold from self-heal)
  const couplingThreshold = mem.stats.couplingThreshold || 5;
  for (const f of staged) {
    for (const [pair, count] of Object.entries(mem.couplings)) {
      if (count >= couplingThreshold && pair.includes(f)) {
        const other = pair.split('<->').find(s => s !== f);
        if (other && !staged.includes(other) && !isNoise(other)) {
          // Check the file actually exists
          const otherPath = path.join(findGitRoot(), other);
          if (fs.existsSync(otherPath)) {
            warnings.push({
              severity: count >= 15 ? 'high' : 'medium',
              msg: `${f} usually changes with ${other} (${count}x together) — are you missing it?`
            });
          }
        }
      }
    }
  }

  // 3. Hotspot warning (extremely high-churn files)
  for (const f of staged) {
    const changes = mem.hotspots[f] || 0;
    if (changes >= 20) {
      warnings.push({
        severity: 'low',
        msg: `${f} is a hotspot (${changes}x changes) — extra care recommended`
      });
    }
  }

  // 4. Fix-chain warning: if the last commit was a fix on the same files
  const lastCommit = mem.commits[mem.commits.length - 1];
  if (lastCommit && lastCommit.isFix) {
    const overlap = staged.filter(f => lastCommit.files.includes(f));
    if (overlap.length > 0) {
      warnings.push({
        severity: 'high',
        msg: `You're editing files that were just fixed (${lastCommit.hash}) — potential fix chain`
      });
    }
  }

  // 5. Constraint warnings: show Mycelium constraints synced to this file
  for (const f of staged) {
    const risk = mem.risks[f];
    if (risk && risk.constraints && risk.constraints.length > 0) {
      for (const c of risk.constraints.slice(0, 2)) {  // max 2 per file
        warnings.push({
          severity: 'medium',
          msg: `${f} has constraint: ${c.slice(0, 100)}`
        });
      }
    }
  }

  // 6. Deep analysis warnings: surface root-cause themes for repeat offenders
  for (const f of staged) {
    const risk = mem.risks[f];
    if (risk && risk.deepAnalysis && risk.deepAnalysis.length > 0) {
      const latest = risk.deepAnalysis[risk.deepAnalysis.length - 1];
      warnings.push({
        severity: 'high',
        msg: `${f} root-cause themes: [${latest.themes.join(', ')}] (${risk.breakCount}x broken)`
      });
    }
  }

  // Print warnings (compact, non-intrusive)
  if (warnings.length === 0) return;

  // Sort by severity
  const order = { high: 0, medium: 1, low: 2 };
  warnings.sort((a, b) => order[a.severity] - order[b.severity]);

  // Deduplicate
  const seen = new Set();
  const unique = warnings.filter(w => {
    if (seen.has(w.msg)) return false;
    seen.add(w.msg);
    return true;
  });

  // Cap at 8 warnings to avoid noise
  const show = unique.slice(0, 8);

  const icons = { high: '\x1b[31m!\x1b[0m', medium: '\x1b[33m~\x1b[0m', low: '\x1b[2m.\x1b[0m' };

  console.error('');
  console.error('  \x1b[2mmycelium-watch:\x1b[0m');
  for (const w of show) {
    console.error(`  ${icons[w.severity]} ${w.msg}`);
  }
  if (unique.length > 8) {
    console.error(`  \x1b[2m  ...and ${unique.length - 8} more\x1b[0m`);
  }
  console.error('');
}

// ─── Cold Start: Backfill from git history ──────────────────────────
// On first run, scans existing git history to build initial knowledge base.
// This means mycelium-watch is useful from the very first commit after install.

function backfill() {
  const mem = load();
  if (mem.commits.length > 0) return mem; // Already have data

  console.log('  mycelium-watch: scanning git history...');

  // Get last 200 commits (enough to find patterns, fast enough for any repo)
  const logRaw = git('log "--pretty=format:%h|%s|%ai" --name-only -200');
  if (!logRaw) return mem;

  const lines = logRaw.split('\n');
  let current = null;

  for (const line of lines) {
    const commitMatch = line.match(/^([a-f0-9]+)\|(.+)\|(\d{4}-\d{2}-\d{2})/);
    if (commitMatch) {
      // Save previous commit
      if (current && current.files.length > 0) {
        mem.commits.push(current);
      }
      const [, hash, msg, date] = commitMatch;
      const { isFix } = detectFix(msg);
      current = { hash, msg: msg.slice(0, 120), date, files: [], isFix };
      mem.stats.totalCommits++;
      if (isFix) mem.stats.totalFixes++;
    } else if (current && line.trim() && !line.startsWith('|')) {
      const file = line.trim();
      if (!isNoise(file)) {
        current.files.push(file);
      }
    }
  }
  // Don't forget the last one
  if (current && current.files.length > 0) {
    mem.commits.push(current);
  }

  // Sort chronologically (git log gives newest first)
  mem.commits.reverse();

  // Now process all commits to build knowledge
  for (let i = 0; i < mem.commits.length; i++) {
    const c = mem.commits[i];

    // Hotspots
    for (const f of c.files) {
      mem.hotspots[f] = (mem.hotspots[f] || 0) + 1;
    }

    // Couplings
    if (c.files.length >= 2 && c.files.length <= 15) {
      for (let a = 0; a < c.files.length; a++) {
        for (let b = a + 1; b < c.files.length; b++) {
          const pair = [c.files[a], c.files[b]].sort().join('<->');
          mem.couplings[pair] = (mem.couplings[pair] || 0) + 1;
        }
      }
    }

    // Breakages from fix commits
    if (c.isFix) {
      const lesson = extractLesson(c.hash, c.msg, c.files, mem.commits.slice(Math.max(0, i - 5), i));

      const breakage = {
        pattern: c.msg.slice(0, 100),
        files: c.files,
        date: c.date,
        fixHash: c.hash,
        lesson
      };

      // Find original commit
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prev = mem.commits[j];
        if (!prev.isFix && prev.files.some(f => c.files.includes(f))) {
          breakage.origHash = prev.hash;
          break;
        }
      }

      mem.breakages.push(breakage);

      // Per-file risk
      for (const f of c.files) {
        if (!mem.risks[f]) mem.risks[f] = { breakCount: 0, lastBreak: '', lessons: [] };
        mem.risks[f].breakCount++;
        mem.risks[f].lastBreak = c.date;
        if (lesson) {
          if (!mem.risks[f].lessons.includes(lesson) && mem.risks[f].lessons.length < 10) {
            mem.risks[f].lessons.push(lesson);
          }
        }
      }
    }
  }

  // Detect patterns
  const newPatterns = detectPatterns(mem);
  mem.patterns.push(...newPatterns);

  mem.stats.lastScan = new Date().toISOString();
  save(mem);

  console.log(`  mycelium-watch: learned from ${mem.commits.length} commits — ${mem.breakages.length} breakages, ${Object.keys(mem.couplings).length} file couplings, ${mem.patterns.length} patterns`);

  // Self-heal after backfill (first-time setup gets the benefit immediately)
  selfHeal(mem);

  return mem;
}

// ─── Install ────────────────────────────────────────────────────────
// One command. Sets up hooks. Backfills history. Done forever.

function install() {
  const root = findGitRoot();
  console.log('');
  console.log('  \x1b[1mmycelium-watch\x1b[0m — your git learns from its own mistakes');
  console.log('');

  // 1. Create .mycelium-watch directory
  ensureDir();
  console.log('  \x1b[32m+\x1b[0m created .mycelium-watch/');

  // 2. Add .mycelium-watch to .gitignore
  const gitignorePath = path.join(root, '.gitignore');
  let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  if (!gitignore.includes('.mycelium-watch')) {
    gitignore = gitignore.trimEnd() + '\n.mycelium-watch/\n';
    fs.writeFileSync(gitignorePath, gitignore);
    console.log('  \x1b[32m+\x1b[0m added .mycelium-watch/ to .gitignore');
  } else {
    console.log('  \x1b[2m.\x1b[0m .gitignore already configured');
  }

  // 3. Set up git hooks
  const huskyDir = path.join(root, '.husky');
  const hooksDir = fs.existsSync(huskyDir) ? huskyDir : path.join(root, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  // Determine the script path relative to git root
  const scriptRelative = path.relative(root, __filename).replace(/\\/g, '/');

  // Pre-commit hook: append mycelium-watch warn to existing hook or create new
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const mycelium-watchPreCommit = `node "${scriptRelative}" --warn 2>/dev/null || true`;

  if (fs.existsSync(preCommitPath)) {
    const existing = fs.readFileSync(preCommitPath, 'utf8');
    if (!existing.includes('mycelium-watch')) {
      // Append to existing hook (don't replace it)
      const appended = existing.trimEnd() + '\n\n# mycelium-watch: warn about known risks\n' + mycelium-watchPreCommit + '\n';
      fs.writeFileSync(preCommitPath, appended, { mode: 0o755 });
      console.log('  \x1b[32m+\x1b[0m appended mycelium-watch to existing pre-commit hook');
    } else {
      console.log('  \x1b[2m.\x1b[0m pre-commit hook already has mycelium-watch');
    }
  } else {
    fs.writeFileSync(preCommitPath, `#!/bin/sh\n# mycelium-watch: warn about known risks\n${mycelium-watchPreCommit}\n`, { mode: 0o755 });
    console.log('  \x1b[32m+\x1b[0m created pre-commit hook');
  }

  // Post-commit hook: append mycelium-watch learn to existing hook or create new
  const postCommitPath = path.join(hooksDir, 'post-commit');
  const mycelium-watchPostCommit = `node "${scriptRelative}" --learn 2>/dev/null || true`;

  if (fs.existsSync(postCommitPath)) {
    const existing = fs.readFileSync(postCommitPath, 'utf8');
    if (!existing.includes('mycelium-watch')) {
      const appended = existing.trimEnd() + '\n\n# mycelium-watch: learn from this commit\n' + mycelium-watchPostCommit + '\n';
      fs.writeFileSync(postCommitPath, appended, { mode: 0o755 });
      console.log('  \x1b[32m+\x1b[0m appended mycelium-watch to existing post-commit hook');
    } else {
      console.log('  \x1b[2m.\x1b[0m post-commit hook already has mycelium-watch');
    }
  } else {
    fs.writeFileSync(postCommitPath, `#!/bin/sh\n# mycelium-watch: learn from this commit\n${mycelium-watchPostCommit}\n`, { mode: 0o755 });
    console.log('  \x1b[32m+\x1b[0m created post-commit hook');
  }

  // Set hooks path if using .husky
  if (hooksDir === huskyDir) {
    try { execSync('git config core.hooksPath .husky', { cwd: root }); } catch {}
  }

  // 4. Backfill from existing history
  backfill();

  console.log('');
  console.log('  \x1b[1mDone.\x1b[0m mycelium-watch will now learn from every commit.');
  console.log('  You never need to run anything again.');
  console.log('');
}

// ─── Status: Quick look at what mycelium-watch knows ───────────────────────
// Optional — for curious developers who want to see what's been learned.

function status() {
  const mem = load();

  if (mem.commits.length === 0) {
    console.log('\n  mycelium-watch: no data yet. Run --install first or make some commits.\n');
    return;
  }

  console.log('');
  console.log('  \x1b[1mmycelium-watch\x1b[0m — what I\x27ve learned');
  console.log('');

  // Key numbers
  const fixRate = mem.stats.totalCommits > 0 ? Math.round(mem.stats.totalFixes / mem.stats.totalCommits * 100) : 0;
  console.log(`  Commits analyzed:  ${mem.commits.length}`);
  console.log(`  Fix rate:          ${fixRate}% (${mem.stats.totalFixes} fixes / ${mem.stats.totalCommits} commits)`);
  console.log(`  Breakages found:   ${mem.breakages.length}`);
  console.log(`  File couplings:    ${Object.keys(mem.couplings).length}`);
  console.log(`  Patterns learned:  ${mem.patterns.length}`);
  console.log('');

  // Riskiest files (by danger score, not just break count)
  const riskyFiles = Object.entries(mem.risks)
    .map(([file, risk]) => [file, risk, dangerScore(file, mem)])
    .filter(([, , score]) => score >= 5)
    .sort((a, b) => b[2] - a[2])
    .slice(0, 5);

  if (riskyFiles.length > 0) {
    console.log('  \x1b[1mRiskiest files:\x1b[0m');
    for (const [file, risk, score] of riskyFiles) {
      const bestLesson = risk.lessons.length > 0
        ? risk.lessons.reduce((a, b) => a.length > b.length ? a : b)
        : '';
      const lessonStr = bestLesson ? `\n      \x1b[2m↳ ${bestLesson.slice(0, 70)}\x1b[0m` : '';
      const bar = '\x1b[31m' + '█'.repeat(Math.min(Math.round(score / 3), 10)) + '\x1b[0m' + '░'.repeat(Math.max(0, 10 - Math.round(score / 3)));
      console.log(`    ${bar} ${file} — danger ${score}, broke ${risk.breakCount}x${lessonStr}`);
    }
    console.log('');
  }

  // Strongest couplings
  const strongCouplings = Object.entries(mem.couplings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (strongCouplings.length > 0) {
    console.log('  \x1b[1mStrongest file couplings:\x1b[0m');
    for (const [pair, count] of strongCouplings) {
      const [a, b] = pair.split('<->');
      console.log(`    ${count}x  ${a}  +  ${b}`);
    }
    console.log('');
  }

  // Hotspots
  const hotspots = Object.entries(mem.hotspots)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (hotspots.length > 0) {
    console.log('  \x1b[1mHottest files:\x1b[0m');
    for (const [file, count] of hotspots) {
      console.log(`    ${count}x  ${file}`);
    }
    console.log('');
  }

  // Patterns
  if (mem.patterns.length > 0) {
    console.log('  \x1b[1mPatterns detected:\x1b[0m');
    for (const p of mem.patterns.slice(-5)) {
      console.log(`    [${p.type}] ${p.description}`);
    }
    console.log('');
  }

  // Recent breakages (with actual lessons)
  const recentBreakages = mem.breakages.slice(-5);
  if (recentBreakages.length > 0) {
    console.log('  \x1b[1mRecent breakages:\x1b[0m');
    for (const b of recentBreakages) {
      console.log(`    ${b.date} ${b.fixHash || '???'} ${b.pattern.slice(0, 70)}`);
      if (b.lesson) {
        console.log(`      \x1b[2m↳ ${b.lesson.slice(0, 90)}\x1b[0m`);
      }
    }
    console.log('');
  }
}

// ─── Eval: Is the learning system getting better? ──────────────────
// The hardest question: does knowing about past mistakes actually prevent new ones?
// This measures 7 signals and grades the system A→F.

/**
 * Core eval logic — pure scoring, no output.
 * Returns { overallScore, grade, scores, insights, upgrades, metrics, repeatFiles, chains } or null
 */
function runEval(mem) {
  if (!mem || mem.commits.length < 20) return null;

  const scores = {};
  const insights = [];
  const upgrades = [];

  // ── 1. Fix Rate Trend ──
  const half = Math.floor(mem.commits.length / 2);
  const firstHalf = mem.commits.slice(0, half);
  const secondHalf = mem.commits.slice(half);
  const fixRate1 = firstHalf.filter(c => c.isFix).length / firstHalf.length;
  const fixRate2 = secondHalf.filter(c => c.isFix).length / secondHalf.length;
  const fixRateDelta = fixRate1 - fixRate2;

  if (fixRateDelta > 0.1) {
    scores.fixRateTrend = 100;
    insights.push(`Fix rate declining: ${pct(fixRate1)} → ${pct(fixRate2)} (${pct(fixRateDelta)} improvement)`);
  } else if (fixRateDelta > 0) {
    scores.fixRateTrend = 60;
    insights.push(`Fix rate slightly better: ${pct(fixRate1)} → ${pct(fixRate2)} (marginal)`);
  } else if (fixRateDelta > -0.05) {
    scores.fixRateTrend = 40;
    insights.push(`Fix rate flat: ${pct(fixRate1)} → ${pct(fixRate2)} (not learning)`);
    upgrades.push('Fix rate not declining — lessons exist but aren\'t preventing new bugs');
  } else {
    scores.fixRateTrend = 10;
    insights.push(`Fix rate INCREASING: ${pct(fixRate1)} → ${pct(fixRate2)} — getting worse`);
    upgrades.push('CRITICAL: Fix rate rising — more bugs over time, not fewer');
  }

  // ── 2. Repeat Breakage Rate ──
  const brokenInFirst = new Set();
  const brokenInSecond = new Set();
  for (const b of mem.breakages) {
    const idx = mem.commits.findIndex(c => c.hash === b.fixHash);
    for (const f of b.files) {
      if (idx < half) brokenInFirst.add(f);
      else brokenInSecond.add(f);
    }
  }
  const repeatFiles = [...brokenInFirst].filter(f => brokenInSecond.has(f));
  const repeatRate = brokenInFirst.size > 0 ? repeatFiles.length / brokenInFirst.size : 0;

  if (repeatRate === 0) {
    scores.repeatBreakage = 100;
    insights.push(`Zero repeat breakages — no file that broke early broke again later`);
  } else if (repeatRate < 0.2) {
    scores.repeatBreakage = 70;
    insights.push(`Low repeat rate: ${repeatFiles.length}/${brokenInFirst.size} files broke again (${pct(repeatRate)})`);
  } else if (repeatRate < 0.5) {
    scores.repeatBreakage = 40;
    insights.push(`Moderate repeats: ${repeatFiles.length}/${brokenInFirst.size} files broke again (${pct(repeatRate)})`);
    upgrades.push(`${repeatFiles.length} files broke AGAIN despite having lessons: ${repeatFiles.slice(0, 3).join(', ')}`);
  } else {
    scores.repeatBreakage = 10;
    insights.push(`High repeat rate: ${repeatFiles.length}/${brokenInFirst.size} files — lessons aren't preventing rework`);
    upgrades.push('CRITICAL: Majority of broken files break again — lessons not actionable enough');
  }

  // ── 3. Lesson Quality ──
  let specificLessons = 0;
  let genericLessons = 0;
  let emptyLessons = 0;
  const genericPatterns = [
    'fix-chain: same files', 'mobile/responsive breakage', 'styling fix',
    'event handling issue', 'test at small viewports'
  ];
  for (const b of mem.breakages) {
    if (!b.lesson || b.lesson.length < 10) emptyLessons++;
    else if (genericPatterns.some(p => b.lesson.toLowerCase().includes(p))) genericLessons++;
    else specificLessons++;
  }
  const totalLessons = mem.breakages.length;
  const specificPct = totalLessons > 0 ? specificLessons / totalLessons : 0;

  if (specificPct > 0.9) { scores.lessonQuality = 100; insights.push(`Lesson quality: ${pct(specificPct)} specific (${specificLessons}/${totalLessons})`); }
  else if (specificPct > 0.7) { scores.lessonQuality = 70; insights.push(`Lesson quality: ${pct(specificPct)} specific, ${genericLessons} generic, ${emptyLessons} empty`); }
  else if (specificPct > 0.4) { scores.lessonQuality = 40; insights.push(`Lesson quality: only ${pct(specificPct)} specific`); upgrades.push(`${genericLessons + emptyLessons} lessons too vague — need commit body/diff analysis`); }
  else { scores.lessonQuality = 10; insights.push(`Lesson quality POOR: ${pct(specificPct)} specific`); upgrades.push('CRITICAL: extractLesson needs commit body + diff analysis upgrade'); }

  // ── 4. Coupling Accuracy ──
  let breakagesWithKnownCoupling = 0;
  let breakagesMissingCoupledFile = 0;
  for (const b of mem.breakages) {
    for (const f of b.files) {
      for (const [pair, count] of Object.entries(mem.couplings)) {
        if (count >= 5 && pair.includes(f)) {
          breakagesWithKnownCoupling++;
          const other = pair.split('<->').find(s => s !== f);
          if (other && !b.files.includes(other)) breakagesMissingCoupledFile++;
        }
      }
    }
  }
  const couplingCoverage = mem.breakages.length > 0 ? Math.min(1, breakagesWithKnownCoupling / mem.breakages.length) : 0;

  if (couplingCoverage > 0.5) { scores.couplingAccuracy = 80; insights.push(`Coupling coverage: ${pct(couplingCoverage)} of breakages involve known coupled files`); }
  else if (couplingCoverage > 0.2) { scores.couplingAccuracy = 50; insights.push(`Coupling coverage: ${pct(couplingCoverage)} — most breakages in uncoupled areas`); }
  else { scores.couplingAccuracy = 30; insights.push(`Coupling coverage low: ${pct(couplingCoverage)}`); upgrades.push('Lower coupling threshold to detect weaker co-change patterns'); }

  // ── 5. Fix Chain Length ──
  const chains = [];
  let currentChain = [];
  for (let i = 0; i < mem.commits.length; i++) {
    const c = mem.commits[i];
    if (c.isFix) {
      if (currentChain.length > 0 && c.files.some(f => currentChain[currentChain.length - 1].files.includes(f))) {
        currentChain.push(c); continue;
      }
      if (currentChain.length > 1) chains.push(currentChain);
      currentChain = [c];
    } else {
      if (currentChain.length > 1) chains.push(currentChain);
      currentChain = [];
    }
  }
  if (currentChain.length > 1) chains.push(currentChain);

  const avgChainLen = chains.length > 0 ? chains.reduce((s, c) => s + c.length, 0) / chains.length : 0;
  const chainHalf = Math.floor(chains.length / 2);
  const earlyAvg = chainHalf > 0 ? chains.slice(0, chainHalf).reduce((s, c) => s + c.length, 0) / chainHalf : 0;
  const lateAvg = (chains.length - chainHalf) > 0 ? chains.slice(chainHalf).reduce((s, c) => s + c.length, 0) / (chains.length - chainHalf) : 0;

  if (chains.length === 0) { scores.fixChainLength = 80; insights.push('No fix chains — single-shot fixes (good)'); }
  else if (lateAvg < earlyAvg) { scores.fixChainLength = 80; insights.push(`Fix chains shortening: ${earlyAvg.toFixed(1)} → ${lateAvg.toFixed(1)} (learning)`); }
  else if (Math.abs(lateAvg - earlyAvg) < 0.3) { scores.fixChainLength = 50; insights.push(`Fix chains flat: avg ${avgChainLen.toFixed(1)} steps`); upgrades.push('Fix chains not shortening — postfix lessons may not be specific enough'); }
  else { scores.fixChainLength = 20; insights.push(`Fix chains GROWING: ${earlyAvg.toFixed(1)} → ${lateAvg.toFixed(1)} — more attempts needed`); upgrades.push('CRITICAL: Root cause analysis not deep enough'); }

  // ── 6. Warning Coverage ──
  let wouldHaveWarned = 0;
  const seenBreaks = new Set();
  for (const b of mem.breakages) {
    for (const f of b.files) { if (seenBreaks.has(f)) { wouldHaveWarned++; break; } }
    for (const f of b.files) seenBreaks.add(f);
  }
  const warnCoverage = mem.breakages.length > 1 ? wouldHaveWarned / (mem.breakages.length - 1) : 0;

  if (warnCoverage > 0.6) { scores.warningCoverage = 90; insights.push(`Warning coverage: ${pct(warnCoverage)} would have been warned`); }
  else if (warnCoverage > 0.3) { scores.warningCoverage = 60; insights.push(`Warning coverage: ${pct(warnCoverage)} — many unseen files`); }
  else { scores.warningCoverage = 30; insights.push(`Warning coverage low: ${pct(warnCoverage)}`); upgrades.push('Need cross-file pattern detection, not just per-file'); }

  // ── 7. Knowledge Density ──
  const filesWithRisk = Object.keys(mem.risks).length;
  const filesWithLessons = Object.values(mem.risks).filter(r => r.lessons.length > 0).length;
  const lessonDensity = filesWithRisk > 0 ? filesWithLessons / filesWithRisk : 0;

  if (lessonDensity > 0.8) { scores.knowledgeDensity = 90; insights.push(`Knowledge density: ${pct(lessonDensity)} of risky files have lessons`); }
  else if (lessonDensity > 0.5) { scores.knowledgeDensity = 60; insights.push(`Knowledge density: ${pct(lessonDensity)}`); upgrades.push(`${filesWithRisk - filesWithLessons} risky files have NO lessons`); }
  else { scores.knowledgeDensity = 30; insights.push(`Knowledge density LOW: ${pct(lessonDensity)}`); upgrades.push('CRITICAL: Most risky files have no lessons'); }

  // ── Overall ──
  const weights = { fixRateTrend: 25, repeatBreakage: 20, lessonQuality: 15, fixChainLength: 15, warningCoverage: 10, couplingAccuracy: 10, knowledgeDensity: 5 };
  let totalScore = 0, totalWeight = 0;
  for (const [k, w] of Object.entries(weights)) { if (scores[k] !== undefined) { totalScore += scores[k] * w; totalWeight += w; } }
  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 40 ? 'D' : 'F';

  return {
    overallScore, grade, scores, insights, upgrades, repeatFiles, chains,
    metrics: {
      commits: mem.commits.length, breakages: mem.breakages.length,
      fixRate: Math.round((mem.stats.totalFixes / mem.stats.totalCommits) * 100),
      specificLessons, repeatFiles: repeatFiles.length,
      fixChains: chains.length, avgChainLength: parseFloat(avgChainLen.toFixed(1))
    }
  };
}

/**
 * Print evaluation results (interactive command).
 */
function evaluate() {
  const mem = load();
  const result = runEval(mem);

  if (!result) {
    console.log('\n  mycelium-watch eval: need at least 20 commits for meaningful evaluation.\n');
    return;
  }

  const { overallScore, grade, scores, insights, upgrades, metrics } = result;
  const gradeColor = (grade === 'A' || grade === 'B') ? '\x1b[32m' : grade === 'C' ? '\x1b[33m' : '\x1b[31m';

  console.log('');
  console.log('  \x1b[1mmycelium-watch eval\x1b[0m — is the learning system getting better?');
  console.log('  ─'.repeat(35));
  console.log('');
  console.log(`  ${gradeColor}\x1b[1m  Overall: ${overallScore}/100 (${grade})\x1b[0m`);
  console.log('');

  const metricNames = { fixRateTrend: 'Fix Rate Trend', repeatBreakage: 'Repeat Prevention', lessonQuality: 'Lesson Quality', fixChainLength: 'Fix Chain Speed', warningCoverage: 'Warning Coverage', couplingAccuracy: 'Coupling Detection', knowledgeDensity: 'Knowledge Density' };
  const weights = { fixRateTrend: 25, repeatBreakage: 20, lessonQuality: 15, fixChainLength: 15, warningCoverage: 10, couplingAccuracy: 10, knowledgeDensity: 5 };

  console.log('  \x1b[1mScorecard:\x1b[0m');
  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key] || 0;
    const barLen = Math.round(score / 10);
    const barColor = score >= 70 ? '\x1b[32m' : score >= 40 ? '\x1b[33m' : '\x1b[31m';
    console.log(`    ${barColor}${'█'.repeat(barLen)}\x1b[0m${'░'.repeat(10 - barLen)} ${score.toString().padStart(3)}  ${(metricNames[key] || key).padEnd(20)} (weight: ${weight}%)`);
  }

  console.log('');
  console.log('  \x1b[1mInsights:\x1b[0m');
  for (const i of insights) console.log(`    ${i}`);

  if (upgrades.length > 0) {
    console.log('');
    console.log('  \x1b[1m\x1b[31mUpgrades needed:\x1b[0m');
    for (const u of upgrades) console.log(`    ${u.startsWith('CRITICAL') ? '\x1b[31m!!\x1b[0m' : '\x1b[33m!\x1b[0m'} ${u}`);
  }

  console.log('');
  if (overallScore >= 75) console.log('  \x1b[32m✓ Learning system is working.\x1b[0m');
  else if (overallScore >= 50) console.log('  \x1b[33m~ Learning system is partially working.\x1b[0m See upgrades above.');
  else console.log('  \x1b[31m✗ Learning system is NOT working.\x1b[0m Needs upgrade.');

  // Store eval snapshot
  if (!mem.evaluations) mem.evaluations = [];
  mem.evaluations.push({ date: new Date().toISOString().slice(0, 10), overallScore, grade, scores: { ...scores }, metrics });
  if (mem.evaluations.length > 50) mem.evaluations = mem.evaluations.slice(-50);
  save(mem);

  // Show trend
  if (mem.evaluations.length > 1) {
    console.log('');
    console.log('  \x1b[1mTrend:\x1b[0m');
    for (const e of mem.evaluations.slice(-5)) {
      const c = (e.grade === 'A' || e.grade === 'B') ? '\x1b[32m' : e.grade === 'C' ? '\x1b[33m' : '\x1b[31m';
      console.log(`    ${e.date}  ${c}${'█'.repeat(Math.round(e.overallScore / 10))}${'░'.repeat(10 - Math.round(e.overallScore / 10))} ${e.overallScore}/100 (${e.grade})\x1b[0m  ${e.metrics.commits} commits, ${e.metrics.breakages} breakages`);
    }
    const prev = mem.evaluations[mem.evaluations.length - 2];
    const delta = overallScore - prev.overallScore;
    if (delta > 0) console.log(`    \x1b[32m↑ +${delta} points since last eval\x1b[0m`);
    else if (delta < 0) console.log(`    \x1b[31m↓ ${delta} points since last eval\x1b[0m`);
    else console.log('    → unchanged since last eval');
    console.log('');
  }
}

// ─── Delegate to nw-fixer: the unified fix → verify → confirm system ─
// selfHeal is kept for backwards compat but the primary path is nw-fixer.

function callFixer(force) {
  try {
    const fixerPath = path.join(__dirname, 'mycelium-fix.cjs');
    if (fs.existsSync(fixerPath)) {
      const flag = force ? '--force' : '--silent';
      require('child_process').execSync(`node "${fixerPath}" ${flag}`, {
        cwd: __dirname, stdio: force ? 'inherit' : 'pipe', timeout: 30000
      });
    } else {
      // Fallback: run old selfHeal if nw-fixer not available
      const mem = load();
      selfHeal(mem);
    }
  } catch { /* best effort */ }
}

// ─── Self-Heal: auto-eval + auto-fix weak scores ──────────────────
// Runs silently every N commits. Detects weaknesses and takes corrective action.
// This is what turns mycelium-watch from a measurement tool into a self-improving system.

function selfHeal(mem) {
  if (!mem || mem.commits.length < 20) return;

  // Run every 3 commits (was 10 — too conservative, missed heal cycles due to squashing)
  const lastHealAt = mem.stats.lastHealAt || 0;
  if (mem.commits.length - lastHealAt < 3) return;

  const result = runEval(mem);
  if (!result) return;

  const actions = [];

  // ── Action 1: Repeat Prevention is low → escalate repeat offenders ──
  // If a file broke 3+ times, mark it as "escalated" so warnings are louder
  if (result.scores.repeatBreakage < 40) {
    const repeatOffenders = Object.entries(mem.risks)
      .filter(([, r]) => r.breakCount >= 3)
      .sort((a, b) => b[1].breakCount - a[1].breakCount);

    for (const [file, risk] of repeatOffenders) {
      if (!risk.escalated) {
        risk.escalated = true;
        risk.escalatedAt = new Date().toISOString().slice(0, 10);
        risk.escalatedReason = `broke ${risk.breakCount}x — auto-escalated by self-heal (repeat prevention: ${result.scores.repeatBreakage}/100)`;
        actions.push(`escalated ${file} (broke ${risk.breakCount}x)`);
      }
    }
  }

  // ── Action 2: Coupling Detection is low → lower threshold ──
  // If coupling accuracy < 50, reduce the threshold from 5 to 3 co-changes
  if (result.scores.couplingAccuracy < 50) {
    if (!mem.stats.couplingThreshold || mem.stats.couplingThreshold > 3) {
      mem.stats.couplingThreshold = 3;
      actions.push('lowered coupling detection threshold from 5 → 3 co-changes');
    }
  }

  // ── Action 3: Lesson Quality is low → re-extract lessons for empty ones ──
  if (result.scores.lessonQuality < 70) {
    let reExtracted = 0;
    for (const b of mem.breakages) {
      if ((!b.lesson || b.lesson.length < 15) && b.fixHash) {
        const newLesson = extractLesson(b.fixHash, b.pattern, b.files, []);
        if (newLesson && newLesson.length > 15 && newLesson !== b.lesson) {
          b.lesson = newLesson;
          // Also update per-file risks
          for (const f of b.files) {
            if (mem.risks[f] && !mem.risks[f].lessons.includes(newLesson) && mem.risks[f].lessons.length < 10) {
              mem.risks[f].lessons.push(newLesson);
            }
          }
          reExtracted++;
        }
      }
    }
    if (reExtracted > 0) actions.push(`re-extracted ${reExtracted} weak lessons with deeper analysis`);
  }

  // ── Action 4: Fix chains growing → tag files in active chains as volatile ──
  if (result.scores.fixChainLength < 40 && result.chains.length > 0) {
    const recentChains = result.chains.slice(-3);
    for (const chain of recentChains) {
      for (const c of chain) {
        for (const f of c.files) {
          if (mem.risks[f]) {
            if (!mem.risks[f].volatile) {
              mem.risks[f].volatile = true;
              mem.risks[f].volatileReason = `in active fix-chain (${chain.length} consecutive fixes)`;
              actions.push(`marked ${f} as volatile (fix-chain of ${chain.length})`);
            }
          }
        }
      }
    }
  }

  // ── Action 5: Warning coverage is low → auto-create risk entries from patterns ──
  if (result.scores.warningCoverage < 50) {
    // For every pattern theme with 3+ occurrences, check if related files have risk entries
    for (const p of mem.patterns) {
      if (p.type === 'recurring-theme') {
        const theme = p.description.match(/"([^"]+)"/)?.[1] || '';
        if (theme) {
          // Find files that appeared in breakages matching this theme
          for (const b of mem.breakages) {
            if ((b.pattern + ' ' + (b.lesson || '')).toLowerCase().includes(theme)) {
              for (const f of b.files) {
                if (!mem.risks[f]) {
                  mem.risks[f] = { breakCount: 1, lastBreak: b.date, lessons: [b.lesson || theme] };
                  actions.push(`created risk entry for ${f} (theme: ${theme})`);
                }
              }
            }
          }
        }
      }
    }
  }

  // ── Action 6: Knowledge density low → backfill lessons for risky files ──
  if (result.scores.knowledgeDensity < 60) {
    for (const [file, risk] of Object.entries(mem.risks)) {
      if (risk.lessons.length === 0 && risk.breakCount >= 1) {
        // Find any breakage that involved this file and copy its lesson
        const relevantBreakage = mem.breakages.find(b => b.files.includes(file) && b.lesson && b.lesson.length > 15);
        if (relevantBreakage) {
          risk.lessons.push(relevantBreakage.lesson);
          actions.push(`backfilled lesson for ${file}`);
        }
      }
    }
  }

  // ── Action 7: Deep root-cause analysis for repeat offenders ──
  // This is the #1 weakness: "root cause not deep enough" — mycelium-watch eval says learning is NOT working
  // because files keep breaking even with lessons. We need deeper WHY analysis.
  if (result.scores.repeatBreakage < 50) {
    const worstOffenders = Object.entries(mem.risks)
      .filter(([, r]) => r.breakCount >= 2)
      .sort((a, b) => b[1].breakCount - a[1].breakCount)
      .slice(0, 10);

    for (const [file, risk] of worstOffenders) {
      // Gather ALL breakages for this file
      const fileBreakages = mem.breakages.filter(b => b.files.includes(file));
      if (fileBreakages.length < 2) continue;

      // Extract patterns: what words/themes repeat across breakages?
      const allLessons = fileBreakages.map(b => (b.lesson || b.pattern || '').toLowerCase());
      const wordFreq = {};
      for (const lesson of allLessons) {
        // Extract meaningful tokens (3+ chars, skip common words)
        const skip = new Set(['the','and','for','was','not','that','with','this','from','but','are','fix','add','bug']);
        const tokens = lesson.match(/[a-z]{3,}/g) || [];
        for (const t of tokens) {
          if (!skip.has(t)) wordFreq[t] = (wordFreq[t] || 0) + 1;
        }
      }

      // Find recurring themes (words appearing in 2+ breakages = root cause signal)
      const recurringThemes = Object.entries(wordFreq)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      if (recurringThemes.length > 0) {
        const rootCause = `DEEP ROOT-CAUSE: broke ${risk.breakCount}x — recurring themes: [${recurringThemes.join(', ')}]. ` +
          `Common file pairs: ${fileBreakages.flatMap(b => b.files).filter(f => f !== file).slice(0, 3).join(', ') || 'none'}. ` +
          `Pattern: ${fileBreakages.length} breakages share these themes, suggesting a structural/coupling issue.`;

        // Store as a deep-analysis entry (separate from lessons)
        if (!risk.deepAnalysis) risk.deepAnalysis = [];
        const exists = risk.deepAnalysis.some(d => d.themes.join(',') === recurringThemes.join(','));
        if (!exists) {
          risk.deepAnalysis.push({
            date: new Date().toISOString().slice(0, 10),
            themes: recurringThemes,
            breakCount: risk.breakCount,
            rootCause,
            source: 'self-heal: deep root-cause analysis (Action 7)'
          });
          // Also promote to a lesson if it's new knowledge
          if (!risk.lessons.includes(rootCause) && risk.lessons.length < 10) {
            risk.lessons.push(rootCause);
          }
          actions.push(`deep analysis [${file}]: themes=[${recurringThemes.join(',')}] (${risk.breakCount}x broken)`);
        }
      }
    }
  }

  // ── Action 8: Cross-system sync — read Mycelium constraints into mycelium-watch warnings ──
  // Mycelium tracks constraints by area (battle, i18n, cards...), mycelium-watch tracks by file.
  // Bridge: map area → files using mycelium-watch breakage data (file paths contain area keywords).
  try {
    const nwMemPath = path.join(__dirname, '.mycelium/memory.json');
    if (fs.existsSync(nwMemPath)) {
      const nwMem = JSON.parse(fs.readFileSync(nwMemPath, 'utf8'));
      const constraints = nwMem.constraints || {};
      let synced = 0;
      for (const [area, areaConstraints] of Object.entries(constraints)) {
        if (!areaConstraints || areaConstraints.length === 0) continue;
        // Map area to mycelium-watch files: file path must contain the area keyword
        const areaLower = area.toLowerCase();
        const matchingFiles = Object.keys(mem.risks).filter(f =>
          f.toLowerCase().includes(areaLower) ||
          f.toLowerCase().includes(areaLower.replace(/s$/, ''))  // battle→battle, cards→card
        );
        for (const f of matchingFiles) {
          if (!mem.risks[f].constraints) mem.risks[f].constraints = [];
          for (const c of areaConstraints) {
            if (!mem.risks[f].constraints.includes(c.fact) && mem.risks[f].constraints.length < 10) {
              mem.risks[f].constraints.push(c.fact);
              synced++;
            }
          }
        }
      }
      if (synced > 0) actions.push(`synced ${synced} Mycelium constraints into mycelium-watch risk data`);
    }
  } catch { /* Mycelium not available */ }

  // Store results
  mem.stats.lastHealAt = mem.commits.length;
  mem.stats.lastHealDate = new Date().toISOString().slice(0, 10);
  mem.stats.lastHealScore = result.overallScore;

  if (!mem.healHistory) mem.healHistory = [];
  mem.healHistory.push({
    date: new Date().toISOString().slice(0, 10),
    scoreBefore: result.overallScore,
    actions: actions.length > 0 ? actions : ['no action needed — scores acceptable']
  });
  if (mem.healHistory.length > 20) mem.healHistory = mem.healHistory.slice(-20);

  // Log if any actions were taken (silently during post-commit)
  if (actions.length > 0) {
    console.error(`  \x1b[2mmycelium-watch self-heal: ${actions.length} action(s) taken (score: ${result.overallScore}/100)\x1b[0m`);
    for (const a of actions.slice(0, 3)) {
      console.error(`    \x1b[2m→ ${a}\x1b[0m`);
    }
    if (actions.length > 3) console.error(`    \x1b[2m→ ...and ${actions.length - 3} more\x1b[0m`);
  }

  // Save after all mutations
  save(mem);
}

function pct(n) {
  return Math.round(n * 100) + '%';
}

// ─── Uninstall ──────────────────────────────────────────────────────

function uninstall() {
  const root = findGitRoot();
  console.log('');

  // Remove from hooks
  for (const hookName of ['pre-commit', 'post-commit']) {
    for (const dir of [path.join(root, '.husky'), path.join(root, '.git', 'hooks')]) {
      const hookPath = path.join(dir, hookName);
      if (fs.existsSync(hookPath)) {
        let content = fs.readFileSync(hookPath, 'utf8');
        if (content.includes('mycelium-watch')) {
          // Remove mycelium-watch lines
          content = content.split('\n')
            .filter(l => !l.includes('mycelium-watch'))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
          fs.writeFileSync(hookPath, content, { mode: 0o755 });
          console.log(`  \x1b[31m-\x1b[0m removed mycelium-watch from ${hookName}`);
        }
      }
    }
  }

  // Remove .mycelium-watch directory
  if (fs.existsSync(MYCELIUM-WATCH_DIR)) {
    fs.rmSync(MYCELIUM-WATCH_DIR, { recursive: true });
    console.log('  \x1b[31m-\x1b[0m removed .mycelium-watch/');
  }

  console.log('  Done. mycelium-watch has been removed.\n');
}

// ─── Main ───────────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg === '--install' || arg === 'install') {
  install();
} else if (arg === '--learn' || arg === 'learn') {
  learn();
} else if (arg === '--warn' || arg === 'warn') {
  warn();
} else if (arg === '--status' || arg === 'status') {
  status();
} else if (arg === '--eval' || arg === 'eval') {
  evaluate();
} else if (arg === '--heal' || arg === 'heal') {
  // Delegate to nw-fixer (the unified fixer)
  callFixer(true);
  evaluate();
} else if (arg === '--backfill' || arg === 'backfill') {
  backfill();
} else if (arg === '--sync' || arg === 'sync') {
  sync();
} else if (arg === '--uninstall' || arg === 'uninstall') {
  uninstall();
} else {
  console.log(`
  \x1b[1mmycelium-watch\x1b[0m — your git learns from its own mistakes

  Usage:
    node mycelium-watch.cjs --install     Set up hooks + learn from existing history
    node mycelium-watch.cjs --status      See what mycelium-watch has learned
    node mycelium-watch.cjs --eval        Evaluate: is the learning system getting better?
    node mycelium-watch.cjs --heal        Force self-heal: fix weak scores + show eval
    node mycelium-watch.cjs --uninstall   Remove mycelium-watch completely

  After install, mycelium-watch runs automatically on every commit.
  Self-heal runs every 10 commits — no manual intervention needed.
`);
}
