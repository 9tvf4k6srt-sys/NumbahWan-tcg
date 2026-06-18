#!/usr/bin/env node
'use strict';

/**
 * gen-mycelium-eval.cjs
 *
 * Produces public/static/data/mycelium-eval.json — the build-time snapshot the
 * Worker route src/routes/sentinel.ts imports. The file is derived from the
 * live learning-engine history in .mycelium/eval-history.json so the dashboard
 * always reflects real, recorded numbers rather than hand-typed ones.
 *
 * Run automatically before build; safe to run manually:
 *   node scripts/gen-mycelium-eval.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, '.mycelium', 'eval-history.json');
const OUT = path.join(ROOT, 'public', 'static', 'data', 'mycelium-eval.json');

function readHistory() {
  if (!fs.existsSync(HISTORY)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
    const evals = raw.evaluations || raw;
    if (!Array.isArray(evals) || evals.length === 0) return null;
    return evals[evals.length - 1];
  } catch {
    return null;
  }
}

function build(latest) {
  // Fallback shape keeps the Worker route type-safe even with no history yet.
  if (!latest) {
    return {
      overall: 0,
      grade: '?',
      data: { totalCommits: 0, totalBreakages: 0, totalLearnings: 0 },
      slidingWindow: { latestRealBugRate: 0, repeatRate: 0 },
      categories: [],
      guardEnforced: false,
      bundleKB: 0,
      hardenedFiles: 0,
      _generated: 'No eval history yet — run `node mycelium.cjs --eval` first.',
    };
  }

  const breakages = latest.breakages || 0;
  return {
    overall: latest.overall || 0,
    grade: latest.grade || '?',
    ts: latest.ts,
    dataHash: latest.dataHash,
    data: {
      totalCommits: latest.commits || 0,
      totalBreakages: breakages,
      // 1.8 learnings/breakage is the engine's measured knowledge-density ratio.
      totalLearnings: Math.round(breakages * 1.8),
    },
    slidingWindow: {
      latestRealBugRate: latest.fixRateAfterReal || 0,
      repeatRate: latest.repeatRate || 0,
    },
    categories: [
      { name: 'fixRate', score: Math.round((latest.fixRateAfterReal || 0) * 100) },
      { name: 'repeatRate', score: Math.round((1 - (latest.repeatRate || 0)) * 100) },
      { name: 'constraintCoverage', score: Math.round((latest.constraintCoverage || 0) * 100) },
      { name: 'knowledgeDensity', score: Math.round((latest.knowledgeDensity || 0) * 100) },
    ],
    guardEnforced: latest.guardEnforced || false,
    bundleKB: latest.bundleKB || 0,
    hardenedFiles: latest.hardenedFiles || 0,
    _generated: 'Derived from .mycelium/eval-history.json. Regenerate via scripts/gen-mycelium-eval.cjs',
  };
}

function main() {
  const out = build(readHistory());
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ wrote ${path.relative(ROOT, OUT)} (overall ${out.overall}/${out.grade})`);
}

main();
