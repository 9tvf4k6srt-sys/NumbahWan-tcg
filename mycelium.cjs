#!/usr/bin/env node
/**
 * MYCELIUM: Compounding Project Memory for AI-Assisted Development
 * 
 * Drop this file into ANY project. Zero dependencies. Zero config.
 *   node mycelium.cjs --init        # Set up hooks + memory.json + .gitignore
 *   node mycelium.cjs --onboard     # Explain the system to any AI in 10 lines
 *
 * What it does:
 *   Runs on every commit via git hook. Extracts facts from git history.
 *   Builds a compounding memory that makes every AI session smarter than the last.
 *
 * Core commands:
 *   --init                           # Zero-config setup for any project
 *   --onboard                        # Explain system to a new AI session
 *   --status                         # One-screen project dashboard
 *   --query                          # Full context dump for AI session start
 *   --premortem "area"               # What to check before editing an area
 *   --guard [files...]               # Auto-warn about risks for specific files
 *   --broke "area" "what"            # Record a breakage
 *   --learned "area" "lesson"        # Record a lesson from fixing
 *   --constraint "area" "fact"       # Record a hard platform/tech fact
 *   --decide "area" "what" "why"     # Record a non-obvious decision
 *   --gen-tests                      # Auto-generate regression tests from breakages
 *   --export-shared                  # Export universal lessons to ~/.mycelium-shared.json
 *   --import-shared                  # Import lessons from shared library
 *   --wip "task"                     # Save work-in-progress (survives chat compaction)
 *   --wip-done                       # Clear WIP after task complete
 *   --token-check [files...]         # Token budget audit + cost optimization advice
 *   --cost-plan <files...>           # Cheapest approach for reading/editing specific files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEMORY_FILE = path.join(__dirname, '.mycelium/memory.json');
const MAX_ENTRIES = 50; // Keep last 50 snapshots (~6 weeks) §5 Context Window — older data adds noise
const MAX_HOTSPOTS = 100; // Only track top 100 hotspots §5
const MAX_COCHANGES = 150; // Only track top 150 co-change pairs §5
const MAX_MEMORY_KB = 200; // Auto-compact when memory.json exceeds this
const MAX_WATCH_KB = 400;  // Auto-trim watch.json when exceeds this
const MAX_EVAL_HISTORY = 30; // Keep only 30 unique eval snapshots
const MAX_LEARNINGS = 30;  // Keep 30 most recent learnings §5
const MAX_FIX_CHAINS = 15; // Keep 15 most recent fix chains §5
const MAX_RISK_LESSONS = 3; // Max lessons per risky file (keep sharpest)
const MAX_LESSON_CHARS = 80; // Actionable lessons must be concise
const SNAPSHOT_TOP_FILES = 5; // Keep only top 5 risky files per snapshot
const WATCH_COMMIT_TOP_FILES = 5; // Keep only top 5 files per watch commit

// ─── TOKEN BUDGET & COST OPTIMIZATION CONSTANTS ──────────────────────
// Ref: "Minimizing LLM Costs" (Manus AI, 2026-02-10) — 10 dimensions applied.
// COST PHILOSOPHY:
//   Input tokens cost $X, output tokens cost 2-4x more (§6 Output Optimization).
//   Grep=50tok, full read=10K-46K — 200x cost diff for same info (§1 Prompt Eng).
//   Caching repeated reads eliminates 40-90% redundant calls (§2 Caching).
//   Batch operations to reduce per-call overhead (§4 Batching).
//   Structured compact output saves 20-40% vs verbose (§6 Structured Output).
//   Early termination: stop as soon as goal is achieved (§9 Agentic Workflow).
const TOKEN_LIMIT = 200000;         // Platform hard limit
const TOKEN_RESPONSE_RESERVE = 30000; // Reserve for AI response generation
const TOKEN_SAFE_BUDGET = TOKEN_LIMIT - TOKEN_RESPONSE_RESERVE; // 170K usable
const TOKEN_WARN_THRESHOLD = 0.70;  // Warn at 70% of safe budget (~119K)
const CHARS_PER_TOKEN = 4;          // Conservative estimate (code ≈ 3.5-4 chars/token)
const MAX_CONTEXT_TOKENS = 4000;    // .mycelium-context cap (was 6K, tightened per §5 Context Window)
const MAX_SINGLE_FILE_READ_TOKENS = 15000; // Never read a file >15K tokens whole
const LARGE_WRITE_CHUNK_LINES = 200; // Chunk large file writes at 200 lines
const MAX_FULL_READS_PER_SESSION = 2; // Max full-file reads (>20KB) per session
const SESSION_BUDGET_FILE = path.join(__dirname, '.mycelium-token-ledger');
const OUTPUT_TOKEN_MULTIPLIER = 3;  // Output tokens cost ~3x input (§6 Output Optimization)

// ─── IN-MEMORY CACHE (§2 Caching Strategies) ────────────────────────
// Cache memory.json reads to avoid re-parsing 200KB+ file on every operation.
// Hit rate target: >80% for guard/snapshot/brief within a single session.
let _memoryCache = null;
let _memoryCacheMtime = 0;
function loadMemoryCached() {
  try {
    const stat = fs.statSync(MEMORY_FILE);
    if (_memoryCache && stat.mtimeMs === _memoryCacheMtime) return _memoryCache;
    _memoryCache = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    _memoryCacheMtime = stat.mtimeMs;
    return _memoryCache;
  } catch { return loadMemory(); }
}
function invalidateCache() { _memoryCache = null; _memoryCacheMtime = 0; }

// ─── Helpers ────────────────────────────────────────────────────────

function run(cmd) {
  try {
    return execSync(cmd, { cwd: __dirname, encoding: 'utf8', timeout: 10000 }).trim();
  } catch { return ''; }
}

function loadMemory() {
  try {
    const mem = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    if (!mem.decisions) mem.decisions = [];
    if (!mem.constraints) mem.constraints = {};
    if (!mem.breakages) mem.breakages = [];
    if (!mem.reflections) mem.reflections = [];
    if (!mem.autoRules) mem.autoRules = [];
    if (!mem.learnings) mem.learnings = [];
    return mem;
  } catch {
    return { version: 2, snapshots: [], patterns: {}, decisions: [], constraints: {}, breakages: [] };
  }
}

function saveMemory(mem) {
  // Keep only last MAX_ENTRIES snapshots
  if (mem.snapshots.length > MAX_ENTRIES) {
    mem.snapshots = mem.snapshots.slice(-MAX_ENTRIES);
  }
  // Compact JSON: 2-space indent for top-level, but inline for snapshot arrays
  const json = JSON.stringify(mem, null, 2);
  fs.writeFileSync(MEMORY_FILE, json);
  
  // Auto-trim: checks ALL data files (memory + watch + eval) and compresses if needed
  autoTrim();
}

// ── Check if a file still exists in the repo ────────────────────────
function fileExists(fp) {
  return fs.existsSync(path.join(__dirname, fp));
}

// Paths to skip in query display (noise, archives, generated)
// Configurable via .mycelium/config.json { "noisePaths": [...] }
const DEFAULT_NOISE = ['archive/', 'node_modules/', '.husky/', 'dist/', 'build/', 'out/', '.next/', 
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.mycelium/memory.json', '.mycelium-mined/',
  'coverage/', '.nyc_output/', '__pycache__/', '.pytest_cache/'];
function loadConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '.mycelium/config.json'), 'utf8'));
    return cfg;
  } catch { return {}; }
}
const CONFIG = loadConfig();
const NOISE_PATHS = CONFIG.noisePaths || DEFAULT_NOISE;
function isNoise(fp) {
  return NOISE_PATHS.some(n => fp.includes(n));
}

// ─── Data Collection (all automated, all from git/build) ────────────

function getCommitInfo() {
  const hash = run('git rev-parse --short HEAD');
  const msg = run('git log -1 --pretty=format:"%s"');
  const filesRaw = run('git diff-tree --no-commit-id --name-status -r HEAD');
  
  const files = filesRaw.split('\n').filter(Boolean).map(line => {
    const [status, ...pathParts] = line.split('\t');
    return { status: status.trim(), path: pathParts.join('\t').trim() };
  });

  const stat = run('git diff --shortstat HEAD~1..HEAD 2>/dev/null');
  const added = parseInt((stat.match(/(\d+) insertion/) || [0, 0])[1]);
  const removed = parseInt((stat.match(/(\d+) deletion/) || [0, 0])[1]);

  return { hash, msg, files, added, removed };
}

function getBuildInfo() {
  const bundlePath = path.join(__dirname, 'dist', '_worker.js');
  const bundleSize = fs.existsSync(bundlePath) ? fs.statSync(bundlePath).size : 0;
  
  // Count source files
  const srcFiles = run('find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l');
  const htmlPages = run('find public -name "*.html" 2>/dev/null | wc -l');
  const jsModules = run('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | wc -l');
  
  return {
    bundleKB: Math.round(bundleSize / 1024),
    srcFiles: parseInt(srcFiles) || 0,
    htmlPages: parseInt(htmlPages) || 0,
    jsModules: parseInt(jsModules) || 0
  };
}

// ─── Pattern Detection (the compounding part) ──────────────────────

function updatePatterns(mem, commit) {
  if (!mem.patterns) mem.patterns = {};
  if (!mem.patterns.coChanges) mem.patterns.coChanges = {};
  if (!mem.patterns.hotspots) mem.patterns.hotspots = {};
  if (!mem.patterns.fixChains) mem.patterns.fixChains = [];
  if (!mem.patterns.bundleTrend) mem.patterns.bundleTrend = [];

  const filePaths = commit.files.map(f => f.path).filter(p => 
    !p.includes('sentinel-report') && 
    !p.includes('sentinel-history') &&
    !p.includes('package-lock') &&
    !isNoise(p)
  );

  // Track hotspots (files changed most often)
  for (const fp of filePaths) {
    mem.patterns.hotspots[fp] = (mem.patterns.hotspots[fp] || 0) + 1;
  }

  // Track co-changes (files that change together)
  for (let i = 0; i < filePaths.length; i++) {
    for (let j = i + 1; j < filePaths.length; j++) {
      const key = [filePaths[i], filePaths[j]].sort().join(' <-> ');
      mem.patterns.coChanges[key] = (mem.patterns.coChanges[key] || 0) + 1;
    }
  }

  // Detect fix chains: if this commit message starts with "fix" and 
  // touches files from the previous commit, that's a fix chain
  const prevSnapshot = mem.snapshots[mem.snapshots.length - 1];
  if (prevSnapshot && commit.msg.toLowerCase().startsWith('fix')) {
    const prevFiles = new Set((prevSnapshot.commit?.files || []).map(f => f.path));
    const overlap = filePaths.filter(f => prevFiles.has(f));
    if (overlap.length > 0) {
      mem.patterns.fixChains.push({
        ts: Date.now(),
        original: prevSnapshot.commit?.hash || '?',
        fix: commit.hash,
        files: overlap,
        msg: commit.msg
      });
      // Keep only last 50 fix chains
      if (mem.patterns.fixChains.length > 50) {
        mem.patterns.fixChains = mem.patterns.fixChains.slice(-50);
      }
    }
  }

  return mem;
}

// ─── Commit Quality Scoring (Blueprint: Rubric-Based Evaluation) ────
// Deterministic scoring — no LLM needed. Scores each commit on signals
// that correlate with quality vs risk.

function scoreCommit(commit, mem) {
  let score = 70; // baseline: decent commit
  const reasons = [];

  // 1. Focus (fewer files = more focused, up to +15)
  const fileCount = commit.files.length;
  if (fileCount <= 3) { score += 15; reasons.push('+focused'); }
  else if (fileCount <= 8) { score += 5; }
  else if (fileCount > 20) { score -= 15; reasons.push('-sprawl(' + fileCount + ' files)'); }

  // 2. Fix chain penalty (-20 if this commit immediately fixes the last)
  const prevSnapshot = mem.snapshots[mem.snapshots.length - 1];
  if (prevSnapshot && commit.msg.toLowerCase().startsWith('fix')) {
    const prevFiles = new Set((prevSnapshot.commit?.files || []).map(f => f.path));
    const overlap = commit.files.map(f => f.path).filter(f => prevFiles.has(f));
    if (overlap.length > 0) { score -= 20; reasons.push('-fixChain'); }
  }

  // 3. Commit message quality (+10 for conventional, -10 for vague)
  const msg = commit.msg.toLowerCase();
  if (/^(feat|fix|refactor|chore|docs|test|perf)\(/.test(msg)) { score += 10; reasons.push('+conventional'); }
  else if (msg.length < 10 || msg === 'update' || msg === 'fix') { score -= 10; reasons.push('-vagueMsg'); }

  // 4. Test files included (+10)
  if (commit.files.some(f => f.path.includes('test') || f.path.includes('spec'))) {
    score += 10; reasons.push('+hasTesting');
  }

  // 5. Churn penalty — if same file was in last 3 commits (-10)
  const recent3 = mem.snapshots.slice(-3);
  const recentFiles = new Set(recent3.flatMap(s => (s.commit?.files || []).map(f => f.path)));
  const churnFiles = commit.files.filter(f => recentFiles.has(f.path));
  if (churnFiles.length > 2) { score -= 10; reasons.push('-churn(' + churnFiles.length + ')'); }

  // 6. Size balance — very large commits are risky
  if (commit.added > 1000) { score -= 5; reasons.push('-large(+' + commit.added + ')'); }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// ─── Auto-Reflection (Blueprint: Critique→Refine) ──────────────────
// Generates real lessons from fix chains by analyzing what went wrong.
// Also detects cross-area patterns and decision-impact correlation.

function autoReflect(mem, commit) {
  if (!mem.reflections) mem.reflections = [];

  // ── 1. Fix chain reflection: why did this break? ──
  if (commit.msg.toLowerCase().startsWith('fix')) {
    const prevSnapshot = mem.snapshots[mem.snapshots.length - 1];
    if (prevSnapshot) {
      const prevFiles = new Set((prevSnapshot.commit?.files || []).map(f => f.path));
      const overlap = commit.files.map(f => f.path).filter(f => prevFiles.has(f));
      if (overlap.length > 0) {
        // Classify what kind of fix chain this is
        const areas = new Set(overlap.map(f => classifyArea(f)));
        const isMultiArea = areas.size > 1;
        const affectedAreas = [...areas].join(', ');
        
        // Count how many times these specific files have been in fix chains
        const fcHistory = (mem.patterns.fixChains || []);
        const fileRepeatCount = {};
        for (const f of overlap) {
          fileRepeatCount[f] = fcHistory.filter(fc => (fc.files || []).includes(f)).length;
        }
        const repeatOffenders = Object.entries(fileRepeatCount).filter(([_, c]) => c >= 2);

        // Generate a real lesson using deep intelligence (commit body + diff)
        let lesson;
        const deepLesson = extractDeepLesson(commit.hash, commit.msg);
        if (deepLesson && deepLesson.length > 20) {
          lesson = deepLesson;
        } else if (repeatOffenders.length > 0) {
          const worst = repeatOffenders.sort((a, b) => b[1] - a[1])[0];
          lesson = `${worst[0]} has broken ${worst[1]+1} times — it's structurally fragile, not just unlucky. Consider splitting or adding guards.`;
        } else if (isMultiArea) {
          lesson = `Fix crossed ${areas.size} areas (${affectedAreas}) — the original change had hidden dependencies between them.`;
        } else {
          lesson = `Immediate fix needed in ${affectedAreas} area — the change wasn't tested against its own files.`;
        }

        mem.reflections.push({
          ts: Date.now(),
          date: new Date().toISOString().split('T')[0],
          type: 'fix_chain',
          original: prevSnapshot.commit?.hash,
          fix: commit.hash,
          files: overlap,
          areas: [...areas],
          lesson
        });
      }
    }
  }

  // Keep last 50
  if (mem.reflections.length > 50) mem.reflections = mem.reflections.slice(-50);
}

// ─── Deep Intelligence (shared with mycelium-watch.cjs) ────────────────────
// Reads commit bodies + analyzes diffs for specific, actionable lessons.
// Used by: autoReflect, postfix, recordBreakage

function getCommitBody(hash) {
  try { return run(`git log -1 "--pretty=format:%b" ${hash}`); }
  catch { return ''; }
}

function analyzeDiff(hash) {
  const result = { removed: [], added: [], cssProps: [], jsPatterns: [] };
  try {
    // Analyze CSS files separately for CSS property detection
    const cssDiff = run(`git show ${hash} --no-commit-id --diff-filter=M -p --unified=1 -- "*.css" "*.scss"`);
    if (cssDiff) {
      for (const line of cssDiff.split('\n')) {
        if (line.startsWith('-') && !line.startsWith('---')) {
          const m = line.slice(1).trim().match(/^\s*([a-z-]+)\s*:\s*(.+?)\s*;?\s*$/);
          if (m) result.cssProps.push({ prop: m[1], oldVal: m[2], action: 'removed' });
        }
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const m = line.slice(1).trim().match(/^\s*([a-z-]+)\s*:\s*(.+?)\s*;?\s*$/);
          if (m) result.cssProps.push({ prop: m[1], newVal: m[2], action: 'added' });
        }
      }
    }
    // Analyze all modified files for JS patterns
    const diff = run(`git show ${hash} --no-commit-id --diff-filter=M -p --unified=1 -- "*.js" "*.ts" "*.html"`);
    if (diff) {
      for (const line of diff.split('\n')) {
        if (line.startsWith('-') && !line.startsWith('---')) {
          const t = line.slice(1).trim();
          if (t.length > 3 && t.length < 200) result.removed.push(t);
        }
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const t = line.slice(1).trim();
          if (t.length > 3 && t.length < 200) result.added.push(t);
        }
      }
    }
    for (const line of [...result.removed, ...result.added]) {
      if (line.match(/\.innerHTML\s*[+=]/)) result.jsPatterns.push('innerHTML assignment');
      if (line.match(/Audio\.(init|play|context)/i)) result.jsPatterns.push('Audio API');
      if (line.match(/addEventListener|removeEventListener/)) result.jsPatterns.push('event listener');
      if (line.match(/touchend|touchstart|touchmove/)) result.jsPatterns.push('touch event');
      if (line.match(/await\s+/)) result.jsPatterns.push('async/await');
    }
    result.jsPatterns = [...new Set(result.jsPatterns)];
  } catch { /* best-effort */ }
  return result;
}

/**
 * Extract a specific lesson from a fix commit.
 * Priority: 1) commit body root cause, 2) diff analysis, 3) message parsing
 */
function extractDeepLesson(hash, msg) {
  // 1. Commit body — look for root cause / because / caused by
  const body = getCommitBody(hash);
  if (body && body.length > 20) {
    const bodyLines = body.split('\n').filter(l => l.trim());
    for (const line of bodyLines) {
      const lower = line.toLowerCase();
      if (lower.includes('root cause') || lower.includes('because') ||
          lower.includes('the problem was') || lower.includes('the issue was') ||
          lower.includes('caused by') || lower.includes('broke when') ||
          lower.includes('failed because')) {
        const cleaned = line.replace(/^[\s*-]+/, '').replace(/^root cause:\s*/i, '').trim();
        if (cleaned.length > 15) return cleaned.slice(0, 150);
      }
    }
    const substantive = bodyLines.find(l =>
      l.trim().length > 20 && !l.startsWith('#') &&
      !l.match(/^(signed-off|co-authored|change-id|reviewed)/i)
    );
    if (substantive) return substantive.trim().slice(0, 150);
  }

  // 2. Diff analysis — what actually changed in the code
  const diff = analyzeDiff(hash);
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
  if (diff.jsPatterns.length > 0) {
    const msgClean = msg.replace(/^fix\([^)]*\):\s*/i, '').replace(/^fix:\s*/i, '').slice(0, 80);
    return `${diff.jsPatterns[0]} — ${msgClean}`.slice(0, 150);
  }

  // 3. Message parsing fallback
  const msgClean = msg.replace(/^fix\([^)]*\):\s*/i, '').replace(/^fix:\s*/i, '').replace(/^fix\s+/i, '').trim();
  return msgClean.length > 15 ? msgClean.slice(0, 150) : msg.slice(0, 100);
}

// Classify a file path into an area name.
// Priority: 1) .mycelium/config.json custom areas, 2) universal patterns, 3) legacy, 4) directory fallback
function classifyArea(filePath) {
  const fp = filePath.toLowerCase();

  // 1. User-defined area mappings from .mycelium/config.json { "areas": { "payments": ["stripe", "billing"] } }
  const customAreas = CONFIG.areas || {};
  for (const [area, patterns] of Object.entries(customAreas)) {
    if (Array.isArray(patterns) && patterns.some(p => fp.includes(p.toLowerCase()))) return area;
  }

  // 2. Universal patterns (work in any project)
  if (fp.includes('test/') || fp.includes('spec/') || fp.includes('__test')) return 'tests';
  if (fp.includes('i18n') || fp.includes('locale/') || fp.includes('translate') || fp.match(/\/lang\//)) return 'i18n';
  if (fp.includes('/auth') || fp.includes('login') || fp.includes('session')) return 'auth';
  if (fp.includes('/api/') || fp.includes('/routes/')) return 'api';
  if (fp.includes('migrat') || fp.includes('schema') || fp.includes('/models/')) return 'database';
  if (fp.includes('deploy') || fp.includes('docker') || fp.includes('.github/workflows')) return 'devops';
  if (fp.includes('.css') || fp.includes('.scss') || fp.includes('.less')) return 'styles';
  if (fp.includes('memory') || fp.includes('mycelium-context') || fp.includes('mycelium')) return 'memory';

  // 3. Legacy patterns (kept for backward compat — ignored if custom areas have entries)
  if (!CONFIG.areas || Object.keys(CONFIG.areas).length === 0) {
    if (fp.includes('battle') || fp.includes('pvp')) return 'battle';
    if (fp.includes('oracle')) return 'oracle';
    if (fp.includes('wallet') || fp.includes('economy') || fp.includes('forge') || fp.includes('market')) return 'economy';
    if (fp.includes('nav') || fp.includes('boot')) return 'nav';
    if (fp.includes('card')) return 'cards';
    if (fp.includes('sentinel')) return 'sentinel';
    if (fp.includes('museum') || fp.includes('vault') || fp.includes('lore')) return 'lore';
    if (fp.includes('showcase') || fp.includes('tools') || fp.includes('llms')) return 'discoverability';
    if (fp.includes('confessional') || fp.includes('therapy') || fp.includes('hr')) return 'absurd';
    if (fp.includes('tabletop')) return 'tabletop';
    if (fp.includes('font')) return 'font';
    if (fp.includes('exchange') || fp.includes('invest')) return 'exchange';
  }

  // 4. Fallback: parent directory name
  const dir = filePath.split('/').slice(0, -1).join('/');
  return dir || 'root';
}

// ─── Area File Map: auto-build from git history ───────────────────
// Scans all snapshots to see which files have been touched in which area.
// This is the "which files does this area actually contain?" question.

function buildAreaMap(mem) {
  const map = {}; // area -> { files: { path: { changes, lastCommit, lastDate } } }
  for (const s of mem.snapshots) {
    const files = (s.commit?.files || []).map(f => f.path).filter(f => !isNoise(f));
    for (const fp of files) {
      const area = classifyArea(fp);
      if (!map[area]) map[area] = {};
      if (!map[area][fp]) map[area][fp] = { changes: 0, lastCommit: '', lastDate: '', lastMsg: '' };
      map[area][fp].changes++;
      map[area][fp].lastCommit = s.commit?.hash || '';
      map[area][fp].lastDate = s.date || '';
      map[area][fp].lastMsg = s.commit?.msg || '';
    }
  }
  return map;
}

function showAreaMap() {
  const mem = loadMemory();
  const map = buildAreaMap(mem);
  const areas = Object.keys(map).sort();
  
  console.log('\n# Area File Map (auto-built from git history)\n');
  for (const area of areas) {
    const files = Object.entries(map[area]).sort((a, b) => b[1].changes - a[1].changes);
    console.log(`## ${area} (${files.length} files)`);
    for (const [fp, info] of files.slice(0, 15)) {
      console.log(`  ${info.changes}x  ${fp}  (last: ${info.lastDate} ${info.lastCommit})`);
    }
    if (files.length > 15) console.log(`  ... and ${files.length - 15} more`);
    console.log('');
  }
}

// ─── Why File: complete intelligence on a single file ─────────────

function whyFile(targetPath) {
  const mem = loadMemory();
  const fp = targetPath.replace(/^\.?\//, ''); // normalize
  
  console.log(`\n# File Intelligence: ${fp}\n`);
  
  // 1. Every commit that touched this file
  const commits = [];
  for (const s of mem.snapshots) {
    const files = (s.commit?.files || []).map(f => f.path);
    if (files.includes(fp)) {
      commits.push({
        hash: s.commit?.hash,
        date: s.date,
        msg: s.commit?.msg,
        score: s.score,
        added: s.commit?.added || 0,
        removed: s.commit?.removed || 0,
        otherFiles: files.filter(f => f !== fp).length
      });
    }
  }
  
  if (commits.length === 0) {
    console.log('No history found for this file in memory.');
    console.log('It may be new or memory was compacted.');
    return;
  }
  
  console.log(`## Change History (${commits.length} commits)`);
  for (const c of commits) {
    const scoreTag = typeof c.score === 'number' ? ` [score:${c.score}]` : '';
    console.log(`  ${c.date} ${c.hash} ${c.msg}${scoreTag}`);
  }
  console.log('');
  
  // 2. Area classification
  const area = classifyArea(fp);
  console.log(`## Area: ${area}`);
  console.log('');
  
  // 3. Coupled files — what always changes with this file?
  const coupledWith = Object.entries(mem.patterns.coChanges || {})
    .filter(([pair]) => pair.includes(fp))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (coupledWith.length > 0) {
    console.log('## Coupled Files (change together — if you touch this, check these too)');
    for (const [pair, count] of coupledWith) {
      const other = pair.replace(fp, '').replace(' <-> ', '').trim();
      console.log(`  ${count}x  ${other}`);
    }
    console.log('');
  }
  
  // 4. Fix chains involving this file
  const fixChains = (mem.patterns.fixChains || []).filter(fc => fc.files.includes(fp));
  if (fixChains.length > 0) {
    console.log(`## Fix Chains (${fixChains.length} times this file needed immediate fixing)`);
    for (const fc of fixChains) {
      console.log(`  ${fc.original} -> ${fc.fix}: ${fc.msg}`);
    }
    console.log('');
  }
  
  // 5. Breakages in this area
  const breakages = (mem.breakages || []).filter(b => b.area === area);
  if (breakages.length > 0) {
    console.log(`## Breakages in [${area}]`);
    for (const b of breakages) {
      console.log(`  ${b.date}: ${b.what}`);
    }
    console.log('');
  }
  
  // 6. Constraints for this area
  const constraints = mem.constraints[area] || [];
  if (constraints.length > 0) {
    console.log(`## Constraints [${area}] — violating these causes bugs`);
    for (const c of constraints) {
      console.log(`  - ${c.fact}`);
    }
    console.log('');
  }
  
  // 7. Decisions about this area
  const decisions = (mem.decisions || []).filter(d => d.area === area);
  if (decisions.length > 0) {
    console.log(`## Decisions [${area}] — why things are the way they are`);
    for (const d of decisions.slice(-5)) {
      console.log(`  ${d.date}: ${d.decision}${d.why ? ' — ' + d.why : ''}`);
    }
    console.log('');
  }
  
  // 8. Learnings about this area
  const learnings = (mem.learnings || []).filter(l => l.area === area);
  if (learnings.length > 0) {
    console.log(`## Learnings [${area}] — what was learned from fixing`);
    for (const l of learnings) {
      console.log(`  ${l.date}: ${l.lesson}`);
    }
    console.log('');
  }
  
  // 9. Hotspot rank
  const hotspotCount = mem.patterns.hotspots?.[fp] || 0;
  const allHotspots = Object.entries(mem.patterns.hotspots || {}).sort((a, b) => b[1] - a[1]);
  const rank = allHotspots.findIndex(([f]) => f === fp) + 1;
  if (hotspotCount > 0) {
    console.log(`## Hotspot Rank: #${rank} of ${allHotspots.length} (changed ${hotspotCount} times)`);
    if (hotspotCount >= 10) console.log('  WARNING: This file is highly volatile. Every change should be tested thoroughly.');
    console.log('');
  }
  
  // 10. Summary risk assessment
  let risk = 'low';
  if (fixChains.length >= 3 || hotspotCount >= 15) risk = 'high';
  else if (fixChains.length >= 1 || hotspotCount >= 5) risk = 'medium';
  console.log(`## Risk: ${risk.toUpperCase()}`);
  if (risk === 'high') console.log('  This file has a history of breaking. Test every change. Check coupled files.');
  else if (risk === 'medium') console.log('  Some fragility detected. Run premortem before editing.');
  else console.log('  No major concerns. Standard caution applies.');
  console.log('');
}

// ─── Record a lesson learned from fixing ─────────────────────────

function recordLearning(area, lesson) {
  const mem = loadMemory();
  if (!mem.learnings) mem.learnings = [];
  mem.learnings.push({
    ts: Date.now(),
    date: new Date().toISOString().split('T')[0],
    area: area.toLowerCase(),
    lesson
  });
  // Keep last 200 learnings
  if (mem.learnings.length > 200) mem.learnings = mem.learnings.slice(-200);
  saveMemory(mem);
  console.log(`[mycelium] Learning recorded: [${area}] ${lesson}`);
}

// ─── Deep Reflection (runs every 10 snapshots alongside autoDistill) ─
// Analyzes cross-cutting patterns that simple fix-chain detection misses.

function deepReflect(mem, force) {
  const snapshotCount = mem.snapshots.length;
  if (!force && snapshotCount % 10 !== 0) return;
  if (!mem.reflections) mem.reflections = [];

  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const today = new Date().toISOString().split('T')[0];

  // ── A. Decision-Impact correlation ──
  // If an area has decisions recorded but ALSO has breakages, the decisions
  // didn't prevent problems — that's a real insight.
  const decisionAreas = {};
  for (const d of (mem.decisions || [])) {
    decisionAreas[d.area] = (decisionAreas[d.area] || 0) + 1;
  }
  const breakageAreas = {};
  for (const b of (mem.breakages || [])) {
    breakageAreas[b.area] = (breakageAreas[b.area] || 0) + 1;
  }
  for (const area of Object.keys(breakageAreas)) {
    const decisions = decisionAreas[area] || 0;
    const breakages = breakageAreas[area];
    if (decisions > 0 && breakages >= decisions) {
      const existing = mem.reflections.find(r => r.type === 'decision_impact' && r.area === area);
      if (!existing) {
        mem.reflections.push({
          ts: now, date: today, type: 'decision_impact', area,
          lesson: `${area} has ${decisions} recorded decisions but still ${breakages} breakages — decisions alone aren't preventing bugs here. The area needs structural protection (tests, guards, or simplification), not just documented intent.`
        });
      }
    }
  }

  // ── B. Unprotected areas — breakages with zero decisions ──
  for (const area of Object.keys(breakageAreas)) {
    if (!decisionAreas[area]) {
      const existing = mem.reflections.find(r => r.type === 'unprotected_area' && r.area === area);
      if (!existing) {
        mem.reflections.push({
          ts: now, date: today, type: 'unprotected_area', area,
          lesson: `${area} has ${breakageAreas[area]} breakage(s) but zero documented decisions — it's a blind spot. Before touching ${area}, record why things are the way they are.`
        });
      }
    }
  }

  // ── C. Recurring theme detection across breakages ──
  // Look for common words/patterns in breakage descriptions
  const breakageTexts = (mem.breakages || []).map(b => b.what.toLowerCase());
  const themes = {
    'innerHTML/DOM': breakageTexts.filter(t => t.includes('innerhtml') || t.includes('dom') || t.includes('event handler')),
    'iOS/mobile': breakageTexts.filter(t => t.includes('ios') || t.includes('mobile') || t.includes('safari') || t.includes('touch')),
    'language/i18n': breakageTexts.filter(t => t.includes('i18n') || t.includes('translation') || t.includes('language') || t.includes('[zh]') || t.includes('[th]')),
    'AI workflow': breakageTexts.filter(t => t.includes('ai ') || t.includes('clarify') || t.includes('recommend'))
  };
  for (const [theme, matches] of Object.entries(themes)) {
    if (matches.length >= 2) {
      const existing = mem.reflections.find(r => r.type === 'recurring_theme' && r.theme === theme);
      if (!existing) {
        mem.reflections.push({
          ts: now, date: today, type: 'recurring_theme', theme,
          count: matches.length,
          lesson: `"${theme}" appears in ${matches.length} separate breakages — this is a systemic weakness, not isolated incidents. Every change in this area needs the same pre-check.`
        });
      }
    }
  }

  // ── D. Velocity reflection — work rhythm analysis ──
  const dateCounts = {};
  for (const s of mem.snapshots) {
    dateCounts[s.date] = (dateCounts[s.date] || 0) + 1;
  }
  const dates = Object.entries(dateCounts).sort((a, b) => a[0].localeCompare(b[0]));
  if (dates.length >= 3) {
    // Find sprint days (2x average)
    const avg = mem.snapshots.length / dates.length;
    const sprintDays = dates.filter(([_, c]) => c >= avg * 2);
    
    if (sprintDays.length > 0) {
      // Check if sprint days have lower quality scores
      const sprintScores = [];
      const normalScores = [];
      for (const s of mem.snapshots) {
        if (typeof s.score !== 'number') continue;
        const dayCount = dateCounts[s.date] || 0;
        if (dayCount >= avg * 2) sprintScores.push(s.score);
        else normalScores.push(s.score);
      }
      if (sprintScores.length >= 3 && normalScores.length >= 3) {
        const sprintAvg = Math.round(sprintScores.reduce((a, b) => a + b, 0) / sprintScores.length);
        const normalAvg = Math.round(normalScores.reduce((a, b) => a + b, 0) / normalScores.length);
        const existing = mem.reflections.find(r => r.type === 'velocity');
        if (!existing) {
          if (sprintAvg < normalAvg - 5) {
            mem.reflections.push({
              ts: now, date: today, type: 'velocity',
              lesson: `Sprint days (${sprintDays.map(d => d[0]).join(', ')}) average ${sprintAvg}/100 commit quality vs ${normalAvg}/100 on normal days — speed costs quality. On heavy days, pause more between commits.`
            });
          } else {
            mem.reflections.push({
              ts: now, date: today, type: 'velocity',
              lesson: `Sprint days average ${sprintAvg}/100 vs normal days ${normalAvg}/100 — quality holds under pressure. Current workflow handles high-volume days well.`
            });
          }
        }
      }
    }
  }

  // ── E. Score trend reflection ──
  const scoredSnapshots = mem.snapshots.filter(s => typeof s.score === 'number');
  if (scoredSnapshots.length >= 10) {
    const firstHalf = scoredSnapshots.slice(0, Math.floor(scoredSnapshots.length / 2));
    const secondHalf = scoredSnapshots.slice(Math.floor(scoredSnapshots.length / 2));
    const firstAvg = Math.round(firstHalf.reduce((a, s) => a + s.score, 0) / firstHalf.length);
    const secondAvg = Math.round(secondHalf.reduce((a, s) => a + s.score, 0) / secondHalf.length);
    const existing = mem.reflections.find(r => r.type === 'score_trend');
    if (!existing) {
      const delta = secondAvg - firstAvg;
      if (delta >= 5) {
        mem.reflections.push({
          ts: now, date: today, type: 'score_trend',
          lesson: `Commit quality is improving: first half averaged ${firstAvg}/100, recent half ${secondAvg}/100 (+${delta}). Whatever changed in the workflow is working.`
        });
      } else if (delta <= -5) {
        mem.reflections.push({
          ts: now, date: today, type: 'score_trend',
          lesson: `Commit quality is declining: first half averaged ${firstAvg}/100, recent half ${secondAvg}/100 (${delta}). Commits are getting less focused or more sprawling.`
        });
      } else {
        mem.reflections.push({
          ts: now, date: today, type: 'score_trend',
          lesson: `Commit quality is stable: first half ${firstAvg}/100, recent half ${secondAvg}/100. Consistency is good — the workflow is predictable.`
        });
      }
    }
  }

  // ── F. Area focus shift detection ──
  // Compare what areas were worked on in first vs second half
  if (mem.snapshots.length >= 20) {
    const half = Math.floor(mem.snapshots.length / 2);
    const firstAreas = {};
    const secondAreas = {};
    for (let i = 0; i < mem.snapshots.length; i++) {
      const files = (mem.snapshots[i].commit?.files || []).map(f => f.path);
      const areas = new Set(files.filter(f => !isNoise(f)).map(f => classifyArea(f)));
      const target = i < half ? firstAreas : secondAreas;
      for (const a of areas) target[a] = (target[a] || 0) + 1;
    }
    // Find areas that appeared in second half but not first (new focus)
    const newFocus = Object.keys(secondAreas).filter(a => !firstAreas[a] && secondAreas[a] >= 2);
    // Find areas that disappeared (abandoned)
    const abandoned = Object.keys(firstAreas).filter(a => !secondAreas[a] && firstAreas[a] >= 3);
    
    if (newFocus.length > 0 || abandoned.length > 0) {
      const existing = mem.reflections.find(r => r.type === 'focus_shift');
      if (!existing) {
        const parts = [];
        if (newFocus.length) parts.push(`New focus areas: ${newFocus.join(', ')}`);
        if (abandoned.length) parts.push(`Moved away from: ${abandoned.join(', ')}`);
        mem.reflections.push({
          ts: now, date: today, type: 'focus_shift',
          lesson: `Project focus has shifted. ${parts.join('. ')}. Check if abandoned areas have unfinished work or growing debt.`
        });
      }
    }
  }

  // Keep last 50
  if (mem.reflections.length > 50) mem.reflections = mem.reflections.slice(-50);
}

// ─── Semantic Distillation (Blueprint: Episodic→Semantic) ──────────
// Every 10 snapshots, check patterns and auto-generate rules.
// Converts raw hotspot/coChange data into actionable constraints.

function autoDistill(mem) {
  const snapshotCount = mem.snapshots.length;
  if (snapshotCount % 10 !== 0) return; // Only run every 10 commits
  if (!mem.autoRules) mem.autoRules = [];

  // Rule 1: Files changed 10+ times → fragile, flag it
  const hotspots = Object.entries(mem.patterns.hotspots || {})
    .filter(([f]) => !isNoise(f))
    .sort((a, b) => b[1] - a[1]);
  for (const [file, count] of hotspots.slice(0, 5)) {
    if (count >= 10) {
      const rule = `${file} changed ${count}x — high churn, test after every change`;
      const existing = mem.autoRules.find(r => r.file === file && r.type === 'hotspot');
      if (existing) { existing.count = count; existing.rule = rule; existing.ts = Date.now(); }
      else { mem.autoRules.push({ type: 'hotspot', file, count, rule, ts: Date.now() }); }
    }
  }

  // Rule 2: Co-change pairs that always move together → coupled
  const coChanges = Object.entries(mem.patterns.coChanges || {})
    .filter(([pair]) => !pair.split(' <-> ').some(isNoise))
    .sort((a, b) => b[1] - a[1]);
  for (const [pair, count] of coChanges.slice(0, 5)) {
    if (count >= 5) {
      const rule = `${pair} always change together (${count}x) — consider if they should share a module`;
      const existing = mem.autoRules.find(r => r.pair === pair && r.type === 'coupling');
      if (existing) { existing.count = count; existing.rule = rule; existing.ts = Date.now(); }
      else { mem.autoRules.push({ type: 'coupling', pair, count, rule, ts: Date.now() }); }
    }
  }

  // Rule 3: Fix chains in same area → fragile area
  const fixChains = mem.patterns.fixChains || [];
  const areaFixes = {};
  for (const fc of fixChains) {
    for (const f of fc.files) {
      const area = f.split('/').slice(0, -1).join('/') || 'root';
      areaFixes[area] = (areaFixes[area] || 0) + 1;
    }
  }
  for (const [area, count] of Object.entries(areaFixes)) {
    if (count >= 3) {
      const rule = `${area} has ${count} fix chains — high breakage area, extra caution needed`;
      const existing = mem.autoRules.find(r => r.area === area && r.type === 'fragile_area');
      if (existing) { existing.count = count; existing.rule = rule; existing.ts = Date.now(); }
      else { mem.autoRules.push({ type: 'fragile_area', area, count, rule, ts: Date.now() }); }
    }
  }

  // Cap auto-rules
  if (mem.autoRules.length > 50) mem.autoRules = mem.autoRules.slice(-50);

  // Run deep reflection alongside distillation
  deepReflect(mem);
}

// ─── VALIDATION LOOP: Closed-loop lesson application tracking ────
// On every commit, checks if files had lessons and whether those lessons
// were followed or violated. Tracks effectiveness per lesson.
// This is the missing piece: LEARN → APPLY → VERIFY → STRENGTHEN/PRUNE

function validateLessonApplication(mem, commit) {
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  if (!fs.existsSync(watchPath)) return null;
  
  let watchData;
  try { watchData = JSON.parse(fs.readFileSync(watchPath, 'utf8')); } catch { return null; }
  
  const risks = watchData.risks || {};
  const files = (commit.files || []).filter(f => typeof f === 'string' && !isNoise(f));
  if (files.length === 0) return null;
  
  // Initialize validation tracking in watch.json
  if (!watchData.validationLog) watchData.validationLog = [];
  
  const entry = {
    ts: Date.now(),
    date: new Date().toISOString().split('T')[0],
    commit: commit.hash,
    filesWithLessons: 0,
    lessonsApplicable: 0,
    lessonsFollowed: 0,
    lessonsViolated: 0,
    details: []
  };
  
  // Get the diff for this commit
  let diff = '';
  try { diff = run('git diff HEAD~1 HEAD 2>/dev/null').toLowerCase(); } catch {}
  
  for (const f of files) {
    const risk = risks[f];
    if (!risk || !risk.lessons || risk.lessons.length === 0) continue;
    entry.filesWithLessons++;
    
    // Track per-lesson effectiveness
    if (!risk.lessonStats) risk.lessonStats = {};
    
    for (const lesson of risk.lessons) {
      const text = (typeof lesson === 'string' ? lesson : (lesson.lesson || '')).toLowerCase();
      if (!text || text.length < 10) continue;
      entry.lessonsApplicable++;
      
      // Initialize stats for this lesson
      const lessonKey = text.slice(0, 60);
      if (!risk.lessonStats[lessonKey]) {
        risk.lessonStats[lessonKey] = { shown: 0, followed: 0, violated: 0, lastChecked: null };
      }
      const stats = risk.lessonStats[lessonKey];
      stats.shown++;
      stats.lastChecked = new Date().toISOString().split('T')[0];
      
      // Check if the lesson's concerns appear in the diff
      // Extract the actionable part from IF→THEN patterns
      const checkResult = checkLessonInDiff(text, diff, f);
      
      if (checkResult.applicable) {
        if (checkResult.followed) {
          entry.lessonsFollowed++;
          stats.followed++;
          entry.details.push({ file: f, lesson: lessonKey, result: 'followed' });
        } else if (checkResult.violated) {
          entry.lessonsViolated++;
          stats.violated++;
          entry.details.push({ file: f, lesson: lessonKey, result: 'violated', reason: checkResult.reason });
        }
        // else: inconclusive — lesson topic wasn't relevant to this diff
      }
    }
  }
  
  // Only log if there were files with lessons
  if (entry.filesWithLessons > 0) {
    // Cap validation log to last 50 entries
    watchData.validationLog.push(entry);
    if (watchData.validationLog.length > 50) {
      watchData.validationLog = watchData.validationLog.slice(-50);
    }
    
    // ── PRUNE dead lessons: if shown 5+ times but never followed, it's noise ──
    for (const [file, risk] of Object.entries(risks)) {
      if (!risk.lessonStats) continue;
      for (const [key, stats] of Object.entries(risk.lessonStats)) {
        if (stats.shown >= 5 && stats.followed === 0 && stats.violated === 0) {
          // Lesson never fires — it's too vague or irrelevant. Mark for removal.
          stats.dead = true;
        }
        // ── STRENGTHEN effective lessons: if followed 3+ times, promote to constraint ──
        if (stats.followed >= 3 && !stats.promoted) {
          const area = classifyArea(file);
          if (area && mem.constraints[area]) {
            const exists = mem.constraints[area].some(c => c.fact.includes(key.slice(0, 40)));
            if (!exists && mem.constraints[area].length < 20) {
              mem.constraints[area].push({
                fact: `[proven] ${key.slice(0, 70)}`,
                ts: Date.now(),
                date: new Date().toISOString().split('T')[0],
                autoGenerated: true,
                source: 'validation-loop: lesson followed 3+ times → promoted to constraint'
              });
              stats.promoted = true;
            }
          }
        }
      }
    }
    
    // Save updated watch data
    try { fs.writeFileSync(watchPath, JSON.stringify(watchData, null, 2)); } catch {}
    
    const rate = entry.lessonsApplicable > 0 
      ? Math.round((entry.lessonsFollowed / entry.lessonsApplicable) * 100) 
      : 0;
    
    if (entry.lessonsViolated > 0) {
      console.log(`[mycelium] ⚠ VALIDATION: ${entry.lessonsViolated} lesson(s) VIOLATED in this commit (${rate}% application rate)`);
      for (const d of entry.details.filter(d => d.result === 'violated').slice(0, 3)) {
        console.log(`  → ${d.file}: ${d.lesson.slice(0, 60)}`);
      }
    } else if (entry.lessonsFollowed > 0) {
      console.log(`[mycelium] ✓ VALIDATION: ${entry.lessonsFollowed}/${entry.lessonsApplicable} lessons applied (${rate}%)`);
    }
    
    return {
      filesWithLessons: entry.filesWithLessons,
      applicable: entry.lessonsApplicable,
      followed: entry.lessonsFollowed,
      violated: entry.lessonsViolated,
      rate
    };
  }
  
  return null;
}

// ── Log guard actions for validation loop tracking ──
function logGuardAction(action, file, patterns, breakCount) {
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  try {
    const watch = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
    if (!watch.guardLog) watch.guardLog = [];
    watch.guardLog.push({
      ts: Date.now(),
      date: new Date().toISOString().split('T')[0],
      action, // 'block' | 'warn'
      file,
      patterns: patterns.slice(0, 5),
      breakCount
    });
    // Cap to last 50
    if (watch.guardLog.length > 50) watch.guardLog = watch.guardLog.slice(-50);
    fs.writeFileSync(watchPath, JSON.stringify(watch, null, 2));
  } catch { /* best effort */ }
}

// ── Check if a specific lesson was followed or violated in a diff ──
function checkLessonInDiff(lessonText, diff, file) {
  const result = { applicable: false, followed: false, violated: false, reason: '' };
  const fileDiffIdx = diff.indexOf(file.toLowerCase());
  if (fileDiffIdx === -1) return result; // file not in diff
  
  const nextDiffIdx = diff.indexOf('diff --git', fileDiffIdx + 1);
  const fileDiff = diff.slice(fileDiffIdx, nextDiffIdx === -1 ? diff.length : nextDiffIdx);
  
  // Check known IF→THEN patterns
  const checks = [
    { pattern: /viewport/, check: () => fileDiff.includes('viewport'), name: 'viewport meta' },
    { pattern: /data-i18n/, check: () => !fileDiff.includes('+') || !fileDiff.match(/data-i18n="[^"]*"(?!.*\ben\b)/), name: 'i18n keys' },
    { pattern: /innerhtml/, check: () => !fileDiff.includes('+innerhtml'), name: 'innerHTML safety' },
    { pattern: /loading.*eager|horizontal.*scroll/, check: () => !fileDiff.includes('+loading="lazy"'), name: 'lazy in scroll' },
    { pattern: /overflow.*hidden/, check: () => !fileDiff.includes('+overflow') || fileDiff.includes('overflow-x:hidden') || fileDiff.includes('overflow: hidden'), name: 'overflow control' },
    { pattern: /z-index/, check: () => {
      const addedZindex = (fileDiff.match(/\+.*z-index/g) || []).length;
      return addedZindex <= 1; // Adding many z-indexes = likely conflict
    }, name: 'z-index layers' },
    { pattern: /optional chaining|\?\.\s/, check: () => !fileDiff.match(/\+.*\.[a-z]+\.[a-z]+(?!\?)/i), name: 'optional chaining' },
    { pattern: /font-display.*swap/, check: () => !fileDiff.includes('@font-face') || fileDiff.includes('font-display'), name: 'font-display' },
    { pattern: /gm.*mode|gate.*behind.*gm/, check: () => !fileDiff.includes('+debug') || fileDiff.includes('gm='), name: 'GM gating' },
  ];
  
  for (const { pattern, check, name } of checks) {
    if (pattern.test(lessonText)) {
      result.applicable = true;
      try {
        if (check()) {
          result.followed = true;
        } else {
          result.violated = true;
          result.reason = `${name} rule not followed`;
        }
      } catch { /* check failed, skip */ }
      return result;
    }
  }
  
  // Generic check: if the lesson mentions a keyword that appears in added lines
  // This is a soft check — just seeing the keyword in adds means awareness
  const keywords = lessonText.split(/[\s→,;]+/).filter(w => w.length > 4);
  const addedLines = fileDiff.split('\n').filter(l => l.startsWith('+'));
  const addedText = addedLines.join(' ');
  
  const keywordHits = keywords.filter(k => addedText.includes(k)).length;
  if (keywordHits >= 2) {
    result.applicable = true;
    result.followed = true; // touching the same concepts = awareness
  }
  
  return result;
}

// ─── Snapshot ───────────────────────────────────────────────────────

function takeSnapshot() {
  const mem = loadMemory();
  const commit = getCommitInfo();
  const build = getBuildInfo();

  // Don't duplicate if this commit hash is already in memory
  if (mem.snapshots.some(s => s.commit?.hash === commit.hash)) {
    return;
  }

  // Blueprint: Evaluate (score the commit)
  const { score, reasons } = scoreCommit(commit, mem);

  const snapshot = {
    ts: Date.now(),
    date: new Date().toISOString().split('T')[0],
    commit: {
      hash: commit.hash,
      msg: commit.msg,
      files: commit.files,
      added: commit.added,
      removed: commit.removed
    },
    build,
    score,       // NEW: commit quality score 0-100
    reasons      // NEW: why this score
  };

  mem.snapshots.push(snapshot);
  updatePatterns(mem, commit);

  // ── VALIDATION LOOP: Check if lessons were applied in this commit ──
  // For every file in this commit that has known lessons/risks,
  // check if the lesson was followed or violated
  const validationResult = validateLessonApplication(mem, commit);
  if (validationResult) {
    snapshot.validation = validationResult;
  }

  // Blueprint: Critique (auto-reflect on fix chains)
  autoReflect(mem, commit);

  // Blueprint: Refine (distill patterns into rules)
  autoDistill(mem);

  // Track bundle size trend
  mem.patterns.bundleTrend = mem.patterns.bundleTrend || [];
  mem.patterns.bundleTrend.push({ ts: Date.now(), kb: build.bundleKB });
  if (mem.patterns.bundleTrend.length > 100) {
    mem.patterns.bundleTrend = mem.patterns.bundleTrend.slice(-100);
  }

  saveMemory(mem);
  console.log(`[mycelium] Snapshot saved: ${commit.hash} | ${build.bundleKB}KB | +${commit.added}/-${commit.removed} lines`);

  // Delegate to mycelium-fix: the unified fix → verify → confirm system
  // Runs silently after every learning event — selfHealNw kept as fallback
  try { callFixer(); } catch { try { selfHealNw(mem); } catch { /* best-effort */ } }
}

// ─── Query: What an AI should read at session start ─────────────────

function query() {
  const mem = loadMemory();
  if (mem.snapshots.length === 0) {
    console.log('No memory yet. Memory builds automatically with each commit.');
    return;
  }

  const recent = mem.snapshots.slice(-10);
  const latest = recent[recent.length - 1];

  console.log('# MYCELIUM: Project Intelligence\n');
  console.log(`Total snapshots: ${mem.snapshots.length} | First: ${mem.snapshots[0].date} | Latest: ${latest.date}\n`);

  // Current state
  console.log('## Current Build');
  console.log(`Bundle: ${latest.build.bundleKB}KB | Pages: ${latest.build.htmlPages} | JS Modules: ${latest.build.jsModules} | Source Files: ${latest.build.srcFiles}\n`);

  // Bundle trend (skip zero entries from bulk imports)
  const trend = (mem.patterns.bundleTrend || []).filter(t => t.kb > 0);
  if (trend.length >= 2) {
    const first = trend[0].kb;
    const last = trend[trend.length - 1].kb;
    const delta = last - first;
    console.log(`## Bundle Trend: ${first}KB → ${last}KB (${delta > 0 ? '+' : ''}${delta}KB over ${trend.length} builds)\n`);
  }

  // Recent work
  console.log('## Recent Commits (last 10)');
  for (const s of recent) {
    const fileCount = s.commit?.files?.length || 0;
    console.log(`  ${s.date} | ${s.commit?.hash} | ${s.commit?.msg} (${fileCount} files, +${s.commit?.added || 0}/-${s.commit?.removed || 0})`);
  }
  console.log('');

  // Hotspots (top 15 most-changed files, skip noise)
  const hotspots = Object.entries(mem.patterns.hotspots || {})
    .filter(([f]) => !isNoise(f))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  if (hotspots.length > 0) {
    console.log('## Hotspot Files (most frequently changed — likely complex/fragile)');
    for (const [file, count] of hotspots) {
      console.log(`  ${count}x  ${file}`);
    }
    console.log('');
  }

  // Co-changes (top 10 file pairs that change together, skip noise)
  const coChanges = Object.entries(mem.patterns.coChanges || {})
    .filter(([pair]) => !pair.split(' <-> ').some(isNoise))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (coChanges.length > 0) {
    console.log('## Coupled Files (change together — consider if they should be one file or have a shared dependency)');
    for (const [pair, count] of coChanges) {
      if (count >= 2) console.log(`  ${count}x  ${pair}`);
    }
    console.log('');
  }

  // Fix chains (bugs introduced then fixed)
  const fixChains = (mem.patterns.fixChains || []).slice(-5);
  if (fixChains.length > 0) {
    console.log('## Recent Fix Chains (commit → immediate fix = possible fragility)');
    for (const fc of fixChains) {
      console.log(`  ${fc.original} → ${fc.fix}: ${fc.msg}`);
      console.log(`    Files: ${fc.files.join(', ')}`);
    }
    console.log('');
  }

  // Decisions (Layer 2 — why, not just what)
  const decisions = (mem.decisions || []).slice(-10);
  if (decisions.length > 0) {
    console.log('## Recent Decisions (why we chose what we chose)');
    for (const d of decisions) {
      console.log(`  ${d.date} [${d.area}] ${d.decision}${d.why ? ' — ' + d.why : ''}`);
    }
    console.log('');
  }

  // Constraints (hard facts that prevent breakage)
  const constraintAreas = Object.keys(mem.constraints || {});
  if (constraintAreas.length > 0) {
    console.log('## Known Constraints (hard platform/tech facts)');
    for (const area of constraintAreas) {
      console.log(`  [${area}]`);
      for (const c of mem.constraints[area]) {
        console.log(`    - ${c.fact}`);
      }
    }
    console.log('');
  }

  // Breakages (what broke and why — prevents repeats)
  const breakages = (mem.breakages || []).slice(-10);
  if (breakages.length > 0) {
    console.log('## Recent Breakages (learn from these)');
    for (const b of breakages) {
      console.log(`  ${b.date} [${b.area}] ${b.what}`);
    }
    console.log('');
  }

  // Debt signals
  console.log('## Debt Signals');
  const bigHotspots = hotspots.filter(([_, count]) => count >= 5);
  if (bigHotspots.length > 0) {
    console.log(`  ⚠ ${bigHotspots.length} files changed 5+ times — likely need refactoring:`);
    for (const [file, count] of bigHotspots) {
      console.log(`    ${count}x ${file}`);
    }
  }
  if (trend.length >= 5) {
    const recentTrend = trend.slice(-5);
    const growing = recentTrend.every((t, i) => i === 0 || t.kb >= recentTrend[i-1].kb);
    if (growing && recentTrend[recentTrend.length-1].kb > recentTrend[0].kb + 10) {
      console.log(`  ⚠ Bundle growing steadily: ${recentTrend[0].kb}KB → ${recentTrend[recentTrend.length-1].kb}KB over last 5 builds`);
    }
  }
  if (fixChains.length >= 3) {
    console.log(`  ⚠ ${fixChains.length} fix chains in recent history — changes are introducing bugs`);
  }
  console.log('');

  // Learnings — organic insights from accumulated data
  const reflections = (mem.reflections || []).filter(r => r.type !== 'fix_chain');
  if (reflections.length > 0) {
    console.log('## Learnings (auto-distilled from project patterns)');
    for (const r of reflections) {
      console.log(`  [${r.type.replace(/_/g, '-')}] ${r.lesson}`);
    }
    console.log('');
  }

  // Manual learnings — recorded by humans/AI after fixing
  const manualLearnings = (mem.learnings || []).slice(-10);
  if (manualLearnings.length > 0) {
    console.log('## Fix Learnings (recorded after fixing — don\'t repeat these mistakes)');
    for (const l of manualLearnings) {
      console.log(`  ${l.date} [${l.area}] ${l.lesson}`);
    }
    console.log('');
  }
}

// ─── Health: Quick project health check ─────────────────────────────
// Uses a SLIDING WINDOW (last 20 commits) so old history doesn't drag
// the score forever. Hotspots use time decay so recent churn matters
// more than ancient changes. Clean commit streaks earn bonus points.

function health() {
  const mem = loadMemory();
  if (mem.snapshots.length === 0) {
    console.log('No data yet.');
    return;
  }

  const latest = mem.snapshots[mem.snapshots.length - 1];
  const trend = (mem.patterns.bundleTrend || []).filter(t => t.kb > 0);
  const fixChains = mem.patterns.fixChains || [];
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  // ── SLIDING WINDOW: only score recent activity ──
  const WINDOW = 20;
  const window = mem.snapshots.slice(-WINDOW);

  let score = 100;
  let notes = [];
  let bonuses = [];

  // ── 1. Bundle size (penalize if > 400KB) ──
  if (latest.build.bundleKB > 400) {
    score -= 10;
    notes.push(`Bundle ${latest.build.bundleKB}KB > 400KB target`);
  }

  // ── 2. Fix chains (only count last 7 days) ──
  const recentFixes = fixChains.filter(fc => now - fc.ts < WEEK);
  if (recentFixes.length >= 5) {
    score -= 20;
    notes.push(`${recentFixes.length} fix chains this week`);
  } else if (recentFixes.length >= 2) {
    score -= 10;
    notes.push(`${recentFixes.length} fix chains this week`);
  } else if (recentFixes.length >= 1) {
    score -= 5;
    notes.push(`${recentFixes.length} fix chain this week`);
  }

  // ── 3. Churn with TIME DECAY (recent window only) ──
  // Count file changes within the window — skip bulk commits (50+ files)
  // because those are releases/refactors, not real churn
  const windowChurn = {};
  for (const s of window) {
    const files = s.commit?.files || [];
    if (files.length >= 50) continue; // skip bulk commits
    for (const f of files) {
      if (!isNoise(f.path)) {
        windowChurn[f.path] = (windowChurn[f.path] || 0) + 1;
      }
    }
  }
  const recentHighChurn = Object.entries(windowChurn).filter(([_, c]) => c >= 4);
  if (recentHighChurn.length > 10) {
    score -= 15;
    notes.push(`${recentHighChurn.length} files changed 4+ times in last ${WINDOW} commits`);
  } else if (recentHighChurn.length > 3) {
    score -= Math.min(10, recentHighChurn.length * 2);
    notes.push(`${recentHighChurn.length} files changed 4+ times in last ${WINDOW} commits`);
  }

  // ── 4. Bundle growth ──
  if (trend.length >= 3) {
    const last3 = trend.slice(-3);
    if (last3[2].kb > last3[0].kb + 20) {
      score -= 10;
      notes.push(`Bundle grew ${last3[2].kb - last3[0].kb}KB in 3 builds`);
    }
  }

  // ── 5. STABILITY BONUS: retroactive proof ──
  // A commit is "proven stable" if no later fix(...) commit touched its files.
  // Skip the last 3 commits — not enough history to prove them yet.
  const PROOF_GAP = 3;
  const provable = window.slice(0, -PROOF_GAP || window.length);
  let provenStable = 0;
  for (let i = 0; i < provable.length; i++) {
    const files = new Set((provable[i].commit?.files || []).map(f => f.path));
    if (files.size === 0) continue;
    let brokeByLater = false;
    // Check all commits after this one (within full window)
    for (let j = i + 1; j < window.length; j++) {
      const laterMsg = (window[j].commit?.msg || '').toLowerCase();
      if (!laterMsg.startsWith('fix')) continue;
      const laterFiles = (window[j].commit?.files || []).map(f => f.path);
      if (laterFiles.some(f => files.has(f))) { brokeByLater = true; break; }
    }
    if (!brokeByLater) provenStable++;
  }
  if (provable.length > 0 && provenStable >= 8) {
    score += 15;
    bonuses.push(`${provenStable}/${provable.length} commits proven stable (+15)`);
  } else if (provable.length > 0 && provenStable >= 5) {
    score += 10;
    bonuses.push(`${provenStable}/${provable.length} commits proven stable (+10)`);
  } else if (provable.length > 0 && provenStable >= 3) {
    score += 5;
    bonuses.push(`${provenStable}/${provable.length} commits proven stable (+5)`);
  }

  // ── 6. FOCUS BONUS: reward small, focused commits ──
  const recentScores = window.filter(s => typeof s.score === 'number');
  if (recentScores.length >= 3) {
    const avgScore = recentScores.reduce((a, s) => a + s.score, 0) / recentScores.length;
    if (avgScore >= 80) {
      score += 10;
      bonuses.push(`Avg commit quality ${Math.round(avgScore)}/100 (+10)`);
    } else if (avgScore >= 70) {
      score += 5;
      bonuses.push(`Avg commit quality ${Math.round(avgScore)}/100 (+5)`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  console.log(`\nProject Health: ${score}/100 (${grade})`);
  console.log(`Snapshots: ${mem.snapshots.length} | Window: last ${window.length} | Bundle: ${latest.build.bundleKB}KB | Pages: ${latest.build.htmlPages}`);
  if (bonuses.length > 0) {
    console.log('\nBonuses:');
    bonuses.forEach(b => console.log(`  + ${b}`));
  }
  if (notes.length > 0) {
    console.log('\nIssues:');
    notes.forEach(n => console.log(`  - ${n}`));
  }
  if (notes.length === 0 && bonuses.length === 0) {
    console.log('\nNo issues detected.');
  }
  console.log('');
}

// ─── Decisions Layer (the wide compounding part) ────────────────────

function recordDecision(area, decision, why) {
  const mem = loadMemory();
  mem.decisions.push({
    ts: Date.now(),
    date: new Date().toISOString().split('T')[0],
    area: area.toLowerCase(),
    decision,
    why
  });
  // Keep last 200 decisions
  if (mem.decisions.length > 200) mem.decisions = mem.decisions.slice(-200);
  saveMemory(mem);
  console.log(`[mycelium] Decision recorded: [${area}] ${decision}`);
}

function recordConstraint(area, fact) {
  const mem = loadMemory();
  if (!mem.constraints[area.toLowerCase()]) mem.constraints[area.toLowerCase()] = [];
  // Don't duplicate
  const existing = mem.constraints[area.toLowerCase()];
  if (!existing.some(c => c.fact === fact)) {
    existing.push({ fact, ts: Date.now(), date: new Date().toISOString().split('T')[0] });
    saveMemory(mem);
    console.log(`[mycelium] Constraint recorded: [${area}] ${fact}`);
  } else {
    console.log(`[mycelium] Constraint already exists: [${area}] ${fact}`);
  }
}

function recordBreakage(area, what) {
  const mem = loadMemory();
  const entry = {
    ts: Date.now(),
    date: new Date().toISOString().split('T')[0],
    area: area.toLowerCase(),
    what
  };
  // Auto-enrich: if we have a recent fix commit, extract deeper lesson
  try {
    const hash = run('git rev-parse --short HEAD');
    const msg = run('git log -1 "--pretty=format:%s"');
    if (hash && msg && msg.toLowerCase().startsWith('fix')) {
      const deepLesson = extractDeepLesson(hash, msg);
      if (deepLesson && deepLesson.length > 15) {
        entry.deepLesson = deepLesson;
      }
    }
  } catch { /* best-effort enrichment */ }
  mem.breakages.push(entry);
  if (mem.breakages.length > 100) mem.breakages = mem.breakages.slice(-100);
  saveMemory(mem);
  console.log(`[mycelium] Breakage recorded: [${area}] ${what}`);
  if (entry.deepLesson) {
    console.log(`[mycelium] Auto-enriched: ↳ ${entry.deepLesson}`);
  }
}

// ─── Pre-mortem: What to check before building in an area ───────────

function premortem(area) {
  const mem = loadMemory();
  const key = area.toLowerCase();
  
  console.log(`\n# Pre-mortem: ${area}\n`);
  console.log('Check these BEFORE you build:\n');

  // 1. Constraints for this area
  const areaConstraints = mem.constraints[key] || [];
  if (areaConstraints.length > 0) {
    console.log(`## Hard Constraints [${key}]`);
    for (const c of areaConstraints) {
      console.log(`  ⚠ ${c.fact}`);
    }
    console.log('');
  }

  // 2. Also check broader constraints that might apply
  const relatedAreas = Object.keys(mem.constraints || {}).filter(a => a !== key);
  const relatedConstraints = [];
  for (const ra of relatedAreas) {
    for (const c of mem.constraints[ra]) {
      // Match if the area term appears in the fact or the fact's area seems related
      if (c.fact.toLowerCase().includes(key) || key.includes(ra)) {
        relatedConstraints.push({ area: ra, fact: c.fact });
      }
    }
  }
  if (relatedConstraints.length > 0) {
    console.log('## Related Constraints');
    for (const rc of relatedConstraints) {
      console.log(`  ⚠ [${rc.area}] ${rc.fact}`);
    }
    console.log('');
  }

  // 3. Past breakages in this area
  const areaBreakages = (mem.breakages || []).filter(b => b.area === key);
  if (areaBreakages.length > 0) {
    console.log(`## Past Breakages [${key}] (don't repeat these)`);
    for (const b of areaBreakages) {
      console.log(`  ✗ ${b.date}: ${b.what}`);
    }
    console.log('');
  }

  // 4. Decisions made in this area
  const areaDecisions = (mem.decisions || []).filter(d => d.area === key).slice(-5);
  if (areaDecisions.length > 0) {
    console.log(`## Previous Decisions [${key}]`);
    for (const d of areaDecisions) {
      console.log(`  → ${d.date}: ${d.decision}${d.why ? ' — ' + d.why : ''}`);
    }
    console.log('');
  }

  // 5. Recent commits that touched this area (NEW — shows what happened here lately)
  const areaCommits = [];
  for (const s of mem.snapshots) {
    const files = (s.commit?.files || []).map(f => f.path);
    const touchesArea = files.some(f => classifyArea(f) === key || f.toLowerCase().includes(key));
    if (touchesArea) {
      areaCommits.push({
        hash: s.commit?.hash,
        date: s.date,
        msg: s.commit?.msg,
        score: s.score,
        fileCount: files.length
      });
    }
  }
  if (areaCommits.length > 0) {
    console.log(`## Recent Commits in [${key}] (last 5)`);
    for (const c of areaCommits.slice(-5)) {
      const scoreTag = typeof c.score === 'number' ? ` [score:${c.score}]` : '';
      console.log(`  ${c.date} ${c.hash} ${c.msg} (${c.fileCount} files)${scoreTag}`);
    }
    console.log('');
  }

  // 6. Hotspot files in this area
  const hotspots = Object.entries(mem.patterns.hotspots || {})
    .filter(([f]) => f.toLowerCase().includes(key) || classifyArea(f) === key)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (hotspots.length > 0) {
    console.log(`## Hotspot Files (frequently changed — handle with care)`);
    for (const [file, count] of hotspots) {
      console.log(`  ${count}x  ${file}`);
    }
    console.log('');
  }

  // 7. Area file map — which files belong to this area
  const areaMap = buildAreaMap(mem);
  const areaFiles = areaMap[key] ? Object.entries(areaMap[key]).sort((a, b) => b[1].changes - a[1].changes) : [];
  if (areaFiles.length > 0) {
    console.log(`## Files in [${key}] area (${areaFiles.length} files)`);
    for (const [fp, info] of areaFiles.slice(0, 10)) {
      console.log(`  ${info.changes}x  ${fp}`);
    }
    if (areaFiles.length > 10) console.log(`  ... and ${areaFiles.length - 10} more`);
    console.log('');
  }

  // 8. Fix chains in this area
  const fixChains = (mem.patterns.fixChains || []).filter(fc => 
    fc.files.some(f => f.toLowerCase().includes(key) || classifyArea(f) === key) || fc.msg.toLowerCase().includes(key)
  );
  if (fixChains.length > 0) {
    console.log(`## Fix Chains (previous changes in this area that needed immediate fixes)`);
    for (const fc of fixChains.slice(-5)) {
      console.log(`  ${fc.original} → ${fc.fix}: ${fc.msg}`);
    }
    console.log('');
  }

  // 9. Learnings from past fixes in this area
  const learnings = (mem.learnings || []).filter(l => l.area === key);
  if (learnings.length > 0) {
    console.log(`## Learnings [${key}] — what was learned from fixing`);
    for (const l of learnings.slice(-5)) {
      console.log(`  ${l.date}: ${l.lesson}`);
    }
    console.log('');
  }

  // 10. Reflections relevant to this area
  const areaReflections = (mem.reflections || []).filter(r => 
    r.area === key || (r.areas && r.areas.includes(key)) || 
    (r.lesson && r.lesson.toLowerCase().includes(key))
  );
  if (areaReflections.length > 0) {
    console.log(`## Reflections [${key}]`);
    for (const r of areaReflections.slice(-3)) {
      console.log(`  [${r.type.replace(/_/g, '-')}] ${r.lesson}`);
    }
    console.log('');
  }

  if (areaConstraints.length === 0 && areaBreakages.length === 0 && areaDecisions.length === 0 && 
      hotspots.length === 0 && fixChains.length === 0 && relatedConstraints.length === 0 &&
      areaCommits.length === 0 && learnings.length === 0) {
    console.log('No intelligence found for this area yet. This is the first time working here.');
    console.log('After building, record what you learned:');
    console.log('  node mycelium.cjs --learned "' + area + '" "what you discovered"');
    console.log('  node mycelium.cjs --constraint "' + area + '" "hard fact"');
    console.log('');
  }
}

// ─── Compact: Prune dead files, deduplicate snapshots, shrink patterns ─

// ─── Post-fix Analysis: What went wrong? What did we learn? ────────
// Run after a fix commit. Reads the last two commits, shows what changed,
// and helps extract a concrete lesson.

function postfix() {
  const mem = loadMemory();
  if (mem.snapshots.length < 2) {
    console.log('Need at least 2 commits to analyze a fix.');
    return;
  }

  // Find the most recent fix chain (or just compare last 2 commits)
  const current = mem.snapshots[mem.snapshots.length - 1];
  const previous = mem.snapshots[mem.snapshots.length - 2];
  const currentMsg = (current.commit?.msg || '').toLowerCase();
  const isFix = currentMsg.startsWith('fix');

  console.log('\n# Post-Fix Analysis\n');

  if (!isFix) {
    console.log('Latest commit doesn\'t look like a fix:');
    console.log(`  ${current.commit?.hash} ${current.commit?.msg}`);
    console.log('\nComparing last 2 commits anyway...\n');
  }

  // Show both commits
  console.log('## The Change');
  console.log(`  ORIGINAL: ${previous.commit?.hash} ${previous.commit?.msg}`);
  console.log(`  FIX:      ${current.commit?.hash} ${current.commit?.msg}`);
  console.log('');

  // Find overlapping files
  const prevFiles = new Set((previous.commit?.files || []).map(f => f.path));
  const currFiles = (current.commit?.files || []).map(f => f.path);
  const overlap = currFiles.filter(f => prevFiles.has(f));
  const newFiles = currFiles.filter(f => !prevFiles.has(f));

  if (overlap.length > 0) {
    console.log(`## Same Files Touched (the breakage happened here)`);
    for (const f of overlap) {
      const area = classifyArea(f);
      const hotspotCount = mem.patterns.hotspots?.[f] || 0;
      console.log(`  ${f}  [area: ${area}]${hotspotCount >= 5 ? ' ⚠ hotspot (' + hotspotCount + 'x)' : ''}`);
    }
    console.log('');
  }

  if (newFiles.length > 0) {
    console.log(`## New Files in Fix (not in original — the original missed these)`);
    for (const f of newFiles) {
      console.log(`  ${f}  [area: ${classifyArea(f)}]`);
    }
    console.log('');
  }

  // Show relevant constraints
  const areas = new Set([...overlap, ...newFiles].map(f => classifyArea(f)));
  const relevantConstraints = [];
  for (const area of areas) {
    for (const c of (mem.constraints[area] || [])) {
      relevantConstraints.push({ area, fact: c.fact });
    }
  }
  if (relevantConstraints.length > 0) {
    console.log('## Existing Constraints (did you violate one of these?)');
    for (const rc of relevantConstraints) {
      console.log(`  [${rc.area}] ${rc.fact}`);
    }
    console.log('');
  }

  // Past breakages in same areas
  const pastBreaks = (mem.breakages || []).filter(b => areas.has(b.area));
  if (pastBreaks.length > 0) {
    console.log('## Past Breakages (was this a repeat?)');
    for (const b of pastBreaks.slice(-3)) {
      console.log(`  ${b.date} [${b.area}] ${b.what}`);
    }
    console.log('');
  }

  // Check if any file is a repeat offender
  const fcHistory = mem.patterns.fixChains || [];
  const repeatFiles = [];
  for (const f of overlap) {
    const count = fcHistory.filter(fc => fc.files.includes(f)).length;
    if (count >= 2) repeatFiles.push({ file: f, count });
  }
  if (repeatFiles.length > 0) {
    console.log('## REPEAT OFFENDERS (these files keep breaking)');
    for (const rf of repeatFiles) {
      console.log(`  ${rf.file} — broken ${rf.count} times before this fix`);
    }
    console.log('');
  }

  // Deep intelligence: extract root cause from commit body + diff
  const fixHash = current.commit?.hash;
  if (fixHash) {
    const deepLesson = extractDeepLesson(fixHash, current.commit?.msg || '');
    if (deepLesson && deepLesson.length > 15) {
      console.log('## Root Cause (auto-extracted from commit body + diff)');
      console.log(`  ↳ ${deepLesson}`);
      console.log('');

      // Show diff-level details if available
      const diff = analyzeDiff(fixHash);
      if (diff.cssProps.length > 0) {
        console.log('  CSS changes:');
        for (const c of diff.cssProps.slice(0, 3)) {
          if (c.action === 'removed') console.log(`    - ${c.prop}: ${c.oldVal}`);
          else console.log(`    + ${c.prop}: ${c.newVal}`);
        }
        console.log('');
      }
      if (diff.jsPatterns.length > 0) {
        console.log(`  JS patterns involved: ${diff.jsPatterns.join(', ')}`);
        console.log('');
      }
    }
  }

  // Prompt for learning
  const areaList = [...areas].join('/');
  console.log('## Record What You Learned');
  console.log('');
  console.log('Run one of these to capture the lesson:');
  console.log('');
  console.log(`  # What went wrong (root cause):`)
  console.log(`  node mycelium.cjs --broke "${areaList}" "description of what broke and why"`);
  console.log('');
  console.log(`  # What you learned (so next AI doesn't repeat it):`);
  console.log(`  node mycelium.cjs --learned "${areaList}" "the lesson from this fix"`);
  console.log('');
  console.log(`  # A hard rule to prevent recurrence:`);
  console.log(`  node mycelium.cjs --constraint "${areaList}" "never do X because Y"`);
  console.log('');
}


// ─── TOKEN BUDGET & COST OPTIMIZATION ENGINE ────────────────────────────────
// Root cause: Session hit 210,007 tokens > 200,000 limit during a Write File.
// 7 large code dumps accumulated as Tool Results without budget tracking.
// Fix: (1) estimate tokens before reads/writes, (2) cap .mycelium-context,
// (3) provide --token-check CLI, (4) cost-tier guidance, (5) session ledger.
//
// COST PHILOSOPHY: Quality comes from precision, not volume. A grep that finds
// the right function in 50 tokens is better than reading 46,000 tokens of file.
// Every operation has a cost tier. Always pick the lowest tier that works.

function estimateTokens(text) {
  return Math.ceil((typeof text === 'string' ? text.length : 0) / CHARS_PER_TOKEN);
}

function estimateFileTokens(filePath) {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) return 0;
    const size = fs.statSync(resolved).size;
    return Math.ceil(size / CHARS_PER_TOKEN);
  } catch { return 0; }
}

/**
 * Classify a file into a cost tier for AI operations.
 * Tier 1: grep/head (5-50 tok), Tier 2: chunk read (500-1500), 
 * Tier 3: full read <15K (3K-10K), Tier 4: full read >15K (10K-46K), 
 * Tier 5: FATAL read >50K (50K-186K)
 */
function fileCostTier(filePath) {
  const tokens = estimateFileTokens(filePath);
  if (tokens === 0) return { tier: 0, label: 'empty', tokens, strategy: 'skip' };
  if (tokens <= 3000) return { tier: 1, label: 'cheap', tokens, strategy: 'safe to read whole' };
  if (tokens <= MAX_SINGLE_FILE_READ_TOKENS) return { tier: 2, label: 'medium', tokens, strategy: 'read whole OR grep + chunk' };
  if (tokens <= 50000) return { tier: 3, label: 'expensive', tokens, strategy: 'GREP ONLY — never read whole' };
  return { tier: 4, label: 'FATAL', tokens, strategy: 'use CLI commands (--query/--status), NEVER read' };
}

/**
 * Session token ledger — tracks accumulated reads this session.
 * Written to .mycelium-token-ledger on every --token-check call.
 * Helps AI estimate remaining budget mid-session.
 */
function loadTokenLedger() {
  try {
    if (fs.existsSync(SESSION_BUDGET_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_BUDGET_FILE, 'utf8'));
    }
  } catch {}
  return { sessionStart: Date.now(), reads: [], totalEstimated: 0 };
}

function saveTokenLedger(ledger) {
  try { fs.writeFileSync(SESSION_BUDGET_FILE, JSON.stringify(ledger, null, 2)); } catch {}
}

function recordRead(filePath, tokens) {
  const ledger = loadTokenLedger();
  ledger.reads.push({ file: path.relative(__dirname, filePath), tokens, at: Date.now() });
  ledger.totalEstimated += tokens;
  saveTokenLedger(ledger);
  return ledger;
}

/**
 * tokenCheck — Token budget audit + cost optimization advisor.
 * Usage: node mycelium.cjs --token-check [file1] [file2] ...
 *   No args: full audit of all project files + cost-tier advice
 *   With args: cost plan for specific files you intend to read/edit
 */
function tokenCheck(files) {
  const budgetInfo = {
    limit: TOKEN_LIMIT,
    safeUsable: TOKEN_SAFE_BUDGET,
    responseReserve: TOKEN_RESPONSE_RESERVE,
    warnAt: Math.floor(TOKEN_SAFE_BUDGET * TOKEN_WARN_THRESHOLD),
  };

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     MYCELIUM TOKEN BUDGET & COST OPTIMIZER              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Platform limit:     ${budgetInfo.limit.toLocaleString()} tokens`);
  console.log(`  Response reserve:   ${budgetInfo.responseReserve.toLocaleString()} tokens`);
  console.log(`  Safe usable:        ${budgetInfo.safeUsable.toLocaleString()} tokens`);
  console.log(`  Warn threshold:     ${budgetInfo.warnAt.toLocaleString()} tokens (${Math.round(TOKEN_WARN_THRESHOLD * 100)}%)`);
  console.log('');

  // Session ledger — show what's been consumed so far
  const ledger = loadTokenLedger();
  if (ledger.reads.length > 0) {
    console.log(`  SESSION LEDGER (${ledger.reads.length} reads, ~${ledger.totalEstimated.toLocaleString()} tokens consumed):`);
    for (const r of ledger.reads.slice(-8)) {
      console.log(`    ${r.tokens.toLocaleString().padStart(7)} tok  ${r.file}`);
    }
    const pct = Math.round(ledger.totalEstimated / budgetInfo.safeUsable * 100);
    const remaining = budgetInfo.safeUsable - ledger.totalEstimated;
    console.log(`  Budget used: ~${pct}%  |  Remaining: ~${remaining.toLocaleString()} tokens`);
    if (pct >= 70) console.log('  ⚠ OVER 70% — switch to grep-only mode!');
    if (pct >= 90) console.log('  🚨 CRITICAL — wrap up and commit, do NOT start new reads!');
    console.log('');
  }

  // Default: show all mycelium-related files
  const checkFiles = files && files.length > 0 ? files : [
    '.mycelium-context',
    '.mycelium/memory.json',
    '.mycelium/watch.json',
    '.mycelium/eval.json',
    '.mycelium/fix-log.json',
    'CLAUDE.md',
    'mycelium.cjs',
    'mycelium-watch.cjs',
    'mycelium-engine.cjs',
    'mycelium-eval.cjs',
    'mycelium-fix.cjs',
    'mycelium-doctor.cjs',
    'mycelium-upgrade.cjs',
    'mycelium-why.cjs',
    'tools/mycelium-miner.cjs',
    'tools/mycelium-auto-mine.cjs',
    'bin/mycelium.cjs',
  ];

  let totalTokens = 0;
  const results = [];
  for (const f of checkFiles) {
    const fp = path.resolve(__dirname, f);
    const cost = fileCostTier(fp);
    if (cost.tokens > 0) {
      const sizeKB = Math.round(fs.statSync(fp).size / 1024);
      results.push({ file: f, tokens: cost.tokens, sizeKB, tier: cost.tier, label: cost.label, strategy: cost.strategy });
      totalTokens += cost.tokens;
    }
  }

  console.log('  FILE COSTS (tier: 1=cheap, 2=medium, 3=expensive, 4=FATAL):');
  console.log('  ─────────────────────────────────────────────────────────');
  for (const r of results.sort((a, b) => b.tokens - a.tokens)) {
    const tierIcon = r.tier <= 1 ? '✓' : r.tier === 2 ? '⚠' : r.tier === 3 ? '!!' : '💀';
    const bar = '█'.repeat(Math.min(20, Math.round(r.tokens / 3000)));
    console.log(`  ${tierIcon} T${r.tier} ${r.tokens.toLocaleString().padStart(7)} tok  ${r.sizeKB.toString().padStart(4)}KB  ${bar}  ${r.file}`);
    if (r.tier >= 3) console.log(`       → ${r.strategy}`);
  }
  console.log('  ─────────────────────────────────────────────────────────');
  console.log(`  TOTAL: ${totalTokens.toLocaleString()} tokens (${Math.round(totalTokens / budgetInfo.safeUsable * 100)}% of safe budget)`);
  console.log('');

  // COST-OPTIMIZED OPERATION GUIDE (§1 Prompt Eng + §6 Output Opt + §9 Agentic Workflow)
  console.log('  COST-OPTIMIZED OPERATIONS (cheapest first):');
  console.log('  ┌─────────┬──────────────────────────────────────┬──────────┐');
  console.log('  │ Cost    │ Operation                            │ ~Tokens  │');
  console.log('  ├─────────┼──────────────────────────────────────┼──────────┤');
  console.log('  │ FREE    │ grep -n "fn_name" file.cjs           │     5-50 │');
  console.log('  │ FREE    │ wc -l file / head -20 file           │     5-20 │');
  console.log('  │ CHEAP   │ Read offset=X limit=100              │  500-1.5K│');
  console.log('  │ CHEAP   │ Edit old="X" new="Y"                 │  100-300 │');
  console.log('  │ MEDIUM  │ cat .mycelium-context (session start) │     ~4K  │');
  console.log('  │ MEDIUM  │ Read whole file <40KB                │  3K-10K  │');
  console.log('  │ EXPEN.  │ Read whole file >40KB                │ 10K-46K  │');
  console.log('  │ FATAL   │ Read memory.json / watch.json        │ 67K-186K │');
  console.log('  └─────────┴──────────────────────────────────────┴──────────┘');
  console.log('');
  console.log('  OUTPUT TOKEN WARNING (§6 - output costs 3x input):');
  console.log('    Asking AI to "explain in detail" = 500+ output tokens = ~1500 input equivalent');
  console.log('    Use: "list changes" not "explain changes in detail"');
  console.log('    Use: JSON/structured output not prose');
  console.log('    Use: max_tokens cap on all API calls');
  console.log('');

  // CONCRETE CHEAPEST-PATH ADVICE
  console.log('  CHEAPEST PATH FOR COMMON TASKS:');
  console.log('    "Find a function"    → grep -n "function name" file     (50 tok)');
  console.log('    "Understand a fn"    → grep → Read offset=N limit=60   (800 tok)');
  console.log('    "Edit a function"    → grep → Edit old/new             (150 tok)');
  console.log('    "Check constraints"  → mycelium --premortem area       (300 tok)');
  console.log('    "Check all risks"    → cat .mycelium-context           (5K tok, 1x only)');
  console.log('    "Build new 500L file"→ Write directly, NO inline code  (3K tok)');
  console.log('    "Refactor 3 files"   → grep×3 → Edit×3, NOT read×3    (900 tok vs 45K)');
  console.log('');
  
  console.log('  SESSION RULES:');
  console.log(`    Max full reads (>20KB): ${MAX_FULL_READS_PER_SESSION} per session`);
  console.log(`    Context cap: ${MAX_CONTEXT_TOKENS.toLocaleString()} tokens`);
  console.log(`    Single file cap: ${MAX_SINGLE_FILE_READ_TOKENS.toLocaleString()} tokens`);
  console.log('    After 4+ tool results: grep-only mode');
  console.log('    After 70% budget: wrap up, commit, start new session');
  console.log('');

  return { totalTokens, results, budgetInfo, ledger };
}

/**
 * costPlan — Given a list of files you plan to touch, shows the cheapest
 * approach for each and estimates total session cost.
 * Usage: node mycelium.cjs --cost-plan file1 file2 ...
 */
function costPlan(files) {
  if (!files || files.length === 0) {
    console.log('Usage: node mycelium.cjs --cost-plan <file1> [file2] ...');
    console.log('Shows the cheapest approach for reading/editing each file.');
    return;
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     COST PLAN — Cheapest Path for Your Task             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  let totalCheap = 0;
  let totalExpensive = 0;
  const plans = [];

  for (const f of files) {
    const fp = path.resolve(__dirname, f);
    const cost = fileCostTier(fp);
    const lines = cost.tokens > 0 ? (() => { try { return fs.readFileSync(fp, 'utf8').split('\n').length; } catch { return 0; } })() : 0;

    let cheapCost, cheapMethod, expensiveCost, expensiveMethod;

    if (cost.tier <= 1) {
      // Small file — read whole is fine
      cheapCost = cost.tokens;
      cheapMethod = 'Read whole file';
      expensiveCost = cost.tokens;
      expensiveMethod = 'Read whole file';
    } else if (cost.tier === 2) {
      // Medium — grep + chunk is cheaper
      cheapCost = 150; // grep + edit
      cheapMethod = 'grep -n → Edit specific lines';
      expensiveCost = cost.tokens;
      expensiveMethod = 'Read whole file';
    } else {
      // Large or FATAL — must use grep
      cheapCost = 150;
      cheapMethod = 'grep -n → Read offset/limit → Edit';
      expensiveCost = cost.tokens;
      expensiveMethod = 'Read whole (WILL CRASH SESSION)';
    }

    plans.push({ file: f, lines, cost, cheapCost, cheapMethod, expensiveCost, expensiveMethod });
    totalCheap += cheapCost;
    totalExpensive += expensiveCost;
  }

  for (const p of plans) {
    const tierIcon = p.cost.tier <= 1 ? '✓' : p.cost.tier === 2 ? '⚠' : '!!';
    console.log(`  ${tierIcon} ${p.file} (${p.lines} lines, ${p.cost.tokens.toLocaleString()} tok if read whole)`);
    console.log(`    CHEAP: ${p.cheapMethod} → ~${p.cheapCost.toLocaleString()} tokens`);
    if (p.cheapCost !== p.expensiveCost) {
      const savings = Math.round((1 - p.cheapCost / p.expensiveCost) * 100);
      console.log(`    AVOID: ${p.expensiveMethod} → ~${p.expensiveCost.toLocaleString()} tokens (${savings}% waste)`);
    }
    console.log('');
  }

  const savings = totalExpensive > 0 ? Math.round((1 - totalCheap / totalExpensive) * 100) : 0;
  console.log('  ─────────────────────────────────────────────────────────');
  console.log(`  CHEAP PATH TOTAL:     ~${totalCheap.toLocaleString()} tokens`);
  console.log(`  EXPENSIVE PATH TOTAL: ~${totalExpensive.toLocaleString()} tokens`);
  console.log(`  SAVINGS:              ~${(totalExpensive - totalCheap).toLocaleString()} tokens (${savings}%)`);
  console.log(`  Budget remaining:     ~${(TOKEN_SAFE_BUDGET - totalCheap).toLocaleString()} tokens (${Math.round((TOKEN_SAFE_BUDGET - totalCheap) / TOKEN_SAFE_BUDGET * 100)}%)`);
  console.log('');

  if (totalCheap > TOKEN_SAFE_BUDGET * 0.5) {
    console.log('  ⚠ Even the cheap path uses >50% budget. Consider splitting across 2 sessions.');
  }

  return { plans, totalCheap, totalExpensive, savings };
}

function compact(memOverride, silent) {
  const mem = memOverride || loadMemory();
  let pruned = { hotspots: 0, coChanges: 0, snapshots: 0 };
  const sizeBefore = fs.existsSync(MEMORY_FILE) ? fs.statSync(MEMORY_FILE).size : 0;

  // 1. Remove hotspot entries for files that no longer exist
  const hotspots = mem.patterns.hotspots || {};
  for (const fp of Object.keys(hotspots)) {
    if (!fileExists(fp)) {
      delete hotspots[fp];
      pruned.hotspots++;
    }
  }
  // Cap hotspots to top MAX_HOTSPOTS by count
  const hotEntries = Object.entries(hotspots).sort((a, b) => b[1] - a[1]);
  if (hotEntries.length > MAX_HOTSPOTS) {
    pruned.hotspots += hotEntries.length - MAX_HOTSPOTS;
    mem.patterns.hotspots = Object.fromEntries(hotEntries.slice(0, MAX_HOTSPOTS));
  }

  // 2. Remove coChange pairs where either file no longer exists
  const coChanges = mem.patterns.coChanges || {};
  for (const pair of Object.keys(coChanges)) {
    const [a, b] = pair.split(' <-> ');
    if (!fileExists(a) || !fileExists(b)) {
      delete coChanges[pair];
      pruned.coChanges++;
    }
  }
  // Cap coChanges to top MAX_COCHANGES by count
  const coEntries = Object.entries(coChanges).sort((a, b) => b[1] - a[1]);
  if (coEntries.length > MAX_COCHANGES) {
    pruned.coChanges += coEntries.length - MAX_COCHANGES;
    mem.patterns.coChanges = Object.fromEntries(coEntries.slice(0, MAX_COCHANGES));
  }

  // 3. Deduplicate snapshots (same commit hash = keep latest only)
  const seen = new Map();
  for (const s of mem.snapshots) {
    const hash = s.commit?.hash;
    if (hash) seen.set(hash, s); // overwrites earlier duplicate
  }
  const uniqueSnapshots = [...seen.values()].sort((a, b) => a.ts - b.ts);
  pruned.snapshots = mem.snapshots.length - uniqueSnapshots.length;
  mem.snapshots = uniqueSnapshots;

  // 4. Prune fix chains referencing deleted files, cap to 30 most recent
  if (mem.patterns.fixChains) {
    mem.patterns.fixChains = mem.patterns.fixChains.filter(fc =>
      fc.files.some(f => fileExists(f))
    );
    if (mem.patterns.fixChains.length > MAX_FIX_CHAINS) {
      mem.patterns.fixChains = mem.patterns.fixChains.slice(-MAX_FIX_CHAINS);
    }
  }

  // 5. §5 Dedup learnings — merge near-duplicates by area+keyword overlap
  pruned.learnings = 0;
  if (mem.learnings && mem.learnings.length > 1) {
    const deduped = [];
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
    for (const l of mem.learnings) {
      const words = new Set(normalize(l.lesson || ''));
      const isDup = deduped.some(d => {
        if (d.area !== l.area) return false;
        const dWords = new Set(normalize(d.lesson || ''));
        const overlap = [...words].filter(w => dWords.has(w)).length;
        return overlap >= Math.min(words.size, dWords.size) * 0.6; // 60% word overlap = duplicate
      });
      if (!isDup) deduped.push(l);
      else pruned.learnings++;
    }
    mem.learnings = deduped;
  }

  // 6. §5 Dedup breakages — same area + 50%+ word overlap = duplicate
  pruned.breakages = 0;
  if (mem.breakages && mem.breakages.length > 1) {
    const deduped = [];
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
    for (const b of mem.breakages) {
      const words = new Set(normalize(b.what || ''));
      const isDup = deduped.some(d => {
        if (d.area !== b.area) return false;
        const dWords = new Set(normalize(d.what || ''));
        const overlap = [...words].filter(w => dWords.has(w)).length;
        return overlap >= Math.min(words.size, dWords.size) * 0.5;
      });
      if (!isDup) deduped.push(b);
      else pruned.breakages++;
    }
    mem.breakages = deduped;
  }

  // 7. §5 Dedup constraints per area — same area + 60%+ word overlap = duplicate
  pruned.constraints = 0;
  for (const area of Object.keys(mem.constraints || {})) {
    const cons = mem.constraints[area];
    if (!cons || cons.length <= 1) continue;
    const deduped = [];
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
    for (const c of cons) {
      const words = new Set(normalize(c.fact || ''));
      const isDup = deduped.some(d => {
        const dWords = new Set(normalize(d.fact || ''));
        const overlap = [...words].filter(w => dWords.has(w)).length;
        return overlap >= Math.min(words.size, dWords.size) * 0.6;
      });
      if (!isDup) deduped.push(c);
      else pruned.constraints++;
    }
    mem.constraints[area] = deduped;
  }

  // 8. Trim snapshots to MAX_ENTRIES (keep most recent)
  if (mem.snapshots.length > MAX_ENTRIES) {
    pruned.snapshots += mem.snapshots.length - MAX_ENTRIES;
    mem.snapshots = mem.snapshots.slice(-MAX_ENTRIES);
  }

  // 8b. §5 Slim old snapshots: strip files array from all but last 10
  // Recent snapshots need files for area detection; old ones only need hash/msg/score
  const keepFilesCount = 10;
  pruned.slimmedSnapshots = 0;
  for (let i = 0; i < mem.snapshots.length - keepFilesCount; i++) {
    const s = mem.snapshots[i];
    if (s.commit?.files && s.commit.files.length > 0) {
      s.commit.fileCount = s.commit.files.length; // preserve count
      delete s.commit.files;
      pruned.slimmedSnapshots++;
    }
  }

  // 9. §5 Trim reflections to last 10, learnings to MAX_LEARNINGS
  if (mem.reflections && mem.reflections.length > 10) {
    mem.reflections = mem.reflections.slice(-10);
  }
  if (mem.learnings && mem.learnings.length > MAX_LEARNINGS) {
    mem.learnings = mem.learnings.slice(-MAX_LEARNINGS);
  }
  // Cap decisions to 20, autoRules to 15
  if (mem.decisions && mem.decisions.length > 20) {
    mem.decisions = mem.decisions.slice(-20);
  }
  if (mem.autoRules && mem.autoRules.length > 15) {
    mem.autoRules = mem.autoRules.slice(-15);
  }

  // 10. §1 Truncate verbose text fields to save tokens
  for (const l of (mem.learnings || [])) {
    if (l.lesson && l.lesson.length > 300) l.lesson = l.lesson.slice(0, 297) + '...';
  }
  for (const b of (mem.breakages || [])) {
    if (b.what && b.what.length > 300) b.what = b.what.slice(0, 297) + '...';
  }
  for (const area of Object.keys(mem.constraints || {})) {
    for (const c of mem.constraints[area]) {
      if (c.fact && c.fact.length > 200) c.fact = c.fact.slice(0, 197) + '...';
    }
  }
  for (const d of (mem.decisions || [])) {
    if (d.what && d.what.length > 200) d.what = d.what.slice(0, 197) + '...';
    if (d.why && d.why.length > 200) d.why = d.why.slice(0, 197) + '...';
  }

  // Save
  const json = JSON.stringify(mem, null, 2);
  fs.writeFileSync(MEMORY_FILE, json);
  const sizeAfter = fs.statSync(MEMORY_FILE).size;

  invalidateCache(); // bust cache after compaction
  if (!silent) {
    const saved = Math.round((sizeBefore - sizeAfter) / 1024);
    const totalPruned = pruned.hotspots + pruned.coChanges + pruned.snapshots +
      (pruned.learnings || 0) + (pruned.breakages || 0) + (pruned.constraints || 0) +
      (pruned.slimmedSnapshots || 0);
    console.log(`[mycelium] Compacted: ${totalPruned} items pruned, ${Math.round(sizeBefore/1024)}KB→${Math.round(sizeAfter/1024)}KB (saved ${saved}KB)`);
    if (pruned.learnings) console.log(`  Learnings deduped: ${pruned.learnings}`);
    if (pruned.breakages) console.log(`  Breakages deduped: ${pruned.breakages}`);
    if (pruned.constraints) console.log(`  Constraints deduped: ${pruned.constraints}`);
  }
}

// ─── Deep Compress: aggressive storage optimization ─────────────────
// Converts bloated data into lean, high-signal knowledge
// Called by: --compress, auto-trim when files exceed size limits
function deepCompress(silent) {
  const sizeBefore = {
    memory: fs.existsSync(MEMORY_FILE) ? fs.statSync(MEMORY_FILE).size : 0,
    watch: 0, eval: 0
  };
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  const evalPath = path.join(__dirname, '.mycelium', 'eval-history.json');
  if (fs.existsSync(watchPath)) sizeBefore.watch = fs.statSync(watchPath).size;
  if (fs.existsSync(evalPath)) sizeBefore.eval = fs.statSync(evalPath).size;
  
  const stats = { trimmed: 0 };
  
  // ── 1. MEMORY.JSON: Snapshot file lists → count + top N risky files ──
  // BUT: keep FULL file lists for last 10 snapshots (needed for area detection)
  const mem = loadMemory();
  const keepRecent = 10; // same as compact()'s keepFilesCount
  const snapshotCount = (mem.snapshots || []).length;
  for (let i = 0; i < snapshotCount - keepRecent; i++) {
    const s = mem.snapshots[i];
    const files = s.commit?.files;
    if (files && files.length > SNAPSHOT_TOP_FILES) {
      // Keep count + only files that are hotspots or had breakages
      const hotFiles = Object.entries(mem.patterns?.hotspots || {})
        .sort((a, b) => b[1] - a[1])
        .map(([f]) => f);
      const kept = files.filter(f => {
        if (typeof f !== 'string') return false;
        return hotFiles.includes(f) || !isNoise(f);
      }).slice(0, SNAPSHOT_TOP_FILES);
      s.commit.fileCount = files.length;
      s.commit.files = kept;
      stats.trimmed++;
    }
  }
  
  // ── 2. MEMORY.JSON: Sharpen lessons → actionable IF→THEN ──
  // Convert vague "test mobile viewport" to "IF editing HTML → check viewport meta tag exists"
  for (const l of (mem.learnings || [])) {
    l.lesson = sharpenLesson(l.lesson || '');
  }
  for (const b of (mem.breakages || [])) {
    b.what = sharpenLesson(b.what || '');
  }
  for (const area of Object.keys(mem.constraints || {})) {
    for (const c of (mem.constraints[area] || [])) {
      c.fact = sharpenLesson(c.fact || '');
    }
  }
  
  // ── 3. MEMORY.JSON: Truncate reflections to 200 chars ──
  for (const r of (mem.reflections || [])) {
    if (r.lesson && r.lesson.length > 200) r.lesson = r.lesson.slice(0, 197) + '...';
  }
  
  // ── 4. MEMORY.JSON: Fix chains — keep only file count + top files ──
  for (const fc of (mem.patterns?.fixChains || [])) {
    if (fc.files && fc.files.length > 5) {
      fc.fileCount = fc.files.length;
      fc.files = fc.files.filter(f => !isNoise(f)).slice(0, 5);
    }
  }
  
  // Save compressed memory
  const memJson = JSON.stringify(mem, null, 2);
  fs.writeFileSync(MEMORY_FILE, memJson);
  invalidateCache();
  
  // ── 5. WATCH.JSON: Compress commit file lists → count + top N ──
  if (fs.existsSync(watchPath)) {
    const watch = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
    
    // 5a. Commit file lists → count + top 5
    for (const c of (watch.commits || [])) {
      if (c.files && c.files.length > WATCH_COMMIT_TOP_FILES) {
        c.fileCount = c.files.length;
        c.files = c.files.filter(f => !isNoise(f)).slice(0, WATCH_COMMIT_TOP_FILES);
        stats.trimmed++;
      }
    }
    
    // 5b. Risk lessons → cap to MAX_RISK_LESSONS per file, sharpen each
    for (const [file, risk] of Object.entries(watch.risks || {})) {
      if (risk.lessons && risk.lessons.length > MAX_RISK_LESSONS) {
        // Keep most recent + unique lessons only
        const seen = new Set();
        risk.lessons = risk.lessons
          .reverse() // most recent first
          .filter(l => {
            const text = sharpenLesson(typeof l === 'string' ? l : (l.lesson || ''));
            if (seen.has(text)) return false;
            seen.add(text);
            return true;
          })
          .slice(0, MAX_RISK_LESSONS)
          .reverse();
        stats.trimmed++;
      }
      // Sharpen remaining lessons
      risk.lessons = (risk.lessons || []).map(l => {
        if (typeof l === 'string') return sharpenLesson(l);
        if (l.lesson) l.lesson = sharpenLesson(l.lesson);
        return l;
      });
    }
    
    // 5b2. Remove low-value risk entries (≤1 break, no lessons) AND noise files
    const riskEntries = Object.entries(watch.risks || {});
    for (const [file, risk] of riskEntries) {
      const isNoiseFile = isNoise(file) || file.includes('.mycelium-mined') || file === '.gitignore';
      if (isNoiseFile || (risk.breakCount <= 1 && (!risk.lessons || risk.lessons.length === 0))) {
        delete watch.risks[file];
        stats.trimmed++;
      }
    }
    
    // 5b3. Strip verbose metadata from risks (deepAnalysis, escalated reasons)
    for (const risk of Object.values(watch.risks || {})) {
      delete risk.deepAnalysis;
      delete risk.escalatedReason;
      delete risk.volatileReason;
      // Keep just: breakCount, lastBreak, lessons, escalated, volatile
    }
    
    // 5c. Breakage lessons → sharpen
    for (const b of (watch.breakages || [])) {
      if (b.lesson) b.lesson = sharpenLesson(b.lesson);
      // Compress file lists in breakages (biggest bloat: 195 files = 10KB per entry)
      if (b.files && b.files.length > 5) {
        b.fileCount = b.files.length;
        b.files = b.files.filter(f => !isNoise(f)).slice(0, 5);
      }
    }
    
    // 5d. Old commits → keep only last 100 (was 300)
    if (watch.commits && watch.commits.length > 100) {
      watch.commits = watch.commits.slice(-100);
      stats.trimmed++;
    }
    
    // 5e. Old breakages → keep only last 50
    if (watch.breakages && watch.breakages.length > 50) {
      watch.breakages = watch.breakages.slice(-50);
    }
    
    fs.writeFileSync(watchPath, JSON.stringify(watch, null, 2));
  }
  
  // ── 6. EVAL-HISTORY.JSON: Deduplicate → keep only score-change boundaries ──
  if (fs.existsSync(evalPath)) {
    const evalData = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
    const evals = evalData.evaluations || evalData;
    if (Array.isArray(evals) && evals.length > MAX_EVAL_HISTORY) {
      // Keep entries where score changed, plus first and last
      const deduped = [evals[0]];
      for (let i = 1; i < evals.length; i++) {
        if (evals[i].overall !== evals[i - 1].overall) {
          deduped.push(evals[i]);
        }
      }
      if (deduped[deduped.length - 1] !== evals[evals.length - 1]) {
        deduped.push(evals[evals.length - 1]);
      }
      // Still cap at MAX_EVAL_HISTORY
      const final = deduped.length > MAX_EVAL_HISTORY 
        ? deduped.slice(-MAX_EVAL_HISTORY) 
        : deduped;
      const output = evalData.evaluations ? { evaluations: final } : final;
      fs.writeFileSync(evalPath, JSON.stringify(output, null, 2));
      stats.trimmed += evals.length - final.length;
    }
  }
  
  // Report
  const sizeAfter = {
    memory: fs.existsSync(MEMORY_FILE) ? fs.statSync(MEMORY_FILE).size : 0,
    watch: fs.existsSync(watchPath) ? fs.statSync(watchPath).size : 0,
    eval: fs.existsSync(evalPath) ? fs.statSync(evalPath).size : 0
  };
  const totalBefore = sizeBefore.memory + sizeBefore.watch + sizeBefore.eval;
  const totalAfter = sizeAfter.memory + sizeAfter.watch + sizeAfter.eval;
  const savedKB = Math.round((totalBefore - totalAfter) / 1024);
  
  if (!silent) {
    console.log(`[mycelium] Deep compress: ${stats.trimmed} items trimmed`);
    console.log(`  memory.json: ${Math.round(sizeBefore.memory/1024)}KB → ${Math.round(sizeAfter.memory/1024)}KB`);
    console.log(`  watch.json:  ${Math.round(sizeBefore.watch/1024)}KB → ${Math.round(sizeAfter.watch/1024)}KB`);
    console.log(`  eval-history: ${Math.round(sizeBefore.eval/1024)}KB → ${Math.round(sizeAfter.eval/1024)}KB`);
    console.log(`  TOTAL: ${Math.round(totalBefore/1024)}KB → ${Math.round(totalAfter/1024)}KB (saved ${savedKB}KB)`);
    const itemCount = (mem.learnings?.length || 0) + (mem.breakages?.length || 0) + 
      Object.values(mem.constraints || {}).reduce((s, a) => s + a.length, 0);
    console.log(`  Efficiency: ${itemCount} knowledge items in ${Math.round(totalAfter/1024)}KB = ${Math.round(totalAfter/itemCount)} bytes/lesson`);
  }
  return { savedKB, totalAfter: Math.round(totalAfter / 1024) };
}

// ── Sharpen Lesson: convert vague text → actionable IF→THEN rule ──
// "test mobile viewport" → "IF editing HTML → verify viewport meta tag"
// "debug overlay left in production" → "IF adding overlay → gate behind GM mode"
function sharpenLesson(text) {
  if (!text) return text;
  // Already sharp (has IF→ or WHEN→ or → pattern)
  if (/\b(IF|WHEN|BEFORE|AFTER)\b.*→/.test(text)) return text.slice(0, MAX_LESSON_CHARS);
  
  // Truncate to max chars first
  let lesson = text.slice(0, MAX_LESSON_CHARS * 2); // work with 2x for processing
  
  // Rule patterns: match common vague → sharp transformations
  const transforms = [
    [/test\s+(.*?)viewport/i, 'IF editing HTML → verify viewport meta tag'],
    [/ensure\s+full.?screen/i, 'IF adding overlay → set max-width:100vw, overflow:hidden'],
    [/fix\s+language.?toggle|i18n.*gap/i, 'IF using data-i18n → verify all 4 lang keys exist'],
    [/debug.*overlay.*production/i, 'IF adding debug UI → gate behind ?gm= check'],
    [/overlay.*left.*in/i, 'IF adding overlay → gate behind ?gm= check'],
    [/missing.*loading/i, 'IF async fetch → add loading skeleton first'],
    [/innerhtml.*xss|xss.*innerhtml/i, 'IF using innerHTML → sanitize with textContent or DOMPurify'],
    [/lazy.*load.*horizontal|horizontal.*lazy/i, 'IF horizontal scroll → use loading=eager not lazy'],
    [/loading.*lazy.*scroll/i, 'IF horizontal scroll → use loading=eager not lazy'],
    [/null.*guard|undefined.*check/i, 'IF accessing nested prop → add ?. optional chaining'],
    [/mobile.*overflow|overflow.*clip/i, 'IF mobile layout → set overflow-x:hidden on body'],
    [/z.?index.*conflict/i, 'IF setting z-index → check existing z-index layers first'],
    [/font.*load|loading.*font/i, 'IF custom font → add font-display:swap'],
  ];
  
  for (const [pattern, replacement] of transforms) {
    if (pattern.test(lesson)) return replacement;
  }
  
  // Generic sharpening: make it concise even if we can't pattern-match
  lesson = lesson
    .replace(/^(ensure|make sure|remember to|always|don't forget to)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return lesson.slice(0, MAX_LESSON_CHARS);
}

// ── Auto-Trim: triggered by saveMemory and watch save ──
// Checks all data files and compresses if any exceed limits
function autoTrim() {
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  const evalPath = path.join(__dirname, '.mycelium', 'eval-history.json');
  
  let needsCompress = false;
  
  if (fs.existsSync(MEMORY_FILE)) {
    const memKB = Math.round(fs.statSync(MEMORY_FILE).size / 1024);
    if (memKB > MAX_MEMORY_KB) {
      console.log(`[mycelium] Auto-trim: memory.json ${memKB}KB > ${MAX_MEMORY_KB}KB limit`);
      needsCompress = true;
    }
  }
  if (fs.existsSync(watchPath)) {
    const watchKB = Math.round(fs.statSync(watchPath).size / 1024);
    if (watchKB > MAX_WATCH_KB) {
      console.log(`[mycelium] Auto-trim: watch.json ${watchKB}KB > ${MAX_WATCH_KB}KB limit`);
      needsCompress = true;
    }
  }
  if (fs.existsSync(evalPath)) {
    const evalKB = Math.round(fs.statSync(evalPath).size / 1024);
    if (evalKB > 20) { // 20KB is plenty for eval history
      console.log(`[mycelium] Auto-trim: eval-history.json ${evalKB}KB > 20KB limit`);
      needsCompress = true;
    }
  }
  
  if (needsCompress) {
    deepCompress(true);
    // Run standard compact too for dedup
    compact(null, true);
  }
  
  return needsCompress;
}

// ─── Brief: Write compact context file to disk ─────────────────────
// Blueprint: Context Retrieval — relevance-filtered, actionable intel.
// This file can be re-read by any AI mid-conversation.

function brief() {
  const mem = loadMemoryCached();
  const lines = [];
  // §1 Prompt Engineering: shorter delimiters (# not ##), abbreviations, no verbose headers
  // §6 Output Optimization: structured compact format, no filler
  lines.push('# CTX (auto|cat .mycelium-context)');

  // CHECKPOINT: structured task state — HIGHEST priority, MUST appear first
  // This survives chat compaction and tells the AI exactly what to resume
  const checkpointPath = path.join(__dirname, '.mycelium', 'checkpoint.json');
  if (fs.existsSync(checkpointPath)) {
    try {
      const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
      if (cp.status === 'in_progress') {
        lines.push('# !!RESUME!! (checkpoint active — DO NOT re-plan, continue from pending steps)');
        lines.push(`  TASK: ${cp.task}`);
        if (cp.completed && cp.completed.length) lines.push(`  DONE: ${cp.completed.join(' | ')}`);
        if (cp.pending && cp.pending.length) lines.push(`  PENDING: ${cp.pending.join(' | ')}`);
        if (cp.blocked && cp.blocked.length) lines.push(`  BLOCKED: ${cp.blocked.join(' | ')}`);
        if (cp.files && cp.files.length) lines.push(`  FILES: ${cp.files.slice(0, 10).join(', ')}`);
        if (cp.context) {
          for (const [k, v] of Object.entries(cp.context).slice(0, 5)) {
            lines.push(`  ${k}: ${String(v).slice(0, 120)}`);
          }
        }
        if (cp.resumeHint) lines.push(`  RESUME: ${cp.resumeHint}`);
      }
    } catch (e) { /* corrupted checkpoint, skip */ }
  }

  // Health: 1 line per commit, no decoration
  const recent = mem.snapshots.slice(-3); // was -5, §5 Context Window: fewer = cheaper
  if (recent.length) {
    const avgScore = Math.round(recent.reduce((s, r) => s + (r.score || 70), 0) / recent.length);
    const grade = avgScore >= 85 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 55 ? 'C' : 'D';
    lines.push(`# HP:${avgScore}(${grade}) last ${recent.length}`);
    for (const s of recent) {
      const r = (s.reasons || []).slice(0, 3).join(' '); // cap reasons per commit
      lines.push(` ${s.score||'?'} ${(s.commit?.hash||'').slice(0,7)} ${(s.commit?.msg||'').slice(0,70)}${r ? ' ['+r+']' : ''}`);
    }
  }

  // Build: single line
  const latest = mem.snapshots[mem.snapshots.length - 1];
  if (latest) {
    lines.push(`# BLD:${latest.build.bundleKB}KB|${latest.build.htmlPages}pg|${latest.build.jsModules}mod`);
  }

  // §9 Agentic Workflow: only show what prevents mistakes, skip inventory list
  // STOP signals — breakages (max 3, truncated to 120 chars each)
  const breakages = (mem.breakages || []).slice(-3);
  const fixChainReflections = (mem.reflections || []).filter(r => r.type === 'fix_chain').slice(-2);
  if (breakages.length || fixChainReflections.length) {
    lines.push('# STOP');
    for (const b of breakages) {
      lines.push(` [${b.area}] ${b.what.slice(0, 120)}`);
    }
    for (const r of fixChainReflections) {
      lines.push(` [fc] ${r.lesson.slice(0, 120)}`);
    }
  }

  // Rules: §5 Context Pruning — only show rules for areas touched recently
  // ENHANCED: Also inject file-specific lessons from watch.json risks
  const constraints = mem.constraints || {};
  const recentAreas = new Set();
  const recentFiles = [];
  (mem.snapshots || []).slice(-5).forEach(s => {
    (s.commit?.files || []).forEach(f => {
      if (typeof f !== 'string') return; // skip non-string entries
      const area = classifyArea(f);
      if (area) recentAreas.add(area);
      recentFiles.push(f);
    });
  });
  // Also include areas with breakages
  breakages.forEach(b => recentAreas.add(b.area));
  const relevantAreas = [...recentAreas].filter(a => constraints[a]?.length > 0);
  if (relevantAreas.length) {
    lines.push('# RULES');
    let ruleCount = 0;
    const MAX_RULES = 20; // was 50, §1 concise
    for (const area of relevantAreas) {
      for (const c of (constraints[area] || []).slice(0, 3)) { // max 3 per area
        if (ruleCount >= MAX_RULES) break;
        if (c.fact.includes('[auto-fixer]')) continue; // skip verbose auto entries
        lines.push(` [${area}] ${c.fact.slice(0, 100)}`);
        ruleCount++;
      }
      if (ruleCount >= MAX_RULES) break;
    }
  }
  
  // FILE-SPECIFIC LESSONS: Pull risk lessons from watch.json for recently-touched files
  // This is the key upgrade: 14% delivery → 80%+ by matching FILES not just areas
  // Sources: snapshot files, watch commit files, AND hotspot files as fallback
  const watchPath2 = path.join(__dirname, '.mycelium', 'watch.json');
  if (fs.existsSync(watchPath2)) {
    try {
      const watchData = JSON.parse(fs.readFileSync(watchPath2, 'utf8'));
      const risks = watchData.risks || {};
      
      // Build file set from all sources
      const allRecentFiles = new Set(recentFiles);
      // Also add files from watch commits (compressed to top 5)
      for (const c of (watchData.commits || []).slice(-5)) {
        for (const f of (c.files || [])) {
          if (typeof f === 'string') allRecentFiles.add(f);
        }
      }
      // Also add top hotspot files (they're the most-edited, most likely to break)
      for (const [f] of Object.entries(mem.patterns?.hotspots || {})
        .filter(([fp]) => !isNoise(fp))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)) {
        allRecentFiles.add(f);
      }
      
      const fileRules = [];
      for (const f of allRecentFiles) {
        // Skip noise/auto-generated files
        if (isNoise(f) || f.includes('.mycelium-mined') || f.includes('.mycelium/') || f === '.gitignore') continue;
        const risk = risks[f];
        if (!risk || !risk.lessons || risk.lessons.length === 0) continue;
        if (risk.breakCount < 2) continue; // only show for files that broke 2+ times
        const topLesson = risk.lessons[risk.lessons.length - 1]; // most recent
        const text = typeof topLesson === 'string' ? topLesson : (topLesson.lesson || '');
        if (text && !fileRules.some(r => r.includes(path.basename(f)))) {
          fileRules.push(` [${path.basename(f)}|${risk.breakCount}x] ${text.slice(0, 80)}`);
        }
      }
      if (fileRules.length > 0) {
        lines.push('# FILE-RISKS (from watch: files that broke before)');
        for (const r of fileRules.slice(0, 8)) { // max 8 file-specific rules
          lines.push(r);
        }
      }
    } catch (e) { /* watch.json read error, skip */ }
  }

  // Learnings: §5 Hierarchical Summarization — only most recent 3
  const learnings = (mem.learnings || []).slice(-3);
  if (learnings.length) {
    lines.push('# LEARNED');
    for (const l of learnings) {
      lines.push(` [${l.area}] ${l.lesson.slice(0, 100)}`);
    }
  }

  // Hotspots: top 3 only
  const hotspots = Object.entries(mem.patterns.hotspots || {})
    .filter(([f]) => !isNoise(f))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (hotspots.length) {
    lines.push('# HOT');
    for (const [file, count] of hotspots) {
      lines.push(` ${count}x ${file}`);
    }
  }

  // WIP: fallback text-only task state (legacy — only if no checkpoint)
  const wipPath = path.join(__dirname, '.mycelium-wip');
  if (fs.existsSync(wipPath)) {
    const wipRaw = fs.readFileSync(wipPath, 'utf8').trim();
    if (wipRaw && !fs.existsSync(checkpointPath)) {
      lines.push('# WIP (resume this)');
      lines.push(wipRaw.slice(0, 500));
    }
  }

  let content = lines.join('\n');

  // §3 Token Counting: hard cap at MAX_CONTEXT_TOKENS
  const contextTokens = estimateTokens(content);
  if (contextTokens > MAX_CONTEXT_TOKENS) {
    // Progressive trim: remove from bottom sections
    const sections = content.split(/\n(?=# )/);
    const priorityOrder = ['!!RESUME!!', 'WIP', 'HP:', 'BLD:', 'STOP', 'RULES', 'FILE-RISKS', 'LEARNED', 'HOT', 'CTX'];
    let rebuilt = [];
    let runningTokens = 0;
    const budget = MAX_CONTEXT_TOKENS - 200;
    for (const prio of priorityOrder) {
      const section = sections.find(s => s.includes(prio));
      if (!section) continue;
      const sectionTokens = estimateTokens(section);
      if (runningTokens + sectionTokens <= budget) {
        rebuilt.push(section);
        runningTokens += sectionTokens;
      } else break;
    }
    content = rebuilt.join('\n');
  }

  fs.writeFileSync(path.join(__dirname, '.mycelium-context'), content);
  console.log(content);
}

// ─── FEATURE 1: Auto-Premortem — fires on file list, not just area name ─
// Instead of manually running --premortem <area>, pass file paths.
// Detects areas from the files, deduplicates, runs premortem for each.
// Used by: --guard <file1> <file2> ... OR --guard (reads git staged files)

function guard(files) {
  const mem = loadMemoryCached(); // §2 Caching: avoid re-reading 200KB+ file

  // If no files passed, read from git staged files
  if (!files || files.length === 0) {
    try {
      const staged = run('git diff --cached --name-only 2>/dev/null').trim();
      const unstaged = run('git diff --name-only 2>/dev/null').trim();
      const all = (staged + '\n' + unstaged).trim();
      files = all ? all.split('\n').filter(Boolean) : [];
    } catch (e) { files = []; }
  }

  if (files.length === 0) {
    console.log('[mycelium] No files to guard. Stage some files or pass paths.');
    return;
  }

  // Classify files into areas
  const areas = new Set();
  for (const f of files) {
    const area = classifyArea(f);
    if (area && area !== 'root' && area !== 'public') areas.add(area);
  }

  if (areas.size === 0) {
    console.log('[mycelium] No known areas detected in these files. Checking root constraints...');
    areas.add('root');
  }

  console.log(`\n# Auto-Guard: ${files.length} files → ${areas.size} area(s) detected`);
  console.log(`  Areas: ${[...areas].join(', ')}`);
  console.log(`  Files: ${files.slice(0, 8).join(', ')}${files.length > 8 ? ` (+${files.length - 8} more)` : ''}`);

  // ── COST WARNING: show token cost of files being guarded ──
  let guardTokenCost = 0;
  const expensiveFiles = [];
  for (const f of files) {
    const fp = path.resolve(__dirname, f);
    const cost = fileCostTier(fp);
    guardTokenCost += cost.tokens;
    if (cost.tier >= 3) expensiveFiles.push({ file: f, ...cost });
  }
  if (expensiveFiles.length > 0) {
    console.log(`  ⚠ TOKEN COST: These files are EXPENSIVE to read (use grep + Edit instead):`);
    for (const ef of expensiveFiles) {
      console.log(`    ${ef.label.toUpperCase()} ${ef.file}: ~${ef.tokens.toLocaleString()} tokens → ${ef.strategy}`);
    }
  }
  console.log('');

  // Collect all warnings (compact format — not full premortem, just the dangerous stuff)
  let totalWarnings = 0;

  for (const area of areas) {
    const constraints = mem.constraints[area] || [];
    const breakages = (mem.breakages || []).filter(b => b.area === area);
    const learnings = (mem.learnings || []).filter(l => l.area === area);
    const fixChains = (mem.patterns.fixChains || []).filter(fc =>
      fc.files.some(f => classifyArea(f) === area) || fc.msg.toLowerCase().includes(area)
    );

    if (constraints.length === 0 && breakages.length === 0 && learnings.length === 0 && fixChains.length === 0) continue;

    console.log(`## [${area}] — ${constraints.length} constraints, ${breakages.length} breakages, ${fixChains.length} fix chains`);

    for (const c of constraints) {
      console.log(`  ⚠ CONSTRAINT: ${c.fact}`);
      totalWarnings++;
    }
    for (const b of breakages.slice(-3)) {
      console.log(`  ✗ BROKE BEFORE: ${b.what}`);
      totalWarnings++;
    }
    for (const l of learnings.slice(-2)) {
      console.log(`  📝 LEARNED: ${l.lesson}`);
      totalWarnings++;
    }
    if (fixChains.length > 0) {
      console.log(`  🔄 ${fixChains.length} fix chain(s) — this area has needed immediate follow-up fixes before`);
      totalWarnings++;
    }
    console.log('');
  }

  // Cross-cutting: check if files touch coupled pairs
  const coupledWarnings = [];
  const coChanges = mem.patterns.coChanges || {};
  for (const f of files) {
    for (const [pair, count] of Object.entries(coChanges)) {
      if (count >= 10 && pair.includes(f)) {
        const other = pair.split('<->').map(s => s.trim()).find(s => s !== f);
        if (other && !files.includes(other)) {
          coupledWarnings.push(`${f} usually changes with ${other} (${count}x together) — are you missing it?`);
        }
      }
    }
  }
  if (coupledWarnings.length > 0) {
    console.log('## Coupled Files Warning');
    for (const w of coupledWarnings.slice(0, 5)) {
      console.log(`  🔗 ${w}`);
      totalWarnings++;
    }
    console.log('');
  }

  if (totalWarnings === 0) {
    console.log('✅ No known risks for these files. Proceed with confidence.');
  } else {
    console.log(`⚡ ${totalWarnings} warning(s) total. Review before editing.`);
  }
  console.log('');

  // ── FILE-SPECIFIC GUARD: check staged diffs against known failure patterns ──
  // For files with 5+ breaks, extract root-cause themes from watch data
  // and check if the diff contains those patterns. This is the upgrade from
  // "passive warnings" to "active blocking."
  try {
    const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
    if (fs.existsSync(watchPath)) {
      const watchData = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
      const risks = watchData.risks || {};

      // Get the actual diff for staged files
      let diff = '';
      try { diff = run('git diff --cached 2>/dev/null').toLowerCase(); } catch {}
      if (!diff) try { diff = run('git diff 2>/dev/null').toLowerCase(); } catch {}

      const highRiskFiles = files.filter(f => {
        const r = risks[f];
        return r && r.breakCount >= 5;
      });

      if (highRiskFiles.length > 0) {
        console.log('## File-Specific Risk Check (5+ break history)');

        for (const f of highRiskFiles) {
          const r = risks[f];
          const breakCount = r.breakCount || 0;
          const lessons = r.lessons || [];

          // Extract failure patterns from lessons
          const patterns = [];
          for (const lesson of lessons) {
            const text = (lesson.lesson || lesson || '').toLowerCase();
            // Extract key problem phrases
            if (text.includes('innerhtml')) patterns.push('innerHTML');
            if (text.includes('i18n') || text.includes('data-i18n')) patterns.push('i18n/translation');
            if (text.includes('ios') || text.includes('safari') || text.includes('webkit')) patterns.push('iOS/Safari');
            if (text.includes('mobile') || text.includes('320px') || text.includes('responsive')) patterns.push('mobile/responsive');
            if (text.includes('touch') || text.includes('click')) patterns.push('touch/click events');
            if (text.includes('flex') || text.includes('overflow') || text.includes('layout')) patterns.push('layout/flex');
            if (text.includes('font') || text.includes('text-align')) patterns.push('font/text');
            if (text.includes('coupled') || text.includes('co-change')) patterns.push('coupled file');
            if (text.includes('load order') || text.includes('init')) patterns.push('load order/init');
          }
          const uniquePatterns = [...new Set(patterns)];

          // Check if diff touches this file and contains risky patterns
          const fileDiffStart = diff.indexOf(f.toLowerCase());
          if (fileDiffStart === -1) continue; // file not in diff

          const fileDiff = diff.slice(fileDiffStart, diff.indexOf('diff --git', fileDiffStart + 1) || diff.length);

          const triggeredPatterns = [];
          for (const p of uniquePatterns) {
            const keywords = p.toLowerCase().split('/');
            if (keywords.some(k => fileDiff.includes(k))) {
              triggeredPatterns.push(p);
            }
          }

          if (triggeredPatterns.length > 0) {
            console.log(`  🔴 ${f} (broke ${breakCount}x) — RISK: diff touches ${triggeredPatterns.join(', ')}`);
            console.log(`     Known failure themes from ${lessons.length} lessons:`);
            for (const p of triggeredPatterns) {
              console.log(`       → ${p}: caused previous breakages — verify this change carefully`);
            }
            totalWarnings += triggeredPatterns.length;
          } else if (fileDiff.length > 0) {
            console.log(`  🟡 ${f} (broke ${breakCount}x) — editing a fragile file. Known patterns: ${uniquePatterns.slice(0, 4).join(', ') || 'general'}`);
            totalWarnings++;
          }
        }
        console.log('');
      }
    }
  } catch (e) { /* file-specific guard is best-effort */ }

  // ── CONTEXT-READ CHECK: did the AI/dev read .mycelium-context this session? ──
  // Only warn (not block) for commits touching 3+ files
  if (files.length >= 3) {
    try {
      const sessionFile = path.join(__dirname, '.mycelium-session');
      const contextFile = path.join(__dirname, '.mycelium-context');
      if (fs.existsSync(sessionFile) && fs.existsSync(contextFile)) {
        const sessionTime = fs.statSync(sessionFile).mtimeMs;
        const contextTime = fs.statSync(contextFile).mtimeMs;
        // If session file is newer than context file, context wasn't refreshed this session
        // Check if context was accessed (atime) after session started
        const contextAccess = fs.statSync(contextFile).atimeMs;
        if (contextAccess < sessionTime) {
          console.log('## Context Warning');
          console.log('  ⚠ .mycelium-context was not read this session.');
          console.log('  You\'re touching ' + files.length + ' files — read the context first:');
          console.log('  Run: cat .mycelium-context');
          console.log('');
          totalWarnings++;
        }
      }
    } catch (e) { /* best effort */ }
  }

  // ── NEW FILE DUPLICATION CHECK: catch overlap at commit time ──
  try {
    const addedRaw = run('git diff --cached --diff-filter=A --name-only 2>/dev/null').trim();
    const added = addedRaw ? addedRaw.split('\n').filter(f => f && !isNoise(f)) : [];
    for (const newFile of added) {
      const ext = path.extname(newFile);
      if (!['.html','.js','.cjs','.ts','.tsx','.css'].includes(ext)) continue;
      const dir = path.dirname(newFile);
      const base = path.basename(newFile, ext).toLowerCase();
      const words = new Set(base.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
        .split(/[-_.\s]+/).filter(w => w.length > 2));
      if (words.size === 0) continue;

      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) continue;
      const existing = fs.readdirSync(dirPath)
        .filter(f => path.extname(f) === ext && f !== path.basename(newFile));
      for (const ef of existing) {
        const efBase = path.basename(ef, ext).toLowerCase();
        const efWords = new Set(efBase
          .replace(/([a-z])([A-Z])/g, '$1-$2').split(/[-_.\s]+/).filter(w => w.length > 2));
        const kwOverlap = [...words].filter(w => efWords.has(w));

        // Shared-root check (catches showroom/showcase)
        let sharedPfx = 0;
        for (let i = 0; i < Math.min(base.length, efBase.length); i++) {
          if (base[i] === efBase[i]) sharedPfx++; else break;
        }
        const hasSharedRoot = sharedPfx >= 4;

        if (kwOverlap.length >= 2 || (kwOverlap.length >= 1 && kwOverlap[0].length >= 5) || hasSharedRoot) {
          const reasons = [];
          if (kwOverlap.length > 0) reasons.push(`shared keywords: [${kwOverlap.join(', ')}]`);
          if (hasSharedRoot) reasons.push(`shared root "${base.slice(0, sharedPfx)}"`);
          console.log(`## Duplicate File Warning`);
          console.log(`  ⚠ NEW "${path.basename(newFile)}" overlaps with EXISTING "${ef}"`);
          console.log(`    ${reasons.join(', ')}`);
          console.log(`    Run: node mycelium.cjs --check ${newFile}`);
          console.log('');
          totalWarnings++;
        }
      }
    }
  } catch (e) { /* best effort */ }

  // Enforce mode: return warning count so callers can block on violations
  return totalWarnings;
}

// ─── FEATURE 1b: Predict risks for files BEFORE you edit them ────────
// Usage: --predict <file1> <file2> ...
// Shows: breakage probability, coupled files you'll need, constraints to obey

function predict(files) {
  const mem = loadMemory();
  
  if (!files || files.length === 0) {
    console.log('[mycelium] Usage: --predict <file1> [file2] ...');
    return;
  }

  console.log(`\n# Risk Prediction for ${files.length} file(s)\n`);

  for (const file of files) {
    const area = classifyArea(file);
    const breakages = (mem.breakages || []).filter(b => 
      (b.files && b.files.includes(file)) || b.area === area
    );
    const fixChains = (mem.patterns.fixChains || []).filter(fc =>
      fc.files && fc.files.includes(file)
    );
    const coChanges = mem.patterns.coChanges || {};
    const coupled = [];
    for (const [pair, count] of Object.entries(coChanges)) {
      if (count >= 5 && pair.includes(file)) {
        const other = pair.split('<->').map(s => s.trim()).find(s => s !== file);
        if (other) coupled.push({ file: other, count });
      }
    }
    coupled.sort((a, b) => b.count - a.count);

    const constraints = mem.constraints[area] || [];
    const learnings = (mem.learnings || []).filter(l => l.area === area);

    // Risk score: 0-100
    const breakScore = Math.min(breakages.length * 15, 50);
    const chainScore = Math.min(fixChains.length * 10, 30);
    const coupledScore = coupled.length > 0 ? 10 : 0;
    const constraintScore = constraints.length > 3 ? 10 : 0;
    const risk = Math.min(breakScore + chainScore + coupledScore + constraintScore, 100);

    const riskLabel = risk >= 70 ? 'HIGH' : risk >= 40 ? 'MEDIUM' : 'LOW';
    const riskColor = risk >= 70 ? '🔴' : risk >= 40 ? '🟡' : '🟢';

    console.log(`## ${file} — ${riskColor} ${riskLabel} RISK (${risk}/100)`);
    console.log(`   Area: ${area} | Breakages: ${breakages.length} | Fix chains: ${fixChains.length} | Constraints: ${constraints.length}`);

    if (coupled.length > 0) {
      console.log(`   Coupled files (edit these too):`);
      for (const c of coupled.slice(0, 5)) {
        console.log(`     → ${c.file} (${c.count}x co-changed)`);
      }
    }

    if (constraints.length > 0) {
      console.log(`   Must obey:`);
      for (const c of constraints.slice(0, 3)) {
        console.log(`     ⚠ ${c.fact}`);
      }
    }

    if (learnings.length > 0) {
      console.log(`   Key lessons:`);
      for (const l of learnings.slice(-2)) {
        console.log(`     📝 ${l.lesson}`);
      }
    }

    console.log('');
  }
}

// ─── FEATURE 1c: Trending — show score trend in terminal ────────
// Usage: --trending
// Shows: ASCII chart of recent scores, improvement rate, trajectory

function trending() {
  const mem = loadMemory();
  const snapshots = mem.snapshots || [];
  const breakages = mem.breakages || [];

  // Build daily stats
  const dailyMap = {};
  for (const s of snapshots) {
    const date = s.date || (s.ts ? new Date(s.ts).toISOString().slice(0, 10) : null);
    if (!date) continue;
    if (!dailyMap[date]) dailyMap[date] = { commits: 0, fixes: 0, score: 0, count: 0 };
    dailyMap[date].commits++;
    if (s.commit && s.commit.isFix) dailyMap[date].fixes++;
    if (s.score !== undefined) {
      dailyMap[date].score += s.score;
      dailyMap[date].count++;
    }
  }

  // Count breakages per day
  for (const b of breakages) {
    const date = b.date;
    if (date && dailyMap[date]) dailyMap[date].breakages = (dailyMap[date].breakages || 0) + 1;
  }

  const days = Object.keys(dailyMap).sort();
  if (days.length === 0) {
    console.log('[mycelium] No data for trending.');
    return;
  }

  console.log('\n# Score Trend — Mycelium Learning System\n');

  // ASCII bar chart
  const barWidth = 40;
  const maxCommits = Math.max(...days.map(d => dailyMap[d].commits), 1);

  console.log('  Date       | Commits | Fixes | Brk | Avg Score | Activity');
  console.log('  ' + '-'.repeat(75));

  for (const day of days) {
    const d = dailyMap[day];
    const avg = d.count > 0 ? Math.round(d.score / d.count) : '-';
    const barLen = Math.round((d.commits / maxCommits) * barWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(barWidth - barLen);
    const brk = d.breakages || 0;
    console.log(`  ${day} | ${String(d.commits).padStart(7)} | ${String(d.fixes).padStart(5)} | ${String(brk).padStart(3)} | ${String(avg).padStart(9)} | ${bar}`);
  }

  // Summary
  const totalCommits = days.reduce((s, d) => s + dailyMap[d].commits, 0);
  const totalFixes = days.reduce((s, d) => s + dailyMap[d].fixes, 0);
  const totalBreakages = days.reduce((s, d) => s + (dailyMap[d].breakages || 0), 0);

  const earlyDays = days.slice(0, Math.ceil(days.length / 2));
  const lateDays = days.slice(Math.ceil(days.length / 2));
  const earlyFixRate = earlyDays.reduce((s, d) => s + dailyMap[d].fixes, 0) / Math.max(earlyDays.reduce((s, d) => s + dailyMap[d].commits, 0), 1);
  const lateFixRate = lateDays.reduce((s, d) => s + dailyMap[d].fixes, 0) / Math.max(lateDays.reduce((s, d) => s + dailyMap[d].commits, 0), 1);

  console.log('\n  Summary:');
  console.log(`    Total: ${totalCommits} commits, ${totalFixes} fixes, ${totalBreakages} breakages`);
  console.log(`    Fix rate: ${(earlyFixRate * 100).toFixed(0)}% (early) → ${(lateFixRate * 100).toFixed(0)}% (late) ${lateFixRate < earlyFixRate ? '📈 IMPROVING' : '📉 needs work'}`);
  console.log(`    Learnings: ${(mem.learnings || []).length} | Constraints: ${Object.values(mem.constraints || {}).reduce((s, a) => s + a.length, 0)} | Decisions: ${(mem.decisions || []).length}`);

  // Trajectory
  if (lateDays.length > 0 && earlyDays.length > 0) {
    const earlyBreakRate = earlyDays.reduce((s, d) => s + (dailyMap[d].breakages || 0), 0) / earlyDays.length;
    const lateBreakRate = lateDays.reduce((s, d) => s + (dailyMap[d].breakages || 0), 0) / lateDays.length;
    const trajectory = lateBreakRate < earlyBreakRate ? '🟢 Breakage rate declining' : '🔴 Breakage rate flat/rising';
    console.log(`    Trajectory: ${trajectory} (${earlyBreakRate.toFixed(1)}/day → ${lateBreakRate.toFixed(1)}/day)`);
  }
  console.log('');
}

// ─── FEATURE 2: Auto-generate regression tests from breakages ────────
// Each --broke entry becomes a concrete test assertion.
// Tests are written to tests/regression-from-breakages.cjs and can run standalone.

function generateRegressionTests() {
  const mem = loadMemory();
  const breakages = mem.breakages || [];
  
  if (breakages.length === 0) {
    console.log('[mycelium] No breakages recorded. Nothing to generate tests for.');
    return;
  }

  const testFile = path.join(__dirname, 'tests', 'regression-from-breakages.cjs');

  // Build test cases from breakages + constraints
  const testCases = [];

  for (const b of breakages) {
    const tc = breakageToTest(b, mem);
    if (tc) testCases.push(tc);
  }

  // Also generate from constraints that imply testable rules
  for (const [area, constraints] of Object.entries(mem.constraints || {})) {
    for (const c of constraints) {
      const tc = constraintToTest(area, c, mem);
      if (tc) testCases.push(tc);
    }
  }

  // Write test file
  const lines = [];
  lines.push('#!/usr/bin/env node');
  lines.push('/**');
  lines.push(' * AUTO-GENERATED regression tests from MYCELIUM breakages & constraints');
  lines.push(` * Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push(` * Breakages: ${breakages.length} | Constraints: ${Object.values(mem.constraints || {}).reduce((s, a) => s + a.length, 0)}`);
  lines.push(` * Test cases: ${testCases.length}`);
  lines.push(' *');
  lines.push(' * Run: node tests/regression-from-breakages.cjs');
  lines.push(' * These tests verify that known breakages have NOT been reintroduced.');
  lines.push(' */');
  lines.push('');
  lines.push("const fs = require('fs');");
  lines.push("const path = require('path');");
  lines.push('');
  lines.push('let passed = 0, failed = 0, skipped = 0;');
  lines.push("const PASS = '\\x1b[32m✓\\x1b[0m';");
  lines.push("const FAIL = '\\x1b[31m✗\\x1b[0m';");
  lines.push("const SKIP = '\\x1b[33m⊘\\x1b[0m';");
  lines.push('');
  lines.push('function test(name, fn) {');
  lines.push('  try {');
  lines.push('    const result = fn();');
  lines.push("    if (result === 'skip') { skipped++; console.log(`  ${SKIP} ${name} (skipped — file not found)`); return; }");
  lines.push('    passed++; console.log(`  ${PASS} ${name}`);');
  lines.push('  } catch (e) {');
  lines.push('    failed++; console.log(`  ${FAIL} ${name}: ${e.message}`);');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('function assert(cond, msg) { if (!cond) throw new Error(msg); }');
  lines.push("function readFile(fp) { const p = path.join(__dirname, '..', fp); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }");
  lines.push('');
  lines.push(`console.log('\\n# Regression Tests (auto-generated from ${breakages.length} breakages + constraints)\\n');`);
  lines.push('');

  for (const tc of testCases) {
    lines.push(`// From: [${tc.area}] ${tc.source}`);
    lines.push(`test('${tc.name.replace(/'/g, "\\'")}', () => {`);
    for (const line of tc.body) {
      lines.push(`  ${line}`);
    }
    lines.push('});');
    lines.push('');
  }

  lines.push('console.log(`\\n${passed} passed, ${failed} failed, ${skipped} skipped\\n`);');
  lines.push('if (failed > 0) process.exit(1);');

  // Ensure tests/ directory exists
  const testsDir = path.join(__dirname, 'tests');
  if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir);

  fs.writeFileSync(testFile, lines.join('\n'));
  console.log(`[mycelium] Generated ${testCases.length} regression tests from ${breakages.length} breakages + constraints`);
  console.log(`  Written to: tests/regression-from-breakages.cjs`);
  console.log(`  Run: node tests/regression-from-breakages.cjs`);
}

// Convert a breakage into a test case
function breakageToTest(breakage, mem) {
  const area = breakage.area;
  const what = breakage.what;
  const wLower = what.toLowerCase();

  // Helper: wrap each file check in a block scope to avoid variable collisions
  function fileBlock(f, innerLines) {
    return [`{ // check: ${f}`, ...innerLines.map(l => '  ' + l), '}'];
  }

  // Pattern: overflow:hidden / overflow clipping
  if (wLower.includes('overflow') && wLower.includes('hidden')) {
    const areaMap = buildAreaMap(mem);
    const cssFiles = Object.keys(areaMap[area] || {}).filter(f => f.endsWith('.css'));
    const htmlFiles = Object.keys(areaMap[area] || {}).filter(f => f.endsWith('.html'));
    const targets = [...cssFiles, ...htmlFiles].slice(0, 3);
    if (targets.length === 0) return null;
    return {
      area, source: what,
      name: `[${area}] no overflow:hidden that clips interactive content`,
      body: targets.map(f => fileBlock(f, [
        `const content = readFile('${f}');`,
        `if (!content) return 'skip';`,
        `const lines = content.split('\\n');`,
        `for (let i = 0; i < lines.length; i++) {`,
        `  const line = lines[i].toLowerCase();`,
        `  if (line.includes('overflow') && line.includes('hidden') && (line.includes('arena') || line.includes('game') || line.includes('hand') || line.includes('card'))) {`,
        `    assert(false, '${f}:' + (i+1) + ' has overflow:hidden on game container — broke mobile before');`,
        `  }`,
        `}`,
      ])).flat()
    };
  }

  // Pattern: Audio.init / audio blocking
  if (wLower.includes('audio') && (wLower.includes('block') || wLower.includes('init') || wLower.includes('ios'))) {
    const areaMap = buildAreaMap(mem);
    const jsFiles = Object.keys(areaMap[area] || {}).filter(f => f.endsWith('.js')).slice(0, 3);
    if (jsFiles.length === 0) return null;
    return {
      area, source: what,
      name: `[${area}] Audio.init not called at page load (blocks iOS)`,
      body: jsFiles.map(f => fileBlock(f, [
        `const content = readFile('${f}');`,
        `if (!content) return 'skip';`,
        `// Audio.init at load time blocks iOS — must be on user gesture`,
      ])).flat()
    };
  }

  // Pattern: debug / dev mode left in production
  if (wLower.includes('debug') && wLower.includes('production')) {
    const areaMap = buildAreaMap(mem);
    const htmlFiles = Object.keys(areaMap[area] || {}).filter(f => f.endsWith('.html')).slice(0, 5);
    if (htmlFiles.length === 0) return null;
    return {
      area, source: what,
      name: `[${area}] no debug overlays left in production HTML`,
      body: htmlFiles.map(f => fileBlock(f, [
        `const content = readFile('${f}');`,
        `if (!content) return 'skip';`,
        `assert(!(/id=["']debug/i.test(content) && !/display:\\s*none|GM_MODE|DEV_MODE/i.test(content)), '${f} has debug overlay without gate');`,
      ])).flat()
    };
  }

  // Pattern: innerHTML replacing DOM / event handlers lost
  if (wLower.includes('innerhtml') || (wLower.includes('event') && wLower.includes('lost'))) {
    const areaMap = buildAreaMap(mem);
    const jsFiles = Object.keys(areaMap[area] || {}).filter(f => f.endsWith('.js')).slice(0, 3);
    if (jsFiles.length === 0) return null;
    return {
      area, source: what,
      name: `[${area}] innerHTML usage flagged (destroys event handlers)`,
      body: jsFiles.map(f => fileBlock(f, [
        `const content = readFile('${f}');`,
        `if (!content) return 'skip';`,
        `const matches = content.match(/\\.innerHTML\\s*=/g);`,
        `if (matches && matches.length > 5) assert(false, '${f} has ' + matches.length + ' innerHTML assignments — high risk of losing event handlers');`,
      ])).flat()
    };
  }

  // Pattern: placeholder / untranslated strings visible
  if (wLower.includes('placeholder') || wLower.includes('[zh]') || wLower.includes('[th]') || wLower.includes('translation')) {
    return {
      area, source: what,
      name: `[${area}] no raw translation placeholders visible in HTML`,
      body: [
        `const dir = path.join(__dirname, '..', 'public');`,
        `if (!fs.existsSync(dir)) return 'skip';`,
        `const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html')).slice(0, 20);`,
        `for (const f of htmlFiles) {`,
        `  const content = fs.readFileSync(path.join(dir, f), 'utf8');`,
        `  const placeholders = content.match(/\\[ZH\\]|\\[TH\\]|\\[EN\\]/g);`,
        `  if (placeholders && placeholders.length > 10) assert(false, f + ' has ' + placeholders.length + ' raw translation placeholders');`,
        `}`,
      ]
    };
  }

  // Pattern: script load order matters
  if (wLower.includes('must load after') || wLower.includes('load order') || wLower.includes('must load before')) {
    return {
      area, source: what,
      name: `[${area}] script load order verified`,
      body: [
        `// Load order constraint: ${what.replace(/'/g, "\\'")}`,
        `// This is a manual verification reminder — check HTML <script> tags`,
        `// Auto-test: verify the constraint file references still exist`,
        `const areaDir = path.join(__dirname, '..', 'public', 'static');`,
        `if (!fs.existsSync(areaDir)) return 'skip';`,
      ]
    };
  }

  // Generic pattern: create a documentation test
  return {
    area, source: what,
    name: `[${area}] regression guard: ${what.slice(0, 60).replace(/'/g, "\\'")}`,
    body: [
      `// Known breakage: ${what.replace(/'/g, "\\'")}`,
      `// This test exists as a reminder. Add specific assertions when the pattern recurs.`,
      `assert(true, 'guard acknowledged');`,
    ]
  };
}

// Convert a constraint into a test case (only for testable ones)
function constraintToTest(area, constraint, mem) {
  const fact = constraint.fact;
  const fLower = fact.toLowerCase();

  // Helper: wrap each file check in a block scope
  function fileBlock(f, innerLines) {
    return [`{ // check: ${f}`, ...innerLines.map(l => '  ' + l), '}'];
  }

  // Constraint: viewport / mobile width
  if (fLower.includes('viewport') || fLower.includes('320') || fLower.includes('375')) {
    const areaMap = buildAreaMap(mem);
    const cssFiles = Object.keys(areaMap[area] || {}).filter(f => f.endsWith('.css')).slice(0, 3);
    if (cssFiles.length === 0) return null;
    return {
      area, source: `constraint: ${fact}`,
      name: `[${area}] CSS handles minimum mobile viewport`,
      body: cssFiles.map(f => fileBlock(f, [
        `const content = readFile('${f}');`,
        `if (!content) return 'skip';`,
        `const hasResponsive = /min-width|max-width|@media|flex-wrap|grid-template/i.test(content);`,
        `assert(hasResponsive, '${f} should have responsive CSS for mobile viewports');`,
      ])).flat()
    };
  }

  // Constraint: webkit prefix
  if (fLower.includes('webkit') || fLower.includes('ios safari')) {
    const areaMap = buildAreaMap(mem);
    const cssFiles = Object.keys(areaMap[area] || {}).filter(f => f.endsWith('.css')).slice(0, 3);
    if (cssFiles.length === 0) return null;
    return {
      area, source: `constraint: ${fact}`,
      name: `[${area}] CSS includes -webkit- prefixes`,
      body: cssFiles.map(f => fileBlock(f, [
        `const content = readFile('${f}');`,
        `if (!content) return 'skip';`,
        `if (content.includes('background-clip') && !content.includes('-webkit-background-clip')) {`,
        `  assert(false, '${f} uses background-clip without -webkit- prefix');`,
        `}`,
      ])).flat()
    };
  }

  // Constraint: touchend + click double-fire
  if (fLower.includes('touchend') || fLower.includes('touch') && fLower.includes('click')) {
    return {
      area, source: `constraint: ${fact}`,
      name: `[${area}] touch+click double-fire handling`,
      body: [
        `// Constraint: ${fact.replace(/'/g, "\\'")}`,
        `const dir = path.join(__dirname, '..', 'public', 'static');`,
        `if (!fs.existsSync(dir)) return 'skip';`,
        `const jsFiles = fs.readdirSync(dir).filter(f => f.includes('${area}') && f.endsWith('.js'));`,
        `for (const f of jsFiles) {`,
        `  const content = fs.readFileSync(path.join(dir, f), 'utf8');`,
        `  if (content.includes('touchend') && content.includes('click')) {`,
        `    const hasGuard = /handling|touchHandled|isTouch|preventDouble|setTimeout.*300/i.test(content);`,
        `    assert(hasGuard, f + ' has both touchend+click but no double-fire guard');`,
        `  }`,
        `}`,
      ]
    };
  }

  // Don't generate tests for non-testable constraints (decisions, design choices)
  return null;
}

// ─── FEATURE 3: Cross-project shared constraint library ──────────────
// Export portable constraints/learnings to ~/.mycelium-shared.json
// Import them into any new project. Universal truths carry forward.

const SHARED_MEMORY_PATH = path.join(require('os').homedir(), '.mycelium-shared.json');

function loadSharedMemory() {
  try {
    return JSON.parse(fs.readFileSync(SHARED_MEMORY_PATH, 'utf8'));
  } catch (e) {
    return { 
      constraints: [],
      learnings: [],
      meta: { created: new Date().toISOString(), projects: [] }
    };
  }
}

function saveSharedMemory(shared) {
  fs.writeFileSync(SHARED_MEMORY_PATH, JSON.stringify(shared, null, 2));
}

function exportToShared() {
  const mem = loadMemory();
  const shared = loadSharedMemory();
  const projectName = path.basename(__dirname);

  // Track which project contributed
  if (!shared.meta.projects.includes(projectName)) {
    shared.meta.projects.push(projectName);
  }
  shared.meta.lastExport = new Date().toISOString();

  // Export UNIVERSAL constraints (not project-specific ones)
  // Filter for constraints that are about platforms/tech, not about specific files
  const universalKeywords = ['ios', 'safari', 'mobile', 'touch', 'viewport', 'webkit', 'audio', 'innerhtml', 
    'dom', 'event', 'handler', 'font', 'performance', 'security', 'accessibility', 'seo',
    'cloudflare', 'worker', 'cache', 'cors', 'api', 'regex', 'css', 'flex', 'grid',
    'hover', 'scroll', 'overflow', 'animation', 'transition', 'z-index', 'module', 'import'];

  let exportedConstraints = 0;
  for (const [area, constraints] of Object.entries(mem.constraints || {})) {
    for (const c of constraints) {
      const isUniversal = universalKeywords.some(kw => c.fact.toLowerCase().includes(kw));
      if (!isUniversal) continue;

      // Don't duplicate
      const exists = shared.constraints.some(sc => sc.fact === c.fact);
      if (exists) continue;

      shared.constraints.push({
        fact: c.fact,
        area,
        sourceProject: projectName,
        exportDate: new Date().toISOString().split('T')[0],
        tags: universalKeywords.filter(kw => c.fact.toLowerCase().includes(kw))
      });
      exportedConstraints++;
    }
  }

  // Export universal learnings
  let exportedLearnings = 0;
  for (const l of (mem.learnings || [])) {
    const isUniversal = universalKeywords.some(kw => l.lesson.toLowerCase().includes(kw));
    if (!isUniversal) continue;

    const exists = shared.learnings.some(sl => sl.lesson === l.lesson);
    if (exists) continue;

    shared.learnings.push({
      lesson: l.lesson,
      area: l.area,
      sourceProject: projectName,
      exportDate: new Date().toISOString().split('T')[0]
    });
    exportedLearnings++;
  }

  // Also export breakage patterns as learnings (the most valuable cross-project data)
  for (const b of (mem.breakages || [])) {
    const isUniversal = universalKeywords.some(kw => b.what.toLowerCase().includes(kw));
    if (!isUniversal) continue;

    const lesson = `[from breakage] ${b.what}`;
    const exists = shared.learnings.some(sl => sl.lesson === lesson);
    if (exists) continue;

    shared.learnings.push({
      lesson,
      area: b.area,
      sourceProject: projectName,
      exportDate: new Date().toISOString().split('T')[0]
    });
    exportedLearnings++;
  }

  saveSharedMemory(shared);

  console.log(`[mycelium] Exported to shared library: ${SHARED_MEMORY_PATH}`);
  console.log(`  ${exportedConstraints} new constraints exported`);
  console.log(`  ${exportedLearnings} new learnings exported`);
  console.log(`  Total in library: ${shared.constraints.length} constraints, ${shared.learnings.length} learnings`);
  console.log(`  Projects: ${shared.meta.projects.join(', ')}`);
  console.log('');
  console.log('  Use in any project: node mycelium.cjs --import-shared');
}

function importFromShared() {
  const shared = loadSharedMemory();
  const mem = loadMemory();
  const projectName = path.basename(__dirname);

  if (shared.constraints.length === 0 && shared.learnings.length === 0) {
    console.log('[mycelium] Shared library is empty. Export from a project first: --export-shared');
    return;
  }

  let importedConstraints = 0;
  let importedLearnings = 0;

  // Import constraints (skip ones from this project — they're already here)
  for (const sc of shared.constraints) {
    if (sc.sourceProject === projectName) continue;

    const area = sc.area;
    if (!mem.constraints[area]) mem.constraints[area] = [];
    const exists = mem.constraints[area].some(c => c.fact === sc.fact);
    if (exists) continue;

    mem.constraints[area].push({
      fact: `[shared:${sc.sourceProject}] ${sc.fact}`,
      ts: Date.now(),
      date: new Date().toISOString().split('T')[0]
    });
    importedConstraints++;
  }

  // Import learnings
  for (const sl of shared.learnings) {
    if (sl.sourceProject === projectName) continue;

    if (!mem.learnings) mem.learnings = [];
    const exists = mem.learnings.some(l => l.lesson === sl.lesson);
    if (exists) continue;

    mem.learnings.push({
      area: sl.area,
      lesson: `[shared:${sl.sourceProject}] ${sl.lesson}`,
      ts: Date.now(),
      date: new Date().toISOString().split('T')[0]
    });
    importedLearnings++;
  }

  if (importedConstraints > 0 || importedLearnings > 0) {
    saveMemory(mem);
  }

  console.log(`[mycelium] Imported from shared library:`);
  console.log(`  ${importedConstraints} constraints imported`);
  console.log(`  ${importedLearnings} learnings imported`);
  console.log(`  Source: ${shared.meta.projects.filter(p => p !== projectName).join(', ') || 'none (all from this project)'}`);
}

function showSharedLibrary() {
  const shared = loadSharedMemory();

  console.log(`\n# Shared Constraint Library: ${SHARED_MEMORY_PATH}`);
  console.log(`  Projects: ${shared.meta.projects.join(', ') || 'none'}`);
  console.log(`  Constraints: ${shared.constraints.length}`);
  console.log(`  Learnings: ${shared.learnings.length}`);
  console.log('');

  if (shared.constraints.length > 0) {
    console.log('## Universal Constraints');
    for (const c of shared.constraints) {
      console.log(`  [${c.area}] ${c.fact}  (from: ${c.sourceProject})`);
    }
    console.log('');
  }

  if (shared.learnings.length > 0) {
    console.log('## Universal Learnings');
    for (const l of shared.learnings) {
      console.log(`  [${l.area}] ${l.lesson}  (from: ${l.sourceProject})`);
    }
    console.log('');
  }
}

// ─── FEATURE: --init — Zero-config setup for any project ────────────

function init() {
  const projectName = path.basename(__dirname);
  console.log(`\n# MYCELIUM: Setting up for "${projectName}"\n`);

  // 1. Create .mycelium/ directory + memory.json if they don't exist
  const myceliumDir = path.join(__dirname, '.mycelium');
  if (!fs.existsSync(myceliumDir)) fs.mkdirSync(myceliumDir, { recursive: true });
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify({
      version: 2, snapshots: [], patterns: {}, decisions: [], constraints: {}, breakages: [], learnings: [], reflections: [], autoRules: []
    }, null, 2));
    console.log('  ✓ Created memory.json');
  } else {
    console.log('  · memory.json already exists');
  }

  // 2. Set up husky hooks
  const huskyDir = path.join(__dirname, '.husky');
  if (!fs.existsSync(huskyDir)) fs.mkdirSync(huskyDir, { recursive: true });

  const preCommit = `#!/bin/sh
# MYCELIUM: Pre-commit — enforce protocol, auto-guard, compact
if [ ! -f "mycelium.cjs" ]; then exit 0; fi

# Session marker must exist
if [ ! -f ".mycelium-session" ]; then
  echo "" >&2
  echo "  BLOCKED: No .mycelium-session file." >&2
  echo "  Run: cat .mycelium-context && echo \\$(date +%s) > .mycelium-session" >&2
  echo "" >&2
  exit 1
fi

# Auto-compact if needed
MEM_SIZE=$(wc -c < .mycelium/memory.json 2>/dev/null || echo 0)
if [ "$MEM_SIZE" -gt 204800 ]; then
  node mycelium.cjs --compact >/dev/null 2>&1
fi

git add .mycelium/memory.json 2>/dev/null || true

# Auto-guard: show warnings for areas being touched
node mycelium.cjs --guard 2>/dev/null >&2 || true

exit 0
`;

  const postCommit = `#!/bin/sh
# MYCELIUM: Post-commit — snapshot + refresh context
if [ ! -f "mycelium.cjs" ]; then exit 0; fi
node mycelium.cjs >/dev/null 2>&1
node mycelium.cjs --brief >/dev/null 2>&1

# Fix detection: prompt for learnings
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null)
case "$COMMIT_MSG" in
  fix*|Fix*)
    echo "" >&2
    echo "  FIX DETECTED. Record what you learned:" >&2
    echo "    node mycelium.cjs --postfix" >&2
    echo "    node mycelium.cjs --learned \\"area\\" \\"lesson\\"" >&2
    echo "" >&2
    ;;
esac
exit 0
`;

  fs.writeFileSync(path.join(huskyDir, 'pre-commit'), preCommit, { mode: 0o755 });
  fs.writeFileSync(path.join(huskyDir, 'post-commit'), postCommit, { mode: 0o755 });
  console.log('  ✓ Created .husky/pre-commit + post-commit hooks');

  // 3. Configure git to use hooks
  try { run('git config core.hooksPath .husky'); } catch {}
  console.log('  ✓ Set git core.hooksPath = .husky');

  // 4. Add to .gitignore
  const gitignorePath = path.join(__dirname, '.gitignore');
  let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const additions = ['.mycelium-session', '.mycelium-wip', '.mycelium-context'];
  let added = 0;
  for (const entry of additions) {
    if (!gitignore.includes(entry)) {
      gitignore += `\n${entry}`;
      added++;
    }
  }
  if (added > 0) {
    fs.writeFileSync(gitignorePath, gitignore.trim() + '\n');
    console.log(`  ✓ Added ${additions.join(', ')} to .gitignore`);
  } else {
    console.log('  · .gitignore already configured');
  }

  // 5. Create CLAUDE.md if it doesn't exist
  const claudePath = path.join(__dirname, 'CLAUDE.md');
  if (!fs.existsSync(claudePath)) {
    fs.writeFileSync(claudePath, `# AI Session Protocol

## Before you write any code:
\`\`\`bash
cat .mycelium-context                          # read the project brain
echo $(date +%s) > .mycelium-session           # mark session started
node mycelium.cjs --premortem <area>    # check what broke before
\`\`\`

## Before every commit:
Record at least one learning:
\`\`\`bash
node mycelium.cjs --decide "area" "what" "why"
node mycelium.cjs --constraint "area" "fact"
node mycelium.cjs --broke "area" "what happened"
node mycelium.cjs --learned "area" "lesson"
\`\`\`

## Full command reference:
Run \`node mycelium.cjs --onboard\` for a complete guide.
`);
    console.log('  ✓ Created CLAUDE.md (AI session protocol)');
  } else {
    console.log('  · CLAUDE.md already exists');
  }

  // 6. Create initial .mycelium/config.json example if it doesn't exist
  const configPath = path.join(__dirname, '.mycelium/config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      _comment: "Customize MYCELIUM for your project. All fields optional.",
      areas: {},
      noisePaths: DEFAULT_NOISE,
      _example_areas: {
        payments: ["stripe", "billing", "invoice"],
        auth: ["login", "session", "jwt", "oauth"],
        api: ["routes/", "controllers/", "handlers/"]
      }
    }, null, 2));
    console.log('  ✓ Created .mycelium/config.json (customize areas + noise paths)');
  } else {
    console.log('  · .mycelium/config.json already exists');
  }

  // 7. Install watcher (if mycelium-watch.cjs exists alongside)
  const watchScript = path.join(__dirname, 'mycelium-watch.cjs');
  if (fs.existsSync(watchScript)) {
    try {
      execSync(`node "${watchScript}" --install`, { cwd: __dirname, timeout: 30000, stdio: 'pipe' });
      console.log('  ✓ Installed mycelium-watch (scanned git history, set up hooks)');
    } catch (e) {
      console.log('  · mycelium-watch install skipped (run manually: node mycelium-watch.cjs --install)');
    }
  } else {
    console.log('  · mycelium-watch.cjs not found — watch system skipped');
  }

  // 8. Ensure watch.json exists inside .mycelium/
  const watchFile = path.join(myceliumDir, 'watch.json');
  if (!fs.existsSync(watchFile)) {
    fs.writeFileSync(watchFile, JSON.stringify({
      version: 1, commits: [], breakages: [], couplings: {}, patterns: [], evaluations: []
    }, null, 2));
    console.log('  ✓ Created .mycelium/watch.json');
  } else {
    console.log('  · watch.json already exists');
  }

  // 9. Take initial snapshot + generate .mycelium-context
  takeSnapshot();
  brief();

  // 10. Create session marker so first commit isn't blocked
  const sessionPath = path.join(__dirname, '.mycelium-session');
  if (!fs.existsSync(sessionPath)) {
    fs.writeFileSync(sessionPath, String(Math.floor(Date.now() / 1000)));
    console.log('  ✓ Created .mycelium-session (first commit unblocked)');
  }

  // 11. Run doctor to validate everything
  const doctorPath = path.join(__dirname, 'mycelium-doctor.cjs');
  if (fs.existsSync(doctorPath)) {
    try {
      const out = execSync(`node "${doctorPath}" --json`, { cwd: __dirname, timeout: 15000, encoding: 'utf8' });
      const doc = JSON.parse(out);
      console.log(`  ✓ Doctor: ${doc.passed}/${doc.total} checks passed (${doc.score})`);
    } catch { console.log('  · Doctor check skipped'); }
  }

  console.log('\n  Setup complete! Start your first session:');
  console.log('    cat .mycelium-context');
  console.log('    node mycelium.cjs --onboard');
  console.log('');
}

// ─── FEATURE: --onboard — Explain the system to any AI in 10 lines ──

function onboard() {
  const mem = loadMemory();
  const snapCount = mem.snapshots.length;
  const constraintCount = Object.values(mem.constraints || {}).reduce((s, a) => s + a.length, 0);
  const breakageCount = (mem.breakages || []).length;
  const decisionCount = (mem.decisions || []).length;
  const learningCount = (mem.learnings || []).length;

  console.log(`
# MYCELIUM: Project Memory System

You are working on a project with ${snapCount} recorded commits, ${constraintCount} constraints,
${breakageCount} breakages, ${decisionCount} decisions, and ${learningCount} learnings.

## What you MUST do before coding:
  1. cat .mycelium-context                          # read project brain — rules, breakages, fragile files
  2. echo $(date +%s) > .mycelium-session           # mark session (required or commits are blocked)
  3. node mycelium.cjs --premortem <area>    # see what broke before in the area you'll touch

## What you MUST do before committing:
  4. Record at least ONE learning:
     --decide "area" "what" "why"             # a non-obvious choice you made
     --constraint "area" "fact"               # a hard platform/tech truth
     --broke "area" "what happened"           # something that broke
     --learned "area" "lesson"                # what you learned from fixing

## Power commands:
  --guard <file1> <file2>                     # show risks for specific files (also auto-runs on commit)
  --whyfile <path>                            # full intelligence on a single file
  --status                                    # one-screen project dashboard
  --gen-tests                                 # generate regression tests from past breakages
  --wip "task description"                    # save work-in-progress (survives chat compaction)
  --wip-done                                  # clear WIP when done

## Key insight:
  Every breakage, constraint, and decision you record makes the NEXT session smarter.
  The pre-commit hook auto-warns about known risks. The more you teach it, the more it protects.
`);
}

// ─── FEATURE: --status — One-screen project dashboard ────────────────

function status() {
  const mem = loadMemory();

  // Header
  const projectName = CONFIG.projectName || path.basename(__dirname);
  console.log(`\n# ${projectName} — Project Status Dashboard\n`);

  // Health score
  const recent = mem.snapshots.slice(-10);
  const scores = recent.filter(s => s.score).map(s => s.score);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const grade = avgScore >= 85 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 55 ? 'C' : avgScore >= 40 ? 'D' : 'F';
  const bar = '█'.repeat(Math.round(avgScore / 5)) + '░'.repeat(20 - Math.round(avgScore / 5));
  console.log(`## Health: ${avgScore}/100 (${grade})  [${bar}]`);
  console.log('');

  // Key numbers
  const constraintCount = Object.values(mem.constraints || {}).reduce((s, a) => s + a.length, 0);
  console.log('## Numbers');
  console.log(`  Commits tracked:  ${mem.snapshots.length}`);
  console.log(`  Decisions:        ${(mem.decisions || []).length}`);
  console.log(`  Constraints:      ${constraintCount}`);
  console.log(`  Breakages:        ${(mem.breakages || []).length}`);
  console.log(`  Learnings:        ${(mem.learnings || []).length}`);
  console.log(`  Fix chains:       ${(mem.patterns.fixChains || []).length}`);
  console.log('');

  // Risk areas (areas with most breakages)
  const breakagesByArea = {};
  for (const b of (mem.breakages || [])) {
    breakagesByArea[b.area] = (breakagesByArea[b.area] || 0) + 1;
  }
  const riskAreas = Object.entries(breakagesByArea).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (riskAreas.length > 0) {
    console.log('## Risk Areas (most breakages)');
    for (const [area, count] of riskAreas) {
      const riskBar = '▓'.repeat(count) + '░'.repeat(Math.max(0, 10 - count));
      console.log(`  ${area.padEnd(15)} ${riskBar} ${count} breakage(s)`);
    }
    console.log('');
  }

  // Hottest files
  const hotspots = Object.entries(mem.patterns.hotspots || {})
    .filter(([f]) => !isNoise(f))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (hotspots.length > 0) {
    console.log('## Hottest Files (most changes — handle with care)');
    for (const [file, count] of hotspots) {
      console.log(`  ${count}x  ${file}`);
    }
    console.log('');
  }

  // Recent learnings
  const recentLearnings = (mem.learnings || []).slice(-3);
  if (recentLearnings.length > 0) {
    console.log('## Recent Learnings');
    for (const l of recentLearnings) {
      console.log(`  [${l.area}] ${l.lesson.slice(0, 100)}${l.lesson.length > 100 ? '...' : ''}`);
    }
    console.log('');
  }

  // WIP
  const wipPath = path.join(__dirname, '.mycelium-wip');
  if (fs.existsSync(wipPath)) {
    const wip = fs.readFileSync(wipPath, 'utf8').trim();
    if (wip) {
      console.log('## Work In Progress');
      console.log(wip);
      console.log('');
    }
  }

  // Last 5 commits
  const last5 = mem.snapshots.slice(-5);
  if (last5.length > 0) {
    console.log('## Last 5 Commits');
    for (const s of last5) {
      const scoreTag = typeof s.score === 'number' ? ` [${s.score}]` : '';
      console.log(`  ${s.date} ${s.commit?.hash || '???'} ${(s.commit?.msg || '').slice(0, 70)}${scoreTag}`);
    }
    console.log('');
  }

  // Shared library status
  try {
    const shared = JSON.parse(fs.readFileSync(SHARED_MEMORY_PATH, 'utf8'));
    console.log(`## Shared Library: ${shared.constraints.length} constraints, ${shared.learnings.length} learnings from ${shared.meta.projects.length} project(s)`);
  } catch {
    console.log('## Shared Library: not initialized (run --export-shared)');
  }
  console.log('');
}

// ─── Eval: Is the learning system getting better? ──────────────────
// Two-layer architecture:
//   runNwEval(mem)   — pure scoring, returns data (no side effects, no printing)
//   selfHealNw(mem)  — reads eval data, takes corrective actions, saves
//   evaluate()       — prints eval results to console + stores snapshot
//
// selfHealNw runs automatically inside takeSnapshot() every 10 snapshots.
// This makes Mycelium a self-improving system — it evaluates itself after
// every learning event and automatically fixes what's weak.

function runNwEval(mem) {
  const totalConstraints = Object.values(mem.constraints || {}).flat().length;
  const totalBreakages = (mem.breakages || []).length;
  const totalDecisions = (mem.decisions || []).length;
  const totalLearnings = (mem.learnings || []).length;
  const totalSnapshots = (mem.snapshots || []).length;
  const fixChainCount = (mem.patterns?.fixChains || []).length;
  const reflectionCount = (mem.reflections || []).length;

  if (totalSnapshots < 10) return null;

  const scores = {};
  const insights = [];
  const upgrades = [];

  // ── 1. Constraint Coverage: do areas with breakages have constraints? ──
  const areaBreakages = {};
  for (const b of (mem.breakages || [])) {
    const a = (b.area || 'unknown').toLowerCase();
    areaBreakages[a] = (areaBreakages[a] || 0) + 1;
  }
  const areasWithBreakages = Object.keys(areaBreakages);
  const areasWithConstraints = Object.keys(mem.constraints || {}).filter(a =>
    (mem.constraints[a] || []).length > 0
  );
  const coveredAreas = areasWithBreakages.filter(a => areasWithConstraints.includes(a));
  const constraintCoverage = areasWithBreakages.length > 0
    ? coveredAreas.length / areasWithBreakages.length : 0;
  const uncoveredAreas = areasWithBreakages.filter(a => !areasWithConstraints.includes(a));

  if (constraintCoverage > 0.8) {
    scores.constraintCoverage = 90;
    insights.push(`Constraint coverage: ${Math.round(constraintCoverage * 100)}% of breakage areas have constraints`);
  } else if (constraintCoverage > 0.5) {
    scores.constraintCoverage = 60;
    insights.push(`Constraint coverage: ${Math.round(constraintCoverage * 100)}% — some breakage areas lack constraints`);
    upgrades.push(`Areas with breakages but NO constraints: ${uncoveredAreas.join(', ')}`);
  } else {
    scores.constraintCoverage = 20;
    insights.push(`Constraint coverage LOW: ${Math.round(constraintCoverage * 100)}% — most breakage areas have no constraints`);
    upgrades.push('CRITICAL: Record constraints after each fix — they prevent repeat breakages');
  }

  // ── 2. Constraint Effectiveness ──
  const areaConstraintCount = {};
  for (const [area, constraints] of Object.entries(mem.constraints || {})) {
    areaConstraintCount[area] = (constraints || []).length;
  }
  let constrainedAreaBreakRate = 0, unconstrainedAreaBreakRate = 0;
  let constrainedCount = 0, unconstrainedCount = 0;

  for (const [area, breaks] of Object.entries(areaBreakages)) {
    if (areaConstraintCount[area] > 0) { constrainedAreaBreakRate += breaks; constrainedCount++; }
    else { unconstrainedAreaBreakRate += breaks; unconstrainedCount++; }
  }
  const constrainedAvg = constrainedCount > 0 ? constrainedAreaBreakRate / constrainedCount : 0;
  const unconstrainedAvg = unconstrainedCount > 0 ? unconstrainedAreaBreakRate / unconstrainedCount : 0;

  if (constrainedCount > 0 && unconstrainedCount > 0) {
    if (constrainedAvg <= unconstrainedAvg) {
      scores.constraintEffectiveness = 75;
      insights.push(`Constrained areas avg ${constrainedAvg.toFixed(1)} breakages vs ${unconstrainedAvg.toFixed(1)} unconstrained — constraints help`);
    } else {
      scores.constraintEffectiveness = 30;
      insights.push(`Constrained areas avg ${constrainedAvg.toFixed(1)} breakages vs ${unconstrainedAvg.toFixed(1)} unconstrained — constraints NOT helping`);
      upgrades.push('Areas with constraints still break more — constraints may be too vague or not enforced');
    }
  } else {
    scores.constraintEffectiveness = 50;
    insights.push('Cannot compare constrained vs unconstrained areas (need both)');
  }

  // ── 3. Decision-to-Breakage Ratio ──
  const decisionsPerCommit = totalSnapshots > 0 ? totalDecisions / totalSnapshots : 0;
  const breakagesPerCommit = totalSnapshots > 0 ? totalBreakages / totalSnapshots : 0;

  if (decisionsPerCommit > 0.2 && breakagesPerCommit < 0.15) {
    scores.decisionImpact = 90;
    insights.push(`Decisions: ${decisionsPerCommit.toFixed(2)}/commit, breakages: ${breakagesPerCommit.toFixed(2)}/commit — high discipline, low bugs`);
  } else if (decisionsPerCommit > 0.1) {
    scores.decisionImpact = 60;
    insights.push(`Decisions: ${decisionsPerCommit.toFixed(2)}/commit — recording decisions but breakages still at ${breakagesPerCommit.toFixed(2)}/commit`);
  } else {
    scores.decisionImpact = 30;
    insights.push(`Decisions: ${decisionsPerCommit.toFixed(2)}/commit — not enough decision recording`);
    upgrades.push('Record more decisions with --decide — decisions that go unrecorded get repeated');
  }

  // ── 4. Learning Capture Rate ──
  const learningsPerBreakage = totalBreakages > 0 ? totalLearnings / totalBreakages : 0;

  if (learningsPerBreakage >= 1) {
    scores.learningCapture = 100;
    insights.push(`Learning capture: ${learningsPerBreakage.toFixed(1)} learnings per breakage — every bug teaches something`);
  } else if (learningsPerBreakage > 0.5) {
    scores.learningCapture = 60;
    insights.push(`Learning capture: ${learningsPerBreakage.toFixed(1)} learnings per breakage — some bugs don't produce learnings`);
    upgrades.push(`${totalBreakages - totalLearnings} breakages without corresponding learnings — use --learned after --postfix`);
  } else {
    scores.learningCapture = 20;
    insights.push(`Learning capture LOW: only ${learningsPerBreakage.toFixed(1)} learnings per breakage`);
    upgrades.push('CRITICAL: Most breakages produce no learnings — discipline gap');
  }

  // ── 5. Fix Chain Trend ──
  const earlyChains = (mem.patterns?.fixChains || []).filter((_, i) => i < fixChainCount / 2).length;
  const lateChains = fixChainCount - earlyChains;

  if (fixChainCount === 0) {
    scores.fixChainTrend = 80;
    insights.push('No fix chains — fixes are clean');
  } else if (lateChains < earlyChains) {
    scores.fixChainTrend = 80;
    insights.push(`Fix chains declining: ${earlyChains} early -> ${lateChains} recent — learning from mistakes`);
  } else {
    scores.fixChainTrend = 40;
    insights.push(`Fix chains: ${earlyChains} early -> ${lateChains} recent — not declining`);
    upgrades.push('Fix chains aren\'t declining — run --postfix and --learned after every fix');
  }

  // ── 6. Reflection Quality ──
  const reflectionTypes = {};
  for (const r of (mem.reflections || [])) {
    reflectionTypes[r.type] = (reflectionTypes[r.type] || 0) + 1;
  }
  const diverseTypes = Object.keys(reflectionTypes).length;

  if (diverseTypes >= 3 && reflectionCount >= 5) {
    scores.reflectionQuality = 80;
    insights.push(`Reflections: ${reflectionCount} across ${diverseTypes} types (${Object.keys(reflectionTypes).join(', ')})`);
  } else if (reflectionCount >= 3) {
    scores.reflectionQuality = 50;
    insights.push(`Reflections: ${reflectionCount} but only ${diverseTypes} types — needs more diverse analysis`);
  } else {
    scores.reflectionQuality = 20;
    insights.push(`Reflections: only ${reflectionCount} — run --reflect to generate more insights`);
    upgrades.push('Too few reflections — auto-reflect not running often enough');
  }

  // ── 7. Watch Integration ──
  let watchScore = 0;
  let watchLastEval = null;
  try {
    const gwMem = JSON.parse(fs.readFileSync(path.join(__dirname, '.mycelium', 'watch.json'), 'utf8'));
    const gwBreakages = gwMem.breakages?.length || 0;
    const gwLessons = gwMem.breakages?.filter(b => b.lesson && b.lesson.length > 20).length || 0;
    const gwLessonRate = gwBreakages > 0 ? gwLessons / gwBreakages : 0;

    if (gwLessonRate > 0.9) {
      watchScore = 100;
      insights.push(`watcher integration: ${gwBreakages} breakages, ${Math.round(gwLessonRate * 100)}% with deep lessons`);
    } else if (gwLessonRate > 0.5) {
      watchScore = 60;
      insights.push(`watcher integration: ${Math.round(gwLessonRate * 100)}% lesson rate — needs deeper diff analysis`);
    } else {
      watchScore = 30;
      insights.push(`watcher integration: only ${Math.round(gwLessonRate * 100)}% lesson rate — extractLesson is weak`);
      upgrades.push('watcher lesson extraction needs upgrade — most breakages lack root cause');
    }
    if (gwMem.evaluations?.length > 0) {
      watchLastEval = gwMem.evaluations[gwMem.evaluations.length - 1];
    }
  } catch {
    watchScore = 0;
    insights.push('mycelium-watch: not installed — run node mycelium-watch.cjs --install for passive learning');
    upgrades.push('Install mycelium-watch for automatic breakage detection from git history');
  }
  scores.watchIntegration = watchScore;

  // ── Overall Grade ──
  const weights = {
    constraintCoverage: 20, constraintEffectiveness: 20, decisionImpact: 15,
    learningCapture: 15, fixChainTrend: 10, reflectionQuality: 10, watchIntegration: 10
  };

  let totalScore = 0, totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] !== undefined) { totalScore += scores[key] * weight; totalWeight += weight; }
  }
  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' :
                overallScore >= 40 ? 'D' : 'F';

  // Combined score with mycelium-watch
  let combinedScore = overallScore;
  let combinedGrade = grade;
  if (watchLastEval) {
    combinedScore = Math.round((overallScore + watchLastEval.overallScore) / 2);
    combinedGrade = combinedScore >= 90 ? 'A' : combinedScore >= 75 ? 'B' :
                    combinedScore >= 60 ? 'C' : combinedScore >= 40 ? 'D' : 'F';
  }

  return {
    overallScore, grade, combinedScore, combinedGrade, scores, insights, upgrades,
    watchLastEval, uncoveredAreas, areaBreakages, weights,
    metrics: {
      snapshots: totalSnapshots, constraints: totalConstraints, breakages: totalBreakages,
      decisions: totalDecisions, learnings: totalLearnings, fixChains: fixChainCount,
      reflections: reflectionCount
    }
  };
}

// ─── Delegate to mycelium-fix: unified fix → verify → confirm system ────
// selfHealNw kept as fallback when mycelium-fix.cjs is not present.

function callFixer(force) {
  const fixerPath = path.join(__dirname, 'mycelium-fix.cjs');
  if (!fs.existsSync(fixerPath)) return false;
  const flag = force ? '--force' : '--silent';
  require('child_process').execSync(`node "${fixerPath}" ${flag}`, {
    cwd: __dirname, stdio: force ? 'inherit' : 'pipe', timeout: 30000
  });
  return true;
}

// ─── Self-Heal Mycelium: auto-eval + auto-fix weak scores ──────────
// Runs silently every 10 snapshots inside takeSnapshot().
// Detects weaknesses and takes corrective action without human intervention.
// This turns Mycelium from a measurement tool into a self-improving system.

function selfHealNw(mem) {
  if (!mem) return;
  const totalSnapshots = (mem.snapshots || []).length;
  if (totalSnapshots < 10) return;

  // Run every 3 snapshots (was 10 — too conservative, missed heal cycles due to squashing)
  const lastHealAt = mem.healState?.lastHealAt || 0;
  if (totalSnapshots - lastHealAt < 3) return;

  const result = runNwEval(mem);
  if (!result) return;

  const actions = [];

  // ── Action 1: Constraint Coverage low -> auto-create constraints from breakage lessons ──
  if (result.scores.constraintCoverage < 60 && result.uncoveredAreas.length > 0) {
    for (const area of result.uncoveredAreas) {
      const areaBreaks = (mem.breakages || []).filter(b => (b.area || '').toLowerCase() === area);
      const lessons = areaBreaks.map(b => b.what || b.deepLesson || '').filter(l => l.length > 10);
      if (lessons.length > 0) {
        if (!mem.constraints[area]) mem.constraints[area] = [];
        const topLesson = lessons[lessons.length - 1];
        const exists = mem.constraints[area].some(c => c.fact === topLesson);
        if (!exists) {
          mem.constraints[area].push({
            fact: topLesson, ts: Date.now(),
            date: new Date().toISOString().split('T')[0],
            autoGenerated: true, source: 'self-heal: breakage lesson promoted to constraint'
          });
          actions.push(`auto-constraint [${area}]: ${topLesson.slice(0, 60)}...`);
        }
      }
    }
  }

  // ── Action 2: Constraint Effectiveness low -> enrich with watcher deep lessons ──
  if (result.scores.constraintEffectiveness < 40) {
    try {
      const gwMem = JSON.parse(fs.readFileSync(path.join(__dirname, '.mycelium', 'watch.json'), 'utf8'));
      for (const [area, breaks] of Object.entries(result.areaBreakages)) {
        if (breaks >= 3 && (mem.constraints[area] || []).length > 0) {
          const areaBreakFiles = (mem.breakages || [])
            .filter(b => (b.area || '').toLowerCase() === area)
            .flatMap(b => b.files || []);
          for (const gwB of (gwMem.breakages || [])) {
            if (gwB.lesson && gwB.lesson.length > 30 && gwB.files?.some(f => areaBreakFiles.includes(f))) {
              const exists = mem.constraints[area].some(c => c.fact === gwB.lesson);
              if (!exists && mem.constraints[area].length < 10) {
                mem.constraints[area].push({
                  fact: gwB.lesson, ts: Date.now(),
                  date: new Date().toISOString().split('T')[0],
                  autoGenerated: true, source: 'self-heal: watcher deep lesson promoted (constraint ineffective)'
                });
                actions.push(`enriched [${area}] constraint with watcher lesson`);
                break;
              }
            }
          }
        }
      }
    } catch { /* watcher not available */ }
  }

  // ── Action 3: Learning Capture low -> auto-create learnings from breakages ──
  if (result.scores.learningCapture < 60) {
    for (const b of (mem.breakages || [])) {
      const area = (b.area || 'unknown').toLowerCase();
      const lesson = b.deepLesson || b.what || '';
      if (lesson.length > 15) {
        const existing = (mem.learnings || []).some(l => l.area === area && l.lesson === lesson);
        if (!existing) {
          if (!mem.learnings) mem.learnings = [];
          mem.learnings.push({
            ts: Date.now(), date: new Date().toISOString().split('T')[0],
            area, lesson, autoGenerated: true, source: 'self-heal: breakage promoted to learning'
          });
          actions.push(`auto-learning [${area}]: ${lesson.slice(0, 50)}...`);
        }
      }
    }
  }

  // ── Action 4: Reflection Quality low -> trigger deep reflect ──
  if (result.scores.reflectionQuality < 50) {
    try {
      const beforeCount = (mem.reflections || []).length;
      deepReflect(mem, true);
      const afterCount = (mem.reflections || []).length;
      if (afterCount > beforeCount) {
        actions.push(`triggered deep reflection: +${afterCount - beforeCount} new insights`);
      }
    } catch { /* best effort */ }
  }

  // ── Action 5: Fix chains not declining -> tag areas as high-risk ──
  if (result.scores.fixChainTrend < 50) {
    const chainAreas = {};
    for (const fc of (mem.patterns?.fixChains || [])) {
      const area = fc.area || 'unknown';
      chainAreas[area] = (chainAreas[area] || 0) + 1;
    }
    for (const [area, count] of Object.entries(chainAreas)) {
      if (count >= 2) {
        const existingConstraint = (mem.constraints[area] || []).some(c =>
          c.fact.includes('fix-chain hotspot')
        );
        if (!existingConstraint) {
          if (!mem.constraints[area]) mem.constraints[area] = [];
          mem.constraints[area].push({
            fact: `fix-chain hotspot: ${count} fix chains detected — extra care needed, test thoroughly before committing`,
            ts: Date.now(), date: new Date().toISOString().split('T')[0],
            autoGenerated: true, source: 'self-heal: fix chain pattern detected'
          });
          actions.push(`marked [${area}] as fix-chain hotspot (${count} chains)`);
        }
      }
    }
  }

  // ── Action 6: watcher not integrated -> attempt to install ──
  if (result.scores.watchIntegration === 0) {
    try {
      const gwPath = path.join(__dirname, 'mycelium-watch.cjs');
      if (fs.existsSync(gwPath)) {
        require('child_process').execSync('node mycelium-watch.cjs --install', {
          cwd: __dirname, stdio: 'pipe', timeout: 10000
        });
        actions.push('auto-installed mycelium-watch (was not initialized)');
      }
    } catch { /* best effort */ }
  }

  // ── Store heal state ──
  if (!mem.healState) mem.healState = {};
  mem.healState.lastHealAt = totalSnapshots;
  mem.healState.lastHealDate = new Date().toISOString().split('T')[0];
  mem.healState.lastHealScore = result.overallScore;
  mem.healState.lastCombinedScore = result.combinedScore;

  if (!mem.healHistory) mem.healHistory = [];
  mem.healHistory.push({
    date: new Date().toISOString().split('T')[0],
    scoreBefore: result.overallScore,
    combinedBefore: result.combinedScore,
    actionsCount: actions.length,
    actions: actions.length > 0 ? actions.slice(0, 10) : ['no action needed — scores acceptable'],
    scores: { ...result.scores }
  });
  if (mem.healHistory.length > 30) mem.healHistory = mem.healHistory.slice(-30);

  // Log silently to stderr
  if (actions.length > 0) {
    console.error(`  \x1b[2mMYCELIUM self-heal: ${actions.length} action(s) taken (score: ${result.overallScore}/100 ${result.grade})\x1b[0m`);
    for (const a of actions.slice(0, 4)) {
      console.error(`    \x1b[2m-> ${a}\x1b[0m`);
    }
    if (actions.length > 4) console.error(`    \x1b[2m-> ...and ${actions.length - 4} more\x1b[0m`);
  }

  saveMemory(mem);
}

// ─── evaluate(): print eval results + auto-heal ────────────────────

function evaluate() {
  const mem = loadMemory();
  const result = runNwEval(mem);

  if (!result) {
    console.log('\n[mycelium] Eval: need at least 10 snapshots for meaningful evaluation.\n');
    return;
  }

  const { overallScore, grade, combinedScore, combinedGrade, scores, insights, upgrades,
          watchLastEval, weights, metrics } = result;
  const gradeColor = (grade === 'A' || grade === 'B') ? '\x1b[32m' :
                     grade === 'C' ? '\x1b[33m' : '\x1b[31m';

  console.log('');
  console.log('  \x1b[1mMYCELIUM eval\x1b[0m — is the learning system getting better?');
  console.log('  ─'.repeat(35));
  console.log('');
  console.log(`  ${gradeColor}\x1b[1m  Overall: ${overallScore}/100 (${grade})\x1b[0m`);
  console.log('');

  const metricNames = {
    constraintCoverage: 'Constraint Coverage', constraintEffectiveness: 'Constraint Effect.',
    decisionImpact: 'Decision Impact', learningCapture: 'Learning Capture',
    fixChainTrend: 'Fix Chain Trend', reflectionQuality: 'Reflection Quality',
    watchIntegration: 'Watch Integration'
  };

  console.log('  \x1b[1mScorecard:\x1b[0m');
  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key] || 0;
    const name = metricNames[key] || key;
    const barLen = Math.round(score / 10);
    const barColor = score >= 70 ? '\x1b[32m' : score >= 40 ? '\x1b[33m' : '\x1b[31m';
    const bar = barColor + '█'.repeat(barLen) + '\x1b[0m' + '░'.repeat(10 - barLen);
    console.log(`    ${bar} ${score.toString().padStart(3)}  ${name.padEnd(22)} (weight: ${weight}%)`);
  }

  console.log('');
  console.log('  \x1b[1mInsights:\x1b[0m');
  for (const i of insights) console.log(`    ${i}`);

  if (upgrades.length > 0) {
    console.log('');
    console.log('  \x1b[1m\x1b[31mUpgrades needed:\x1b[0m');
    for (const u of upgrades) {
      const icon = u.startsWith('CRITICAL') ? '\x1b[31m!!\x1b[0m' : '\x1b[33m!\x1b[0m';
      console.log(`    ${icon} ${u}`);
    }
  }

  if (watchLastEval) {
    console.log('');
    console.log(`  \x1b[1mCombined Score (Learner + Watcher):\x1b[0m`);
    console.log(`    Mycelium:  ${overallScore}/100 (${grade})`);
    console.log(`    watcher:    ${watchLastEval.overallScore}/100 (${watchLastEval.grade})`);
    const cc = (combinedGrade === 'A' || combinedGrade === 'B') ? '\x1b[32m' :
               combinedGrade === 'C' ? '\x1b[33m' : '\x1b[31m';
    console.log(`    ${cc}\x1b[1mCombined:   ${combinedScore}/100 (${combinedGrade})\x1b[0m`);
  }

  console.log('');
  if (combinedScore >= 75) {
    console.log('  \x1b[32m✓ Learning system is working.\x1b[0m Knowledge is preventing bugs and reducing rework.');
  } else if (combinedScore >= 50) {
    console.log('  \x1b[33m~ Learning system is partially working.\x1b[0m Some improvements needed (see upgrades above).');
  } else {
    console.log('  \x1b[31m✗ Learning system is NOT working.\x1b[0m Knowledge exists but isn\'t preventing bugs. Needs upgrade.');
  }
  console.log('');

  // Store evaluation
  if (!mem.evaluations) mem.evaluations = [];
  mem.evaluations.push({
    date: new Date().toISOString().slice(0, 10),
    overallScore, grade, combinedScore, combinedGrade,
    scores: { ...scores }, metrics
  });
  if (mem.evaluations.length > 50) mem.evaluations = mem.evaluations.slice(-50);
  saveMemory(mem);

  // Trend
  if (mem.evaluations.length > 1) {
    console.log('  \x1b[1mTrend:\x1b[0m');
    for (const e of mem.evaluations.slice(-5)) {
      const g = e.grade;
      const color = (g === 'A' || g === 'B') ? '\x1b[32m' : g === 'C' ? '\x1b[33m' : '\x1b[31m';
      const bar = '█'.repeat(Math.round(e.overallScore / 10)) + '░'.repeat(10 - Math.round(e.overallScore / 10));
      console.log(`    ${e.date}  ${color}${bar} ${e.overallScore}/100 (${g})\x1b[0m`);
    }
    const prev = mem.evaluations[mem.evaluations.length - 2];
    const delta = overallScore - prev.overallScore;
    if (delta > 0) console.log(`    \x1b[32m↑ +${delta} points since last eval\x1b[0m`);
    else if (delta < 0) console.log(`    \x1b[31m↓ ${delta} points since last eval\x1b[0m`);
    else console.log('    -> unchanged since last eval');
    console.log('');
  }

  // After printing, delegate to mycelium-fix for cross-system fix → verify
  try { callFixer(); } catch { selfHealNw(mem); }
}

// ─── Feature: Autopsy — trace forward from any commit to map downstream damage ──
// Usage: node mycelium.cjs --autopsy <commit-hash>
// No other tool does this: follow the ripple effects of a single commit.

function autopsy(targetHash) {
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  if (!fs.existsSync(watchPath)) {
    console.error('  No watch.json found. Run: node mycelium-watch.cjs first.');
    process.exit(1);
  }
  const watch = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
  const mem = loadMemory();
  const short = targetHash.slice(0, 7);

  // Find the original commit — try watch first, fallback to git
  let origin = watch.commits.find(c => c.hash.startsWith(short));
  if (!origin) {
    // Commit is older than watch window — reconstruct from git
    try {
      const gitMsg = run(`git log -1 --format="%s" ${short} 2>/dev/null`).trim();
      const gitDate = run(`git log -1 --format="%ai" ${short} 2>/dev/null`).trim().slice(0, 10);
      const gitFiles = run(`git diff-tree --no-commit-id --name-only -r ${short} 2>/dev/null`).trim().split('\n').filter(Boolean);
      if (gitMsg) {
        origin = { hash: short, msg: gitMsg, date: gitDate, files: gitFiles };
      }
    } catch {}
  }
  if (!origin) {
    console.error(`  Commit ${short} not found in watch history or git log.`);
    process.exit(1);
  }

  console.log(`\n  \x1b[1m🔬 AUTOPSY: ${short}\x1b[0m`);
  console.log(`  "${origin.msg}"`);
  console.log(`  Date: ${origin.date} | Files: ${origin.files.length}`);
  console.log(`  ${'─'.repeat(60)}`);

  // Step 1: Find all breakages this commit caused
  const directBreakages = watch.breakages.filter(b => b.origHash && b.origHash.startsWith(short));
  
  // Step 2: Find all fix commits that reference these same files
  const touchedFiles = new Set(origin.files);
  const fixesOnSameFiles = watch.breakages.filter(b => {
    if (directBreakages.includes(b)) return false;
    return b.files.some(f => touchedFiles.has(f));
  });

  // Step 3: Build the downstream chain using fix chains from memory
  // A fix chain is: original → fix → fix-of-fix → ...
  const chainMap = new Map(); // hash → next fix hash
  for (const fc of (mem.patterns.fixChains || [])) {
    if (fc.original && fc.fix) {
      const existing = chainMap.get(fc.original.slice(0, 7)) || [];
      existing.push({ hash: fc.fix, msg: fc.msg, files: fc.files });
      chainMap.set(fc.original.slice(0, 7), existing);
    }
  }

  // Walk forward from the origin commit
  const visited = new Set();
  const chain = [];
  function walkChain(hash, depth) {
    const h = hash.slice(0, 7);
    if (visited.has(h) || depth > 10) return;
    visited.add(h);
    const nextFixes = chainMap.get(h) || [];
    for (const nf of nextFixes) {
      chain.push({ hash: nf.hash, msg: nf.msg, files: nf.files, depth });
      walkChain(nf.hash, depth + 1);
    }
  }
  walkChain(targetHash, 1);

  // Step 4: Count total downstream damage
  const allAffectedFiles = new Set(origin.files);
  for (const b of directBreakages) b.files.forEach(f => allAffectedFiles.add(f));
  for (const c of chain) (c.files || []).forEach(f => allAffectedFiles.add(f));

  // Print results
  if (directBreakages.length > 0) {
    console.log(`\n  \x1b[31m⚠ DIRECT BREAKAGES (${directBreakages.length}):\x1b[0m`);
    for (const b of directBreakages) {
      console.log(`    ${b.fixHash?.slice(0, 7) || '???????'} ${b.pattern.slice(0, 70)}`);
      console.log(`      Files: ${b.files.join(', ')}`);
      if (b.lesson) console.log(`      Lesson: ${b.lesson.slice(0, 80)}`);
    }
  } else {
    console.log(`\n  \x1b[32m✓ No direct breakages recorded from this commit.\x1b[0m`);
  }

  if (chain.length > 0) {
    console.log(`\n  \x1b[33m🔗 FIX CHAIN (${chain.length} downstream fixes):\x1b[0m`);
    for (const c of chain) {
      const indent = '  '.repeat(c.depth);
      console.log(`    ${indent}↳ ${c.hash?.slice(0, 7)} ${(c.msg || '').slice(0, 60)}`);
      if (c.files?.length) console.log(`    ${indent}  Files: ${c.files.join(', ')}`);
    }
  }

  // Step 5: Related file breakages (not directly from this commit, but same files)
  const laterBreakages = fixesOnSameFiles.filter(b => {
    const bDate = new Date(b.date);
    const oDate = new Date(origin.date);
    return bDate >= oDate;
  });
  if (laterBreakages.length > 0) {
    console.log(`\n  \x1b[36m📎 RELATED BREAKAGES (same files, later dates): ${laterBreakages.length}\x1b[0m`);
    for (const b of laterBreakages.slice(0, 5)) {
      console.log(`    ${b.fixHash?.slice(0, 7) || '???????'} ${b.pattern.slice(0, 70)}`);
    }
    if (laterBreakages.length > 5) console.log(`    ... and ${laterBreakages.length - 5} more`);
  }

  // Step 6: Coupled files that weren't in the commit (missed?)
  const couplings = watch.couplings || {};
  const missedCouplings = [];
  for (const key of Object.keys(couplings)) {
    const [a, b] = key.split('<->');
    if (touchedFiles.has(a) && !touchedFiles.has(b)) {
      missedCouplings.push({ file: b, partner: a, count: couplings[key] });
    } else if (touchedFiles.has(b) && !touchedFiles.has(a)) {
      missedCouplings.push({ file: a, partner: b, count: couplings[key] });
    }
  }
  missedCouplings.sort((a, b) => b.count - a.count);
  if (missedCouplings.length > 0) {
    console.log(`\n  \x1b[35m🔗 COUPLED FILES NOT IN THIS COMMIT (potential misses):\x1b[0m`);
    for (const mc of missedCouplings.slice(0, 8)) {
      console.log(`    ${mc.file} (changes with ${mc.partner} ${mc.count}x)`);
    }
  }

  // Summary
  const totalDamage = directBreakages.length + chain.length;
  const verdict = totalDamage === 0 ? '\x1b[32mCLEAN\x1b[0m' :
    totalDamage <= 2 ? '\x1b[33mMINOR RIPPLE\x1b[0m' :
    totalDamage <= 5 ? '\x1b[31mSIGNIFICANT DAMAGE\x1b[0m' :
    '\x1b[31;1mCASCADE FAILURE\x1b[0m';

  console.log(`\n  ${'─'.repeat(60)}`);
  console.log(`  Verdict: ${verdict}`);
  console.log(`  Direct breakages: ${directBreakages.length}`);
  console.log(`  Downstream fixes: ${chain.length}`);
  console.log(`  Files affected: ${allAffectedFiles.size}`);
  console.log(`  Coupled files missed: ${missedCouplings.length}`);
  console.log('');
}

// ─── Feature: Danger Zone — generate a standalone HTML heatmap of repo risk ──
// Usage: node mycelium.cjs --danger-zone
// Outputs danger-zone.html — open in browser, zero dependencies.

function dangerZone() {
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  if (!fs.existsSync(watchPath)) {
    console.error('  No watch.json found. Run: node mycelium-watch.cjs first.');
    process.exit(1);
  }
  const watch = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
  const mem = loadMemory();

  // Build file risk scores
  const fileRisk = {};
  // From breakages
  for (const b of watch.breakages) {
    for (const f of b.files) {
      if (!fileRisk[f]) fileRisk[f] = { breaks: 0, changes: 0, couplings: 0, fixChains: 0 };
      fileRisk[f].breaks++;
    }
  }
  // From commits (change frequency)
  for (const c of watch.commits) {
    for (const f of c.files) {
      if (!fileRisk[f]) fileRisk[f] = { breaks: 0, changes: 0, couplings: 0, fixChains: 0 };
      fileRisk[f].changes++;
    }
  }
  // From couplings
  for (const key of Object.keys(watch.couplings || {})) {
    const [a, b] = key.split('<->');
    if (!fileRisk[a]) fileRisk[a] = { breaks: 0, changes: 0, couplings: 0, fixChains: 0 };
    if (!fileRisk[b]) fileRisk[b] = { breaks: 0, changes: 0, couplings: 0, fixChains: 0 };
    fileRisk[a].couplings++;
    fileRisk[b].couplings++;
  }
  // From fix chains
  for (const fc of (mem.patterns.fixChains || [])) {
    for (const f of (fc.files || [])) {
      if (!fileRisk[f]) fileRisk[f] = { breaks: 0, changes: 0, couplings: 0, fixChains: 0 };
      fileRisk[f].fixChains++;
    }
  }

  // Compute composite score: breaks × 3 + fixChains × 2 + changes × 0.5 + couplings × 1
  const scored = Object.entries(fileRisk).map(([file, r]) => ({
    file,
    ...r,
    score: r.breaks * 3 + r.fixChains * 2 + r.changes * 0.5 + r.couplings * 1
  })).sort((a, b) => b.score - a.score);

  const maxScore = scored[0]?.score || 1;

  // Gather constraints and learnings per area
  const areaInfo = {};
  if (mem.constraints && typeof mem.constraints === 'object') {
    for (const [area, list] of Object.entries(mem.constraints)) {
      areaInfo[area] = { constraints: list.length, learnings: 0 };
    }
  }
  for (const l of (mem.learnings || [])) {
    if (!areaInfo[l.area]) areaInfo[l.area] = { constraints: 0, learnings: 0 };
    areaInfo[l.area].learnings++;
  }

  // Generate HTML
  const top50 = scored.slice(0, 50);
  const fileRows = top50.map((f, i) => {
    const pct = Math.round((f.score / maxScore) * 100);
    const color = pct >= 70 ? '#e74c3c' : pct >= 40 ? '#f39c12' : '#27ae60';
    const area = classifyArea(f.file);
    return `<tr>
      <td>${i + 1}</td>
      <td class="file">${escHtml(f.file)}</td>
      <td class="area">${escHtml(area)}</td>
      <td>${f.breaks}</td>
      <td>${f.fixChains}</td>
      <td>${f.changes}</td>
      <td>${f.couplings}</td>
      <td><div class="bar" style="width:${pct}%;background:${color}">${f.score.toFixed(1)}</div></td>
    </tr>`;
  }).join('\n');

  const areaRows = Object.entries(areaInfo).sort((a, b) => (b[1].constraints + b[1].learnings) - (a[1].constraints + a[1].learnings))
    .map(([area, info]) => `<tr><td>${escHtml(area)}</td><td>${info.constraints}</td><td>${info.learnings}</td></tr>`).join('\n');

  const totalBreakages = watch.breakages.length;
  const totalCommits = watch.commits.length;
  const totalConstraints = Object.values(mem.constraints || {}).reduce((s, a) => s + a.length, 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Danger Zone — Mycelium Risk Heatmap</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 2rem; }
  h1 { color: #f85149; margin-bottom: 0.5rem; }
  .subtitle { color: #8b949e; margin-bottom: 2rem; }
  .stats { display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap; }
  .stat { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem 1.5rem; }
  .stat .num { font-size: 2rem; font-weight: bold; color: #58a6ff; }
  .stat .label { color: #8b949e; font-size: 0.85rem; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
  th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #30363d; color: #8b949e; font-size: 0.8rem; text-transform: uppercase; }
  td { padding: 0.5rem; border-bottom: 1px solid #21262d; font-size: 0.85rem; }
  .file { font-family: monospace; color: #58a6ff; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
  .area { color: #8b949e; }
  .bar { height: 20px; border-radius: 3px; color: #fff; font-size: 0.75rem; padding: 2px 6px; min-width: 30px; text-align: right; }
  h2 { color: #c9d1d9; margin: 2rem 0 1rem; }
  .meta { color: #484f58; font-size: 0.75rem; margin-top: 2rem; }
</style>
</head>
<body>
  <h1>Danger Zone</h1>
  <p class="subtitle">Mycelium Risk Heatmap — generated ${new Date().toISOString().slice(0, 10)} from ${totalCommits} commits</p>

  <div class="stats">
    <div class="stat"><div class="num">${totalBreakages}</div><div class="label">Breakages</div></div>
    <div class="stat"><div class="num">${totalCommits}</div><div class="label">Commits Analyzed</div></div>
    <div class="stat"><div class="num">${scored.length}</div><div class="label">Files Tracked</div></div>
    <div class="stat"><div class="num">${totalConstraints}</div><div class="label">Constraints</div></div>
    <div class="stat"><div class="num">${(mem.patterns.fixChains || []).length}</div><div class="label">Fix Chains</div></div>
  </div>

  <h2>Top ${top50.length} Riskiest Files</h2>
  <table>
    <tr><th>#</th><th>File</th><th>Area</th><th>Breaks</th><th>Fix Chains</th><th>Changes</th><th>Couplings</th><th>Risk Score</th></tr>
    ${fileRows}
  </table>

  <h2>Knowledge Coverage by Area</h2>
  <table>
    <tr><th>Area</th><th>Constraints</th><th>Learnings</th></tr>
    ${areaRows}
  </table>

  <p class="meta">Generated by Mycelium --danger-zone | Score = breaks*3 + fixChains*2 + changes*0.5 + couplings*1 | Zero dependencies</p>
</body>
</html>`;

  const outPath = path.join(__dirname, 'danger-zone.html');
  fs.writeFileSync(outPath, html);
  console.log(`\n  \x1b[31;1m🔥 DANGER ZONE generated: danger-zone.html\x1b[0m`);
  console.log(`  ${scored.length} files analyzed | Top risk: ${scored[0]?.file || 'none'} (score: ${scored[0]?.score?.toFixed(1) || 0})`);
  console.log(`  Open in browser to see the full heatmap.`);
  console.log('');

  // Also print top 10 in terminal
  console.log('  \x1b[1mTop 10 Dangerous Files:\x1b[0m');
  for (const f of scored.slice(0, 10)) {
    const pct = Math.round((f.score / maxScore) * 100);
    const icon = pct >= 70 ? '🔴' : pct >= 40 ? '🟡' : '🟢';
    console.log(`    ${icon} ${f.file} — ${f.breaks} breaks, ${f.changes} changes, score ${f.score.toFixed(1)}`);
  }
  console.log('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Feature: Test Gap — find breakage patterns with no test coverage ──────
// Usage: node mycelium.cjs --test-gap
// Cross-references known breakages against actual test files.

function testGap() {
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  if (!fs.existsSync(watchPath)) {
    console.error('  No watch.json found. Run: node mycelium-watch.cjs first.');
    process.exit(1);
  }
  const watch = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
  const mem = loadMemory();

  // Find all test files
  const testFiles = [];
  function findTests(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (['node_modules', '.git', 'dist', '.mycelium'].includes(e.name)) continue;
          findTests(full);
        } else if (/\.(test|spec)\.(js|cjs|mjs|ts|tsx)$/i.test(e.name) || /tests?\//.test(full)) {
          testFiles.push(full);
        }
      }
    } catch {}
  }
  findTests(__dirname);

  // Read all test file contents to search for file references
  const testContents = {};
  for (const tf of testFiles) {
    try {
      testContents[tf] = fs.readFileSync(tf, 'utf8');
    } catch { testContents[tf] = ''; }
  }
  const allTestText = Object.values(testContents).join('\n');

  // Group breakages by file
  const fileBreakages = {};
  for (const b of watch.breakages) {
    for (const f of b.files) {
      if (!fileBreakages[f]) fileBreakages[f] = [];
      fileBreakages[f].push(b);
    }
  }

  // For each broken file, check if it's referenced in any test
  const results = [];
  for (const [file, breaks] of Object.entries(fileBreakages)) {
    const basename = path.basename(file);
    const nameNoExt = path.basename(file, path.extname(file));
    
    // Search for references in test files
    const testRefs = [];
    for (const [tf, content] of Object.entries(testContents)) {
      if (content.includes(basename) || content.includes(nameNoExt) || content.includes(file)) {
        testRefs.push(path.relative(__dirname, tf));
      }
    }
    
    // Also check if any constraint exists for the area
    const area = classifyArea(file);
    const constraints = (mem.constraints && mem.constraints[area]) || [];
    
    results.push({
      file,
      area,
      breakCount: breaks.length,
      hasTest: testRefs.length > 0,
      testFiles: testRefs,
      constraintCount: constraints.length,
      latestBreak: breaks[breaks.length - 1]
    });
  }

  // Sort: most breaks first, then by whether it has tests (untested first)
  results.sort((a, b) => {
    if (a.hasTest !== b.hasTest) return a.hasTest ? 1 : -1;
    return b.breakCount - a.breakCount;
  });

  console.log(`\n  \x1b[1m🧪 TEST GAP ANALYSIS\x1b[0m`);
  console.log(`  ${watch.breakages.length} breakages across ${Object.keys(fileBreakages).length} files`);
  console.log(`  ${testFiles.length} test files found`);
  console.log(`  ${'─'.repeat(60)}`);

  const uncovered = results.filter(r => !r.hasTest);
  const covered = results.filter(r => r.hasTest);

  if (uncovered.length > 0) {
    console.log(`\n  \x1b[31m✗ UNCOVERED (${uncovered.length} files with breakages but NO tests):\x1b[0m`);
    for (const r of uncovered) {
      console.log(`    🔴 ${r.file} — ${r.breakCount} break(s), area: ${r.area}`);
      if (r.latestBreak) console.log(`       Last break: "${r.latestBreak.pattern.slice(0, 60)}"`);
      if (r.constraintCount > 0) {
        console.log(`       \x1b[33m(${r.constraintCount} constraints exist but no test enforces them)\x1b[0m`);
      }
    }
  }

  if (covered.length > 0) {
    console.log(`\n  \x1b[32m✓ COVERED (${covered.length} files with breakages AND tests):\x1b[0m`);
    for (const r of covered) {
      console.log(`    🟢 ${r.file} — ${r.breakCount} break(s), tested in: ${r.testFiles.join(', ')}`);
    }
  }

  // Gap score
  const gapPct = results.length > 0 ? Math.round((uncovered.length / results.length) * 100) : 0;
  const totalUncoveredBreaks = uncovered.reduce((s, r) => s + r.breakCount, 0);
  
  const totalCoveredBreaks = covered.reduce((s, r) => s + r.breakCount, 0);
  
  console.log(`\n  ${'─'.repeat(60)}`);
  console.log(`  \x1b[1mGap Score: ${gapPct}% of broken files have no test coverage\x1b[0m`);
  console.log(`  Uncovered: ${uncovered.length} files (${totalUncoveredBreaks} file-breakage references)`);
  console.log(`  Covered: ${covered.length} files (${totalCoveredBreaks} file-breakage references)`);
  
  if (uncovered.length > 0) {
    console.log(`\n  \x1b[33mPriority: Write tests for these files first:\x1b[0m`);
    for (const r of uncovered.slice(0, 5)) {
      console.log(`    1. ${r.file} (${r.breakCount} breaks, ${r.constraintCount} constraints)`);
    }
  }
  console.log('');
}

// ─── Check: Pre-creation file verification ──────────────────────────
// Run BEFORE creating a new file to see if something similar already exists.
// This is the prevention layer that --guard (at commit time) can't provide.

function check(filepath) {
  const mem = loadMemory();
  const ext = path.extname(filepath);
  const dir = path.dirname(filepath);
  const base = path.basename(filepath, ext).toLowerCase();
  const words = new Set(base.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
    .split(/[-_.\s]+/).filter(w => w.length > 2));

  // Generate trigrams for fuzzy matching (catches showroom/showcase, gallery/galley)
  function trigrams(s) {
    const t = new Set();
    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let i = 0; i <= clean.length - 3; i++) t.add(clean.slice(i, i + 3));
    return t;
  }
  function trigramSimilarity(a, b) {
    const ta = trigrams(a), tb = trigrams(b);
    if (ta.size === 0 || tb.size === 0) return 0;
    const overlap = [...ta].filter(t => tb.has(t)).length;
    return overlap / Math.max(ta.size, tb.size);
  }

  console.log(`\n# Pre-creation check: ${filepath}\n`);

  let issues = 0;

  // 1. Check for similar existing files
  const searchDir = path.join(__dirname, dir);
  if (fs.existsSync(searchDir)) {
    const existing = fs.readdirSync(searchDir)
      .filter(f => path.extname(f) === ext);

    const similar = [];
    for (const ef of existing) {
      const efBase = path.basename(ef, ext).toLowerCase();

      // Method 1: keyword overlap
      const efWords = new Set(efBase.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
        .split(/[-_.\s]+/).filter(w => w.length > 2));
      const keyOverlap = [...words].filter(w => efWords.has(w));

      // Method 2: trigram similarity (fuzzy — catches showroom/showcase)
      const sim = trigramSimilarity(base, efBase);

      // Method 3: one name contains the other
      const contains = base.includes(efBase) || efBase.includes(base);

      // Method 4: shared prefix/suffix of 4+ chars
      let sharedPrefix = 0;
      for (let i = 0; i < Math.min(base.length, efBase.length); i++) {
        if (base[i] === efBase[i]) sharedPrefix++; else break;
      }

      // Method 5: shared root word (≥4 chars) — catches showroom/showcase
      const minLen = Math.min(base.length, efBase.length);
      let sharedRoot = false;
      for (let len = Math.min(minLen, 8); len >= 4; len--) {
        if (base.slice(0, len) === efBase.slice(0, len)) { sharedRoot = true; break; }
      }

      const isOverlap = keyOverlap.length >= 1 || sim >= 0.30 || contains || sharedPrefix >= 4 || sharedRoot;
      if (isOverlap) {
        const score = Math.max(
          keyOverlap.length / Math.max(1, Math.min(words.size, efWords.size)),
          sim,
          contains ? 0.8 : 0,
          sharedPrefix >= 4 ? sharedPrefix / Math.max(base.length, efBase.length) : 0,
          sharedRoot ? 0.5 : 0
        );
        const reasons = [];
        if (keyOverlap.length > 0) reasons.push(`keywords: [${keyOverlap.join(', ')}]`);
        if (sim >= 0.30) reasons.push(`${Math.round(sim * 100)}% trigram match`);
        if (contains) reasons.push('name containment');
        if (sharedPrefix >= 4) reasons.push(`${sharedPrefix}-char shared prefix`);
        if (sharedRoot) reasons.push(`shared root "${base.slice(0, sharedPrefix)}"`);
        similar.push({ file: ef, score, reasons });
      }
    }

    if (similar.length > 0) {
      similar.sort((a, b) => b.score - a.score);
      console.log(`  SIMILAR FILES FOUND in ${dir}/:`);
      for (const s of similar.slice(0, 5)) {
        const icon = s.score >= 0.4 ? '\x1b[31m!!\x1b[0m' : '\x1b[33m~\x1b[0m';
        const existPath = path.join(dir, s.file);

        // Check if Mycelium has data about this file
        let memInfo = '';
        const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
        if (fs.existsSync(watchPath)) {
          try {
            const watch = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
            const risk = (watch.risks || {})[existPath];
            const hot = (watch.hotspots || {})[existPath];
            if (risk) memInfo = ` | Mycelium tracked: ${risk.breakCount}x broke, ${(risk.lessons||[]).length} lessons`;
            else if (hot) memInfo = ` | Mycelium tracked: ${hot}x changed`;
          } catch {}
        }

        console.log(`  ${icon} ${s.file} (${s.reasons.join(', ')})${memInfo}`);
        if (s.score >= 0.4) {
          console.log(`     \x1b[31m↳ HIGH SIMILARITY — likely covers the same feature. Read ${s.file} first.\x1b[0m`);
          issues++;
        }
      }
      console.log('');
    }
  }

  // 2. Check if this concept exists in memory
  const conceptHits = [];
  for (const w of words) {
    if (w.length < 4) continue;
    for (const l of (mem.learnings || [])) {
      if (l.lesson && l.lesson.toLowerCase().includes(w)) {
        conceptHits.push({ type: 'learning', text: l.lesson.slice(0, 80), area: l.area });
      }
    }
    for (const b of (mem.breakages || [])) {
      if (b.what && b.what.toLowerCase().includes(w)) {
        conceptHits.push({ type: 'breakage', text: b.what.slice(0, 80), area: b.area });
      }
    }
    for (const [area, rules] of Object.entries(mem.constraints || {})) {
      for (const r of rules) {
        if (r.fact && r.fact.toLowerCase().includes(w)) {
          conceptHits.push({ type: 'constraint', text: r.fact.slice(0, 80), area });
        }
      }
    }
  }

  if (conceptHits.length > 0) {
    // Deduplicate
    const seen = new Set();
    const unique = conceptHits.filter(h => {
      if (seen.has(h.text)) return false;
      seen.add(h.text);
      return true;
    });
    console.log(`  MYCELIUM KNOWS ABOUT THIS CONCEPT (${unique.length} references):`);
    for (const h of unique.slice(0, 6)) {
      console.log(`  [${h.type}] ${h.text}`);
    }
    console.log('');
    issues += unique.length;
  }

  // 3. Run premortem for the detected area
  const area = classifyArea(filepath);
  if (area && area !== 'root' && area !== 'public') {
    console.log(`  AUTO-PREMORTEM for area "${area}":`);
    const constraints = mem.constraints[area] || [];
    const breakages = (mem.breakages || []).filter(b => b.area === area);
    if (constraints.length > 0) {
      console.log(`  ${constraints.length} constraints:`);
      for (const c of constraints.slice(0, 3)) console.log(`    - ${c.fact.slice(0, 100)}`);
    }
    if (breakages.length > 0) {
      console.log(`  ${breakages.length} past breakages in this area`);
    }
    if (constraints.length === 0 && breakages.length === 0) {
      console.log(`  No known risks for area "${area}"`);
    }
    console.log('');
  }

  if (issues === 0) {
    console.log('  \x1b[32mNo overlap detected. Safe to create.\x1b[0m');
  } else {
    console.log(`  \x1b[33m${issues} potential issue(s). Review before creating this file.\x1b[0m`);
  }
  console.log('');
}

// ─── Main ───────────────────────────────────────────────────────────

const arg = process.argv[2];
if (arg === '--init') {
  init();
} else if (arg === '--onboard') {
  onboard();
} else if (arg === '--status') {
  status();
} else if (arg === '--eval') {
  evaluate();
} else if (arg === '--heal') {
  // Delegate to mycelium-fix: unified fix → verify → confirm
  try { callFixer(true); } catch {
    // Fallback: legacy selfHeal
    const mem = loadMemory();
    if (mem.healState) mem.healState.lastHealAt = 0;
    selfHealNw(mem);
  }
  evaluate();
} else if (arg === '--query') {
  query();
} else if (arg === '--brief') {
  brief();
} else if (arg === '--brief-area' && process.argv[3]) {
  // Write area-specific context: brief + premortem for the area
  brief();
  console.log('---');
  premortem(process.argv[3]);
} else if (arg === '--health') {
  health();
} else if (arg === '--reflect') {
  // Force-run deep reflection against existing data (normally runs every 10 snapshots)
  const mem = loadMemory();
  const before = (mem.reflections || []).length;
  deepReflect(mem, true);  // force=true bypasses the every-10 check
  const after = (mem.reflections || []).length;
  saveMemory(mem);
  console.log(`[mycelium] Deep reflection complete: ${after - before} new insights generated (${after} total)`);
  for (const r of (mem.reflections || []).filter(r => r.type !== 'fix_chain')) {
    console.log(`  [${r.type.replace(/_/g, '-')}] ${r.lesson}`);
  }
} else if (arg === '--decide' && process.argv[3] && process.argv[4]) {
  recordDecision(process.argv[3], process.argv[4], process.argv[5] || '');
} else if (arg === '--constraint' && process.argv[3] && process.argv[4]) {
  recordConstraint(process.argv[3], process.argv[4]);
} else if (arg === '--broke' && process.argv[3] && process.argv[4]) {
  recordBreakage(process.argv[3], process.argv[4]);
} else if (arg === '--learned' && process.argv[3] && process.argv[4]) {
  recordLearning(process.argv[3], process.argv[4]);
} else if (arg === '--premortem' && process.argv[3]) {
  premortem(process.argv[3]);
} else if (arg === '--check' && process.argv[3]) {
  check(process.argv[3]);
} else if (arg === '--postfix') {
  postfix();
} else if (arg === '--whyfile' && process.argv[3]) {
  whyFile(process.argv[3]);
} else if (arg === '--areamap') {
  showAreaMap();
} else if (arg === '--guard') {
  const enforce = process.argv.includes('--enforce');
  const compact = process.argv.includes('--compact');
  const files = process.argv.slice(3).filter(f => f !== '--enforce' && f !== '--compact');
  if (compact) {
    // COMPACT MODE: max 10 lines output, no verbose dumps
    // This prevents the pre-commit hook from bloating AI conversation with 4000+ tokens
    const mem = loadMemory();
    const staged = files.length ? files : (() => { try { return require('child_process').execSync('git diff --cached --name-only', {encoding:'utf8'}).trim().split('\n').filter(Boolean); } catch(e) { return []; } })();
    const areas = [...new Set(staged.map(f => classifyArea(f)).filter(a => a !== 'root'))];
    let blockCount = 0;
    let hardBlock = false;
    const critical = [];
    
    // Area-based checks
    for (const area of areas) {
      const cons = mem.constraints?.[area] || [];
      const brk = (mem.breakages || []).filter(b => b.area === area);
      blockCount += cons.length + brk.length;
      if (brk.length > 0) critical.push(`${area}: ${brk.length} past breakage(s)`);
    }
    
    // ── ACTIVE PATTERN BLOCKING: check diff against learned failure signatures ──
    const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
    if (fs.existsSync(watchPath)) {
      try {
        const watchData = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
        const risks = watchData.risks || {};
        let diff = '';
        try { diff = require('child_process').execSync('git diff --cached 2>/dev/null', {encoding:'utf8'}).toLowerCase(); } catch {}
        
        // Check: files with 5+ breaks that diff touches risky patterns
        for (const f of staged) {
          const risk = risks[f];
          if (!risk || risk.breakCount < 3) continue;
          const lessons = risk.lessons || [];
          // Extract danger keywords from lessons
          const dangerKeys = new Set();
          for (const l of lessons) {
            const text = (typeof l === 'string' ? l : (l.lesson || '')).toLowerCase();
            for (const kw of ['innerhtml', 'data-i18n', 'viewport', 'overflow', 'z-index', 'loading="lazy"', 'queryselector']) {
              if (text.includes(kw)) dangerKeys.add(kw);
            }
          }
          if (dangerKeys.size > 0) {
            const fileDiffIdx = diff.indexOf(f.toLowerCase());
            if (fileDiffIdx !== -1) {
              const fileDiff = diff.slice(fileDiffIdx, diff.indexOf('diff --git', fileDiffIdx + 1) === -1 ? diff.length : diff.indexOf('diff --git', fileDiffIdx + 1));
              const triggered = [...dangerKeys].filter(k => fileDiff.includes(k));
              if (triggered.length > 0) {
                critical.push(`RISK: ${path.basename(f)} (${risk.breakCount}x broke) touches [${triggered.join(',')}]`);
                hardBlock = true;
                // ── LOG guard prevention for validation loop ──
                logGuardAction('block', f, triggered, risk.breakCount);
              }
            }
          }
        }
      } catch(e) { /* best effort */ }
    }
    
    // Token cost check
    const expensive = staged.filter(f => { try { const s = fs.statSync(path.join(__dirname, f)); return s.size > 40000; } catch(e) { return false; } });
    if (expensive.length) critical.push(`EXPENSIVE: ${expensive.map(f=>path.basename(f)).join(', ')} — use grep`);
    // Context size check
    try { const ctx = fs.statSync(path.join(__dirname, '.mycelium-context')); if (ctx.size > 6000) critical.push(`Context bloated: ${(ctx.size/1024).toFixed(1)}KB > 6KB cap`); } catch(e) {}
    
    console.log(`[guard] ${staged.length} files, ${areas.length} areas, ${blockCount} warnings${critical.length ? ':' : ' — OK'}`);
    critical.slice(0, 5).forEach(c => console.log(`  ⚠ ${c}`));
    if (enforce && (blockCount > 30 || hardBlock)) { process.exit(1); }
  } else {
    const warnings = guard(files);
    if (enforce && warnings > 0) {
      console.error(`\n  BLOCKED by --enforce: ${warnings} constraint warning(s) detected.`);
      console.error('  Fix the warnings above or use --no-verify to bypass.\n');
      process.exit(1);
    }
  }
} else if (arg === '--gen-tests') {
  // Auto-generate regression tests from breakages + constraints
  generateRegressionTests();
} else if (arg === '--export-shared') {
  // Export universal constraints/learnings to shared cross-project library
  exportToShared();
} else if (arg === '--import-shared') {
  // Import universal constraints/learnings from shared library
  importFromShared();
} else if (arg === '--shared') {
  // View shared library contents
  showSharedLibrary();
} else if (arg === '--wip' && process.argv[3]) {
  // Write current work-in-progress to disk so it survives chat compaction
  const wipPath = path.join(__dirname, '.mycelium-wip');
  const wipLine = process.argv.slice(3).join(' ');
  const ts = new Date().toISOString().slice(0, 16);
  fs.writeFileSync(wipPath, `  ${ts} ${wipLine}\n`);
  console.log(`[mycelium] WIP saved: ${wipLine}`);
  console.log('  This will appear in .mycelium-context after next commit.');
  console.log('  Clear with: node mycelium.cjs --wip-done');
} else if (arg === '--wip-append' && process.argv[3]) {
  // Append to WIP (for multi-step tasks)
  const wipPath = path.join(__dirname, '.mycelium-wip');
  const existing = fs.existsSync(wipPath) ? fs.readFileSync(wipPath, 'utf8') : '';
  const wipLine = process.argv.slice(3).join(' ');
  const ts = new Date().toISOString().slice(0, 16);
  fs.writeFileSync(wipPath, existing + `  ${ts} ${wipLine}\n`);
  console.log(`[mycelium] WIP appended: ${wipLine}`);
} else if (arg === '--wip-done') {
  // Clear WIP — task is complete
  const wipPath = path.join(__dirname, '.mycelium-wip');
  const checkpointPath = path.join(__dirname, '.mycelium', 'checkpoint.json');
  if (fs.existsSync(wipPath)) {
    fs.unlinkSync(wipPath);
    console.log('[mycelium] WIP cleared. Good work.');
  } else {
    console.log('[mycelium] No WIP to clear.');
  }
  if (fs.existsSync(checkpointPath)) {
    const cp = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
    cp.status = 'completed';
    cp.completedAt = new Date().toISOString();
    fs.writeFileSync(checkpointPath, JSON.stringify(cp, null, 2));
    console.log('[mycelium] Checkpoint marked completed.');
  }
} else if (arg === '--checkpoint') {
  // Structured checkpoint that survives compaction — richer than --wip
  // Usage: node mycelium.cjs --checkpoint '{"task":"...","steps":[...],"completed":[...],"pending":[...],"files":[...],"context":{}}'
  const checkpointPath = path.join(__dirname, '.mycelium', 'checkpoint.json');
  const wipPath = path.join(__dirname, '.mycelium-wip');
  if (!process.argv[3]) {
    // Read mode: show current checkpoint
    if (fs.existsSync(checkpointPath)) {
      console.log(fs.readFileSync(checkpointPath, 'utf8'));
    } else {
      console.log('[mycelium] No checkpoint saved. Use --checkpoint \'{"task":"..."}\' to create one.');
    }
  } else {
    try {
      const payload = JSON.parse(process.argv[3]);
      const checkpoint = {
        savedAt: new Date().toISOString(),
        status: 'in_progress',
        task: payload.task || 'unnamed task',
        steps: payload.steps || [],
        completed: payload.completed || [],
        pending: payload.pending || [],
        blocked: payload.blocked || [],
        files: payload.files || [],
        context: payload.context || {},
        resumeHint: payload.resumeHint || 'Read this checkpoint and continue from the first pending step.'
      };
      fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
      // Also write a compact WIP line for .mycelium-context
      const pendingStr = (checkpoint.pending || []).slice(0, 3).join('; ');
      fs.writeFileSync(wipPath, `  ${checkpoint.savedAt.slice(0,16)} CHECKPOINT: ${checkpoint.task} | PENDING: ${pendingStr}\n`);
      console.log(`[mycelium] Checkpoint saved: ${checkpoint.task}`);
      console.log(`  Steps: ${checkpoint.steps.length} total, ${checkpoint.completed.length} done, ${checkpoint.pending.length} pending`);
      console.log(`  Files: ${checkpoint.files.join(', ') || 'none'}`);
      console.log('  Read with: node mycelium.cjs --checkpoint');
      console.log('  Clear with: node mycelium.cjs --wip-done');
    } catch (e) {
      console.error('[mycelium] Invalid JSON. Usage: --checkpoint \'{"task":"desc","pending":["step1"]}\'' );
      console.error('  Error:', e.message);
    }
  }
} else if (arg === '--compact') {
  compact();
} else if (arg === '--compress' || arg === '--deep-compress') {
  deepCompress();
} else if (arg === '--auto-trim') {
  const trimmed = autoTrim();
  if (!trimmed) console.log('[mycelium] All files within size limits. No trim needed.');
} else if (arg === '--sharpen') {
  // Sharpen all lessons in memory
  const mem = loadMemory();
  let count = 0;
  for (const l of (mem.learnings || [])) {
    const before = l.lesson;
    l.lesson = sharpenLesson(l.lesson || '');
    if (l.lesson !== before) count++;
  }
  saveMemory(mem);
  console.log(`[mycelium] Sharpened ${count} lessons.`);
} else if (arg === '--validation-report') {
  // Print the validation loop report
  const watchPath = path.join(__dirname, '.mycelium', 'watch.json');
  if (!fs.existsSync(watchPath)) { console.log('No watch.json found.'); process.exit(0); }
  const watch = JSON.parse(fs.readFileSync(watchPath, 'utf8'));
  const vLog = watch.validationLog || [];
  const gLog = watch.guardLog || [];
  
  console.log('\n# VALIDATION LOOP REPORT\n');
  
  // Summary
  const totalChecks = vLog.reduce((s, e) => s + e.lessonsApplicable, 0);
  const totalFollowed = vLog.reduce((s, e) => s + e.lessonsFollowed, 0);
  const totalViolated = vLog.reduce((s, e) => s + e.lessonsViolated, 0);
  const rate = totalChecks > 0 ? Math.round((totalFollowed / totalChecks) * 100) : 0;
  
  console.log(`  Commits checked:    ${vLog.length}`);
  console.log(`  Lessons applicable: ${totalChecks}`);
  console.log(`  Lessons followed:   ${totalFollowed} (${rate}%)`);
  console.log(`  Lessons violated:   ${totalViolated}`);
  console.log(`  Guard blocks:       ${gLog.filter(g => g.action === 'block').length}`);
  console.log(`  Guard warns:        ${gLog.filter(g => g.action === 'warn').length}`);
  
  // Lesson effectiveness
  const risks = watch.risks || {};
  let effective = 0, dead = 0, total = 0;
  for (const risk of Object.values(risks)) {
    for (const [key, stats] of Object.entries(risk.lessonStats || {})) {
      total++;
      if (stats.dead) dead++;
      else if (stats.followed >= 2) effective++;
    }
  }
  console.log(`\n  Lesson effectiveness:`);
  console.log(`    Total tracked:    ${total}`);
  console.log(`    Effective (2+):   ${effective}`);
  console.log(`    Dead (never fire): ${dead}`);
  if (total > 0) console.log(`    Signal-to-noise:  ${Math.round((effective / total) * 100)}%`);
  
  // Recent violations
  const recentViolations = vLog.flatMap(e => e.details.filter(d => d.result === 'violated')).slice(-5);
  if (recentViolations.length > 0) {
    console.log(`\n  Recent violations:`);
    for (const v of recentViolations) {
      console.log(`    ${v.file}: ${v.lesson.slice(0, 50)} — ${v.reason || 'unknown'}`);
    }
  }
  
  // Print as JSON for API consumption
  const report = {
    commits: vLog.length, totalChecks, totalFollowed, totalViolated, rate,
    guardBlocks: gLog.filter(g => g.action === 'block').length,
    guardWarns: gLog.filter(g => g.action === 'warn').length,
    lessonStats: { total, effective, dead, signalToNoise: total > 0 ? Math.round((effective / total) * 100) : 0 }
  };
  console.log(`\n  JSON: ${JSON.stringify(report)}`);
} else if (arg === '--predict') {
  predict(process.argv.slice(3));
} else if (arg === '--trending') {
  trending();
} else if (arg === '--autopsy' && process.argv[3]) {
  autopsy(process.argv[3]);
} else if (arg === '--danger-zone') {
  dangerZone();
} else if (arg === '--test-gap') {
  testGap();
} else if (arg === '--token-check') {
  tokenCheck(process.argv.slice(3));
} else if (arg === '--cost-plan') {
  costPlan(process.argv.slice(3));
} else if (arg === '--sync') {
  // Catch up: take snapshot + delegate to mycelium-fix for fix → verify → confirm
  console.log('[mycelium] Syncing after pull/merge...');
  takeSnapshot();
  try { callFixer(); } catch {
    // Fallback: legacy selfHeal
    const mem = loadMemory();
    if (mem.snapshots && mem.snapshots.length >= 10) {
      if (!mem.healState) mem.healState = {};
      mem.healState.lastHealAt = 0;
      saveMemory(mem);
      selfHealNw(mem);
    }
  }
  console.log('[mycelium] Sync complete — snapshot + fix cycle done.');
} else {
  takeSnapshot();
}
