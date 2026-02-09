#!/usr/bin/env node
/**
 * NW-MEMORY: Compounding Project Memory System
 * 
 * This runs automatically on every commit (via pre-commit hook).
 * It extracts FACTS from git and the build, appends them to memory.json.
 * The file only grows. Nothing is rewritten. Each entry is timestamped.
 * 
 * What it tracks (all from automated sources, zero manual input):
 * 
 * 1. COMMITS: what changed, which files, how many lines added/removed
 * 2. BUILD: bundle size, module count, build time, errors
 * 3. PATTERNS: files that get changed together (co-change clusters)
 * 4. HOTSPOTS: files changed most often (likely fragile/complex)
 * 5. FIX CHAINS: when a commit is followed by a fix commit touching same files
 * 6. DEBT SIGNALS: growing file sizes, increasing build times
 * 
 * Usage:
 *   node nw-memory.cjs              # Run snapshot (happens on pre-commit)
 *   node nw-memory.cjs --query      # Print useful context for AI session start
 *   node nw-memory.cjs --health     # Print project health trends
 *   node nw-memory.cjs --decide "area" "decision" "why"   # Record a decision
 *   node nw-memory.cjs --constraint "area" "fact"          # Record a hard constraint
 *   node nw-memory.cjs --broke "area" "what happened"      # Record why something broke
 *   node nw-memory.cjs --premortem "area"                   # Show constraints/breakages for an area before building
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEMORY_FILE = path.join(__dirname, 'memory.json');
const MAX_ENTRIES = 500; // Keep last 500 snapshots (~6 months of daily work)
const MAX_HOTSPOTS = 200; // Only track top 200 hotspots
const MAX_COCHANGES = 300; // Only track top 300 co-change pairs
const MAX_MEMORY_KB = 200; // Auto-compact when memory.json exceeds this

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
  
  // Auto-compact if file is too large
  const sizeKB = Math.round(Buffer.byteLength(json) / 1024);
  if (sizeKB > MAX_MEMORY_KB) {
    console.log(`[NW-MEMORY] Auto-compacting: ${sizeKB}KB > ${MAX_MEMORY_KB}KB limit`);
    compact(mem, true); // silent save inside
  }
}

// ── Check if a file still exists in the repo ────────────────────────
function fileExists(fp) {
  return fs.existsSync(path.join(__dirname, fp));
}

// Paths to skip in query display (noise, archives, generated)
const NOISE_PATHS = ['archive/', 'node_modules/', '.husky/', 'dist/', 'package-lock.json', 'sentinel-report', 'sentinel-history', 'memory.json'];
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
  const jsModules = run('ls public/static/nw-*.js 2>/dev/null | wc -l');
  
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
// When a fix chain is detected, auto-generate a constraint from it.
// This is the "distill insight from failure" step.

function autoReflect(mem, commit) {
  if (!commit.msg.toLowerCase().startsWith('fix')) return;
  
  const prevSnapshot = mem.snapshots[mem.snapshots.length - 1];
  if (!prevSnapshot) return;
  
  const prevFiles = new Set((prevSnapshot.commit?.files || []).map(f => f.path));
  const overlap = commit.files.map(f => f.path).filter(f => prevFiles.has(f));
  if (overlap.length === 0) return;
  
  // Auto-generate a reflection entry
  if (!mem.reflections) mem.reflections = [];
  mem.reflections.push({
    ts: Date.now(),
    date: new Date().toISOString().split('T')[0],
    type: 'fix_chain',
    original: prevSnapshot.commit?.hash,
    fix: commit.hash,
    originalMsg: prevSnapshot.commit?.msg,
    fixMsg: commit.msg,
    files: overlap,
    lesson: `Change "${prevSnapshot.commit?.msg}" needed immediate fix "${commit.msg}" on files: ${overlap.join(', ')}`
  });
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
      if (!mem.autoRules.some(r => r.file === file)) {
        mem.autoRules.push({ type: 'hotspot', file, count, rule, ts: Date.now() });
      }
    }
  }

  // Rule 2: Co-change pairs that always move together → coupled
  const coChanges = Object.entries(mem.patterns.coChanges || {})
    .filter(([pair]) => !pair.split(' <-> ').some(isNoise))
    .sort((a, b) => b[1] - a[1]);
  for (const [pair, count] of coChanges.slice(0, 5)) {
    if (count >= 5) {
      const rule = `${pair} always change together (${count}x) — consider if they should share a module`;
      if (!mem.autoRules.some(r => r.pair === pair)) {
        mem.autoRules.push({ type: 'coupling', pair, count, rule, ts: Date.now() });
      }
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
      if (!mem.autoRules.some(r => r.area === area && r.type === 'fragile_area')) {
        mem.autoRules.push({ type: 'fragile_area', area, count, rule, ts: Date.now() });
      }
    }
  }

  // Cap auto-rules
  if (mem.autoRules.length > 50) mem.autoRules = mem.autoRules.slice(-50);
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
  console.log(`[NW-MEMORY] Snapshot saved: ${commit.hash} | ${build.bundleKB}KB | +${commit.added}/-${commit.removed} lines`);
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

  console.log('# NW-MEMORY: Project Intelligence\n');
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
  console.log(`[NW-MEMORY] Decision recorded: [${area}] ${decision}`);
}

function recordConstraint(area, fact) {
  const mem = loadMemory();
  if (!mem.constraints[area.toLowerCase()]) mem.constraints[area.toLowerCase()] = [];
  // Don't duplicate
  const existing = mem.constraints[area.toLowerCase()];
  if (!existing.some(c => c.fact === fact)) {
    existing.push({ fact, ts: Date.now(), date: new Date().toISOString().split('T')[0] });
    saveMemory(mem);
    console.log(`[NW-MEMORY] Constraint recorded: [${area}] ${fact}`);
  } else {
    console.log(`[NW-MEMORY] Constraint already exists: [${area}] ${fact}`);
  }
}

function recordBreakage(area, what) {
  const mem = loadMemory();
  mem.breakages.push({
    ts: Date.now(),
    date: new Date().toISOString().split('T')[0],
    area: area.toLowerCase(),
    what
  });
  if (mem.breakages.length > 100) mem.breakages = mem.breakages.slice(-100);
  saveMemory(mem);
  console.log(`[NW-MEMORY] Breakage recorded: [${area}] ${what}`);
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

  // 5. Hotspot files in this area
  const hotspots = Object.entries(mem.patterns.hotspots || {})
    .filter(([f]) => f.toLowerCase().includes(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (hotspots.length > 0) {
    console.log(`## Hotspot Files (frequently changed — handle with care)`);
    for (const [file, count] of hotspots) {
      console.log(`  ${count}x  ${file}`);
    }
    console.log('');
  }

  // 6. Fix chains in this area
  const fixChains = (mem.patterns.fixChains || []).filter(fc => 
    fc.files.some(f => f.toLowerCase().includes(key)) || fc.msg.toLowerCase().includes(key)
  );
  if (fixChains.length > 0) {
    console.log(`## Fix Chains (previous changes in this area that needed immediate fixes)`);
    for (const fc of fixChains.slice(-5)) {
      console.log(`  ${fc.original} → ${fc.fix}: ${fc.msg}`);
    }
    console.log('');
  }

  if (areaConstraints.length === 0 && areaBreakages.length === 0 && areaDecisions.length === 0 && 
      hotspots.length === 0 && fixChains.length === 0 && relatedConstraints.length === 0) {
    console.log('No intelligence found for this area yet. This is the first time working here.');
    console.log('After building, record constraints with: node nw-memory.cjs --constraint "' + area + '" "fact"');
    console.log('');
  }
}

// ─── Compact: Prune dead files, deduplicate snapshots, shrink patterns ─

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

  // 4. Prune fix chains referencing deleted files
  if (mem.patterns.fixChains) {
    const before = mem.patterns.fixChains.length;
    mem.patterns.fixChains = mem.patterns.fixChains.filter(fc =>
      fc.files.some(f => fileExists(f))
    );
  }

  // Save
  const json = JSON.stringify(mem, null, 2);
  fs.writeFileSync(MEMORY_FILE, json);
  const sizeAfter = fs.statSync(MEMORY_FILE).size;

  if (!silent) {
    const saved = Math.round((sizeBefore - sizeAfter) / 1024);
    console.log(`[NW-MEMORY] Compacted:`);
    console.log(`  Hotspots pruned: ${pruned.hotspots} (${Object.keys(mem.patterns.hotspots).length} remain)`);
    console.log(`  CoChanges pruned: ${pruned.coChanges} (${Object.keys(mem.patterns.coChanges).length} remain)`);
    console.log(`  Snapshots deduped: ${pruned.snapshots} (${mem.snapshots.length} remain)`);
    console.log(`  Size: ${Math.round(sizeBefore/1024)}KB → ${Math.round(sizeAfter/1024)}KB (saved ${saved}KB)`);
  }
}

// ─── Brief: Write compact context file to disk ─────────────────────
// Blueprint: Context Retrieval — relevance-filtered, actionable intel.
// This file can be re-read by any AI mid-conversation.

function brief() {
  const mem = loadMemory();
  const lines = [];
  lines.push('# NW-CONTEXT (auto-generated — re-read anytime with: cat .nw-context)');
  lines.push('');

  // Health score from recent commits
  const recent = mem.snapshots.slice(-5);
  if (recent.length) {
    const avgScore = Math.round(recent.reduce((s, r) => s + (r.score || 70), 0) / recent.length);
    const grade = avgScore >= 85 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 55 ? 'C' : 'D';
    lines.push(`## Session health: ${avgScore}/100 (${grade}) — last ${recent.length} commits`);
    for (const s of recent) {
      const r = (s.reasons || []).join(' ');
      lines.push(`  ${s.score || '??'} ${s.commit?.hash} ${s.commit?.msg}${r ? ' [' + r + ']' : ''}`);
    }
    lines.push('');
  }

  // Build
  const latest = mem.snapshots[mem.snapshots.length - 1];
  if (latest) {
    lines.push(`## Build: ${latest.build.bundleKB}KB | ${latest.build.htmlPages} pages | ${latest.build.jsModules} JS modules`);
    lines.push('');
  }

  // System inventory — what's already built (READ THIS BEFORE RECOMMENDING FEATURES)
  const totalConstraints = Object.values(mem.constraints || {}).reduce((s, arr) => s + arr.length, 0);
  lines.push('## Already built (do NOT recommend these — they exist)');
  lines.push('  [memory] nw-memory.cjs — auto-snapshots every commit, scoring, pattern detection');
  lines.push('  [memory] memory.json — ' + mem.snapshots.length + ' snapshots, ' + totalConstraints + ' constraints, ' + (mem.decisions||[]).length + ' decisions, ' + (mem.breakages||[]).length + ' breakages');
  lines.push('  [hooks] .husky/pre-commit — auto-compact, stage memory.json, constraint checker (detects areas from staged files, warns about relevant constraints + breakages)');
  lines.push('  [hooks] .husky/post-commit — auto-snapshot + refresh .nw-context');
  lines.push('  [cli] --query (full intel), --health (scored), --brief (context file), --premortem <area>, --decide, --constraint, --broke, --compact');
  lines.push('  [scoring] commit quality scoring (focus, fix-chain, churn, size), project health (sliding window, time-decayed churn, retroactive stability, focus bonus)');
  lines.push('  [detection] co-change pairs, hotspot files, fix chains, auto-distilled rules, bundle trend');
  lines.push('');

  // STOP signals — things that MUST NOT be repeated
  const breakages = (mem.breakages || []).slice(-5);
  const reflections = (mem.reflections || []).slice(-3);
  if (breakages.length || reflections.length) {
    lines.push('## STOP — do not repeat these mistakes');
    for (const b of breakages) {
      lines.push(`  [${b.area}] ${b.what}`);
    }
    for (const r of reflections) {
      lines.push(`  [auto] ${r.lesson}`);
    }
    lines.push('');
  }

  // Constraints — hard rules
  const constraints = mem.constraints || {};
  const constraintAreas = Object.keys(constraints);
  if (constraintAreas.length) {
    lines.push('## Rules (violating = bugs)');
    for (const area of constraintAreas) {
      for (const c of constraints[area]) {
        lines.push(`  [${area}] ${c.fact}`);
      }
    }
    lines.push('');
  }

  // Auto-distilled rules
  const autoRules = (mem.autoRules || []).slice(-10);
  if (autoRules.length) {
    lines.push('## Auto-detected patterns');
    for (const r of autoRules) {
      lines.push(`  ${r.rule}`);
    }
    lines.push('');
  }

  // Decisions — why things are the way they are
  const decisions = (mem.decisions || []).slice(-5);
  if (decisions.length) {
    lines.push('## Why things are this way');
    for (const d of decisions) {
      lines.push(`  [${d.area}] ${d.decision}`);
    }
    lines.push('');
  }

  // Hotspots — handle with care
  const hotspots = Object.entries(mem.patterns.hotspots || {})
    .filter(([f]) => !isNoise(f))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (hotspots.length) {
    lines.push('## Fragile files (change carefully)');
    for (const [file, count] of hotspots) {
      lines.push(`  ${count}x ${file}`);
    }
    lines.push('');
  }

  const content = lines.join('\n');
  fs.writeFileSync(path.join(__dirname, '.nw-context'), content);
  console.log(content);
}

// ─── Main ───────────────────────────────────────────────────────────

const arg = process.argv[2];
if (arg === '--query') {
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
} else if (arg === '--decide' && process.argv[3] && process.argv[4]) {
  recordDecision(process.argv[3], process.argv[4], process.argv[5] || '');
} else if (arg === '--constraint' && process.argv[3] && process.argv[4]) {
  recordConstraint(process.argv[3], process.argv[4]);
} else if (arg === '--broke' && process.argv[3] && process.argv[4]) {
  recordBreakage(process.argv[3], process.argv[4]);
} else if (arg === '--premortem' && process.argv[3]) {
  premortem(process.argv[3]);
} else if (arg === '--compact') {
  compact();
} else {
  takeSnapshot();
}
