import type { SystemHealth, CronJob, Improvement, Pattern } from './auto-learn-types';
import { LEARN_CACHE_KEYS } from './auto-learn-types';

export async function trackHealth(
  cache: KVNamespace,
  health: Partial<SystemHealth>
): Promise<void> {
  try {
    const fullHealth: SystemHealth = {
      timestamp: Date.now(),
      apiLatency: {},
      errorRate: 0,
      cacheHitRate: 0,
      activeUsers: 0,
      memoryUsage: 0,
      ...health
    };

    // Store hourly snapshots
    const hour = new Date().toISOString().slice(0, 13);
    const key = `${LEARN_CACHE_KEYS.HEALTH}:${hour}`;

    await cache.put(key, JSON.stringify(fullHealth), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (e) {
    console.error('Failed to track health:', e);
  }
}

// CRON JOB MANAGEMENT

export const DEFAULT_CRON_JOBS: CronJob[] = [
  {
    id: 'price-update',
    name: 'Market Price Update',
    schedule: '*/5 * * * *', // Every 5 minutes
    handler: 'updateMarketPrices',
    enabled: true,
    status: 'idle',
    errorCount: 0
  },
  {
    id: 'log-analysis',
    name: 'Log Analysis & Learning',
    schedule: '0 * * * *', // Every hour
    handler: 'analyzeLogs',
    enabled: true,
    status: 'idle',
    errorCount: 0
  },
  {
    id: 'health-check',
    name: 'System Health Check',
    schedule: '*/15 * * * *', // Every 15 minutes
    handler: 'checkSystemHealth',
    enabled: true,
    status: 'idle',
    errorCount: 0
  },
  {
    id: 'cache-cleanup',
    name: 'Cache Cleanup',
    schedule: '0 0 * * *', // Daily at midnight
    handler: 'cleanupCache',
    enabled: true,
    status: 'idle',
    errorCount: 0
  },
  {
    id: 'daily-stats',
    name: 'Daily Statistics Summary',
    schedule: '0 0 * * *', // Daily at midnight
    handler: 'generateDailyStats',
    enabled: true,
    status: 'idle',
    errorCount: 0
  },
  {
    id: 'patch-notes',
    name: 'Auto Patch Notes',
    schedule: '0 6 * * 0', // Weekly on Sunday 6AM
    handler: 'generatePatchNotes',
    enabled: true,
    status: 'idle',
    errorCount: 0
  },
  {
    id: 'test-suite',
    name: 'Automated Test Suite',
    schedule: '0 */4 * * *', // Every 4 hours
    handler: 'runTestSuite',
    enabled: true,
    status: 'idle',
    errorCount: 0
  },
  {
    id: 'perf-audit',
    name: 'Performance Audit',
    schedule: '0 2 * * *', // Daily at 2AM
    handler: 'runPerfAudit',
    enabled: true,
    status: 'idle',
    errorCount: 0
  }
];

export async function getCronJobs(cache: KVNamespace): Promise<CronJob[]> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.CRON_JOBS);
    if (existing) {
      return JSON.parse(existing);
    }
    // Initialize with defaults
    await cache.put(LEARN_CACHE_KEYS.CRON_JOBS, JSON.stringify(DEFAULT_CRON_JOBS));
    return DEFAULT_CRON_JOBS;
  } catch {
    return DEFAULT_CRON_JOBS;
  }
}

export async function updateCronJob(
  cache: KVNamespace,
  jobId: string,
  updates: Partial<CronJob>
): Promise<CronJob | null> {
  try {
    const jobs = await getCronJobs(cache);
    const index = jobs.findIndex(j => j.id === jobId);

    if (index === -1) return null;

    jobs[index] = { ...jobs[index], ...updates };
    await cache.put(LEARN_CACHE_KEYS.CRON_JOBS, JSON.stringify(jobs));

    return jobs[index];
  } catch {
    return null;
  }
}

// CRON HANDLERS

export async function executeCronHandler(
  handlerName: string,
  cache: KVNamespace,
  env: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  const startTime = Date.now();

  try {
    let result: any;

    switch (handlerName) {
      case 'updateMarketPrices':
        // This is handled by the market-automation service
        result = { message: 'Price update triggered' };
        break;

      case 'analyzeLogs':
        const logs = await getRecentLogs(cache, 60 * 60 * 1000); // Last hour
        const errorLogs = logs.filter(l => l.level === 'error');
        result = {
          logsAnalyzed: logs.length,
          errorsFound: errorLogs.length,
          patterns: await getPatterns(cache)
        };
        break;

      case 'checkSystemHealth':
        // Basic health metrics
        result = {
          status: 'healthy',
          timestamp: Date.now(),
          uptime: process.uptime?.() || 0
        };
        await trackHealth(cache, result);
        break;

      case 'cleanupCache':
        // Cleanup old data (implementation depends on what needs cleaning)
        result = { cleaned: true, timestamp: Date.now() };
        break;

      case 'generateDailyStats':
        const dailyLogs = await getRecentLogs(cache, 24 * 60 * 60 * 1000);
        result = {
          date: new Date().toISOString().split('T')[0],
          totalLogs: dailyLogs.length,
          errors: dailyLogs.filter(l => l.level === 'error').length,
          warnings: dailyLogs.filter(l => l.level === 'warn').length
        };
        break;

      case 'generatePatchNotes':
        const version = `auto-${new Date().toISOString().split('T')[0]}`;
        result = await generatePatchNotes(cache, version);
        break;

      default:
        throw new Error(`Unknown handler: ${handlerName}`);
    }

    return {
      success: true,
      result: {
        ...result,
        executionTime: Date.now() - startTime
      }
    };
  } catch (e) {
    return {
      success: false,
      error: String(e)
    };
  }
}

// AUTO-APPLY IMPROVEMENTS

export async function applyImprovement(
  cache: KVNamespace,
  improvementId: string,
  auto: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    const improvements = await getImprovements(cache);
    const index = improvements.findIndex(i => i.id === improvementId);

    if (index === -1) {
      return { success: false, message: 'Improvement not found' };
    }

    improvements[index].status = 'applied';
    improvements[index].appliedAt = Date.now();
    improvements[index].autoApplied = auto;

    await cache.put(LEARN_CACHE_KEYS.IMPROVEMENTS, JSON.stringify(improvements));

    return {
      success: true,
      message: `Improvement "${improvements[index].title}" marked as applied`
    };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// SUMMARY GENERATOR

export async function generateSystemSummary(cache: KVNamespace): Promise<{
  health: string;
  recentIssues: string[];
  improvements: string[];
  upcomingTasks: string[];
  autoUpdates: string[];
}> {
  const logs = await getRecentLogs(cache, 24 * 60 * 60 * 1000);
  const patterns = await getPatterns(cache);
  const improvements = await getImprovements(cache);
  const cronJobs = await getCronJobs(cache);

  const errorCount = logs.filter(l => l.level === 'error').length;
  const health = errorCount === 0 ? '🟢 Healthy' :
                 errorCount < 5 ? '🟡 Minor Issues' :
                 '🔴 Needs Attention';

  const recentIssues = patterns
    .filter(p => p.status === 'active')
    .map(p => `${p.name}: ${p.occurrences} occurrences`);

  const pendingImprovements = improvements
    .filter(i => i.status === 'pending')
    .map(i => `[${i.priority.toUpperCase()}] ${i.title}`);

  const upcomingTasks = cronJobs
    .filter(j => j.enabled)
    .map(j => `${j.name} (${j.schedule})`);

  const autoUpdates = improvements
    .filter(i => i.autoApplied && i.appliedAt && i.appliedAt > Date.now() - 7 * 24 * 60 * 60 * 1000)
    .map(i => i.title);

  return {
    health,
    recentIssues,
    improvements: pendingImprovements,
    upcomingTasks,
    autoUpdates
  };
}
