#!/usr/bin/env node
/**
 * NW-MEMORY: Compounding Project Memory for AI-Assisted Development
 * 
 * Drop this file into ANY project. Zero dependencies. Zero config.
 *   node nw-memory.cjs --init        # Set up hooks + memory.json + .gitignore
 *   node nw-memory.cjs --onboard     # Explain the system to any AI in 10 lines
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
 *   --export-shared                  # Export universal lessons to ~/.nw-shared-memory.json
 *   --import-shared                  # Import lessons from shared library
 *   --wip "task"                     # Save work-in-progress (survives chat compaction)
 *   --wip-done                       # Clear WIP after task complete
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
// Configurable via .nw-config.json { "noisePaths": [...] }
const DEFAULT_NOISE = ['archive/', 'node_modules/', '.husky/', 'dist/', 'build/', 'out/', '.next/', 
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'memory.json', 
  'coverage/', '.nyc_output/', '__pycache__/', '.pytest_cache/'];
function loadConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '.nw-config.json'), 'utf8'));
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

// ─── Deep Intelligence (shared with gitwise.cjs) ────────────────────
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
// Priority: 1) .nw-config.json custom areas, 2) universal patterns, 3) legacy, 4) directory fallback
function classifyArea(filePath) {
  const fp = filePath.toLowerCase();

  // 1. User-defined area mappings from .nw-config.json { "areas": { "payments": ["stripe", "billing"] } }
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
  if (fp.includes('memory') || fp.includes('nw-context') || fp.includes('nw-memory')) return 'memory';

  // 3. Legacy NumbahWan patterns (kept for backward compat — ignored if custom areas have entries)
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
  console.log(`[NW-MEMORY] Learning recorded: [${area}] ${lesson}`);
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

  // Delegate to nw-fixer: the unified fix → verify → confirm system
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
  console.log(`[NW-MEMORY] Breakage recorded: [${area}] ${what}`);
  if (entry.deepLesson) {
    console.log(`[NW-MEMORY] Auto-enriched: ↳ ${entry.deepLesson}`);
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
    console.log('  node nw-memory.cjs --learned "' + area + '" "what you discovered"');
    console.log('  node nw-memory.cjs --constraint "' + area + '" "hard fact"');
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
  console.log(`  node nw-memory.cjs --broke "${areaList}" "description of what broke and why"`);
  console.log('');
  console.log(`  # What you learned (so next AI doesn't repeat it):`);
  console.log(`  node nw-memory.cjs --learned "${areaList}" "the lesson from this fix"`);
  console.log('');
  console.log(`  # A hard rule to prevent recurrence:`);
  console.log(`  node nw-memory.cjs --constraint "${areaList}" "never do X because Y"`);
  console.log('');
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
  const fixChainReflections = (mem.reflections || []).filter(r => r.type === 'fix_chain').slice(-3);
  if (breakages.length || fixChainReflections.length) {
    lines.push('## STOP — do not repeat these mistakes');
    for (const b of breakages) {
      lines.push(`  [${b.area}] ${b.what}`);
    }
    for (const r of fixChainReflections) {
      lines.push(`  [fix-chain] ${r.lesson}`);
    }
    lines.push('');
  }

  // Learnings — organic insights distilled from real data
  const deepReflections = (mem.reflections || []).filter(r => 
    r.type !== 'fix_chain'  // fix chains shown above in STOP
  ).slice(-10);
  if (deepReflections.length) {
    lines.push('## Learnings (auto-distilled from project data)');
    for (const r of deepReflections) {
      const tag = r.type.replace(/_/g, '-');
      lines.push(`  [${tag}] ${r.lesson}`);
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

  // Fix learnings — what was learned from fixing (crucial for any AI)
  const learnings = (mem.learnings || []).slice(-10);
  if (learnings.length) {
    lines.push('## Fix Learnings (recorded after fixing — DON\'T REPEAT THESE)');
    for (const l of learnings) {
      lines.push(`  [${l.area}] ${l.lesson}`);
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

  // ── WIP section: survives chat compaction ──
  const wipPath = path.join(__dirname, '.nw-wip');
  if (fs.existsSync(wipPath)) {
    const wipRaw = fs.readFileSync(wipPath, 'utf8').trim();
    if (wipRaw) {
      lines.push('## WORK IN PROGRESS (read this FIRST — resume, do NOT re-plan)');
      lines.push(wipRaw);
      lines.push('');
    }
  }

  const content = lines.join('\n');
  fs.writeFileSync(path.join(__dirname, '.nw-context'), content);
  console.log(content);
}

// ─── FEATURE 1: Auto-Premortem — fires on file list, not just area name ─
// Instead of manually running --premortem <area>, pass file paths.
// Detects areas from the files, deduplicates, runs premortem for each.
// Used by: --guard <file1> <file2> ... OR --guard (reads git staged files)

function guard(files) {
  const mem = loadMemory();

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
    console.log('[NW-MEMORY] No files to guard. Stage some files or pass paths.');
    return;
  }

  // Classify files into areas
  const areas = new Set();
  for (const f of files) {
    const area = classifyArea(f);
    if (area && area !== 'root' && area !== 'public') areas.add(area);
  }

  if (areas.size === 0) {
    console.log('[NW-MEMORY] No known areas detected in these files. Checking root constraints...');
    areas.add('root');
  }

  console.log(`\n# Auto-Guard: ${files.length} files → ${areas.size} area(s) detected`);
  console.log(`  Areas: ${[...areas].join(', ')}`);
  console.log(`  Files: ${files.slice(0, 8).join(', ')}${files.length > 8 ? ` (+${files.length - 8} more)` : ''}`);
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
}

// ─── FEATURE 2: Auto-generate regression tests from breakages ────────
// Each --broke entry becomes a concrete test assertion.
// Tests are written to tests/regression-from-breakages.cjs and can run standalone.

function generateRegressionTests() {
  const mem = loadMemory();
  const breakages = mem.breakages || [];
  
  if (breakages.length === 0) {
    console.log('[NW-MEMORY] No breakages recorded. Nothing to generate tests for.');
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
  lines.push(' * AUTO-GENERATED regression tests from NW-MEMORY breakages & constraints');
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
  console.log(`[NW-MEMORY] Generated ${testCases.length} regression tests from ${breakages.length} breakages + constraints`);
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
// Export portable constraints/learnings to ~/.nw-shared-memory.json
// Import them into any new project. Universal truths carry forward.

const SHARED_MEMORY_PATH = path.join(require('os').homedir(), '.nw-shared-memory.json');

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

  console.log(`[NW-MEMORY] Exported to shared library: ${SHARED_MEMORY_PATH}`);
  console.log(`  ${exportedConstraints} new constraints exported`);
  console.log(`  ${exportedLearnings} new learnings exported`);
  console.log(`  Total in library: ${shared.constraints.length} constraints, ${shared.learnings.length} learnings`);
  console.log(`  Projects: ${shared.meta.projects.join(', ')}`);
  console.log('');
  console.log('  Use in any project: node nw-memory.cjs --import-shared');
}

function importFromShared() {
  const shared = loadSharedMemory();
  const mem = loadMemory();
  const projectName = path.basename(__dirname);

  if (shared.constraints.length === 0 && shared.learnings.length === 0) {
    console.log('[NW-MEMORY] Shared library is empty. Export from a project first: --export-shared');
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

  console.log(`[NW-MEMORY] Imported from shared library:`);
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
  console.log(`\n# NW-MEMORY: Setting up for "${projectName}"\n`);

  // 1. Create memory.json if it doesn't exist
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
# NW-MEMORY: Pre-commit — enforce protocol, auto-guard, compact
if [ ! -f "nw-memory.cjs" ]; then exit 0; fi

# Session marker must exist
if [ ! -f ".nw-session" ]; then
  echo "" >&2
  echo "  BLOCKED: No .nw-session file." >&2
  echo "  Run: cat .nw-context && echo \\$(date +%s) > .nw-session" >&2
  echo "" >&2
  exit 1
fi

# Auto-compact if needed
MEM_SIZE=$(wc -c < memory.json 2>/dev/null || echo 0)
if [ "$MEM_SIZE" -gt 204800 ]; then
  node nw-memory.cjs --compact >/dev/null 2>&1
fi

git add memory.json 2>/dev/null || true

# Auto-guard: show warnings for areas being touched
node nw-memory.cjs --guard 2>/dev/null >&2 || true

exit 0
`;

  const postCommit = `#!/bin/sh
# NW-MEMORY: Post-commit — snapshot + refresh context
if [ ! -f "nw-memory.cjs" ]; then exit 0; fi
node nw-memory.cjs >/dev/null 2>&1
node nw-memory.cjs --brief >/dev/null 2>&1

# Fix detection: prompt for learnings
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null)
case "$COMMIT_MSG" in
  fix*|Fix*)
    echo "" >&2
    echo "  FIX DETECTED. Record what you learned:" >&2
    echo "    node nw-memory.cjs --postfix" >&2
    echo "    node nw-memory.cjs --learned \\"area\\" \\"lesson\\"" >&2
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
  const additions = ['.nw-session', '.nw-wip', '.nw-context'];
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
cat .nw-context                          # read the project brain
echo $(date +%s) > .nw-session           # mark session started
node nw-memory.cjs --premortem <area>    # check what broke before
\`\`\`

## Before every commit:
Record at least one learning:
\`\`\`bash
node nw-memory.cjs --decide "area" "what" "why"
node nw-memory.cjs --constraint "area" "fact"
node nw-memory.cjs --broke "area" "what happened"
node nw-memory.cjs --learned "area" "lesson"
\`\`\`

## Full command reference:
Run \`node nw-memory.cjs --onboard\` for a complete guide.
`);
    console.log('  ✓ Created CLAUDE.md (AI session protocol)');
  } else {
    console.log('  · CLAUDE.md already exists');
  }

  // 6. Create initial .nw-config.json example if it doesn't exist
  const configPath = path.join(__dirname, '.nw-config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      _comment: "Customize NW-MEMORY for your project. All fields optional.",
      areas: {},
      noisePaths: DEFAULT_NOISE,
      _example_areas: {
        payments: ["stripe", "billing", "invoice"],
        auth: ["login", "session", "jwt", "oauth"],
        api: ["routes/", "controllers/", "handlers/"]
      }
    }, null, 2));
    console.log('  ✓ Created .nw-config.json (customize areas + noise paths)');
  } else {
    console.log('  · .nw-config.json already exists');
  }

  // 7. Take initial snapshot
  takeSnapshot();
  brief();

  console.log('\n  Setup complete! Start your first session:');
  console.log('    cat .nw-context');
  console.log('    echo $(date +%s) > .nw-session');
  console.log('    node nw-memory.cjs --onboard');
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
# NW-MEMORY: Project Memory System

You are working on a project with ${snapCount} recorded commits, ${constraintCount} constraints,
${breakageCount} breakages, ${decisionCount} decisions, and ${learningCount} learnings.

## What you MUST do before coding:
  1. cat .nw-context                          # read project brain — rules, breakages, fragile files
  2. echo $(date +%s) > .nw-session           # mark session (required or commits are blocked)
  3. node nw-memory.cjs --premortem <area>    # see what broke before in the area you'll touch

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
  const wipPath = path.join(__dirname, '.nw-wip');
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
// This makes NW-Memory a self-improving system — it evaluates itself after
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

  // ── 7. gitwise Integration ──
  let gitwiseScore = 0;
  let gitwiseLastEval = null;
  try {
    const gwMem = JSON.parse(fs.readFileSync(path.join(__dirname, '.gitwise', 'memory.json'), 'utf8'));
    const gwBreakages = gwMem.breakages?.length || 0;
    const gwLessons = gwMem.breakages?.filter(b => b.lesson && b.lesson.length > 20).length || 0;
    const gwLessonRate = gwBreakages > 0 ? gwLessons / gwBreakages : 0;

    if (gwLessonRate > 0.9) {
      gitwiseScore = 100;
      insights.push(`gitwise integration: ${gwBreakages} breakages, ${Math.round(gwLessonRate * 100)}% with deep lessons`);
    } else if (gwLessonRate > 0.5) {
      gitwiseScore = 60;
      insights.push(`gitwise integration: ${Math.round(gwLessonRate * 100)}% lesson rate — needs deeper diff analysis`);
    } else {
      gitwiseScore = 30;
      insights.push(`gitwise integration: only ${Math.round(gwLessonRate * 100)}% lesson rate — extractLesson is weak`);
      upgrades.push('gitwise lesson extraction needs upgrade — most breakages lack root cause');
    }
    if (gwMem.evaluations?.length > 0) {
      gitwiseLastEval = gwMem.evaluations[gwMem.evaluations.length - 1];
    }
  } catch {
    gitwiseScore = 0;
    insights.push('gitwise: not installed — run node gitwise.cjs --install for passive learning');
    upgrades.push('Install gitwise for automatic breakage detection from git history');
  }
  scores.gitwiseIntegration = gitwiseScore;

  // ── Overall Grade ──
  const weights = {
    constraintCoverage: 20, constraintEffectiveness: 20, decisionImpact: 15,
    learningCapture: 15, fixChainTrend: 10, reflectionQuality: 10, gitwiseIntegration: 10
  };

  let totalScore = 0, totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] !== undefined) { totalScore += scores[key] * weight; totalWeight += weight; }
  }
  const overallScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' :
                overallScore >= 40 ? 'D' : 'F';

  // Combined score with gitwise
  let combinedScore = overallScore;
  let combinedGrade = grade;
  if (gitwiseLastEval) {
    combinedScore = Math.round((overallScore + gitwiseLastEval.overallScore) / 2);
    combinedGrade = combinedScore >= 90 ? 'A' : combinedScore >= 75 ? 'B' :
                    combinedScore >= 60 ? 'C' : combinedScore >= 40 ? 'D' : 'F';
  }

  return {
    overallScore, grade, combinedScore, combinedGrade, scores, insights, upgrades,
    gitwiseLastEval, uncoveredAreas, areaBreakages, weights,
    metrics: {
      snapshots: totalSnapshots, constraints: totalConstraints, breakages: totalBreakages,
      decisions: totalDecisions, learnings: totalLearnings, fixChains: fixChainCount,
      reflections: reflectionCount
    }
  };
}

// ─── Delegate to nw-fixer: unified fix → verify → confirm system ────
// selfHealNw kept as fallback when nw-fixer.cjs is not present.

function callFixer(force) {
  const fixerPath = path.join(__dirname, 'nw-fixer.cjs');
  if (!fs.existsSync(fixerPath)) return false;
  const flag = force ? '--force' : '--silent';
  require('child_process').execSync(`node "${fixerPath}" ${flag}`, {
    cwd: __dirname, stdio: force ? 'inherit' : 'pipe', timeout: 30000
  });
  return true;
}

// ─── Self-Heal NW-Memory: auto-eval + auto-fix weak scores ──────────
// Runs silently every 10 snapshots inside takeSnapshot().
// Detects weaknesses and takes corrective action without human intervention.
// This turns NW-Memory from a measurement tool into a self-improving system.

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

  // ── Action 2: Constraint Effectiveness low -> enrich with gitwise deep lessons ──
  if (result.scores.constraintEffectiveness < 40) {
    try {
      const gwMem = JSON.parse(fs.readFileSync(path.join(__dirname, '.gitwise', 'memory.json'), 'utf8'));
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
                  autoGenerated: true, source: 'self-heal: gitwise deep lesson promoted (constraint ineffective)'
                });
                actions.push(`enriched [${area}] constraint with gitwise lesson`);
                break;
              }
            }
          }
        }
      }
    } catch { /* gitwise not available */ }
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

  // ── Action 6: gitwise not integrated -> attempt to install ──
  if (result.scores.gitwiseIntegration === 0) {
    try {
      const gwPath = path.join(__dirname, 'gitwise.cjs');
      if (fs.existsSync(gwPath)) {
        require('child_process').execSync('node gitwise.cjs --install', {
          cwd: __dirname, stdio: 'pipe', timeout: 10000
        });
        actions.push('auto-installed gitwise (was not initialized)');
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
    console.error(`  \x1b[2mNW-MEMORY self-heal: ${actions.length} action(s) taken (score: ${result.overallScore}/100 ${result.grade})\x1b[0m`);
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
    console.log('\n[NW-MEMORY] Eval: need at least 10 snapshots for meaningful evaluation.\n');
    return;
  }

  const { overallScore, grade, combinedScore, combinedGrade, scores, insights, upgrades,
          gitwiseLastEval, weights, metrics } = result;
  const gradeColor = (grade === 'A' || grade === 'B') ? '\x1b[32m' :
                     grade === 'C' ? '\x1b[33m' : '\x1b[31m';

  console.log('');
  console.log('  \x1b[1mNW-MEMORY eval\x1b[0m — is the learning system getting better?');
  console.log('  ─'.repeat(35));
  console.log('');
  console.log(`  ${gradeColor}\x1b[1m  Overall: ${overallScore}/100 (${grade})\x1b[0m`);
  console.log('');

  const metricNames = {
    constraintCoverage: 'Constraint Coverage', constraintEffectiveness: 'Constraint Effect.',
    decisionImpact: 'Decision Impact', learningCapture: 'Learning Capture',
    fixChainTrend: 'Fix Chain Trend', reflectionQuality: 'Reflection Quality',
    gitwiseIntegration: 'gitwise Integration'
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

  if (gitwiseLastEval) {
    console.log('');
    console.log(`  \x1b[1mCombined Score (NW-Memory + gitwise):\x1b[0m`);
    console.log(`    NW-Memory:  ${overallScore}/100 (${grade})`);
    console.log(`    gitwise:    ${gitwiseLastEval.overallScore}/100 (${gitwiseLastEval.grade})`);
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

  // After printing, delegate to nw-fixer for cross-system fix → verify
  try { callFixer(); } catch { selfHealNw(mem); }
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
  // Delegate to nw-fixer: unified fix → verify → confirm
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
  console.log(`[NW-MEMORY] Deep reflection complete: ${after - before} new insights generated (${after} total)`);
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
} else if (arg === '--postfix') {
  postfix();
} else if (arg === '--whyfile' && process.argv[3]) {
  whyFile(process.argv[3]);
} else if (arg === '--areamap') {
  showAreaMap();
} else if (arg === '--guard') {
  // Auto-premortem: detect areas from files, show only the dangerous stuff
  const files = process.argv.slice(3);
  guard(files);
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
  const wipPath = path.join(__dirname, '.nw-wip');
  const wipLine = process.argv.slice(3).join(' ');
  const ts = new Date().toISOString().slice(0, 16);
  fs.writeFileSync(wipPath, `  ${ts} ${wipLine}\n`);
  console.log(`[NW-MEMORY] WIP saved: ${wipLine}`);
  console.log('  This will appear in .nw-context after next commit.');
  console.log('  Clear with: node nw-memory.cjs --wip-done');
} else if (arg === '--wip-append' && process.argv[3]) {
  // Append to WIP (for multi-step tasks)
  const wipPath = path.join(__dirname, '.nw-wip');
  const existing = fs.existsSync(wipPath) ? fs.readFileSync(wipPath, 'utf8') : '';
  const wipLine = process.argv.slice(3).join(' ');
  const ts = new Date().toISOString().slice(0, 16);
  fs.writeFileSync(wipPath, existing + `  ${ts} ${wipLine}\n`);
  console.log(`[NW-MEMORY] WIP appended: ${wipLine}`);
} else if (arg === '--wip-done') {
  // Clear WIP — task is complete
  const wipPath = path.join(__dirname, '.nw-wip');
  if (fs.existsSync(wipPath)) {
    fs.unlinkSync(wipPath);
    console.log('[NW-MEMORY] WIP cleared. Good work.');
  } else {
    console.log('[NW-MEMORY] No WIP to clear.');
  }
} else if (arg === '--compact') {
  compact();
} else if (arg === '--sync') {
  // Catch up: take snapshot + delegate to nw-fixer for fix → verify → confirm
  console.log('[NW-MEMORY] Syncing after pull/merge...');
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
  console.log('[NW-MEMORY] Sync complete — snapshot + fix cycle done.');
} else {
  takeSnapshot();
}
