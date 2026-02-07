/**
 * Sentinel Routes — Code Health & Optimization API
 * NW-SENTINEL v2.5.0 — 10-Module Health Platform
 * 
 * PORTABLE PATTERN: Serves pre-generated sentinel-report.json.
 * Sentinel runs at BUILD TIME (node sentinel.cjs), not runtime.
 * This is the correct architecture for Workers/edge runtimes.
 * 
 * Endpoints:
 *   GET  /api/system/sentinel             — Full health report
 *   GET  /api/system/sentinel/quick       — Fast score check (CI/CD gate)
 *   GET  /api/system/sentinel/plan        — Optimization plan
 *   GET  /api/system/sentinel/files       — Top files by size
 *   GET  /api/system/sentinel/i18n        — i18n coverage audit
 *   GET  /api/system/sentinel/modules     — All module scores & breakdown
 *   GET  /api/system/sentinel/module/:name — Single module deep dive
 *   GET  /api/system/sentinel/trend       — Score trend history
 *   GET  /api/system/sentinel/auto-fix    — Auto-fix suggestions & commands
 *   GET  /api/system/sentinel/security    — Security audit details
 *   GET  /api/system/sentinel/a11y        — Accessibility audit
 *   GET  /api/system/sentinel/seo         — SEO & meta audit
 *   GET  /api/system/sentinel/api-surface — API surface inventory
 *   GET  /api/system/sentinel/deps        — Dependency audit
 */
import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

// Pre-generated at build time by `node sentinel.cjs`
import sentinelReport from '../../public/static/data/sentinel-report.json'
import sentinelHistory from '../../public/static/data/sentinel-history.json'

const router = new Hono<{ Bindings: Bindings }>()
const r = sentinelReport as any;
const ENGINE = 'nw-sentinel v2.5.0';

// ─── Full Report ────────────────────────────────────────────────
router.get('/sentinel', (c) => {
  if (!sentinelReport) {
    return c.json({ engine: ENGINE, error: 'Report not generated. Run: node sentinel.cjs', hint: 'Sentinel runs at build-time, not runtime. Add to CI/CD pipeline.' }, 404);
  }
  return c.json(sentinelReport);
});

// ─── Quick Health Check (for CI/CD) ─────────────────────────────
router.get('/sentinel/quick', (c) => {
  if (!r?.summary) return c.json({ error: 'Run: node sentinel.cjs first' }, 404);
  const s = r.summary;
  return c.json({
    engine: ENGINE,
    score: s.healthScore,
    grade: s.grade,
    modules: s.moduleCount || Object.keys(s.moduleScores || {}).length,
    issues: r.issues?.length || 0,
    critical: s.critical,
    warnings: s.warnings,
    suggestions: s.suggestions,
    pass: s.healthScore >= 50,
    trend: r.trend?.direction || 'unknown',
    trendDelta: r.trend?.delta || 0,
    timestamp: r.timestamp
  });
});

// ─── All Module Scores & Breakdown ──────────────────────────────
router.get('/sentinel/modules', (c) => {
  if (!r?.summary) return c.json({ error: 'Run: node sentinel.cjs first' }, 404);
  return c.json({
    engine: ENGINE,
    composite: r.summary.healthScore,
    grade: r.summary.grade,
    scoring: r.summary.scoring,
    modules: Object.entries(r.modules || {}).map(([name, mod]: [string, any]) => ({
      name,
      score: mod.score,
      grade: mod.grade,
      weight: r.config?.weights?.[name],
      weightedContribution: Math.round(mod.score * (r.config?.weights?.[name] || 0)),
      issues: mod.issues?.length || 0,
      dataKeys: Object.keys(mod.data || {})
    }))
  });
});

// ─── Single Module Deep Dive ────────────────────────────────────
router.get('/sentinel/module/:name', (c) => {
  const name = c.req.param('name');
  if (!r?.modules?.[name]) {
    const available = Object.keys(r?.modules || {});
    return c.json({ error: `Module '${name}' not found. Available: ${available.join(', ')}` }, 404);
  }
  const mod = r.modules[name];
  return c.json({
    engine: ENGINE,
    module: name,
    score: mod.score,
    grade: mod.grade,
    weight: r.config?.weights?.[name],
    issues: mod.issues,
    data: mod.data,
    trendDelta: r.trend?.moduleChanges?.[name] || null
  });
});

// ─── Optimization Plan ──────────────────────────────────────────
router.get('/sentinel/plan', (c) => {
  if (!r?.summary) return c.json({ error: 'Run: node sentinel.cjs first' }, 404);
  return c.json({
    engine: ENGINE,
    currentHealth: r.summary.healthScore,
    currentGrade: r.summary.grade,
    ...r.plan,
    autoFixes: r.autoFixes ? { total: r.autoFixes.totalFixes, automated: r.autoFixes.automatedFixes, manual: r.autoFixes.manualFixes } : null,
    recommendation: r.summary.recommendation
  });
});

// ─── Top Files by Size ──────────────────────────────────────────
router.get('/sentinel/files', (c) => {
  if (!sentinelReport) return c.json({ error: 'Run: node sentinel.cjs first' }, 404);
  return c.json({ engine: ENGINE, topFiles: r.topFiles, metrics: r.metrics });
});

// ─── i18n Coverage Audit ─────────────────────────────────────
router.get('/sentinel/i18n', (c) => {
  if (!r?.i18n) return c.json({ error: 'i18n data not available. Re-run sentinel.' }, 404);
  return c.json({ engine: ENGINE, ...r.i18n });
});

// ─── Trend History ──────────────────────────────────────────────
router.get('/sentinel/trend', (c) => {
  if (!r?.trend) return c.json({ engine: ENGINE, message: 'No trend data yet. Run sentinel at least twice.', trend: null }, 200);
  
  // Load full history from build-time JSON
  const history = sentinelHistory as any || { entries: [], trend: r.trend };
  
  return c.json({
    engine: ENGINE,
    current: { score: r.summary.healthScore, grade: r.summary.grade },
    trend: r.trend,
    history: history.entries?.slice(-20) || [],
    insights: {
      direction: r.trend.direction,
      delta: r.trend.delta,
      streak: `${r.trend.streakLength}-build ${r.trend.streakDirection} streak`,
      allTimeBest: r.trend.allTimeBest,
      allTimeWorst: r.trend.allTimeWorst,
      totalBuilds: r.trend.totalBuilds,
      moduleChanges: r.trend.moduleChanges
    }
  });
});

// ─── Auto-Fix Engine ────────────────────────────────────────────
router.get('/sentinel/auto-fix', (c) => {
  if (!r?.autoFixes) return c.json({ engine: ENGINE, message: 'No auto-fix data. Re-run sentinel.' }, 200);
  return c.json({
    engine: ENGINE,
    summary: {
      totalFixes: r.autoFixes.totalFixes,
      automated: r.autoFixes.automatedFixes,
      manual: r.autoFixes.manualFixes
    },
    fixes: r.autoFixes.fixes
  });
});

// ─── Security Audit ─────────────────────────────────────────────
router.get('/sentinel/security', (c) => {
  const mod = r?.modules?.security;
  if (!mod) return c.json({ error: 'Security module data not available' }, 404);
  return c.json({
    engine: ENGINE,
    score: mod.score,
    grade: mod.grade,
    ...mod.data,
    issues: mod.issues
  });
});

// ─── Accessibility Audit ────────────────────────────────────────
router.get('/sentinel/a11y', (c) => {
  const mod = r?.modules?.accessibility;
  if (!mod) return c.json({ error: 'Accessibility module data not available' }, 404);
  return c.json({
    engine: ENGINE,
    score: mod.score,
    grade: mod.grade,
    ...mod.data,
    issues: mod.issues
  });
});

// ─── SEO & Meta Audit ──────────────────────────────────────────
router.get('/sentinel/seo', (c) => {
  const mod = r?.modules?.seoMeta;
  if (!mod) return c.json({ error: 'SEO module data not available' }, 404);
  return c.json({
    engine: ENGINE,
    score: mod.score,
    grade: mod.grade,
    ...mod.data,
    issues: mod.issues
  });
});

// ─── API Surface Inventory ──────────────────────────────────────
router.get('/sentinel/api-surface', (c) => {
  const mod = r?.modules?.apiSurface;
  if (!mod) return c.json({ error: 'API Surface module data not available' }, 404);
  return c.json({
    engine: ENGINE,
    score: mod.score,
    grade: mod.grade,
    ...mod.data,
    issues: mod.issues
  });
});

// ─── Dependency Audit ───────────────────────────────────────────
router.get('/sentinel/deps', (c) => {
  const mod = r?.modules?.dependencies;
  if (!mod) return c.json({ error: 'Dependencies module data not available' }, 404);
  return c.json({
    engine: ENGINE,
    score: mod.score,
    grade: mod.grade,
    ...mod.data,
    issues: mod.issues
  });
});

export default router;
