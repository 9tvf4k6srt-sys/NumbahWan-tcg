#!/usr/bin/env node
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// NW-FIXER — The Third Brain: Fix → Verify → Confirm
// ═══════════════════════════════════════════════════════════════════════════
//
// Architecture: Three separate roles working in sync
//
//   ┌─────────┐     ┌───────────┐     ┌─────────┐
//   │ LEARNER │ ──> │ EVALUATOR │ ──> │  FIXER  │
//   │         │     │           │     │         │
//   │ gitwise │     │ runEval() │     │ nw-fixer│
//   │ nw-mem  │     │ runNwEval │     │         │
//   │ --learn │     │           │     │ fix()   │
//   │ snapshot│     │ scores{}  │     │ verify()│
//   └─────────┘     └───────────┘     │ report()│
//        │               │            └────┬────┘
//        │               │                 │
//   post-commit     produces eval     reads both evals
//   post-merge      data for fixer    applies fixes
//                                     re-evals to verify
//                                     loops until stable
//
// The Fixer is SEPARATE so it can:
//   1. Read both systems' eval data without being embedded in either
//   2. Apply cross-system fixes (sync constraints ↔ risks)
//   3. Verify its own work with a re-eval loop
//   4. Be called independently or from hooks
//
// Usage:
//   node nw-fixer.cjs              Run fix cycle (fix → verify → report)
//   node nw-fixer.cjs --status     Show current state without fixing
//   node nw-fixer.cjs --force      Force fix even if scores are OK
//   node nw-fixer.cjs --dry-run    Show what would be fixed without doing it
//
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Constants ──────────────────────────────────────────────────────
const ROOT = __dirname;
const NW_MEM_PATH = path.join(ROOT, 'memory.json');
const GW_MEM_PATH = path.join(ROOT, '.gitwise', 'memory.json');
const FIXER_LOG_PATH = path.join(ROOT, '.nw-fixer-log.json');

const MAX_FIX_LOOPS = 3;       // Max fix→verify cycles before giving up
const MIN_IMPROVEMENT = 2;     // Min score improvement to count as "fixed"
const SCORE_OK_THRESHOLD = 70; // Above this = no fixing needed

// ─── Helpers ────────────────────────────────────────────────────────

function loadJson(filepath) {
  try { return JSON.parse(fs.readFileSync(filepath, 'utf8')); }
  catch { return null; }
}

function saveJson(filepath, data) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function run(cmd) {
  try { return execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 30000 }).toString().trim(); }
  catch { return ''; }
}

function log(msg) { console.log(`  [fixer] ${msg}`); }
function dim(msg) { console.error(`  \x1b[2m[fixer] ${msg}\x1b[0m`); }

function loadFixerLog() {
  return loadJson(FIXER_LOG_PATH) || { runs: [], totalFixes: 0, totalVerified: 0 };
}

function saveFixerLog(flog) {
  // Keep last 30 runs
  if (flog.runs.length > 30) flog.runs = flog.runs.slice(-30);
  saveJson(FIXER_LOG_PATH, flog);
}

// ─── Phase 1: EVALUATE — unified scoring via nw-eval.cjs ───────────────

function evaluate() {
  // Primary: use nw-eval.cjs as single source of truth
  try {
    run('node nw-eval.cjs 2>/dev/null');
    const evalResult = loadJson(path.join(ROOT, '.nw-eval-result.json'));
    if (evalResult && evalResult.overall !== undefined) {
      return {
        unified: true,
        overall: evalResult.overall,
        grade: evalResult.grade,
        metrics: evalResult.metrics,
        data: evalResult.data,
        // Legacy compatibility: expose as nw/gw for fix() function
        nw: { overallScore: evalResult.overall, scores: evalResult.metrics, source: 'nw-eval' },
        gw: { overallScore: evalResult.overall, scores: evalResult.metrics, source: 'nw-eval' }
      };
    }
  } catch { /* fallback below */ }

  // Fallback: read from individual systems (legacy)
  let nwResult = null;
  let gwResult = null;

  try {
    const nwOut = run('node nw-memory.cjs --eval-json 2>/dev/null');
    if (nwOut) nwResult = JSON.parse(nwOut);
  } catch { /* fallback: read from memory */ }

  if (!nwResult) {
    const nwMem = loadJson(NW_MEM_PATH);
    if (nwMem) {
      nwResult = computeNwEval(nwMem);
    }
  }

  try {
    const gwOut = run('node gitwise.cjs --eval-json 2>/dev/null');
    if (gwOut) gwResult = JSON.parse(gwOut);
  } catch { /* fallback: read from memory */ }

  if (!gwResult) {
    const gwMem = loadJson(GW_MEM_PATH);
    if (gwMem) {
      gwResult = computeGwEval(gwMem);
    }
  }

  return { unified: false, nw: nwResult, gw: gwResult };
}

// Lightweight eval computation (reads memory directly when CLI not available)
function computeNwEval(mem) {
  const totalConstraints = Object.values(mem.constraints || {}).flat().length;
  const totalBreakages = (mem.breakages || []).length;
  const totalLearnings = (mem.learnings || []).length;
  const totalSnapshots = (mem.snapshots || []).length;
  if (totalSnapshots < 5) return null;

  // Simplified scoring — the real eval is in nw-memory.cjs
  // This is a fallback when CLI isn't available
  const areaBreakages = {};
  for (const b of (mem.breakages || [])) {
    const a = (b.area || 'unknown').toLowerCase();
    areaBreakages[a] = (areaBreakages[a] || 0) + 1;
  }
  const areasWithBreakages = Object.keys(areaBreakages);
  const areasWithConstraints = Object.keys(mem.constraints || {}).filter(a =>
    (mem.constraints[a] || []).length > 0);
  const coveredAreas = areasWithBreakages.filter(a => areasWithConstraints.includes(a));
  const uncoveredAreas = areasWithBreakages.filter(a => !areasWithConstraints.includes(a));
  const constraintCoverage = areasWithBreakages.length > 0
    ? Math.round((coveredAreas.length / areasWithBreakages.length) * 100) : 50;

  const learningsPerBreakage = totalBreakages > 0 ? totalLearnings / totalBreakages : 0;
  const learningCapture = learningsPerBreakage >= 1 ? 100 : learningsPerBreakage > 0.5 ? 60 : 20;

  const overallScore = Math.round((constraintCoverage * 0.4 + learningCapture * 0.3 + 50 * 0.3));

  return {
    overallScore,
    scores: { constraintCoverage, learningCapture, constraintEffectiveness: 50 },
    uncoveredAreas,
    areaBreakages,
    upgrades: [],
    source: 'fixer-computed'
  };
}

function computeGwEval(mem) {
  if (!mem || (mem.commits || []).length < 10) return null;

  const filesWithRisk = Object.keys(mem.risks || {}).length;
  const filesWithLessons = Object.values(mem.risks || {}).filter(r => (r.lessons || []).length > 0).length;
  const lessonDensity = filesWithRisk > 0 ? Math.round((filesWithLessons / filesWithRisk) * 100) : 0;

  const repeatOffenders = Object.entries(mem.risks || {})
    .filter(([, r]) => r.breakCount >= 3)
    .map(([f, r]) => ({ file: f, breaks: r.breakCount, lessons: (r.lessons || []).length, hasDeepAnalysis: !!(r.deepAnalysis && r.deepAnalysis.length > 0) }));

  const overallScore = Math.round(lessonDensity * 0.3 + (repeatOffenders.length === 0 ? 80 : 30) * 0.4 + 50 * 0.3);

  return {
    overallScore,
    scores: { knowledgeDensity: lessonDensity, repeatBreakage: repeatOffenders.length === 0 ? 100 : 20 },
    repeatOffenders,
    source: 'fixer-computed'
  };
}

// ─── Phase 1.5: DIAGNOSE — Find friction points, trace root causes ───
//
// For each weak metric (<60 score), this engine:
//   1. DISCOVERS: which metric is weak and by how much
//   2. TRACES: which specific files/commits/patterns caused it
//   3. ROOT-CAUSES: why those files keep failing (not word clouds — cause chains)
//   4. PRESCRIBES: specific, actionable fix instructions
//
// Output: array of { metric, score, rootCauses[], prescriptions[] }
// The fixer reads these prescriptions to know EXACTLY what to fix.

function diagnose(evalData) {
  const evalResult = loadJson(path.join(ROOT, '.nw-eval-result.json'));
  if (!evalResult || !evalResult.metrics) return [];

  const gwMem = loadJson(GW_MEM_PATH) || {};
  const nwMem = loadJson(NW_MEM_PATH) || {};
  const commits = gwMem.commits || [];
  const breakages = gwMem.breakages || [];
  const risks = gwMem.risks || {};

  // Automation filter
  const autoPatterns = ['self-heal', 'auto-fix', 'auto-eval', 'automation', 'wire gitwise', 'wire hooks', 'learning system'];
  const isAuto = (msg) => autoPatterns.some(p => (msg || '').toLowerCase().includes(p));

  const installIdx = evalResult.honestSplit?.installIdx || Math.floor(commits.length / 2);
  const diagnoses = [];

  // ── Scan all metrics, diagnose weak ones ──
  for (const [metricName, metric] of Object.entries(evalResult.metrics)) {
    if (metric.score >= 60) continue; // healthy — skip

    const diagnosis = {
      metric: metricName,
      score: metric.score,
      weight: metric.weight,
      reason: metric.reason,
      potentialGain: Math.round((100 - metric.score) * metric.weight / 100),
      rootCauses: [],
      prescriptions: [],
      evidence: { files: [], commits: [], patterns: [] }
    };

    // ════════════════════════════════════════════════════════════════
    // REPEAT PREVENTION — Why do the same files keep breaking?
    // ════════════════════════════════════════════════════════════════
    if (metricName === 'repeatPrevention') {
      const brokenBefore = new Set(), brokenAfter = new Set();
      for (const b of breakages) {
        const idx = commits.findIndex(c => c.hash === b.fixHash);
        for (const f of (b.files || [])) {
          if (idx < installIdx) brokenBefore.add(f); else brokenAfter.add(f);
        }
      }
      const repeatFiles = [...brokenBefore].filter(f => brokenAfter.has(f));

      // Group repeat files by break count
      const byBreaks = repeatFiles.map(f => ({
        file: f,
        breakCount: (risks[f] || {}).breakCount || 0,
        lessons: (risks[f] || {}).lessons || [],
        hasConstraints: ((risks[f] || {}).constraints || []).length > 0,
        escalated: !!(risks[f] || {}).escalated,
        coupledWith: Object.entries(gwMem.couplings || {}).filter(([pair, count]) => count >= 5 && pair.includes(f)).map(([pair]) => pair.replace(f, '').replace('||', '').trim()),
      })).sort((a, b) => b.breakCount - a.breakCount);

      diagnosis.evidence.files = byBreaks;

      // Root cause analysis per file
      for (const file of byBreaks.slice(0, 5)) {
        // Find ALL breakages for this file and their lessons
        const fileBreakages = breakages.filter(b => (b.files || []).includes(file.file));
        const fixCommits = fileBreakages.map(b => commits.find(c => c.hash === b.fixHash)).filter(Boolean);
        const lessons = fileBreakages.map(b => b.lesson || '').filter(l => l.length > 10);

        // Analyze patterns: same type of fix? same coupled files? same area?
        const fixTypes = fixCommits.map(c => {
          const msg = (c.msg || '').toLowerCase();
          if (msg.includes('mobile') || msg.includes('responsive') || msg.includes('overflow')) return 'mobile/responsive';
          if (msg.includes('i18n') || msg.includes('lang')) return 'i18n';
          if (msg.includes('ios') || msg.includes('safari')) return 'ios';
          if (msg.includes('overlap') || msg.includes('ui') || msg.includes('css')) return 'ui/layout';
          if (msg.includes('null') || msg.includes('error') || msg.includes('crash')) return 'null/error';
          if (msg.includes('event') || msg.includes('click') || msg.includes('touch')) return 'events';
          return 'other';
        });
        const typeFreq = {};
        for (const t of fixTypes) typeFreq[t] = (typeFreq[t] || 0) + 1;
        const dominantType = Object.entries(typeFreq).sort((a, b) => b[1] - a[1])[0];

        const rootCause = {
          file: file.file,
          breakCount: file.breakCount,
          dominantFailureType: dominantType ? dominantType[0] : 'unknown',
          failureTypeCount: dominantType ? dominantType[1] : 0,
          coupledFiles: file.coupledWith,
          hasLessons: file.lessons.length > 0,
          hasConstraints: file.hasConstraints,
          isHardened: file.escalated,
          lastLesson: lessons.length > 0 ? lessons[lessons.length - 1].slice(0, 120) : 'none',
          causeChain: lessons.length >= 2
            ? `Broke ${file.breakCount}x, mostly ${dominantType ? dominantType[0] : '?'} issues. Has ${file.lessons.length} lessons but keeps breaking → lessons are NOT preventing recurrence. ${file.coupledWith.length > 0 ? `Coupled with ${file.coupledWith.length} other files that might need simultaneous fixes.` : ''}`
            : `Broke ${file.breakCount}x with insufficient root-cause data to determine pattern.`
        };
        diagnosis.rootCauses.push(rootCause);
      }

      // Generate prescriptions
      const worstFiles = byBreaks.filter(f => f.breakCount >= 5);
      if (worstFiles.length > 0) {
        diagnosis.prescriptions.push({
          action: 'STRENGTHEN_CONSTRAINTS',
          target: worstFiles.map(f => f.file),
          detail: `These ${worstFiles.length} files have 5+ breaks each despite having lessons. The lessons are descriptive but not preventive. Need: (1) data-testid markers for automated testing, (2) specific pre-commit constraints that block known bad patterns, (3) coupled-file co-change enforcement.`,
          expectedImpact: 'repeatPrevention +20-40 points'
        });
      }

      const unconstrained = byBreaks.filter(f => !f.hasConstraints);
      if (unconstrained.length > 0) {
        diagnosis.prescriptions.push({
          action: 'ADD_CONSTRAINTS',
          target: unconstrained.map(f => f.file),
          detail: `${unconstrained.length} repeat-breaking files have NO constraints. The guard system can't protect them. Need: per-file constraints extracted from their breakage lessons.`,
          expectedImpact: 'repeatPrevention +10-15 points'
        });
      }

      const coupled = byBreaks.filter(f => f.coupledWith.length > 0);
      if (coupled.length > 0) {
        diagnosis.prescriptions.push({
          action: 'ENFORCE_CO_CHANGES',
          target: coupled.map(f => ({ file: f.file, coupledWith: f.coupledWith })),
          detail: `${coupled.length} files have coupling partners. When one changes, the other must too. The guard warns but doesn't enforce. Need: make coupling violations a blocking error.`,
          expectedImpact: 'repeatPrevention +5-10 points'
        });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // FIX CHAIN SPEED — Why do fixes take multiple attempts?
    // ════════════════════════════════════════════════════════════════
    if (metricName === 'fixChainSpeed') {
      const chains = [];
      let cur = [];
      for (const c of commits) {
        if (c.isFix && !isAuto(c.msg)) {
          if (cur.length > 0 && (c.files || []).some(f => (cur[cur.length - 1].files || []).includes(f))) { cur.push(c); continue; }
          if (cur.length > 1) chains.push([...cur]);
          cur = [c];
        } else { if (cur.length > 1) chains.push([...cur]); cur = []; }
      }
      if (cur.length > 1) chains.push([...cur]);

      for (const chain of chains) {
        const idx0 = commits.indexOf(chain[0]);
        const phase = idx0 < installIdx ? 'before-learning' : 'after-learning';
        const files = [...new Set(chain.flatMap(c => c.files || []))];
        const msgs = chain.map(c => (c.msg || '').slice(0, 80));

        // Analyze WHY this chain happened
        let causeType = 'unknown';
        const allMsgs = msgs.join(' ').toLowerCase();
        if (allMsgs.includes('mobile') || allMsgs.includes('ios') || allMsgs.includes('overflow')) causeType = 'progressive-mobile-fix';
        else if (allMsgs.includes('ui') || allMsgs.includes('overlap') || allMsgs.includes('css')) causeType = 'ui-iteration';
        else if (allMsgs.includes('restore') || allMsgs.includes('revert')) causeType = 'fix-broke-something-else';
        else if (chain.length >= 4) causeType = 'no-root-cause-found';

        diagnosis.rootCauses.push({
          chainLength: chain.length,
          phase,
          files: files.slice(0, 5),
          commits: msgs,
          causeType,
          causeChain: causeType === 'progressive-mobile-fix'
            ? `${chain.length}-fix chain on mobile/responsive issues. Developer couldn't reproduce the bug locally and iterated via deploy-test cycles. Root cause: no mobile testing setup.`
            : causeType === 'ui-iteration'
            ? `${chain.length}-fix chain on UI/layout. Each fix revealed another issue. Root cause: no visual regression tests.`
            : causeType === 'fix-broke-something-else'
            ? `${chain.length}-fix chain where fixing one thing broke another. Root cause: tight coupling between files, no integration tests.`
            : `${chain.length}-fix chain: developer couldn't find root cause and tried multiple approaches. Root cause: insufficient debugging tools or understanding of the codebase.`
        });
        diagnosis.evidence.commits.push(...chain.map(c => c.hash));
      }

      // Prescriptions for fix chains
      const afterChains = chains.filter(ch => commits.indexOf(ch[0]) >= installIdx);
      if (afterChains.length > 0) {
        const longestAfter = afterChains.sort((a, b) => b.length - a.length)[0];
        diagnosis.prescriptions.push({
          action: 'PRE_MORTEM_FOR_CHAIN_FILES',
          target: [...new Set(longestAfter.flatMap(c => c.files || []))],
          detail: `Longest after-learning chain is ${longestAfter.length} commits. Before touching these files again, run: node nw-memory.cjs --premortem <area> to surface known risks. Add constraint: 'test at 320px before committing mobile fixes.'`,
          expectedImpact: 'fixChainSpeed +15-30 points'
        });
      }

      diagnosis.prescriptions.push({
        action: 'ROOT_CAUSE_FIRST',
        target: 'process',
        detail: 'The fix chains happen because developers jump to coding before diagnosing. Protocol: (1) reproduce the bug, (2) identify the root cause in code, (3) write the fix, (4) verify the fix doesn\'t break related files. Add constraint: no fix commit without a root-cause note in the commit message.',
        expectedImpact: 'fixChainSpeed +10-20 points'
      });
    }

    // ════════════════════════════════════════════════════════════════
    // FIX RATE TREND — Why are bugs still happening?
    // ════════════════════════════════════════════════════════════════
    if (metricName === 'fixRateTrend') {
      // Find the most bug-prone areas after learning system install
      const afterCommits = commits.slice(installIdx);
      const afterFixes = afterCommits.filter(c => c.isFix && !isAuto(c.msg));
      const fileBreakFreq = {};
      for (const c of afterFixes) {
        for (const f of (c.files || [])) {
          fileBreakFreq[f] = (fileBreakFreq[f] || 0) + 1;
        }
      }
      const topBreakers = Object.entries(fileBreakFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

      for (const [file, count] of topBreakers) {
        diagnosis.rootCauses.push({
          file,
          fixCount: count,
          causeChain: `${file} was fixed ${count}x after the learning system was installed. The existing lessons/constraints didn't prevent these fixes.`
        });
      }

      diagnosis.prescriptions.push({
        action: 'PREVENT_NEW_BUGS',
        target: topBreakers.map(([f]) => f),
        detail: `Top ${topBreakers.length} post-learning bug files. Need: (1) pre-commit guard blocks for these specific files, (2) automated regression tests covering their common failure modes, (3) review whether lessons are actionable enough.`,
        expectedImpact: 'fixRateTrend +15-30 points'
      });
    }

    // ════════════════════════════════════════════════════════════════
    // FIXER EFFECTIVENESS — Are fixes being verified?
    // ════════════════════════════════════════════════════════════════
    if (metricName === 'fixerEffectiveness') {
      diagnosis.rootCauses.push({
        causeChain: `Fixer has applied ${evalResult.data.fixerApplied} fixes but verified ${evalResult.data.fixerVerified}. The verification step exists but never reports success because the score threshold is too tight.`
      });
      diagnosis.prescriptions.push({
        action: 'VERIFY_EXISTING_FIXES',
        target: 'fixer',
        detail: 'Run nw-fixer --force to re-run the fix cycle. Then check if score improved. If yes, mark as verified.',
        expectedImpact: 'fixerEffectiveness +20-40 points'
      });
    }

    // ════════════════════════════════════════════════════════════════
    // Generic fallback for any other weak metric
    // ════════════════════════════════════════════════════════════════
    if (diagnosis.rootCauses.length === 0) {
      diagnosis.rootCauses.push({
        causeChain: `Metric ${metricName} scored ${metric.score}/100. Raw data: ${JSON.stringify(metric.raw)}. No specific diagnosis implemented yet for this metric.`
      });
      diagnosis.prescriptions.push({
        action: 'INVESTIGATE',
        target: metricName,
        detail: `Manual investigation needed. Run: node nw-eval.cjs --verify to see the raw data, then trace back to specific files/commits.`,
        expectedImpact: 'unknown'
      });
    }

    diagnoses.push(diagnosis);
  }

  return diagnoses;
}

// ─── Phase 2: FIX — prescription-driven + data-sync ────────────────
//
// v3: FIX now reads diagnose() prescriptions and EXECUTES them.
// The old 8 data-sync actions are preserved as "housekeeping".
// New: each prescription type has an executor that modifies the
// memory/constraint/risk data to directly improve the weak metric.
//
// Flow: diagnose() → prescriptions[] → executePrescriptions() → fix()
//

function executePrescriptions(diagnoses, dryRun) {
  const actions = [];
  const nwMem = loadJson(NW_MEM_PATH);
  const gwMem = loadJson(GW_MEM_PATH);
  if (!nwMem || !gwMem) return actions;

  for (const d of diagnoses) {
    for (const rx of d.prescriptions) {
      switch (rx.action) {

        // ════════════════════════════════════════════════════════════
        // STRENGTHEN_CONSTRAINTS: for files with 5+ breaks that have
        // lessons but keep breaking → lessons aren't preventive.
        // Action: extract actionable constraints from lessons,
        //   mark files with preventive constraints, add testability markers.
        // ════════════════════════════════════════════════════════════
        case 'STRENGTHEN_CONSTRAINTS': {
          const files = Array.isArray(rx.target) ? rx.target.filter(f => typeof f === 'string') : [];
          let strengthened = 0;
          for (const file of files) {
            const risk = gwMem.risks?.[file];
            if (!risk) continue;
            const lessons = risk.lessons || [];
            if (!risk.constraints) risk.constraints = [];

            // Extract actionable constraints from each lesson
            for (const lesson of lessons) {
              const lower = (lesson || '').toLowerCase();
              const constraints = [];

              // Pattern: mobile/responsive → constraint: test at 320px, 768px
              if (lower.includes('mobile') || lower.includes('responsive') || lower.includes('overflow')) {
                constraints.push(`MUST test ${file} at 320px and 768px before commit`);
              }
              // Pattern: i18n → constraint: verify all lang toggles work
              if (lower.includes('i18n') || lower.includes('lang') || lower.includes('translation')) {
                constraints.push(`MUST verify i18n toggles on ${file} before commit`);
              }
              // Pattern: iOS/safari → constraint: test on safari/iOS
              if (lower.includes('ios') || lower.includes('safari') || lower.includes('webkit')) {
                constraints.push(`MUST test ${file} on Safari/iOS before commit`);
              }
              // Pattern: overlap/z-index/layout → constraint: check z-index stacking
              if (lower.includes('overlap') || lower.includes('z-index') || lower.includes('layout')) {
                constraints.push(`MUST check z-index stacking and layout on ${file} before commit`);
              }
              // Pattern: event/click/touch → constraint: verify event handlers
              if (lower.includes('event') || lower.includes('click') || lower.includes('touch')) {
                constraints.push(`MUST verify event handlers on ${file} — no duplicate listeners`);
              }

              // Add non-duplicate constraints
              for (const c of constraints) {
                if (!risk.constraints.includes(c) && risk.constraints.length < 15) {
                  if (!dryRun) risk.constraints.push(c);
                  strengthened++;
                }
              }
            }

            // Mark as prescription-strengthened
            if (!dryRun && strengthened > 0) {
              risk.prescriptionApplied = risk.prescriptionApplied || [];
              risk.prescriptionApplied.push({
                date: new Date().toISOString().split('T')[0],
                action: 'STRENGTHEN_CONSTRAINTS',
                constraintsAdded: strengthened,
                source: 'nw-fixer: prescription executor'
              });
            }
          }
          if (strengthened > 0) {
            actions.push({ type: 'rx-strengthen', desc: `strengthened constraints on ${files.length} files (+${strengthened} preventive rules)`, system: 'gitwise', metric: d.metric });
          }
          break;
        }

        // ════════════════════════════════════════════════════════════
        // ADD_CONSTRAINTS: for repeat-breaking files with NO constraints.
        // Action: extract constraints from breakage lessons and create them.
        // ════════════════════════════════════════════════════════════
        case 'ADD_CONSTRAINTS': {
          const files = Array.isArray(rx.target) ? rx.target.filter(f => typeof f === 'string') : [];
          let added = 0;
          for (const file of files) {
            const risk = gwMem.risks?.[file];
            if (!risk || (risk.constraints && risk.constraints.length > 0)) continue;
            risk.constraints = [];

            // Pull constraints from lessons
            const lessons = risk.lessons || [];
            if (lessons.length > 0) {
              // Take the most recent 3 lessons as constraints
              const recent = lessons.slice(-3);
              for (const lesson of recent) {
                if (lesson.length > 10 && risk.constraints.length < 10) {
                  if (!dryRun) risk.constraints.push(`GUARD: ${lesson.slice(0, 150)}`);
                  added++;
                }
              }
            }

            // Also sync from NW-Memory area constraints
            const area = classifyFileToArea(file);
            const areaConstraints = nwMem.constraints?.[area] || [];
            for (const ac of areaConstraints.slice(0, 3)) {
              if (ac.fact && risk.constraints.length < 10) {
                if (!dryRun) risk.constraints.push(`AREA[${area}]: ${ac.fact.slice(0, 150)}`);
                added++;
              }
            }

            if (!dryRun) {
              risk.prescriptionApplied = risk.prescriptionApplied || [];
              risk.prescriptionApplied.push({
                date: new Date().toISOString().split('T')[0],
                action: 'ADD_CONSTRAINTS',
                constraintsAdded: added,
                source: 'nw-fixer: prescription executor'
              });
            }
          }
          if (added > 0) {
            actions.push({ type: 'rx-add-constraints', desc: `added ${added} constraints to ${files.length} unconstrained files`, system: 'gitwise', metric: d.metric });
          }
          break;
        }

        // ════════════════════════════════════════════════════════════
        // ENFORCE_CO_CHANGES: for coupled files that must change together.
        // Action: record coupling enforcement in risk data + NW-Memory.
        // ════════════════════════════════════════════════════════════
        case 'ENFORCE_CO_CHANGES': {
          const targets = Array.isArray(rx.target) ? rx.target : [];
          let enforced = 0;
          for (const t of targets) {
            const file = t.file || t;
            const coupledWith = t.coupledWith || [];
            const risk = gwMem.risks?.[file];
            if (!risk) continue;
            if (!risk.constraints) risk.constraints = [];

            for (const partner of coupledWith) {
              const rule = `CO-CHANGE ENFORCED: when ${file} changes, ${partner} MUST also change`;
              if (!risk.constraints.includes(rule) && risk.constraints.length < 15) {
                if (!dryRun) {
                  risk.constraints.push(rule);
                  // Also add to partner's constraints
                  if (gwMem.risks?.[partner]) {
                    if (!gwMem.risks[partner].constraints) gwMem.risks[partner].constraints = [];
                    const reverseRule = `CO-CHANGE ENFORCED: when ${partner} changes, ${file} MUST also change`;
                    if (!gwMem.risks[partner].constraints.includes(reverseRule) && gwMem.risks[partner].constraints.length < 15) {
                      gwMem.risks[partner].constraints.push(reverseRule);
                    }
                  }
                }
                enforced++;
              }
            }
          }
          if (enforced > 0) {
            actions.push({ type: 'rx-co-change', desc: `enforced ${enforced} co-change rules for coupled files`, system: 'gitwise', metric: d.metric });
          }
          break;
        }

        // ════════════════════════════════════════════════════════════
        // PREVENT_NEW_BUGS: for top post-learning bug files.
        // Action: create file-specific guard constraints + area constraints.
        // ════════════════════════════════════════════════════════════
        case 'PREVENT_NEW_BUGS': {
          const files = Array.isArray(rx.target) ? rx.target.filter(f => typeof f === 'string') : [];
          let prevented = 0;
          for (const file of files) {
            const risk = gwMem.risks?.[file];
            if (!risk) continue;
            if (!risk.constraints) risk.constraints = [];

            const guardRule = `GUARD: ${file} has ${risk.breakCount || '?'}x post-learning breaks — require pre-commit review`;
            if (!risk.constraints.includes(guardRule) && risk.constraints.length < 15) {
              if (!dryRun) risk.constraints.push(guardRule);
              prevented++;
            }

            // Add regression constraint based on dominant failure type
            const area = classifyFileToArea(file);
            const areaKey = area.toLowerCase();
            if (!nwMem.constraints[areaKey]) nwMem.constraints[areaKey] = [];
            const preventionRule = `[auto] ${file} is a top post-learning bug source (${risk.breakCount}x). Require: data-testid markers, regression tests, pre-commit guard check.`;
            const exists = nwMem.constraints[areaKey].some(c => c.fact && c.fact.includes(file) && c.fact.includes('post-learning'));
            if (!exists && nwMem.constraints[areaKey].length < 15) {
              if (!dryRun) {
                nwMem.constraints[areaKey].push({
                  fact: preventionRule,
                  ts: Date.now(),
                  date: new Date().toISOString().split('T')[0],
                  autoGenerated: true,
                  source: 'nw-fixer: PREVENT_NEW_BUGS prescription'
                });
              }
              prevented++;
            }
          }
          if (prevented > 0) {
            actions.push({ type: 'rx-prevent-bugs', desc: `added ${prevented} bug-prevention rules for ${files.length} top-offending files`, system: 'both', metric: d.metric });
          }
          break;
        }

        // ════════════════════════════════════════════════════════════
        // PRE_MORTEM_FOR_CHAIN_FILES: for files in the longest fix chain.
        // Action: add pre-mortem constraints + testing requirements.
        // ════════════════════════════════════════════════════════════
        case 'PRE_MORTEM_FOR_CHAIN_FILES': {
          const files = Array.isArray(rx.target) ? rx.target.filter(f => typeof f === 'string') : [];
          let premortem = 0;
          for (const file of files) {
            const risk = gwMem.risks?.[file];
            if (!risk) continue;
            if (!risk.constraints) risk.constraints = [];

            const chainRule = `PRE-MORTEM: ${file} was in a ${d.rootCauses?.[0]?.chainLength || '?'}-commit fix chain. Before editing: (1) run premortem, (2) test at 320px, (3) verify coupled files`;
            if (!risk.constraints.includes(chainRule) && risk.constraints.length < 15) {
              if (!dryRun) risk.constraints.push(chainRule);
              premortem++;
            }

            // Mark as chain-risk file
            if (!dryRun) {
              risk.chainRisk = true;
              risk.chainRiskDate = new Date().toISOString().split('T')[0];
            }
          }

          // Add process constraint to NW-Memory
          const processArea = 'process';
          if (!nwMem.constraints[processArea]) nwMem.constraints[processArea] = [];
          const processRule = `[auto] Fix-chain files (${files.slice(0,3).join(', ')}) require pre-mortem analysis before any edit. Run: nw-memory.cjs --premortem <area>`;
          const pExists = nwMem.constraints[processArea].some(c => c.fact && c.fact.includes('pre-mortem'));
          if (!pExists && nwMem.constraints[processArea].length < 15) {
            if (!dryRun) {
              nwMem.constraints[processArea].push({
                fact: processRule,
                ts: Date.now(),
                date: new Date().toISOString().split('T')[0],
                autoGenerated: true,
                source: 'nw-fixer: PRE_MORTEM_FOR_CHAIN_FILES prescription'
              });
            }
            premortem++;
          }

          if (premortem > 0) {
            actions.push({ type: 'rx-premortem', desc: `added pre-mortem constraints to ${files.length} fix-chain files`, system: 'both', metric: d.metric });
          }
          break;
        }

        // ════════════════════════════════════════════════════════════
        // ROOT_CAUSE_FIRST: process constraint — no fix commit
        // without a root-cause note.
        // ════════════════════════════════════════════════════════════
        case 'ROOT_CAUSE_FIRST': {
          const wfArea = 'workflow';
          if (!nwMem.constraints[wfArea]) nwMem.constraints[wfArea] = [];
          const rcRule = '[auto] ROOT-CAUSE FIRST: every fix commit MUST include root-cause in commit message. Protocol: (1) reproduce, (2) identify root cause, (3) fix, (4) verify coupled files.';
          const rcExists = nwMem.constraints[wfArea].some(c => c.fact && c.fact.includes('ROOT-CAUSE FIRST'));
          if (!rcExists && nwMem.constraints[wfArea].length < 15) {
            if (!dryRun) {
              nwMem.constraints[wfArea].push({
                fact: rcRule,
                ts: Date.now(),
                date: new Date().toISOString().split('T')[0],
                autoGenerated: true,
                source: 'nw-fixer: ROOT_CAUSE_FIRST prescription'
              });
            }
            actions.push({ type: 'rx-root-cause', desc: 'added ROOT-CAUSE-FIRST protocol to workflow constraints', system: 'nw-memory', metric: d.metric });
          }
          break;
        }

        // ════════════════════════════════════════════════════════════
        // VERIFY_EXISTING_FIXES: re-run fixer to confirm prior fixes
        // ════════════════════════════════════════════════════════════
        case 'VERIFY_EXISTING_FIXES': {
          // This is handled by the verify loop in run_cycle itself
          actions.push({ type: 'rx-verify', desc: 'flagged for re-verification in fix→verify loop', system: 'fixer', metric: d.metric });
          break;
        }

        default: {
          actions.push({ type: 'rx-unknown', desc: `unhandled prescription: ${rx.action}`, system: 'unknown', metric: d.metric });
          break;
        }
      }
    }
  }

  // Save changes from prescriptions
  if (!dryRun && actions.length > 0) {
    saveJson(NW_MEM_PATH, nwMem);
    saveJson(GW_MEM_PATH, gwMem);
  }

  return actions;
}

function fix(evalData, dryRun) {
  const actions = [];
  const nw = evalData.nw;
  const gw = evalData.gw;

  const nwMem = loadJson(NW_MEM_PATH);
  const gwMem = loadJson(GW_MEM_PATH);

  if (!nwMem && !gwMem) {
    log('No data found for either system — nothing to fix');
    return actions;
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 1: Cross-system constraint sync (NW-Memory → gitwise)
  // NW-Memory tracks constraints by area, gitwise by file.
  // Bridge: map area keywords to file paths.
  // ──────────────────────────────────────────────────────────────────
  if (nwMem && gwMem) {
    const constraints = nwMem.constraints || {};
    let synced = 0;
    for (const [area, areaConstraints] of Object.entries(constraints)) {
      if (!areaConstraints || areaConstraints.length === 0) continue;
      const areaLower = area.toLowerCase();
      const matchingFiles = Object.keys(gwMem.risks || {}).filter(f =>
        f.toLowerCase().includes(areaLower) ||
        f.toLowerCase().includes(areaLower.replace(/s$/, ''))
      );
      for (const f of matchingFiles) {
        if (!gwMem.risks[f].constraints) gwMem.risks[f].constraints = [];
        for (const c of areaConstraints) {
          if (!gwMem.risks[f].constraints.includes(c.fact) && gwMem.risks[f].constraints.length < 10) {
            if (!dryRun) gwMem.risks[f].constraints.push(c.fact);
            synced++;
          }
        }
      }
    }
    if (synced > 0) actions.push({ type: 'cross-sync', desc: `synced ${synced} NW-Memory constraints → gitwise`, system: 'both' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 2: Reverse sync — gitwise deep lessons → NW-Memory constraints
  // When gitwise has deep root-cause analysis, promote to NW-Memory constraint
  // ──────────────────────────────────────────────────────────────────
  if (gwMem && nwMem) {
    let promoted = 0;
    for (const [file, risk] of Object.entries(gwMem.risks || {})) {
      if (!risk.deepAnalysis || risk.deepAnalysis.length === 0) continue;
      // Determine the NW-Memory area from the file path
      const area = classifyFileToArea(file);
      if (!nwMem.constraints[area]) nwMem.constraints[area] = [];
      for (const da of risk.deepAnalysis) {
        const fact = `[auto-fixer] ${file} root-cause themes: [${da.themes.join(', ')}] — ${risk.breakCount}x broken`;
        const exists = nwMem.constraints[area].some(c => c.fact === fact);
        if (!exists && nwMem.constraints[area].length < 15) {
          if (!dryRun) {
            nwMem.constraints[area].push({
              fact, ts: Date.now(),
              date: new Date().toISOString().split('T')[0],
              autoGenerated: true,
              source: 'nw-fixer: gitwise deep analysis promoted to constraint'
            });
          }
          promoted++;
        }
      }
    }
    if (promoted > 0) actions.push({ type: 'reverse-sync', desc: `promoted ${promoted} gitwise deep analyses → NW-Memory constraints`, system: 'both' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 3: Auto-constrain uncovered areas
  // If NW-Memory eval shows uncovered areas, create constraints from lessons
  // ──────────────────────────────────────────────────────────────────
  if (nw && nw.uncoveredAreas && nw.uncoveredAreas.length > 0 && nwMem) {
    let created = 0;
    for (const area of nw.uncoveredAreas) {
      const areaBreaks = (nwMem.breakages || []).filter(b => (b.area || '').toLowerCase() === area);
      const lessons = areaBreaks.map(b => b.what || b.deepLesson || '').filter(l => l.length > 10);
      if (lessons.length > 0 && !nwMem.constraints[area]) {
        if (!dryRun) {
          nwMem.constraints[area] = [{
            fact: lessons[lessons.length - 1],
            ts: Date.now(), date: new Date().toISOString().split('T')[0],
            autoGenerated: true, source: 'nw-fixer: uncovered area auto-constrained'
          }];
        }
        created++;
        actions.push({ type: 'auto-constrain', desc: `created constraint for uncovered area [${area}]`, system: 'nw-memory' });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 4: Deep root-cause for repeat offenders (gitwise)
  // Extract recurring themes from breakage lessons using word frequency
  // ──────────────────────────────────────────────────────────────────
  if (gwMem) {
    const offenders = Object.entries(gwMem.risks || {})
      .filter(([, r]) => r.breakCount >= 2 && (!r.deepAnalysis || r.deepAnalysis.length === 0))
      .sort((a, b) => b[1].breakCount - a[1].breakCount)
      .slice(0, 15);

    let analyzed = 0;
    for (const [file, risk] of offenders) {
      const fileBreakages = (gwMem.breakages || []).filter(b => (b.files || []).includes(file));
      if (fileBreakages.length < 2) continue;

      const allLessons = fileBreakages.map(b => (b.lesson || b.pattern || '').toLowerCase());
      const wordFreq = {};
      const skip = new Set(['the', 'and', 'for', 'was', 'not', 'that', 'with', 'this', 'from', 'but', 'are', 'fix', 'add', 'bug']);
      for (const lesson of allLessons) {
        const tokens = lesson.match(/[a-z]{3,}/g) || [];
        for (const t of tokens) { if (!skip.has(t)) wordFreq[t] = (wordFreq[t] || 0) + 1; }
      }

      const recurringThemes = Object.entries(wordFreq)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);

      if (recurringThemes.length > 0) {
        if (!dryRun) {
          if (!risk.deepAnalysis) risk.deepAnalysis = [];
          risk.deepAnalysis.push({
            date: new Date().toISOString().split('T')[0],
            themes: recurringThemes,
            breakCount: risk.breakCount,
            source: 'nw-fixer: deep root-cause analysis'
          });
          // Promote to lesson
          const rootCause = `ROOT-CAUSE: themes=[${recurringThemes.join(',')}] across ${fileBreakages.length} breakages`;
          if (!risk.lessons) risk.lessons = [];
          if (!risk.lessons.includes(rootCause) && risk.lessons.length < 10) {
            risk.lessons.push(rootCause);
          }
        }
        analyzed++;
      }
    }
    if (analyzed > 0) actions.push({ type: 'deep-analysis', desc: `deep root-cause on ${analyzed} repeat offenders`, system: 'gitwise' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 5: Escalate high-risk files (gitwise)
  // Mark files with 3+ breaks as escalated for louder warnings
  // ──────────────────────────────────────────────────────────────────
  if (gwMem) {
    let escalated = 0;
    for (const [file, risk] of Object.entries(gwMem.risks || {})) {
      if (risk.breakCount >= 3 && !risk.escalated) {
        if (!dryRun) {
          risk.escalated = true;
          risk.escalatedAt = new Date().toISOString().slice(0, 10);
          risk.escalatedReason = `[nw-fixer] broke ${risk.breakCount}x — auto-escalated`;
        }
        escalated++;
      }
    }
    if (escalated > 0) actions.push({ type: 'escalate', desc: `escalated ${escalated} files (3+ breaks)`, system: 'gitwise' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 6: Backfill empty lessons (gitwise)
  // For files with risk but no lessons, pull from breakage data
  // ──────────────────────────────────────────────────────────────────
  if (gwMem) {
    let backfilled = 0;
    for (const [file, risk] of Object.entries(gwMem.risks || {})) {
      if ((!risk.lessons || risk.lessons.length === 0) && risk.breakCount >= 1) {
        const relevantBreakage = (gwMem.breakages || []).find(b =>
          (b.files || []).includes(file) && b.lesson && b.lesson.length > 15
        );
        if (relevantBreakage && !dryRun) {
          if (!risk.lessons) risk.lessons = [];
          risk.lessons.push(relevantBreakage.lesson);
          backfilled++;
        }
      }
    }
    if (backfilled > 0) actions.push({ type: 'backfill', desc: `backfilled lessons for ${backfilled} files`, system: 'gitwise' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 7: Auto-create learnings from unlearned breakages (NW-Memory)
  // ──────────────────────────────────────────────────────────────────
  if (nwMem) {
    let created = 0;
    for (const b of (nwMem.breakages || [])) {
      const area = (b.area || 'unknown').toLowerCase();
      const lesson = b.deepLesson || b.what || '';
      if (lesson.length > 15) {
        if (!nwMem.learnings) nwMem.learnings = [];
        const exists = nwMem.learnings.some(l => l.area === area && l.lesson === lesson);
        if (!exists) {
          if (!dryRun) {
            nwMem.learnings.push({
              ts: Date.now(), date: new Date().toISOString().split('T')[0],
              area, lesson, autoGenerated: true,
              source: 'nw-fixer: breakage promoted to learning'
            });
          }
          created++;
        }
      }
    }
    if (created > 0) actions.push({ type: 'auto-learn', desc: `promoted ${created} breakages → learnings`, system: 'nw-memory' });
  }

  // ──────────────────────────────────────────────────────────────────
  // FIX 8: Lower coupling threshold if accuracy is low (gitwise)
  // ──────────────────────────────────────────────────────────────────
  if (gw && gwMem && gw.scores && gw.scores.couplingAccuracy < 50) {
    const current = gwMem.stats?.couplingThreshold || 5;
    if (current > 3) {
      if (!dryRun) {
        if (!gwMem.stats) gwMem.stats = {};
        gwMem.stats.couplingThreshold = 3;
      }
      actions.push({ type: 'coupling', desc: `coupling threshold ${current} → 3`, system: 'gitwise' });
    }
  }

  // ── Save both systems after all fixes ──
  if (!dryRun) {
    if (nwMem) saveJson(NW_MEM_PATH, nwMem);
    if (gwMem) saveJson(GW_MEM_PATH, gwMem);
  }

  return actions;
}

// ─── Phase 3: VERIFY — re-evaluate to confirm fixes worked ─────────

function verify(beforeScores) {
  const afterEval = evaluate();

  const result = {
    nwBefore: beforeScores.nw?.overallScore || 0,
    nwAfter: afterEval.nw?.overallScore || 0,
    gwBefore: beforeScores.gw?.overallScore || 0,
    gwAfter: afterEval.gw?.overallScore || 0,
    improved: false,
    stable: false
  };

  const nwDelta = result.nwAfter - result.nwBefore;
  const gwDelta = result.gwAfter - result.gwBefore;
  const combinedBefore = Math.round((result.nwBefore + result.gwBefore) / 2);
  const combinedAfter = Math.round((result.nwAfter + result.gwAfter) / 2);

  result.combinedBefore = combinedBefore;
  result.combinedAfter = combinedAfter;
  result.combinedDelta = combinedAfter - combinedBefore;
  result.improved = result.combinedDelta >= MIN_IMPROVEMENT;
  result.stable = result.combinedDelta >= 0; // at least didn't get worse

  result.details = {
    nw: { before: result.nwBefore, after: result.nwAfter, delta: nwDelta },
    gw: { before: result.gwBefore, after: result.gwAfter, delta: gwDelta },
    combined: { before: combinedBefore, after: combinedAfter, delta: result.combinedDelta }
  };

  return { eval: afterEval, verification: result };
}

// ─── Classify file path to NW-Memory area ───────────────────────────

function classifyFileToArea(filePath) {
  const fp = filePath.toLowerCase();
  if (fp.includes('battle')) return 'battle';
  if (fp.includes('card') || fp.includes('cards')) return 'cards';
  if (fp.includes('market') || fp.includes('wallet') || fp.includes('merch')) return 'economy';
  if (fp.includes('i18n') || fp.includes('lang')) return 'i18n';
  if (fp.includes('nav')) return 'nav';
  if (fp.includes('guide')) return 'guide';
  if (fp.includes('ios') || fp.includes('safari')) return 'ios';
  if (fp.includes('wyckoff') || fp.includes('oracle')) return 'oracle';
  if (fp.includes('lore') || fp.includes('conspiracy')) return 'lore';
  if (fp.includes('tabletop')) return 'tabletop';
  if (fp.includes('emoji')) return 'emoji';
  return 'general';
}

// ─── Main Run: Fix → Verify → Report ────────────────────────────────

function run_cycle(opts) {
  const { force, dryRun, silent } = opts || {};

  if (!silent) {
    console.log('');
    console.log('  \x1b[1mnw-fixer\x1b[0m — fix → verify → confirm');
    console.log('  ' + '─'.repeat(55));
  }

  // Phase 1: Evaluate
  const beforeEval = evaluate();
  const combinedBefore = beforeEval.unified ? beforeEval.overall : Math.round(((beforeEval.nw?.overallScore || 0) + (beforeEval.gw?.overallScore || 0)) / 2);

  if (!silent) {
    if (beforeEval.unified) {
      log(`before: unified ${combinedBefore}/100 (${beforeEval.grade}) — via nw-eval.cjs`);
    } else {
      const nwS = beforeEval.nw?.overallScore || 0;
      const gwS = beforeEval.gw?.overallScore || 0;
      log(`before: NW-Memory ${nwS}/100 | gitwise ${gwS}/100 | combined ${combinedBefore}/100`);
    }
  }

  // Check if fixing is needed
  if (!force && combinedBefore >= SCORE_OK_THRESHOLD) {
    if (!silent) log(`scores OK (>=${SCORE_OK_THRESHOLD}) — no fixing needed`);
    return { status: 'ok', score: combinedBefore, actions: [], loops: 0 };
  }

  // Phase 1.5: DIAGNOSE — find friction points and prescriptions
  if (!silent) log('Phase 1.5: diagnosing friction points...');
  const diagnoses = diagnose(beforeEval);
  let rxActions = [];
  if (diagnoses.length > 0) {
    if (!silent) {
      log(`found ${diagnoses.length} friction points with ${diagnoses.reduce((s,d) => s + d.prescriptions.length, 0)} prescriptions`);
    }
    // Execute prescriptions FIRST — these are targeted, evidence-based fixes
    rxActions = executePrescriptions(diagnoses, dryRun);
    if (!silent && rxActions.length > 0) {
      log(`Phase 1.5: executed ${rxActions.length} prescription actions:`);
      for (const a of rxActions) {
        dim(`  Rx [${a.metric}] → ${a.desc}`);
      }
    }
  } else {
    if (!silent) log('no friction points — all metrics >= 60');
  }

  // Phase 2+3: Housekeeping Fix → Verify loop
  let totalActions = [...rxActions];
  let loops = 0;
  let lastVerification = null;

  for (let i = 0; i < MAX_FIX_LOOPS; i++) {
    loops++;
    if (!silent) log(`loop ${loops}/${MAX_FIX_LOOPS}: applying housekeeping fixes...`);

    // Fix (housekeeping: cross-sync, backfill, escalate, etc.)
    const currentEval = i === 0 ? beforeEval : evaluate();
    const actions = fix(currentEval, dryRun);
    totalActions.push(...actions);

    if (actions.length === 0 && rxActions.length === 0) {
      if (!silent) log('no more actions to take — stopping');
      break;
    }
    // Reset rxActions so it doesn't keep us looping if only prescriptions ran
    rxActions = [];

    if (!silent) {
      for (const a of actions) {
        dim(`  → [${a.system}] ${a.desc}`);
      }
    }

    if (dryRun) {
      if (!silent) log('dry-run mode — not verifying');
      break;
    }

    // Verify
    const { verification } = verify(beforeEval);
    lastVerification = verification;

    if (!silent) {
      const arrow = verification.combinedDelta > 0 ? '\x1b[32m↑\x1b[0m' : verification.combinedDelta < 0 ? '\x1b[31m↓\x1b[0m' : '→';
      log(`verify: ${verification.combinedBefore} ${arrow} ${verification.combinedAfter} (${verification.combinedDelta >= 0 ? '+' : ''}${verification.combinedDelta})`);
    }

    // If improved or no more room, stop
    if (verification.improved || verification.combinedAfter >= SCORE_OK_THRESHOLD) {
      if (!silent) log('scores improved — fix cycle complete');
      break;
    }

    // If not improved and already looped, don't waste cycles
    if (!verification.stable) {
      if (!silent) log('scores dropped — reverting would be ideal but stopping to avoid damage');
      break;
    }
  }

  // Report
  const afterEval = evaluate();
  const combinedAfter = Math.round(((afterEval.nw?.overallScore || 0) + (afterEval.gw?.overallScore || 0)) / 2);

  const result = {
    status: totalActions.length > 0 ? 'fixed' : 'no-op',
    before: combinedBefore,
    after: combinedAfter,
    delta: combinedAfter - combinedBefore,
    actions: totalActions,
    loops,
    verification: lastVerification,
    timestamp: new Date().toISOString()
  };

  // Log the run
  const flog = loadFixerLog();
  flog.runs.push({
    date: new Date().toISOString().split('T')[0],
    before: combinedBefore,
    after: combinedAfter,
    delta: result.delta,
    actions: totalActions.length,
    loops,
    actionSummary: totalActions.map(a => a.desc).slice(0, 5)
  });
  flog.totalFixes += totalActions.length;
  if (lastVerification?.improved) flog.totalVerified++;
  saveFixerLog(flog);

  if (!silent) {
    console.log('');
    const grade = combinedAfter >= 75 ? '\x1b[32mB+\x1b[0m' : combinedAfter >= 60 ? '\x1b[33mC\x1b[0m' : '\x1b[31mD\x1b[0m';
    log(`result: ${combinedBefore} → ${combinedAfter} (${result.delta >= 0 ? '+' : ''}${result.delta}) | grade: ${grade} | ${totalActions.length} actions in ${loops} loop(s)`);
    console.log('');
  }

  return result;
}

// ─── Status: show current state ─────────────────────────────────────

function status() {
  console.log('');
  console.log('  \x1b[1mnw-fixer status\x1b[0m');
  console.log('  ' + '─'.repeat(55));

  const evalData = evaluate();
  let combined, gradeStr;
  if (evalData.unified) {
    combined = evalData.overall;
    gradeStr = evalData.grade;
    log(`unified:   ${combined}/100 (${gradeStr}) — via nw-eval.cjs`);
  } else {
    const nwScore = evalData.nw?.overallScore || 0;
    const gwScore = evalData.gw?.overallScore || 0;
    combined = Math.round((nwScore + gwScore) / 2);
    gradeStr = combined >= 75 ? 'B' : combined >= 60 ? 'C' : 'D';
    log(`NW-Memory: ${nwScore}/100 (legacy)`);
    log(`gitwise:   ${gwScore}/100 (legacy)`);
    log(`combined:  ${combined}/100`);
  }
  log(`threshold: ${SCORE_OK_THRESHOLD} (auto-fix triggers below this)`);
  log(`needs fix: ${combined < SCORE_OK_THRESHOLD ? 'YES' : 'NO'}`);

  const flog = loadFixerLog();
  if (flog.runs.length > 0) {
    const last = flog.runs[flog.runs.length - 1];
    log(`last run:  ${last.date} | ${last.before}→${last.after} | ${last.actions} actions`);
    log(`total:     ${flog.totalFixes} fixes applied, ${flog.totalVerified} verified`);
  }

  // Show what would be fixed (housekeeping)
  const actions = fix(evalData, true);
  if (actions.length > 0) {
    console.log('');
    log(`pending housekeeping fixes (${actions.length}):`);
    for (const a of actions) {
      dim(`  → [${a.system}] ${a.desc}`);
    }
  }

  // Show friction diagnosis + pending prescriptions
  const diag = diagnose(evalData);
  if (diag.length > 0) {
    console.log('');
    log(`friction points (${diag.length}):`);
    for (const d of diag) {
      const label = d.metric.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
      log(`  \x1b[31m${label}\x1b[0m: ${d.score}/100 — ${d.rootCauses.length} root causes, ${d.prescriptions.length} prescriptions (+${d.potentialGain} pts potential)`);
    }

    // Show what prescriptions WOULD do
    const rxPreview = executePrescriptions(diag, true /* dryRun */);
    if (rxPreview.length > 0) {
      console.log('');
      log(`prescription preview (${rxPreview.length} actions would execute):`);
      for (const a of rxPreview) {
        dim(`  Rx [${a.metric}] → ${a.desc}`);
      }
    }

    const totalPotential = diag.reduce((s, d) => s + d.potentialGain, 0);
    log(`run \x1b[1mnw-fixer --diagnose\x1b[0m for full root-cause analysis`);
    log(`run \x1b[1mnw-fixer --force\x1b[0m to execute all prescriptions + fixes (potential: +${totalPotential} pts)`);
  }

  console.log('');
}

// ─── Diagnose: full friction analysis output ──────────────────────────

function printDiagnose() {
  const B = '\x1b[1m', R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', D = '\x1b[2m', X = '\x1b[0m';

  console.log('');
  console.log(`  ${B}nw-fixer — Friction Analysis Engine${X}`);
  console.log('  ' + '═'.repeat(55));

  const evalData = evaluate();
  const diag = diagnose(evalData);

  if (diag.length === 0) {
    log(`${G}No friction points detected — all metrics >= 60${X}`);
    console.log('');
    return;
  }

  for (const d of diag) {
    const label = d.metric.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
    console.log('');
    console.log(`  ${R}${B}▸ ${label}: ${d.score}/100 (weight ${d.weight}%)${X}`);
    console.log(`  ${D}${d.reason}${X}`);
    console.log(`  ${D}Fixing this adds up to +${d.potentialGain} points to overall score${X}`);

    // Root causes
    if (d.rootCauses.length > 0) {
      console.log('');
      console.log(`    ${B}Root Causes (${d.rootCauses.length}):${X}`);
      for (let i = 0; i < d.rootCauses.length; i++) {
        const rc = d.rootCauses[i];
        if (rc.file) {
          const icon = rc.breakCount >= 5 ? R + '✗' + X : Y + '!' + X;
          console.log(`    ${icon} ${rc.file} — broke ${rc.breakCount || '?'}x`);
          if (rc.dominantFailureType) console.log(`      ${D}Dominant failure: ${rc.dominantFailureType} (${rc.failureTypeCount}x)${X}`);
          if (rc.coupledFiles && rc.coupledFiles.length > 0) console.log(`      ${D}Coupled with: ${rc.coupledFiles.slice(0, 3).join(', ')}${X}`);
          if (rc.causeChain) console.log(`      ${Y}Why: ${rc.causeChain}${X}`);
        } else if (rc.chainLength) {
          console.log(`    ${Y}!${X} Fix chain of ${rc.chainLength} (${rc.phase}): ${rc.causeType}`);
          if (rc.files) console.log(`      ${D}Files: ${rc.files.join(', ')}${X}`);
          if (rc.causeChain) console.log(`      ${Y}Why: ${rc.causeChain}${X}`);
        } else if (rc.causeChain) {
          console.log(`    ${Y}!${X} ${rc.causeChain}`);
        }
      }
    }

    // Prescriptions
    if (d.prescriptions.length > 0) {
      console.log('');
      console.log(`    ${B}Prescriptions (${d.prescriptions.length}):${X}`);
      for (const p of d.prescriptions) {
        console.log(`    ${G}→${X} ${B}${p.action}${X}`);
        if (Array.isArray(p.target) && typeof p.target[0] === 'string') {
          console.log(`      ${D}Target: ${p.target.slice(0, 5).join(', ')}${p.target.length > 5 ? ' +' + (p.target.length - 5) + ' more' : ''}${X}`);
        }
        console.log(`      ${p.detail}`);
        console.log(`      ${G}Expected: ${p.expectedImpact}${X}`);
      }
    }
  }

  // Summary
  console.log('');
  console.log('  ' + '─'.repeat(55));
  const totalPotential = diag.reduce((s, d) => s + d.potentialGain, 0);
  const totalPrescriptions = diag.reduce((s, d) => s + d.prescriptions.length, 0);
  log(`${B}Summary: ${diag.length} friction points, ${totalPrescriptions} prescriptions, +${totalPotential} pts potential${X}`);

  // Show what the executor would do in dry-run
  const rxPreview = executePrescriptions(diag, true);
  if (rxPreview.length > 0) {
    console.log('');
    console.log(`  ${B}Prescription Executor Preview (${rxPreview.length} actions):${X}`);
    for (const a of rxPreview) {
      console.log(`    ${G}▸${X} [${a.metric}] ${a.desc}`);
    }
    console.log('');
    log(`Run ${B}nw-fixer --force${X} to execute all prescriptions + verify improvement`);
  }

  console.log('');

  return diag;
}

// ─── CLI ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const arg = args[0] || '';

if (arg === '--status' || arg === 'status') {
  status();
} else if (arg === '--diagnose' || arg === 'diagnose') {
  printDiagnose();
} else if (arg === '--diagnose-json') {
  const evalData = evaluate();
  const diag = diagnose(evalData);
  console.log(JSON.stringify(diag, null, 2));
} else if (arg === '--dry-run' || arg === 'dry-run') {
  run_cycle({ dryRun: true });
} else if (arg === '--force' || arg === 'force') {
  run_cycle({ force: true });
} else if (arg === '--silent') {
  run_cycle({ silent: true });
} else if (arg === '--json') {
  // Machine-readable output for hooks
  const result = run_cycle({ silent: true });
  console.log(JSON.stringify(result));
} else {
  run_cycle({});
}
