#!/usr/bin/env node
/**
 * gitwise — your git learns from its own mistakes
 *
 * Install:  node gitwise.cjs --install
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

const GITWISE_DIR = path.join(findGitRoot(), '.gitwise');
const MEMORY_FILE = path.join(GITWISE_DIR, 'memory.json');
const MAX_MEMORY_KB = 200;
const MAX_ENTRIES = 300;

// Noise — files that change often but teach nothing
const NOISE = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'node_modules/', 'dist/', 'build/', 'out/', '.next/',
  'coverage/', '__pycache__/', '.pytest_cache/', '.nyc_output/',
  '.gitwise/', '.DS_Store', 'Thumbs.db',
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
  if (!fs.existsSync(GITWISE_DIR)) fs.mkdirSync(GITWISE_DIR, { recursive: true });
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
 * Detect if a commit message indicates a fix.
 * Returns { isFix: true, area, hint } or { isFix: false }
 */
function detectFix(msg) {
  const lower = msg.toLowerCase();

  // Conventional commit: fix(...): ...
  const conventional = lower.match(/^fix\(?([^)]*)\)?[:\s]/);
  if (conventional) {
    return { isFix: true, area: conventional[1] || '', hint: msg };
  }

  // Common fix patterns
  const fixPatterns = [
    /\bfix(?:e[ds])?\b/i,
    /\bhotfix\b/i,
    /\bbugfix\b/i,
    /\bpatch(?:e[ds])?\b/i,
    /\brevert\b/i,
    /\bresolve[ds]?\b/i,
    /\brepair\b/i,
    /\bcorrect\b/i,
  ];

  if (fixPatterns.some(p => p.test(lower))) {
    return { isFix: true, area: '', hint: msg };
  }

  return { isFix: false };
}

/**
 * Extract what went wrong from a fix commit.
 * Looks at the commit message and the diff to figure out the breakage pattern.
 */
function extractLesson(fixMsg, fixFiles, prevCommits) {
  const lower = fixMsg.toLowerCase();
  const lessons = [];

  // Pattern: overflow/clipping
  if (lower.includes('overflow') || lower.includes('clip')) {
    lessons.push('overflow/clipping issue — CSS overflow property caused visual cutoff');
  }

  // Pattern: mobile/responsive
  if (lower.includes('mobile') || lower.includes('responsive') || lower.includes('viewport')) {
    lessons.push('mobile/responsive breakage — test at small viewports');
  }

  // Pattern: iOS/Safari specific
  if (lower.includes('ios') || lower.includes('safari') || lower.includes('webkit')) {
    lessons.push('iOS/Safari specific issue — platform requires special handling');
  }

  // Pattern: load order / initialization
  if (lower.includes('load order') || lower.includes('init') || lower.includes('undefined') || lower.includes('not defined')) {
    lessons.push('initialization/load order issue — dependency timing matters');
  }

  // Pattern: event handling
  if (lower.includes('event') || lower.includes('handler') || lower.includes('listener') || lower.includes('click') || lower.includes('touch')) {
    lessons.push('event handling issue — handlers may be lost or double-fired');
  }

  // Pattern: innerHTML / DOM manipulation
  if (lower.includes('innerhtml') || lower.includes('dom') || lower.includes('handler')) {
    lessons.push('DOM manipulation issue — innerHTML destroys event handlers');
  }

  // Pattern: CSS/styling
  if (fixFiles.some(f => f.endsWith('.css') || f.endsWith('.scss'))) {
    lessons.push('styling fix required — CSS changes needed');
  }

  // Pattern: same files touched as previous commit (fix-chain)
  for (const prev of prevCommits.slice(-3)) {
    const overlap = fixFiles.filter(f => prev.files.includes(f));
    if (overlap.length > 0 && prev.hash) {
      lessons.push(`fix-chain: same files as commit ${prev.hash.slice(0, 7)} (${prev.msg.slice(0, 40)})`);
      break;
    }
  }

  // Fallback: derive from commit message
  if (lessons.length === 0) {
    // Clean up the message for a generic lesson
    const cleaned = fixMsg
      .replace(/^fix\([^)]*\):\s*/i, '')
      .replace(/^fix:\s*/i, '')
      .replace(/^fix\s+/i, '')
      .slice(0, 100);
    if (cleaned.length > 5) {
      lessons.push(cleaned);
    }
  }

  return lessons;
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

    const lessons = extractLesson(msg, files, mem.commits.slice(-10));

    // Record breakage
    const breakage = {
      pattern: hint || msg.slice(0, 100),
      files,
      date,
      fixHash: hash,
      lesson: lessons.join('; ')
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
      for (const lesson of lessons) {
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

  // 1. Files that have broken before
  for (const f of staged) {
    const risk = mem.risks[f];
    if (risk && risk.breakCount >= 1) {
      const lessonStr = risk.lessons.length > 0 ? ` (${risk.lessons[0]})` : '';
      warnings.push({
        severity: risk.breakCount >= 3 ? 'high' : risk.breakCount >= 2 ? 'medium' : 'low',
        msg: `${f} has broken ${risk.breakCount}x before${lessonStr}`
      });
    }
  }

  // 2. Coupled files that are missing
  for (const f of staged) {
    for (const [pair, count] of Object.entries(mem.couplings)) {
      if (count >= 5 && pair.includes(f)) {
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
  console.error('  \x1b[2mgitwise:\x1b[0m');
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
// This means gitwise is useful from the very first commit after install.

function backfill() {
  const mem = load();
  if (mem.commits.length > 0) return mem; // Already have data

  console.log('  gitwise: scanning git history...');

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
      const lessons = extractLesson(c.msg, c.files, mem.commits.slice(Math.max(0, i - 5), i));

      const breakage = {
        pattern: c.msg.slice(0, 100),
        files: c.files,
        date: c.date,
        fixHash: c.hash,
        lesson: lessons.join('; ')
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
        for (const lesson of lessons) {
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

  console.log(`  gitwise: learned from ${mem.commits.length} commits — ${mem.breakages.length} breakages, ${Object.keys(mem.couplings).length} file couplings, ${mem.patterns.length} patterns`);

  return mem;
}

// ─── Install ────────────────────────────────────────────────────────
// One command. Sets up hooks. Backfills history. Done forever.

function install() {
  const root = findGitRoot();
  console.log('');
  console.log('  \x1b[1mgitwise\x1b[0m — your git learns from its own mistakes');
  console.log('');

  // 1. Create .gitwise directory
  ensureDir();
  console.log('  \x1b[32m+\x1b[0m created .gitwise/');

  // 2. Add .gitwise to .gitignore
  const gitignorePath = path.join(root, '.gitignore');
  let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  if (!gitignore.includes('.gitwise')) {
    gitignore = gitignore.trimEnd() + '\n.gitwise/\n';
    fs.writeFileSync(gitignorePath, gitignore);
    console.log('  \x1b[32m+\x1b[0m added .gitwise/ to .gitignore');
  } else {
    console.log('  \x1b[2m.\x1b[0m .gitignore already configured');
  }

  // 3. Set up git hooks
  const huskyDir = path.join(root, '.husky');
  const hooksDir = fs.existsSync(huskyDir) ? huskyDir : path.join(root, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  // Determine the script path relative to git root
  const scriptRelative = path.relative(root, __filename).replace(/\\/g, '/');

  // Pre-commit hook: append gitwise warn to existing hook or create new
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const gitwisePreCommit = `node "${scriptRelative}" --warn 2>/dev/null || true`;

  if (fs.existsSync(preCommitPath)) {
    const existing = fs.readFileSync(preCommitPath, 'utf8');
    if (!existing.includes('gitwise')) {
      // Append to existing hook (don't replace it)
      const appended = existing.trimEnd() + '\n\n# gitwise: warn about known risks\n' + gitwisePreCommit + '\n';
      fs.writeFileSync(preCommitPath, appended, { mode: 0o755 });
      console.log('  \x1b[32m+\x1b[0m appended gitwise to existing pre-commit hook');
    } else {
      console.log('  \x1b[2m.\x1b[0m pre-commit hook already has gitwise');
    }
  } else {
    fs.writeFileSync(preCommitPath, `#!/bin/sh\n# gitwise: warn about known risks\n${gitwisePreCommit}\n`, { mode: 0o755 });
    console.log('  \x1b[32m+\x1b[0m created pre-commit hook');
  }

  // Post-commit hook: append gitwise learn to existing hook or create new
  const postCommitPath = path.join(hooksDir, 'post-commit');
  const gitwisePostCommit = `node "${scriptRelative}" --learn 2>/dev/null || true`;

  if (fs.existsSync(postCommitPath)) {
    const existing = fs.readFileSync(postCommitPath, 'utf8');
    if (!existing.includes('gitwise')) {
      const appended = existing.trimEnd() + '\n\n# gitwise: learn from this commit\n' + gitwisePostCommit + '\n';
      fs.writeFileSync(postCommitPath, appended, { mode: 0o755 });
      console.log('  \x1b[32m+\x1b[0m appended gitwise to existing post-commit hook');
    } else {
      console.log('  \x1b[2m.\x1b[0m post-commit hook already has gitwise');
    }
  } else {
    fs.writeFileSync(postCommitPath, `#!/bin/sh\n# gitwise: learn from this commit\n${gitwisePostCommit}\n`, { mode: 0o755 });
    console.log('  \x1b[32m+\x1b[0m created post-commit hook');
  }

  // Set hooks path if using .husky
  if (hooksDir === huskyDir) {
    try { execSync('git config core.hooksPath .husky', { cwd: root }); } catch {}
  }

  // 4. Backfill from existing history
  backfill();

  console.log('');
  console.log('  \x1b[1mDone.\x1b[0m gitwise will now learn from every commit.');
  console.log('  You never need to run anything again.');
  console.log('');
}

// ─── Status: Quick look at what gitwise knows ───────────────────────
// Optional — for curious developers who want to see what's been learned.

function status() {
  const mem = load();

  if (mem.commits.length === 0) {
    console.log('\n  gitwise: no data yet. Run --install first or make some commits.\n');
    return;
  }

  console.log('');
  console.log('  \x1b[1mgitwise\x1b[0m — what I\x27ve learned');
  console.log('');

  // Key numbers
  const fixRate = mem.stats.totalCommits > 0 ? Math.round(mem.stats.totalFixes / mem.stats.totalCommits * 100) : 0;
  console.log(`  Commits analyzed:  ${mem.commits.length}`);
  console.log(`  Fix rate:          ${fixRate}% (${mem.stats.totalFixes} fixes / ${mem.stats.totalCommits} commits)`);
  console.log(`  Breakages found:   ${mem.breakages.length}`);
  console.log(`  File couplings:    ${Object.keys(mem.couplings).length}`);
  console.log(`  Patterns learned:  ${mem.patterns.length}`);
  console.log('');

  // Riskiest files
  const riskyFiles = Object.entries(mem.risks)
    .filter(([, r]) => r.breakCount >= 2)
    .sort((a, b) => b[1].breakCount - a[1].breakCount)
    .slice(0, 5);

  if (riskyFiles.length > 0) {
    console.log('  \x1b[1mRiskiest files:\x1b[0m');
    for (const [file, risk] of riskyFiles) {
      const lesson = risk.lessons[0] ? ` — ${risk.lessons[0].slice(0, 60)}` : '';
      console.log(`    ${risk.breakCount}x broken  ${file}${lesson}`);
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

  // Recent breakages
  const recentBreakages = mem.breakages.slice(-3);
  if (recentBreakages.length > 0) {
    console.log('  \x1b[1mRecent breakages:\x1b[0m');
    for (const b of recentBreakages) {
      console.log(`    ${b.date} ${b.fixHash || '???'} ${b.pattern.slice(0, 70)}`);
      if (b.lesson) {
        console.log(`           \x1b[2mlesson: ${b.lesson.slice(0, 70)}\x1b[0m`);
      }
    }
    console.log('');
  }
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
        if (content.includes('gitwise')) {
          // Remove gitwise lines
          content = content.split('\n')
            .filter(l => !l.includes('gitwise'))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
          fs.writeFileSync(hookPath, content, { mode: 0o755 });
          console.log(`  \x1b[31m-\x1b[0m removed gitwise from ${hookName}`);
        }
      }
    }
  }

  // Remove .gitwise directory
  if (fs.existsSync(GITWISE_DIR)) {
    fs.rmSync(GITWISE_DIR, { recursive: true });
    console.log('  \x1b[31m-\x1b[0m removed .gitwise/');
  }

  console.log('  Done. gitwise has been removed.\n');
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
} else if (arg === '--backfill' || arg === 'backfill') {
  backfill();
} else if (arg === '--uninstall' || arg === 'uninstall') {
  uninstall();
} else {
  console.log(`
  \x1b[1mgitwise\x1b[0m — your git learns from its own mistakes

  Usage:
    node gitwise.cjs --install     Set up hooks + learn from existing history
    node gitwise.cjs --status      See what gitwise has learned
    node gitwise.cjs --uninstall   Remove gitwise completely

  After install, gitwise runs automatically on every commit.
  You never need to run it manually again.
`);
}
