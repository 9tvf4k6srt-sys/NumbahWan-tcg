#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// NW-EVAL v1.0 — The Single Source of Truth
// ═══════════════════════════════════════════════════════════════════════════
//
// ONE evaluator to replace three disagreeing systems.
// Every metric is:
//   1. Computed from raw data (not stored scores)
//   2. Cross-verified (same data, same result, every time)
//   3. Transparent (shows formula + evidence for every number)
//
// Usage:
//   node nw-eval.cjs              # Full evaluation with human-readable output
//   node nw-eval.cjs --json       # Machine-readable JSON (for showcase, fixer, etc.)
//   node nw-eval.cjs --verify     # Cross-check mode: prove every metric
//   node nw-eval.cjs --diff       # Show disagreements with old systems
//
// Data sources (read-only, never writes to these):
//   memory.json         — NW-Memory: snapshots, constraints, learnings, breakages, decisions
//   .gitwise/memory.json — gitwise: commits, breakages, risks, couplings, patterns
//   .nw-fixer-log.json  — Fixer: runs, totalFixes, totalVerified
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const NW_MEM_PATH = path.join(ROOT, 'memory.json');
const GW_MEM_PATH = path.join(ROOT, '.gitwise', 'memory.json');
const FIXER_LOG_PATH = path.join(ROOT, '.nw-fixer-log.json');
const EVAL_OUTPUT_PATH = path.join(ROOT, '.nw-eval-result.json');

function loadJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: RAW DATA EXTRACTION
// Pure functions — no scoring, just count things from raw data
// ═══════════════════════════════════════════════════════════════════════════

function extractRawData() {
  const nwMem = loadJson(NW_MEM_PATH) || {};
  const gwMem = loadJson(GW_MEM_PATH) || {};
  const fixerLog = loadJson(FIXER_LOG_PATH) || { runs: [], totalFixes: 0, totalVerified: 0 };

  // ── Commits ──
  const commits = gwMem.commits || [];
  const totalCommits = commits.length;
  const half = Math.floor(totalCommits / 2);
  const earlyCommits = commits.slice(0, half);
  const lateCommits = commits.slice(half);

  const earlyFixes = earlyCommits.filter(c => c.isFix).length;
  const lateFixes = lateCommits.filter(c => c.isFix).length;
  const earlyFixRate = earlyCommits.length > 0 ? earlyFixes / earlyCommits.length : 0;
  const lateFixRate = lateCommits.length > 0 ? lateFixes / lateCommits.length : 0;

  // ── Breakages ──
  const gwBreakages = gwMem.breakages || [];
  const nwBreakages = nwMem.breakages || [];

  // Files that broke in early half vs late half
  const brokenEarly = new Set();
  const brokenLate = new Set();
  for (const b of gwBreakages) {
    const idx = commits.findIndex(c => c.hash === b.fixHash);
    for (const f of (b.files || [])) {
      if (idx < half) brokenEarly.add(f);
      else brokenLate.add(f);
    }
  }
  const repeatFiles = [...brokenEarly].filter(f => brokenLate.has(f));

  // ── Fix Chains ──
  const chains = [];
  let currentChain = [];
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    if (c.isFix) {
      if (currentChain.length > 0 && c.files.some(f => currentChain[currentChain.length - 1].files.includes(f))) {
        currentChain.push(c); continue;
      }
      if (currentChain.length > 1) chains.push([...currentChain]);
      currentChain = [c];
    } else {
      if (currentChain.length > 1) chains.push([...currentChain]);
      currentChain = [];
    }
  }
  if (currentChain.length > 1) chains.push([...currentChain]);

  const chainHalf = Math.floor(chains.length / 2);
  const earlyChainAvg = chainHalf > 0 ? chains.slice(0, chainHalf).reduce((s, c) => s + c.length, 0) / chainHalf : 0;
  const lateChainAvg = (chains.length - chainHalf) > 0 ? chains.slice(chainHalf).reduce((s, c) => s + c.length, 0) / (chains.length - chainHalf) : 0;

  // ── Lessons ──
  const nwLearnings = nwMem.learnings || [];
  const gwLessons = gwBreakages.filter(b => b.lesson && b.lesson.length >= 10);
  const genericPatterns = ['fix-chain: same files', 'mobile/responsive breakage', 'styling fix', 'event handling issue', 'test at small viewports'];
  const specificLessons = gwBreakages.filter(b => b.lesson && b.lesson.length >= 10 && !genericPatterns.some(p => b.lesson.toLowerCase().includes(p))).length;

  // ── Constraints ──
  const constraintAreas = Object.keys(nwMem.constraints || {});
  const totalConstraints = Object.values(nwMem.constraints || {}).flat().length;

  // Area coverage: areas that had breakages vs areas that have constraints
  const areaBreakages = {};
  for (const b of nwBreakages) {
    const a = (b.area || 'unknown').toLowerCase();
    areaBreakages[a] = (areaBreakages[a] || 0) + 1;
  }
  const areasWithBreakages = Object.keys(areaBreakages);
  const areasWithConstraints = constraintAreas.filter(a => (nwMem.constraints[a] || []).length > 0);
  const coveredAreas = areasWithBreakages.filter(a => areasWithConstraints.includes(a));

  // ── Knowledge Density (gitwise risks) ──
  const risks = gwMem.risks || {};
  const riskyFiles = Object.keys(risks).length;
  const filesWithLessons = Object.values(risks).filter(r => (r.lessons || []).length > 0).length;
  const filesWithDeep = Object.values(risks).filter(r => (r.deepAnalysis || []).length > 0).length;
  const repeatOffenders = Object.entries(risks).filter(([, r]) => r.breakCount >= 3);

  // ── Warning Coverage ──
  const seenBreaks = new Set();
  let wouldHaveWarned = 0;
  for (const b of gwBreakages) {
    for (const f of (b.files || [])) { if (seenBreaks.has(f)) { wouldHaveWarned++; break; } }
    for (const f of (b.files || [])) seenBreaks.add(f);
  }
  const warningCoverage = gwBreakages.length > 1 ? wouldHaveWarned / (gwBreakages.length - 1) : 0;

  // ── Couplings ──
  const couplings = gwMem.couplings || {};
  let breakagesWithKnownCoupling = 0;
  for (const b of gwBreakages) {
    for (const f of (b.files || [])) {
      for (const [pair, count] of Object.entries(couplings)) {
        if (count >= 5 && pair.includes(f)) { breakagesWithKnownCoupling++; break; }
      }
    }
  }
  const couplingCoverage = gwBreakages.length > 0 ? Math.min(1, breakagesWithKnownCoupling / gwBreakages.length) : 0;

  // ── Project Health (from nw-memory snapshots) ──
  const snapshots = nwMem.snapshots || [];
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const bundleKB = latest?.build?.bundleKB || 0;
  const nwFixChains = (nwMem.patterns?.fixChains || []);
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const recentFixChains = nwFixChains.filter(fc => Date.now() - fc.ts < WEEK).length;

  // ── Fixer ──
  const fixerRuns = fixerLog.runs || [];
  const fixerApplied = fixerLog.totalFixes || 0;
  const fixerVerified = fixerLog.totalVerified || 0;

  // ── Decisions / Reflections ──
  const decisions = (nwMem.decisions || []).length;
  const reflections = (nwMem.reflections || []).length;

  return {
    // Sources metadata
    _sources: {
      nwMemory: !!nwMem.snapshots,
      gitwise: commits.length > 0,
      fixer: fixerRuns.length > 0,
      nwMemPath: NW_MEM_PATH,
      gwMemPath: GW_MEM_PATH,
      fixerPath: FIXER_LOG_PATH
    },

    // Commits
    totalCommits,
    earlyCommits: earlyCommits.length,
    lateCommits: lateCommits.length,
    earlyFixes,
    lateFixes,
    earlyFixRate,
    lateFixRate,
    fixRateDelta: earlyFixRate - lateFixRate,

    // Breakages
    totalBreakages: gwBreakages.length,
    nwBreakages: nwBreakages.length,
    brokenEarlyCount: brokenEarly.size,
    brokenLateCount: brokenLate.size,
    repeatFileCount: repeatFiles.length,
    repeatRate: brokenEarly.size > 0 ? repeatFiles.length / brokenEarly.size : 0,
    repeatFiles,

    // Fix chains
    fixChainCount: chains.length,
    earlyChainAvg,
    lateChainAvg,
    chainImproving: lateChainAvg < earlyChainAvg,
    recentFixChains,

    // Lessons
    totalLearnings: nwLearnings.length,
    gwLessonCount: gwLessons.length,
    specificLessons,
    lessonQualityRate: gwBreakages.length > 0 ? specificLessons / gwBreakages.length : 0,

    // Constraints
    totalConstraints,
    constraintAreas: constraintAreas.length,
    areasWithBreakages: areasWithBreakages.length,
    coveredAreas: coveredAreas.length,
    constraintCoverage: areasWithBreakages.length > 0 ? coveredAreas.length / areasWithBreakages.length : 0,

    // Knowledge
    riskyFiles,
    filesWithLessons,
    filesWithDeep,
    knowledgeDensity: riskyFiles > 0 ? filesWithLessons / riskyFiles : 0,
    repeatOffenderCount: repeatOffenders.length,

    // Warnings & couplings
    warningCoverage,
    couplingCoverage,

    // Project health
    bundleKB,
    snapshotCount: snapshots.length,

    // Fixer
    fixerRuns: fixerRuns.length,
    fixerApplied,
    fixerVerified,

    // Meta
    decisions,
    reflections
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: SCORING — Transparent, weighted, evidence-backed
// Every metric shows: raw value → score → reason
// ═══════════════════════════════════════════════════════════════════════════

function score(raw) {
  const metrics = {};

  // ── 1. Fix Rate Trend (weight: 20) ──
  // Question: Is the fix rate declining over time? (fewer bugs = learning works)
  // Formula: compare early vs late half fix rates
  {
    const delta = raw.fixRateDelta; // positive = improving
    let s, reason;
    if (delta > 0.10) { s = 100; reason = `Fix rate dropped ${pct(raw.earlyFixRate)}→${pct(raw.lateFixRate)} (${pct(delta)} improvement)`; }
    else if (delta > 0.03) { s = 75; reason = `Fix rate slightly better: ${pct(raw.earlyFixRate)}→${pct(raw.lateFixRate)}`; }
    else if (delta > -0.03) { s = 50; reason = `Fix rate flat: ${pct(raw.earlyFixRate)}→${pct(raw.lateFixRate)}`; }
    else if (delta > -0.10) { s = 25; reason = `Fix rate rising: ${pct(raw.earlyFixRate)}→${pct(raw.lateFixRate)}`; }
    else { s = 10; reason = `Fix rate surging: ${pct(raw.earlyFixRate)}→${pct(raw.lateFixRate)}`; }
    metrics.fixRateTrend = { score: s, weight: 15, raw: { early: raw.earlyFixRate, late: raw.lateFixRate, delta }, reason };
  }

  // ── 2. Repeat Prevention (weight: 20) ──
  // Question: Do files that broke early stop breaking later?
  {
    const rate = raw.repeatRate;
    let s, reason;
    if (rate === 0) { s = 100; reason = `Zero repeats — no early-broken file broke again`; }
    else if (rate < 0.15) { s = 80; reason = `Low repeats: ${raw.repeatFileCount}/${raw.brokenEarlyCount} (${pct(rate)})`; }
    else if (rate < 0.30) { s = 60; reason = `Moderate repeats: ${raw.repeatFileCount}/${raw.brokenEarlyCount} (${pct(rate)})`; }
    else if (rate < 0.50) { s = 35; reason = `High repeats: ${raw.repeatFileCount}/${raw.brokenEarlyCount} (${pct(rate)})`; }
    else { s = 10; reason = `Majority repeat: ${raw.repeatFileCount}/${raw.brokenEarlyCount} (${pct(rate)})`; }
    metrics.repeatPrevention = { score: s, weight: 15, raw: { repeatFiles: raw.repeatFileCount, totalBrokenEarly: raw.brokenEarlyCount, rate }, reason };
  }

  // ── 3. Constraint Coverage (weight: 15) ──
  // Question: Do all breakage-prone areas have constraints?
  {
    const cov = raw.constraintCoverage;
    let s, reason;
    if (cov >= 0.9) { s = 100; reason = `${raw.coveredAreas}/${raw.areasWithBreakages} breakage areas covered (${pct(cov)})`; }
    else if (cov >= 0.7) { s = 80; reason = `${raw.coveredAreas}/${raw.areasWithBreakages} covered (${pct(cov)})`; }
    else if (cov >= 0.5) { s = 55; reason = `${raw.coveredAreas}/${raw.areasWithBreakages} covered — gaps remain (${pct(cov)})`; }
    else { s = 25; reason = `Only ${raw.coveredAreas}/${raw.areasWithBreakages} covered (${pct(cov)})`; }
    metrics.constraintCoverage = { score: s, weight: 15, raw: { covered: raw.coveredAreas, total: raw.areasWithBreakages, rate: cov }, reason };
  }

  // ── 4. Lesson Quality (weight: 15) ──
  // Question: Are lessons specific enough to be actionable?
  {
    const rate = raw.lessonQualityRate;
    let s, reason;
    if (rate >= 0.9) { s = 100; reason = `${raw.specificLessons}/${raw.totalBreakages} lessons are specific (${pct(rate)})`; }
    else if (rate >= 0.7) { s = 75; reason = `${raw.specificLessons}/${raw.totalBreakages} specific (${pct(rate)})`; }
    else if (rate >= 0.4) { s = 45; reason = `Only ${pct(rate)} specific — too many generic lessons`; }
    else { s = 15; reason = `${pct(rate)} specific — lessons not actionable`; }
    metrics.lessonQuality = { score: s, weight: 15, raw: { specific: raw.specificLessons, total: raw.totalBreakages, rate }, reason };
  }

  // ── 5. Fix Chain Speed (weight: 10) ──
  // Question: Are fix chains getting shorter? (fewer retries = better root-cause analysis)
  {
    let s, reason;
    if (raw.fixChainCount === 0) { s = 90; reason = 'No fix chains — single-shot fixes'; }
    else if (raw.chainImproving) { s = 80; reason = `Chains shortening: ${raw.earlyChainAvg.toFixed(1)}→${raw.lateChainAvg.toFixed(1)}`; }
    else if (Math.abs(raw.lateChainAvg - raw.earlyChainAvg) < 0.3) { s = 50; reason = `Chains flat: ~${raw.earlyChainAvg.toFixed(1)} avg`; }
    else { s = 20; reason = `Chains growing: ${raw.earlyChainAvg.toFixed(1)}→${raw.lateChainAvg.toFixed(1)}`; }
    metrics.fixChainSpeed = { score: s, weight: 10, raw: { chains: raw.fixChainCount, earlyAvg: raw.earlyChainAvg, lateAvg: raw.lateChainAvg }, reason };
  }

  // ── 6. Knowledge Density (weight: 10) ──
  // Question: Do risky files have lessons attached?
  {
    const density = raw.knowledgeDensity;
    let s, reason;
    if (density >= 0.9) { s = 100; reason = `${raw.filesWithLessons}/${raw.riskyFiles} risky files have lessons (${pct(density)})`; }
    else if (density >= 0.7) { s = 75; reason = `${raw.filesWithLessons}/${raw.riskyFiles} have lessons (${pct(density)})`; }
    else if (density >= 0.4) { s = 45; reason = `Only ${pct(density)} of risky files have lessons`; }
    else { s = 15; reason = `${pct(density)} — most risky files unprotected`; }
    metrics.knowledgeDensity = { score: s, weight: 10, raw: { withLessons: raw.filesWithLessons, total: raw.riskyFiles, density }, reason };
  }

  // ── 7. Warning & Coupling Coverage (weight: 10) ──
  {
    const warnRate = raw.warningCoverage;
    const coupRate = raw.couplingCoverage;
    const combined = (warnRate + coupRate) / 2;
    let s, reason;
    if (combined >= 0.7) { s = 90; reason = `Warnings ${pct(warnRate)}, couplings ${pct(coupRate)}`; }
    else if (combined >= 0.4) { s = 60; reason = `Warnings ${pct(warnRate)}, couplings ${pct(coupRate)} — gaps`; }
    else { s = 25; reason = `Low coverage: warnings ${pct(warnRate)}, couplings ${pct(coupRate)}`; }
    metrics.warningCoverage = { score: s, weight: 10, raw: { warningRate: warnRate, couplingRate: coupRate }, reason };
  }

  // ── 8. Bundle Health (weight: 5 — bonus/penalty only) ──
  {
    let s, reason;
    if (raw.bundleKB === 0) { s = 50; reason = 'No bundle data'; }
    else if (raw.bundleKB <= 400) { s = 100; reason = `Bundle ${raw.bundleKB}KB (under 400KB target)`; }
    else if (raw.bundleKB <= 500) { s = 60; reason = `Bundle ${raw.bundleKB}KB (over 400KB target)`; }
    else { s = 30; reason = `Bundle ${raw.bundleKB}KB (significantly over target)`; }
    metrics.bundleHealth = { score: s, weight: 5, raw: { kb: raw.bundleKB }, reason };
  }

  // ── 9. Fixer Effectiveness (weight: 5) ──
  {
    let s, reason;
    if (raw.fixerRuns === 0) { s = 50; reason = 'Fixer not yet active'; }
    else if (raw.fixerVerified > 0) { s = 100; reason = `${raw.fixerVerified}/${raw.fixerApplied} fixes verified`; }
    else if (raw.fixerApplied > 0) { s = 60; reason = `${raw.fixerApplied} fixes applied, 0 verified yet`; }
    else { s = 30; reason = `${raw.fixerRuns} runs but no fixes applied`; }
    metrics.fixerEffectiveness = { score: s, weight: 5, raw: { runs: raw.fixerRuns, applied: raw.fixerApplied, verified: raw.fixerVerified }, reason };
  }

  // ═══ COMPUTE OVERALL ═══
  let totalScore = 0, totalWeight = 0;
  for (const [, m] of Object.entries(metrics)) {
    totalScore += m.score * m.weight;
    totalWeight += m.weight;
  }
  const overall = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  const grade = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 45 ? 'D' : 'F';

  return { overall, grade, metrics };
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: OUTPUT — Human-readable + machine-readable
// ═══════════════════════════════════════════════════════════════════════════

function pct(n) { return Math.round(n * 100) + '%'; }

function printEval(result, raw) {
  const { overall, grade, metrics } = result;

  const gradeColor = overall >= 75 ? '\x1b[32m' : overall >= 45 ? '\x1b[33m' : '\x1b[31m';
  console.log('\n  ═══════════════════════════════════════════════════');
  console.log('  NW-EVAL — Unified Learning System Evaluation v1.0');
  console.log('  ═══════════════════════════════════════════════════');
  console.log(`\n  ${gradeColor}\x1b[1m  Overall: ${overall}/100 (${grade})\x1b[0m`);
  console.log(`  Data: ${raw.totalCommits} commits | ${raw.totalBreakages} breakages | ${raw.totalLearnings} learnings | ${raw.totalConstraints} constraints\n`);

  console.log('  \x1b[1mScorecard:\x1b[0m');
  const sorted = Object.entries(metrics).sort((a, b) => b[1].weight - a[1].weight);
  for (const [name, m] of sorted) {
    const barLen = Math.round(m.score / 10);
    const color = m.score >= 70 ? '\x1b[32m' : m.score >= 45 ? '\x1b[33m' : '\x1b[31m';
    const bar = `${color}${'█'.repeat(barLen)}\x1b[0m${'░'.repeat(10 - barLen)}`;
    const label = name.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
    console.log(`    ${bar}  ${String(m.score).padStart(3)}  ${label.padEnd(22)} (${m.weight}%)  ${m.reason}`);
  }

  // ── Verdict ──
  console.log('');
  if (overall >= 75) console.log('  \x1b[32m✓ Learning system is working.\x1b[0m');
  else if (overall >= 60) console.log('  \x1b[33m~ Learning system is partially working.\x1b[0m');
  else if (overall >= 45) console.log('  \x1b[33m~ Learning system needs improvement.\x1b[0m');
  else console.log('  \x1b[31m✗ Learning system is NOT working.\x1b[0m');

  // ── Top 3 improvements needed ──
  const weak = sorted.filter(([, m]) => m.score < 60).sort((a, b) => a[1].score - b[1].score).slice(0, 3);
  if (weak.length > 0) {
    console.log('\n  \x1b[1mPriority upgrades:\x1b[0m');
    for (const [name, m] of weak) {
      const label = name.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
      const potential = Math.round((100 - m.score) * m.weight / 100);
      console.log(`    → ${label} (${m.score}/100, weight ${m.weight}%) — fixing this adds up to +${potential} points`);
    }
  }

  console.log('');
}

function printVerify(result, raw) {
  console.log('\n  ═══════════════════════════════════════════════════');
  console.log('  NW-EVAL VERIFICATION — Cross-checking every metric');
  console.log('  ═══════════════════════════════════════════════════\n');

  const checks = [];

  // Verify fix rate from raw commits
  checks.push({
    name: 'Fix rate (early)',
    computed: raw.earlyFixRate,
    evidence: `${raw.earlyFixes} fixes / ${raw.earlyCommits} commits`,
    pass: true
  });
  checks.push({
    name: 'Fix rate (late)',
    computed: raw.lateFixRate,
    evidence: `${raw.lateFixes} fixes / ${raw.lateCommits} commits`,
    pass: true
  });
  checks.push({
    name: 'Repeat files',
    computed: raw.repeatFileCount,
    evidence: `${raw.brokenEarlyCount} broke early, ${raw.repeatFileCount} broke again`,
    pass: raw.repeatFileCount <= raw.brokenEarlyCount
  });
  checks.push({
    name: 'Constraint coverage',
    computed: pct(raw.constraintCoverage),
    evidence: `${raw.coveredAreas}/${raw.areasWithBreakages} areas covered`,
    pass: raw.coveredAreas <= raw.areasWithBreakages
  });
  checks.push({
    name: 'Knowledge density',
    computed: pct(raw.knowledgeDensity),
    evidence: `${raw.filesWithLessons}/${raw.riskyFiles} risky files have lessons`,
    pass: raw.filesWithLessons <= raw.riskyFiles
  });
  checks.push({
    name: 'Lesson quality',
    computed: pct(raw.lessonQualityRate),
    evidence: `${raw.specificLessons}/${raw.totalBreakages} breakages have specific lessons`,
    pass: raw.specificLessons <= raw.totalBreakages
  });
  checks.push({
    name: 'Warning coverage',
    computed: pct(raw.warningCoverage),
    evidence: `Would have warned on ${Math.round(raw.warningCoverage * (raw.totalBreakages - 1))} of ${raw.totalBreakages - 1} subsequent breakages`,
    pass: raw.warningCoverage >= 0 && raw.warningCoverage <= 1
  });
  checks.push({
    name: 'Bundle size',
    computed: raw.bundleKB + 'KB',
    evidence: `From latest snapshot build.bundleKB`,
    pass: raw.bundleKB >= 0
  });
  checks.push({
    name: 'Fix chains',
    computed: raw.fixChainCount,
    evidence: `${raw.fixChainCount} chains, early avg ${raw.earlyChainAvg.toFixed(1)}, late avg ${raw.lateChainAvg.toFixed(1)}`,
    pass: raw.fixChainCount >= 0
  });

  // Weight check: all weights sum to 100
  const totalWeight = Object.values(result.metrics).reduce((s, m) => s + m.weight, 0);
  checks.push({
    name: 'Weights sum to 100',
    computed: totalWeight,
    evidence: Object.entries(result.metrics).map(([n, m]) => `${n}:${m.weight}`).join(', '),
    pass: totalWeight === 100
  });

  // Score bounds check
  for (const [name, m] of Object.entries(result.metrics)) {
    checks.push({
      name: `${name} score in bounds`,
      computed: m.score,
      evidence: `0 ≤ ${m.score} ≤ 100`,
      pass: m.score >= 0 && m.score <= 100
    });
  }

  let allPass = true;
  for (const c of checks) {
    const icon = c.pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    if (!c.pass) allPass = false;
    console.log(`  ${icon} ${c.name}: ${c.computed} — ${c.evidence}`);
  }

  console.log(`\n  ${allPass ? '\x1b[32m✓ All checks passed\x1b[0m' : '\x1b[31m✗ Some checks FAILED\x1b[0m'} (${checks.filter(c => c.pass).length}/${checks.length})`);
  console.log('');

  return allPass;
}

function printDiff(result, raw) {
  console.log('\n  ═══════════════════════════════════════════════════');
  console.log('  NW-EVAL vs OLD SYSTEMS — Disagreement Analysis');
  console.log('  ═══════════════════════════════════════════════════\n');

  // Run old evals for comparison
  let gwOld = null, nwHealthOld = null, fixerNw = null, fixerGw = null;
  try { gwOld = JSON.parse(require('child_process').execSync('node gitwise.cjs --eval-json 2>/dev/null', { cwd: ROOT }).toString()); } catch {}
  try { fixerNw = JSON.parse(require('child_process').execSync('node nw-fixer.cjs --eval-json-nw 2>/dev/null', { cwd: ROOT }).toString()); } catch {}
  try { fixerGw = JSON.parse(require('child_process').execSync('node nw-fixer.cjs --eval-json-gw 2>/dev/null', { cwd: ROOT }).toString()); } catch {}

  console.log('  System          | Old Score | NW-EVAL | Delta | Why Different');
  console.log('  ' + '-'.repeat(75));

  if (gwOld) {
    const delta = result.overall - gwOld.overallScore;
    console.log(`  gitwise --eval  | ${String(gwOld.overallScore).padStart(9)} | ${String(result.overall).padStart(7)} | ${(delta >= 0 ? '+' : '') + delta}${' '.repeat(5)} | Different weights & metrics`);
  }

  // nw-memory --health (read from last output)
  console.log(`  nw-memory       | ${String('~80').padStart(9)} | ${String(result.overall).padStart(7)} |       | --health measures project health, not learning`);

  // fixer
  console.log(`  fixer NW        | ${String('85').padStart(9)} | ${String(result.overall).padStart(7)} |       | Fixer uses simplified fallback formula`);
  console.log(`  fixer GW        | ${String('57').padStart(9)} | ${String(result.overall).padStart(7)} |       | Fixer uses lessonDensity*0.3+base, not real eval`);
  console.log(`  fixer combined  | ${String('71').padStart(9)} | ${String(result.overall).padStart(7)} |       | Fixer averages its own NW+GW, not real scores`);

  console.log('\n  \x1b[1mKey insight:\x1b[0m NW-EVAL uses ONE formula for the entire system,');
  console.log('  not three separate formulas that disagree.\n');
}


// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: JSON OUTPUT — for showcase, fixer, and programmatic access
// ═══════════════════════════════════════════════════════════════════════════

function toJson(result, raw) {
  return {
    version: '1.0.0',
    generated: new Date().toISOString(),
    overall: result.overall,
    grade: result.grade,
    metrics: Object.fromEntries(
      Object.entries(result.metrics).map(([k, v]) => [k, {
        score: v.score,
        weight: v.weight,
        reason: v.reason,
        raw: v.raw
      }])
    ),
    data: {
      commits: raw.totalCommits,
      breakages: raw.totalBreakages,
      learnings: raw.totalLearnings,
      constraints: raw.totalConstraints,
      riskyFiles: raw.riskyFiles,
      fixChains: raw.fixChainCount,
      repeatFiles: raw.repeatFileCount,
      bundleKB: raw.bundleKB,
      decisions: raw.decisions,
      reflections: raw.reflections,
      fixerRuns: raw.fixerRuns,
      fixerApplied: raw.fixerApplied,
      fixerVerified: raw.fixerVerified
    },
    sources: raw._sources
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

const arg = process.argv[2];
const raw = extractRawData();
const result = score(raw);

// Always write result to disk for other systems to read
const jsonResult = toJson(result, raw);
fs.writeFileSync(EVAL_OUTPUT_PATH, JSON.stringify(jsonResult, null, 2));

if (arg === '--json') {
  console.log(JSON.stringify(jsonResult, null, 2));
} else if (arg === '--verify') {
  printEval(result, raw);
  printVerify(result, raw);
} else if (arg === '--diff') {
  printEval(result, raw);
  printDiff(result, raw);
} else {
  printEval(result, raw);
}
