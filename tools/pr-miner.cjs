#!/usr/bin/env node
/**
 * PR/Review Miner v1.0
 * ═══════════════════════════════════════════════════════════════════
 * Pulls GitHub PR metadata (titles, files, labels, review comments,
 * merge times) into the mining pipeline using the `gh` CLI.
 *
 * OUTPUT:
 *   .mycelium-mined/pr-data.json — structured PR dataset
 *
 * WHAT IT ANSWERS:
 *   - Which areas get the most PR churn?
 *   - What's the avg time-to-merge by area/author?
 *   - Which PRs had the most file changes (risky merges)?
 *   - PR velocity over time
 *
 * USAGE:
 *   node tools/pr-miner.cjs              # Mine all PRs
 *   node tools/pr-miner.cjs --recent 20  # Last 20 PRs only
 *   node tools/pr-miner.cjs --stats      # Print statistics
 *   node tools/pr-miner.cjs --json       # JSON output
 *
 * @version 1.0.0
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, '.mycelium-mined', 'pr-data.json');

function run(cmd, timeout = 30000) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout }).trim(); } catch { return ''; }
}

function ghAvailable() {
  return run('which gh 2>/dev/null') !== '';
}

function minePRs(limit) {
  if (!ghAvailable()) {
    console.error('  [pr-miner] gh CLI not found. Install: https://cli.github.com/');
    return null;
  }

  // Fetch PR list with metadata
  const fields = 'number,title,state,createdAt,mergedAt,closedAt,author,labels,additions,deletions,changedFiles,headRefName,baseRefName,mergeCommit,reviews,comments';
  const limitStr = limit > 0 ? `--limit ${limit}` : '--limit 100';
  const stateFlag = '--state all';

  const rawPRs = run(`gh pr list ${stateFlag} ${limitStr} --json ${fields} 2>/dev/null`, 60000);
  if (!rawPRs) {
    console.error('  [pr-miner] Failed to fetch PRs from GitHub.');
    return null;
  }

  let prs;
  try { prs = JSON.parse(rawPRs); } catch { return null; }

  // Enrich each PR
  const enriched = prs.map(pr => {
    const created = new Date(pr.createdAt);
    const merged = pr.mergedAt ? new Date(pr.mergedAt) : null;
    const closed = pr.closedAt ? new Date(pr.closedAt) : null;

    // Time to merge (hours)
    let hoursToMerge = null;
    if (merged) {
      hoursToMerge = Math.round((merged - created) / (1000 * 60 * 60) * 10) / 10;
    }

    // Parse conventional commit from title
    const typeMatch = pr.title.match(/^(\w+)(?:\(([^)]*)\))?:/);
    const commitType = typeMatch ? typeMatch[1] : 'other';
    const commitScope = typeMatch ? typeMatch[2] || null : null;

    // Review stats
    const reviews = pr.reviews || [];
    const reviewCount = reviews.length;
    const approvals = reviews.filter(r => r.state === 'APPROVED').length;
    const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
    const reviewers = [...new Set(reviews.map(r => r.author?.login).filter(Boolean))];

    // Labels
    const labels = (pr.labels || []).map(l => l.name || l);

    // Size category
    const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
    let sizeCategory = 'xs';
    if (totalChanges > 1000) sizeCategory = 'xl';
    else if (totalChanges > 500) sizeCategory = 'l';
    else if (totalChanges > 100) sizeCategory = 'm';
    else if (totalChanges > 10) sizeCategory = 's';

    return {
      number: pr.number,
      title: pr.title.slice(0, 150),
      state: pr.state,
      type: commitType,
      scope: commitScope,
      branch: pr.headRefName,
      base: pr.baseRefName,
      author: pr.author?.login || '?',
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      closedAt: pr.closedAt,
      hoursToMerge,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changedFiles || 0,
      totalChanges,
      sizeCategory,
      labels,
      reviews: {
        total: reviewCount,
        approvals,
        changesRequested,
        reviewers,
      },
      comments: pr.comments || 0,
      mergeCommit: pr.mergeCommit?.oid?.slice(0, 12) || null,
    };
  });

  // Sort by number descending
  enriched.sort((a, b) => b.number - a.number);

  // Aggregate statistics
  const mergedPRs = enriched.filter(p => p.state === 'MERGED');
  const mergeTimes = mergedPRs.map(p => p.hoursToMerge).filter(h => h != null && h >= 0);

  const typeDistribution = {};
  const scopeDistribution = {};
  const sizeDistribution = { xs: 0, s: 0, m: 0, l: 0, xl: 0 };
  const authorStats = {};

  for (const pr of enriched) {
    typeDistribution[pr.type] = (typeDistribution[pr.type] || 0) + 1;
    if (pr.scope) scopeDistribution[pr.scope] = (scopeDistribution[pr.scope] || 0) + 1;
    sizeDistribution[pr.sizeCategory]++;

    if (!authorStats[pr.author]) authorStats[pr.author] = { prs: 0, merged: 0, additions: 0, deletions: 0 };
    authorStats[pr.author].prs++;
    if (pr.state === 'MERGED') authorStats[pr.author].merged++;
    authorStats[pr.author].additions += pr.additions;
    authorStats[pr.author].deletions += pr.deletions;
  }

  const stats = {
    total: enriched.length,
    merged: mergedPRs.length,
    open: enriched.filter(p => p.state === 'OPEN').length,
    closed: enriched.filter(p => p.state === 'CLOSED').length,
    avgHoursToMerge: mergeTimes.length > 0 ? Math.round(mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length * 10) / 10 : null,
    medianHoursToMerge: mergeTimes.length > 0 ? mergeTimes.sort((a, b) => a - b)[Math.floor(mergeTimes.length / 2)] : null,
    avgChangedFiles: enriched.length > 0 ? Math.round(enriched.reduce((a, p) => a + p.changedFiles, 0) / enriched.length) : 0,
    totalAdditions: enriched.reduce((a, p) => a + p.additions, 0),
    totalDeletions: enriched.reduce((a, p) => a + p.deletions, 0),
    typeDistribution,
    scopeDistribution: Object.fromEntries(Object.entries(scopeDistribution).sort((a, b) => b[1] - a[1]).slice(0, 15)),
    sizeDistribution,
    authorStats,
    largestPRs: enriched.sort((a, b) => b.totalChanges - a.totalChanges).slice(0, 10).map(p => ({
      number: p.number, title: p.title.slice(0, 60), changes: p.totalChanges, files: p.changedFiles
    })),
  };

  return { version: '1.0.0', generatedAt: new Date().toISOString(), stats, prs: enriched };
}

// ═══════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════
const args = process.argv.slice(2);
const recentIdx = args.indexOf('--recent');
const limit = recentIdx >= 0 ? parseInt(args[recentIdx + 1]) || 20 : 0;

const data = minePRs(limit);
if (!data) process.exit(1);

// Save
const outDir = path.dirname(OUTPUT);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));

if (args.includes('--json')) {
  console.log(JSON.stringify(data, null, 2));
} else if (args.includes('--stats')) {
  const s = data.stats;
  console.log('');
  console.log('  PR/REVIEW MINING STATS');
  console.log('  ═══════════════════════════════════════════════════');
  console.log(`  Total PRs: ${s.total}  Merged: ${s.merged}  Open: ${s.open}  Closed: ${s.closed}`);
  console.log(`  Avg hours to merge: ${s.avgHoursToMerge ?? '-'}  Median: ${s.medianHoursToMerge ?? '-'}`);
  console.log(`  Avg files changed: ${s.avgChangedFiles}  Total: +${s.totalAdditions}/-${s.totalDeletions}`);
  console.log('');
  console.log('  PR types:');
  for (const [t, c] of Object.entries(s.typeDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t.padEnd(12)} ${c}`);
  }
  console.log('');
  console.log('  Size distribution:');
  for (const [sz, c] of Object.entries(s.sizeDistribution)) {
    console.log(`    ${sz.padEnd(4)} ${c} ${'█'.repeat(c)}`);
  }
  console.log('');
  console.log('  Largest PRs:');
  for (const p of (s.largestPRs || []).slice(0, 5)) {
    console.log(`    #${p.number} ${p.title.padEnd(50)} ${p.changes} changes, ${p.files} files`);
  }
  console.log('  ═══════════════════════════════════════════════════');
} else {
  console.log(`  [pr-miner] ${data.stats.total} PRs mined (${data.stats.merged} merged, avg ${data.stats.avgHoursToMerge ?? '?'}h to merge)`);
}
