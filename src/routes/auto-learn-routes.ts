import { Hono } from 'hono'
import {
  analyzeLog, generatePatchNotes, getImprovements, getPatterns,
  getRecentLogs, getPatchNotes, trackHealth, getCronJobs,
  updateCronJob, executeCronHandler, applyImprovement,
  generateSystemSummary, KNOWN_PATTERNS, CODE_QUALITY_RULES,
  DEFAULT_CRON_JOBS
} from '../services/auto-learn'

type Bindings = {
  GUILD_DB: D1Database
  MARKET_CACHE: KVNamespace
}


// Route helpers - reduce repetitive error handling patterns
function jsonError(c: any, msg: string, status = 400) {
  return c.json({ success: false, error: msg }, status);
}

function jsonSuccess(c: any, data: any) {
  return c.json({ success: true, ...data });
}

function parseIntParam(val: string | undefined, fallback: number): number {
  const n = parseInt(val || '');
  return isNaN(n) ? fallback : n;
}

function requireFields(body: any, fields: string[]): string | null {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') return f;
  }
  return null;
}

function safeString(val: any, maxLen = 200): string {
  return String(val || '').trim().slice(0, maxLen);
}

const router = new Hono<{ Bindings: Bindings }>()

//
// Features:
// - Log analysis and pattern detection
// - Automatic code improvement tracking
// - Patch notes auto-generation with auto_update section
// - Cron job management
// - System health monitoring

// GET /api/system/summary - Get comprehensive system summary
router.get('/summary', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({
        success: true,
        summary: {
          health: '🟡 KV Not Available',
          recentIssues: [],
          improvements: [],
          upcomingTasks: DEFAULT_CRON_JOBS.map(j => `${j.name} (${j.schedule})`),
          autoUpdates: []
        }
      });
    }

    const summary = await generateSystemSummary(cache);

    return c.json({
      success: true,
      summary,
      timestamp: Date.now()
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/log - Submit a log entry for analysis
router.post('/log', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }

    const body = await c.req.json();
    const { level, source, message, metadata } = body;

    if (!level || !source || !message) {
      return c.json({
        success: false,
        error: 'Missing required fields: level, source, message'
      }, 400);
    }

    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      source,
      message,
      metadata
    };

    const analysis = await analyzeLog(cache, entry);

    return c.json({
      success: true,
      logId: entry.id,
      analysis: {
        patternsMatched: analysis.patterns.length,
        improvementsSuggested: analysis.improvements.length,
        patterns: analysis.patterns.map(p => p.name),
        improvements: analysis.improvements.map(i => i.title)
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/logs - Get recent logs
router.get('/logs', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: true, logs: [], message: 'KV not available' });
    }

    const hours = parseInt(c.req.query('hours') || '24');
    const logs = await getRecentLogs(cache, hours * 60 * 60 * 1000);

    return c.json({
      success: true,
      count: logs.length,
      timeRange: `${hours} hours`,
      logs: logs.slice(-100), // Last 100
      stats: {
        errors: logs.filter(l => l.level === 'error').length,
        warnings: logs.filter(l => l.level === 'warn').length,
        info: logs.filter(l => l.level === 'info').length
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/patterns - Get detected patterns
router.get('/patterns', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;

    // Return known patterns even without cache
    if (!cache) {
      return c.json({
        success: true,
        patterns: KNOWN_PATTERNS.map(p => ({
          ...p,
          occurrences: 0,
          firstSeen: null,
          lastSeen: null
        }))
      });
    }

    const patterns = await getPatterns(cache);

    // Merge with known patterns
    const merged = KNOWN_PATTERNS.map(known => {
      const detected = patterns.find(p => p.id === known.id);
      return detected || {
        ...known,
        occurrences: 0,
        firstSeen: 0,
        lastSeen: 0
      };
    });

    return c.json({
      success: true,
      patterns: merged,
      active: merged.filter(p => p.status === 'active').length,
      resolved: merged.filter(p => p.status === 'resolved').length,
      monitoring: merged.filter(p => p.status === 'monitoring').length
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/improvements - Get improvement suggestions
router.get('/improvements', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: true, improvements: [] });
    }

    const status = c.req.query('status') as Improvement['status'] | undefined;
    const improvements = await getImprovements(cache, status);

    return c.json({
      success: true,
      count: improvements.length,
      improvements: improvements.sort((a, b) => {
        const priority = { critical: 0, high: 1, medium: 2, low: 3 };
        return priority[a.priority] - priority[b.priority];
      }),
      stats: {
        pending: improvements.filter(i => i.status === 'pending').length,
        applied: improvements.filter(i => i.status === 'applied').length,
        rejected: improvements.filter(i => i.status === 'rejected').length,
        autoApplied: improvements.filter(i => i.autoApplied).length
      }
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/improvements/:id/apply - Apply an improvement
router.post('/improvements/:id/apply', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }

    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const auto = body.auto === true;

    const result = await applyImprovement(cache, id, auto);

    return c.json(result);
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/patch-notes - Get patch notes
router.get('/patch-notes', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({
        success: true,
        patchNotes: [{
          version: '2.1.0',
          date: new Date().toISOString().split('T')[0],
          changes: [
            { type: 'feature', title: 'Auto-Learning System', description: 'Added self-improvement capabilities', automated: false },
            { type: 'feature', title: 'Market Automation v2', description: 'KV caching, multi-source aggregation', automated: false },
            { type: 'auto_update', title: 'iOS Touch Fix', description: 'Resolved double-fire on iOS Safari', automated: true }
          ]
        }]
      });
    }

    const notes = await getPatchNotes(cache);

    return c.json({
      success: true,
      patchNotes: notes,
      count: notes.length,
      autoUpdatesCount: notes.reduce((sum, n) =>
        sum + n.changes.filter(ch => ch.type === 'auto_update').length, 0
      )
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/patch-notes/generate - Generate new patch notes
router.post('/patch-notes/generate', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const version = body.version || `auto-${new Date().toISOString().split('T')[0]}`;

    const patchNote = await generatePatchNotes(cache, version);

    return c.json({
      success: true,
      patchNote,
      message: `Patch notes v${version} generated with ${patchNote.changes.length} changes`
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/cron - Get cron jobs
router.get('/cron', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;

    if (!cache) {
      return c.json({
        success: true,
        jobs: DEFAULT_CRON_JOBS,
        message: 'Default jobs (KV not available)'
      });
    }

    const jobs = await getCronJobs(cache);

    return c.json({
      success: true,
      jobs,
      enabled: jobs.filter(j => j.enabled).length,
      disabled: jobs.filter(j => !j.enabled).length
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/cron/:id/run - Manually run a cron job
router.post('/cron/:id/run', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }

    const jobId = c.req.param('id');
    const jobs = await getCronJobs(cache);
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    // Update job status
    await updateCronJob(cache, jobId, { status: 'running', lastRun: Date.now() });

    // Execute handler
    const result = await executeCronHandler(job.handler, cache, c.env);

    // Update job status
    await updateCronJob(cache, jobId, {
      status: result.success ? 'idle' : 'failed',
      errorCount: result.success ? 0 : (job.errorCount + 1)
    });

    return c.json({
      success: result.success,
      job: job.name,
      result: result.result,
      error: result.error
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// POST /api/system/cron/:id/toggle - Enable/disable a cron job
router.post('/cron/:id/toggle', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    if (!cache) {
      return c.json({ success: false, error: 'KV storage required' }, 400);
    }

    const jobId = c.req.param('id');
    const jobs = await getCronJobs(cache);
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    const updated = await updateCronJob(cache, jobId, { enabled: !job.enabled });

    return c.json({
      success: true,
      job: updated,
      message: `Job "${job.name}" ${updated?.enabled ? 'enabled' : 'disabled'}`
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/health - Get system health
router.get('/health', async (c) => {
  try {
    const cache = c.env?.MARKET_CACHE;
    const startTime = Date.now();

    // Test API latency
    const apiTests: Record<string, number> = {};

    // Test market prices API
    const marketStart = Date.now();
    await fetchMarketData(cache);
    apiTests['market-prices'] = Date.now() - marketStart;

    // Get recent logs for error rate
    let errorRate = 0;
    if (cache) {
      const logs = await getRecentLogs(cache, 60 * 60 * 1000);
      errorRate = logs.length > 0
        ? logs.filter(l => l.level === 'error').length / logs.length
        : 0;
    }

    const health = {
      status: errorRate < 0.05 ? 'healthy' : errorRate < 0.1 ? 'degraded' : 'unhealthy',
      timestamp: Date.now(),
      uptime: 'N/A (Workers are stateless)',
      apiLatency: apiTests,
      errorRate: Math.round(errorRate * 100) + '%',
      kvAvailable: !!cache,
      responseTime: Date.now() - startTime
    };

    // Track health if KV available
    if (cache) {
      await trackHealth(cache, {
        apiLatency: apiTests,
        errorRate
      });
    }

    return c.json({
      success: true,
      health
    });
  } catch (e) {
    return c.json({ success: false, error: String(e) }, 500);
  }
});

// GET /api/system/code-quality - Get code quality rules
router.get('/code-quality', (c) => {
  return c.json({
    success: true,
    rules: CODE_QUALITY_RULES.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      suggestion: rule.suggestion,
      priority: rule.priority
    })),
    totalRules: CODE_QUALITY_RULES.length
  });
});
export default router
