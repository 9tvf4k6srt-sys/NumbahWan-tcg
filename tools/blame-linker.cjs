#!/usr/bin/env node
/**
 * Feature→Bug Linker v1.0
 * ═══════════════════════════════════════════════════════════════════
 * Links every fix commit to the feature/refactor commit that INTRODUCED
 * the bug. Uses git blame on the fix's changed lines to trace back to
 * the originating commit.
 *
 * OUTPUT:
 *   .mycelium-mined/blame-links.json — array of {fix, introducedBy, daysBetween, ...}
 *
 * WHAT IT ANSWERS:
 *   - Which features cause the most bugs?
 *   - What's the avg time-to-break for features touching file X?
 *   - Which authors' features generate the most fix commits?
 *   - Which areas have the shortest fix chains (fragile code)?
 *
 * USAGE:
 *   node tools/blame-linker.cjs              # Full scan (all fix commits)
 *   node tools/blame-linker.cjs --recent 20  # Last 20 fix commits only
 *   node tools/blame-linker.cjs --json       # JSON output only
 *   node tools/blame-linker.cjs --stats      # Print statistics
 *
 * @version 1.0.0
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, '.mycelium-mined', 'blame-links.json');
const ENRICHED = path.join(ROOT, '.mycelium-mined', 'webapp-enriched.json');
const EXTRACTED = path.join(ROOT, '.mycelium-mined', 'webapp-extracted.json');

function run(cmd, fallback = '') {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 10000 }).trim(); } catch { return fallback; }
}

function readJSON(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

/**
 * For a given fix commit, find which earlier commits introduced the
 * lines that were changed (deleted/modified) by the fix.
 */
function blameFixCommit(fixHash, fixFiles) {
  const introducers = {};

  for (const file of fixFiles.slice(0, 10)) { // Cap files per commit
    // Get the lines that the fix commit CHANGED (deleted/modified)
    // by looking at the diff of the fix commit's parent vs the fix
    const diffOutput = run(
      `git diff ${fixHash}~1 ${fixHash} -- "${file}" 2>/dev/null | grep "^-[^-]" | head -20`,
      ''
    );
    if (!diffOutput) continue;

    // Now blame those lines in the parent commit (before the fix)
    // to find who introduced them
    const blameOutput = run(
      `git blame --porcelain ${fixHash}~1 -- "${file}" 2>/dev/null | grep "^[0-9a-f]\\{40\\}" | head -30`,
      ''
    );
    if (!blameOutput) continue;

    for (const line of blameOutput.split('\n').filter(Boolean)) {
      const introHash = line.slice(0, 40);
      if (!introHash || introHash.match(/^0+$/)) continue; // skip uncommitted
      if (introHash.startsWith(fixHash)) continue; // skip self

      if (!introducers[introHash]) {
        introducers[introHash] = { count: 0, files: new Set() };
      }
      introducers[introHash].count++;
      introducers[introHash].files.add(file);
    }
  }

  // Find the most likely introducer (most blamed lines)
  let topIntro = null;
  let topCount = 0;
  for (const [hash, data] of Object.entries(introducers)) {
    if (data.count > topCount) {
      topCount = data.count;
      topIntro = hash;
    }
  }

  if (!topIntro) return null;

  // Get metadata for the introducing commit
  const introMsg = run(`git log -1 --pretty=format:"%s" ${topIntro} 2>/dev/null`);
  const introAuthor = run(`git log -1 --pretty=format:"%an" ${topIntro} 2>/dev/null`);
  const introDate = run(`git log -1 --pretty=format:"%aI" ${topIntro} 2>/dev/null`);
  const introType = parseType(introMsg);

  return {
    hash: topIntro.slice(0, 12),
    fullHash: topIntro,
    message: introMsg.slice(0, 120),
    author: introAuthor,
    date: introDate,
    type: introType,
    blamedLines: topCount,
    filesOverlap: [...introducers[topIntro].files],
    totalIntroducers: Object.keys(introducers).length,
  };
}

function parseType(msg) {
  const m = msg.match(/^(\w+)(?:\([^)]*\))?:/);
  return m ? m[1] : msg.toLowerCase().startsWith('fix') ? 'fix' : 'other';
}

function loadFixCommits(limit) {
  // Try enriched first (has rootCause etc.)
  const enriched = readJSON(ENRICHED);
  let fixes = [];

  if (enriched && enriched.fixCommits && enriched.fixCommits.length > 0) {
    fixes = enriched.fixCommits;
  } else {
    // Fallback: extracted
    const extracted = readJSON(EXTRACTED);
    if (extracted && extracted.fixCommits) fixes = extracted.fixCommits;
  }

  if (limit && limit > 0) fixes = fixes.slice(-limit);
  return fixes;
}

function linkAll(limit) {
  const fixes = loadFixCommits(limit);
  if (fixes.length === 0) {
    console.log('  No fix commits found to link.');
    return { links: [], stats: {} };
  }

  const links = [];
  let linked = 0, selfFix = 0, noBlame = 0;

  for (let i = 0; i < fixes.length; i++) {
    const fix = fixes[i];
    const hash = fix.hash || fix.fullHash || '';
    const files = fix.files || [];
    const fileNames = files.map(f => typeof f === 'string' ? f : f.file || f.name || '').filter(Boolean);

    if (!hash || fileNames.length === 0) { noBlame++; continue; }

    const shortHash = hash.slice(0, 12);
    const intro = blameFixCommit(shortHash, fileNames);

    const link = {
      fix: {
        hash: shortHash,
        message: (fix.msg || fix.message || '').slice(0, 120),
        date: fix.date || '',
        category: fix.category || null,
        severity: fix.severity || null,
        pattern: fix.pattern || null,
        files: fileNames.slice(0, 10),
      },
      introducedBy: intro,
      daysBetween: null,
      sameAuthor: false,
    };

    if (intro) {
      linked++;
      // Calculate days between introduction and fix
      try {
        const fixDate = new Date(fix.date);
        const introDate = new Date(intro.date);
        link.daysBetween = Math.round((fixDate - introDate) / (1000 * 60 * 60 * 24));
      } catch {}
      // Same author?
      const fixAuthor = run(`git log -1 --pretty=format:"%an" ${shortHash} 2>/dev/null`);
      link.sameAuthor = fixAuthor === intro.author;
    } else {
      noBlame++;
    }

    links.push(link);

    // Progress
    if ((i + 1) % 20 === 0) {
      process.stderr.write(`  [blame-linker] ${i + 1}/${fixes.length} processed\r`);
    }
  }

  // Compute aggregate statistics
  const linkedItems = links.filter(l => l.introducedBy);
  const daysBetween = linkedItems.map(l => l.daysBetween).filter(d => d != null && d >= 0);
  const introTypes = {};
  const introAuthors = {};
  const introFiles = {};

  for (const l of linkedItems) {
    const t = l.introducedBy.type;
    introTypes[t] = (introTypes[t] || 0) + 1;
    const a = l.introducedBy.author;
    introAuthors[a] = (introAuthors[a] || 0) + 1;
    for (const f of l.introducedBy.filesOverlap) {
      introFiles[f] = (introFiles[f] || 0) + 1;
    }
  }

  const stats = {
    totalFixes: fixes.length,
    linked,
    noBlame,
    linkRate: fixes.length > 0 ? Math.round(linked / fixes.length * 100) : 0,
    avgDaysBetween: daysBetween.length > 0 ? Math.round(daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length) : null,
    medianDaysBetween: daysBetween.length > 0 ? daysBetween.sort((a, b) => a - b)[Math.floor(daysBetween.length / 2)] : null,
    sameAuthorFixes: linkedItems.filter(l => l.sameAuthor).length,
    introducingTypes: introTypes,
    topIntroducingFiles: Object.entries(introFiles).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([f, c]) => ({ file: f, count: c })),
  };

  return { links, stats };
}

// ═══════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const recentIdx = args.indexOf('--recent');
const limit = recentIdx >= 0 ? parseInt(args[recentIdx + 1]) || 20 : 0;

if (args.includes('--help')) {
  console.log(`
  Feature→Bug Linker v1.0
  
  USAGE:
    node tools/blame-linker.cjs              # Full scan
    node tools/blame-linker.cjs --recent 20  # Last 20 fix commits
    node tools/blame-linker.cjs --stats      # Print statistics only
    node tools/blame-linker.cjs --json       # JSON output
  `);
  process.exit(0);
}

const { links, stats } = linkAll(limit);

// Save
const output = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  stats,
  links,
};

const outDir = path.dirname(OUTPUT);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));

if (args.includes('--json')) {
  console.log(JSON.stringify(output, null, 2));
} else if (args.includes('--stats')) {
  console.log('');
  console.log('  FEATURE→BUG LINK STATS');
  console.log('  ═══════════════════════════════════════════════════');
  console.log(`  Fixes scanned: ${stats.totalFixes}`);
  console.log(`  Linked: ${stats.linked} (${stats.linkRate}%)`);
  console.log(`  No blame: ${stats.noBlame}`);
  console.log(`  Avg days to break: ${stats.avgDaysBetween ?? '-'}`);
  console.log(`  Median days: ${stats.medianDaysBetween ?? '-'}`);
  console.log(`  Same-author fixes: ${stats.sameAuthorFixes}`);
  console.log('');
  console.log('  Introducing commit types:');
  for (const [t, c] of Object.entries(stats.introducingTypes || {}).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t.padEnd(12)} ${c}`);
  }
  console.log('');
  console.log('  Top files that introduce bugs:');
  for (const { file, count } of (stats.topIntroducingFiles || []).slice(0, 10)) {
    console.log(`    ${file.padEnd(45)} ${count}x`);
  }
  console.log('  ═══════════════════════════════════════════════════');
} else {
  console.log(`  [blame-linker] ${stats.linked}/${stats.totalFixes} fixes linked (${stats.linkRate}%), avg ${stats.avgDaysBetween ?? '?'} days to break`);
}
