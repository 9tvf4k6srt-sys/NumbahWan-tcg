/**
 * Sentinel Routes — Code Health & Optimization API
 * 
 * PORTABLE PATTERN: Serves pre-generated sentinel-report.json.
 * Sentinel runs at BUILD TIME (node sentinel.cjs), not runtime.
 * This is the correct architecture for Workers/edge runtimes.
 * 
 * Endpoints:
 *   GET  /api/system/sentinel         — Full health report
 *   GET  /api/system/sentinel/quick   — Fast score check (CI/CD gate)  
 *   GET  /api/system/sentinel/plan    — Optimization plan
 *   GET  /api/system/sentinel/files   — Top files by size
 */
import { Hono } from 'hono'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}

// Pre-generated at build time by `node sentinel.cjs`
// Import as static JSON — Vite handles this at build time, zero runtime cost
import sentinelReport from '../../public/static/data/sentinel-report.json'

const router = new Hono<{ Bindings: Bindings }>()

// ─── Full Report ────────────────────────────────────────────────
router.get('/sentinel', (c) => {
  if (!sentinelReport) {
    return c.json({ 
      engine: 'nw-sentinel v1.0.0',
      error: 'Report not generated. Run: node sentinel.cjs',
      hint: 'Sentinel runs at build-time, not runtime. Add to CI/CD pipeline.'
    }, 404);
  }
  return c.json(sentinelReport);
});

// ─── Quick Health Check (for CI/CD) ─────────────────────────────
router.get('/sentinel/quick', (c) => {
  if (!sentinelReport?.summary) {
    return c.json({ error: 'Run: node sentinel.cjs first' }, 404);
  }
  const s = (sentinelReport as any).summary;
  return c.json({
    engine: 'nw-sentinel v1.0.0',
    score: s.healthScore,
    grade: s.grade,
    issues: (sentinelReport as any).issues?.length || 0,
    critical: s.critical,
    warnings: s.warnings,
    bloatPercent: s.bloatBudget?.percent,
    pass: s.healthScore >= 50,
    timestamp: (sentinelReport as any).timestamp
  });
});

// ─── Optimization Plan ──────────────────────────────────────────
router.get('/sentinel/plan', (c) => {
  if (!sentinelReport?.summary) {
    return c.json({ error: 'Run: node sentinel.cjs first' }, 404);
  }
  const r = sentinelReport as any;
  return c.json({
    engine: 'nw-sentinel v1.0.0',
    currentHealth: r.summary.healthScore,
    currentGrade: r.summary.grade,
    ...r.plan,
    recommendation: r.summary.recommendation
  });
});

// ─── Top Files by Size ──────────────────────────────────────────
router.get('/sentinel/files', (c) => {
  if (!sentinelReport) {
    return c.json({ error: 'Run: node sentinel.cjs first' }, 404);
  }
  const r = sentinelReport as any;
  return c.json({
    engine: 'nw-sentinel v1.0.0',
    topFiles: r.topFiles,
    metrics: r.metrics
  });
});

export default router;
