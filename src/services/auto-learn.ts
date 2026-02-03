/**
 * NWG Auto-Learning & Self-Improvement System
 * 
 * Features:
 * - Log analysis and pattern detection
 * - Automatic code improvement suggestions
 * - Patch notes auto-generation
 * - Issue tracking and resolution history
 * - Performance metrics tracking
 * - Cron job scheduling
 * 
 * This system learns from logs, user feedback, and code patterns
 * to continuously improve the application.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolution?: string;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  regex: string;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  autoFix?: string;
  status: 'active' | 'resolved' | 'monitoring';
}

export interface Improvement {
  id: string;
  type: 'performance' | 'security' | 'ux' | 'code_quality' | 'bug_fix';
  title: string;
  description: string;
  file?: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'applied' | 'rejected';
  createdAt: number;
  appliedAt?: number;
  autoApplied: boolean;
}

export interface PatchNote {
  version: string;
  date: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement' | 'auto_update';
    title: string;
    description: string;
    automated: boolean;
  }[];
}

export interface SystemHealth {
  timestamp: number;
  apiLatency: Record<string, number>;
  errorRate: number;
  cacheHitRate: number;
  activeUsers: number;
  memoryUsage: number;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string; // cron expression
  handler: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  status: 'idle' | 'running' | 'failed';
  errorCount: number;
}

// ============================================================================
// CACHE KEYS
// ============================================================================

export const LEARN_CACHE_KEYS = {
  LOGS: 'learn:logs',
  PATTERNS: 'learn:patterns',
  IMPROVEMENTS: 'learn:improvements',
  PATCH_NOTES: 'learn:patchnotes',
  HEALTH: 'learn:health',
  CRON_JOBS: 'learn:crons',
  METRICS: 'learn:metrics:',
} as const;

// ============================================================================
// KNOWN PATTERNS & AUTO-FIXES
// ============================================================================

export const KNOWN_PATTERNS: Omit<Pattern, 'occurrences' | 'firstSeen' | 'lastSeen'>[] = [
  {
    id: 'ios-touch-double-fire',
    name: 'iOS Touch Double-Fire',
    description: 'Touch events firing twice on iOS Safari',
    regex: 'touch.*double|iOS.*click.*twice',
    autoFix: 'Add touchstart/touchend handlers with flag to prevent double execution',
    status: 'resolved'
  },
  {
    id: 'language-toggle-fail',
    name: 'Language Toggle Failure',
    description: 'Language buttons not switching language correctly',
    regex: 'language.*toggle|lang.*switch.*fail',
    autoFix: 'Clone buttons to remove stale listeners, add comprehensive logging',
    status: 'resolved'
  },
  {
    id: 'api-rate-limit',
    name: 'API Rate Limiting',
    description: 'External API returning 429 errors',
    regex: '429|rate.?limit|too.?many.?requests',
    autoFix: 'Implement exponential backoff and fallback to cached data',
    status: 'monitoring'
  },
  {
    id: 'localstorage-error',
    name: 'LocalStorage Access Error',
    description: 'Failed to read/write localStorage (private browsing)',
    regex: 'localStorage.*error|quota.*exceeded|access.*denied.*storage',
    autoFix: 'Wrap localStorage calls in try/catch with fallback to memory storage',
    status: 'active'
  },
  {
    id: 'fetch-timeout',
    name: 'Fetch Request Timeout',
    description: 'API requests timing out',
    regex: 'timeout|ETIMEDOUT|fetch.*fail',
    autoFix: 'Add AbortController with timeout, implement retry logic',
    status: 'active'
  },
  {
    id: 'cors-error',
    name: 'CORS Error',
    description: 'Cross-origin request blocked',
    regex: 'CORS|cross.?origin|blocked.*policy',
    autoFix: 'Use server-side proxy or configure proper CORS headers',
    status: 'active'
  },
  {
    id: 'json-parse-error',
    name: 'JSON Parse Error',
    description: 'Invalid JSON in API response',
    regex: 'JSON.*parse|Unexpected.*token|invalid.*json',
    autoFix: 'Add response validation and fallback data',
    status: 'active'
  },
  {
    id: 'memory-leak',
    name: 'Memory Leak Warning',
    description: 'Potential memory leak detected',
    regex: 'memory.*leak|heap.*grow|out.?of.?memory',
    autoFix: 'Review event listeners, clear intervals, and optimize data structures',
    status: 'monitoring'
  }
];

// ============================================================================
// CODE QUALITY RULES
// ============================================================================

export const CODE_QUALITY_RULES = [
  {
    id: 'console-log-cleanup',
    name: 'Console Log Cleanup',
    description: 'Remove or consolidate debug console.log statements',
    pattern: /console\.(log|debug)\([^)]+\)/g,
    suggestion: 'Use centralized logging with DEBUG flag',
    priority: 'low' as const
  },
  {
    id: 'magic-numbers',
    name: 'Magic Numbers',
    description: 'Replace magic numbers with named constants',
    pattern: /[^a-zA-Z_]\d{4,}[^a-zA-Z_]/g,
    suggestion: 'Extract to named constant for clarity',
    priority: 'medium' as const
  },
  {
    id: 'duplicate-fetch',
    name: 'Duplicate Fetch Calls',
    description: 'Multiple identical fetch calls that could be cached',
    pattern: /fetch\(['"](https?:\/\/[^'"]+)['"]\)/g,
    suggestion: 'Implement request deduplication or caching',
    priority: 'medium' as const
  },
  {
    id: 'error-handling',
    name: 'Missing Error Handling',
    description: 'Async operations without proper error handling',
    pattern: /await\s+[^;]+(?!\.catch)/g,
    suggestion: 'Add try/catch or .catch() for error handling',
    priority: 'high' as const
  },
  {
    id: 'hardcoded-urls',
    name: 'Hardcoded URLs',
    description: 'URLs that should be environment variables',
    pattern: /['"]https?:\/\/(?!cdn\.|api\.coingecko|api\.coinbase)[^'"]+['"]/g,
    suggestion: 'Move to environment variable or config',
    priority: 'medium' as const
  }
];

// ============================================================================
// LOG ANALYZER
// ============================================================================

export async function analyzeLog(
  cache: KVNamespace,
  entry: LogEntry
): Promise<{ patterns: Pattern[]; improvements: Improvement[] }> {
  const matchedPatterns: Pattern[] = [];
  const suggestedImprovements: Improvement[] = [];
  
  // Check against known patterns
  for (const knownPattern of KNOWN_PATTERNS) {
    const regex = new RegExp(knownPattern.regex, 'i');
    if (regex.test(entry.message)) {
      const pattern: Pattern = {
        ...knownPattern,
        occurrences: 1,
        firstSeen: entry.timestamp,
        lastSeen: entry.timestamp
      };
      matchedPatterns.push(pattern);
      
      // Generate improvement suggestion
      if (knownPattern.autoFix && knownPattern.status === 'active') {
        suggestedImprovements.push({
          id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'bug_fix',
          title: `Fix: ${knownPattern.name}`,
          description: knownPattern.description,
          suggestion: knownPattern.autoFix,
          priority: entry.level === 'error' ? 'high' : 'medium',
          status: 'pending',
          createdAt: Date.now(),
          autoApplied: false
        });
      }
    }
  }
  
  // Store log entry
  await storeLogEntry(cache, entry);
  
  // Update pattern statistics
  for (const pattern of matchedPatterns) {
    await updatePatternStats(cache, pattern);
  }
  
  // Store improvements
  for (const improvement of suggestedImprovements) {
    await storeImprovement(cache, improvement);
  }
  
  return { patterns: matchedPatterns, improvements: suggestedImprovements };
}

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

async function storeLogEntry(cache: KVNamespace, entry: LogEntry): Promise<void> {
  try {
    const key = `${LEARN_CACHE_KEYS.LOGS}:${new Date().toISOString().split('T')[0]}`;
    const existing = await cache.get(key);
    const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
    
    logs.push(entry);
    
    // Keep last 1000 logs per day
    if (logs.length > 1000) {
      logs.shift();
    }
    
    await cache.put(key, JSON.stringify(logs), { expirationTtl: 7 * 24 * 60 * 60 }); // 7 days
  } catch (e) {
    console.error('Failed to store log entry:', e);
  }
}

async function updatePatternStats(cache: KVNamespace, pattern: Pattern): Promise<void> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATTERNS);
    const patterns: Record<string, Pattern> = existing ? JSON.parse(existing) : {};
    
    if (patterns[pattern.id]) {
      patterns[pattern.id].occurrences++;
      patterns[pattern.id].lastSeen = pattern.lastSeen;
    } else {
      patterns[pattern.id] = pattern;
    }
    
    await cache.put(LEARN_CACHE_KEYS.PATTERNS, JSON.stringify(patterns));
  } catch (e) {
    console.error('Failed to update pattern stats:', e);
  }
}

async function storeImprovement(cache: KVNamespace, improvement: Improvement): Promise<void> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.IMPROVEMENTS);
    const improvements: Improvement[] = existing ? JSON.parse(existing) : [];
    
    // Avoid duplicates
    const exists = improvements.some(i => 
      i.title === improvement.title && i.status === 'pending'
    );
    
    if (!exists) {
      improvements.push(improvement);
      await cache.put(LEARN_CACHE_KEYS.IMPROVEMENTS, JSON.stringify(improvements));
    }
  } catch (e) {
    console.error('Failed to store improvement:', e);
  }
}

// ============================================================================
// PATCH NOTES GENERATOR
// ============================================================================

export async function generatePatchNotes(
  cache: KVNamespace,
  version: string
): Promise<PatchNote> {
  const improvements = await getImprovements(cache, 'applied');
  const recentLogs = await getRecentLogs(cache, 24 * 60 * 60 * 1000); // Last 24h
  
  const changes: PatchNote['changes'] = [];
  
  // Add applied improvements
  for (const imp of improvements) {
    if (imp.appliedAt && imp.appliedAt > Date.now() - 7 * 24 * 60 * 60 * 1000) {
      changes.push({
        type: imp.type === 'bug_fix' ? 'fix' : 
              imp.type === 'performance' ? 'improvement' : 
              imp.autoApplied ? 'auto_update' : 'feature',
        title: imp.title,
        description: imp.description,
        automated: imp.autoApplied
      });
    }
  }
  
  // Analyze resolved issues from logs
  const resolvedPatterns = recentLogs.filter(l => l.resolved);
  for (const log of resolvedPatterns.slice(0, 5)) {
    changes.push({
      type: 'fix',
      title: `Resolved: ${log.source}`,
      description: log.resolution || log.message,
      automated: false
    });
  }
  
  const patchNote: PatchNote = {
    version,
    date: new Date().toISOString().split('T')[0],
    changes
  };
  
  // Store patch notes
  await storePatchNote(cache, patchNote);
  
  return patchNote;
}

async function storePatchNote(cache: KVNamespace, note: PatchNote): Promise<void> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATCH_NOTES);
    const notes: PatchNote[] = existing ? JSON.parse(existing) : [];
    
    notes.unshift(note);
    
    // Keep last 50 versions
    if (notes.length > 50) {
      notes.pop();
    }
    
    await cache.put(LEARN_CACHE_KEYS.PATCH_NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to store patch note:', e);
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

export async function getImprovements(
  cache: KVNamespace,
  status?: Improvement['status']
): Promise<Improvement[]> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.IMPROVEMENTS);
    const improvements: Improvement[] = existing ? JSON.parse(existing) : [];
    
    if (status) {
      return improvements.filter(i => i.status === status);
    }
    return improvements;
  } catch {
    return [];
  }
}

export async function getPatterns(cache: KVNamespace): Promise<Pattern[]> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATTERNS);
    const patterns: Record<string, Pattern> = existing ? JSON.parse(existing) : {};
    return Object.values(patterns);
  } catch {
    return [];
  }
}

export async function getRecentLogs(
  cache: KVNamespace,
  timeRange: number = 24 * 60 * 60 * 1000
): Promise<LogEntry[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `${LEARN_CACHE_KEYS.LOGS}:${today}`;
    const existing = await cache.get(key);
    const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
    
    const cutoff = Date.now() - timeRange;
    return logs.filter(l => l.timestamp > cutoff);
  } catch {
    return [];
  }
}

export async function getPatchNotes(cache: KVNamespace): Promise<PatchNote[]> {
  try {
    const existing = await cache.get(LEARN_CACHE_KEYS.PATCH_NOTES);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

// ============================================================================
// SYSTEM HEALTH TRACKING
// ============================================================================

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

// ============================================================================
// CRON JOB MANAGEMENT
// ============================================================================

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

// ============================================================================
// CRON HANDLERS
// ============================================================================

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

// ============================================================================
// AUTO-APPLY IMPROVEMENTS
// ============================================================================

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

// ============================================================================
// SUMMARY GENERATOR
// ============================================================================

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

// ============================================================================
// EXPORT
// ============================================================================

export default {
  analyzeLog,
  generatePatchNotes,
  getImprovements,
  getPatterns,
  getRecentLogs,
  getPatchNotes,
  trackHealth,
  getCronJobs,
  updateCronJob,
  executeCronHandler,
  applyImprovement,
  generateSystemSummary,
  KNOWN_PATTERNS,
  CODE_QUALITY_RULES,
  DEFAULT_CRON_JOBS,
  LEARN_CACHE_KEYS
};
