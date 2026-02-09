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
  },
  // ========== v3.0 Architecture Patterns ==========
  {
    id: 'monolith-file-size',
    name: 'Monolith File Size Warning',
    description: 'Single file exceeding 3000 lines - needs modularization',
    regex: 'monolith|file.*too.*large|index\\.tsx.*large',
    autoFix: 'Split into route modules under src/routes/. Use Hono sub-apps.',
    status: 'resolved'
  },
  {
    id: 'auction-bid-snipe',
    name: 'Auction Snipe Detection',
    description: 'Bid placed in last 2 minutes of auction',
    regex: 'snipe.*protect|bid.*last.*minute|timer.*extend',
    autoFix: 'Auto-extend auction by 2 minutes when bid arrives in final 2 minutes',
    status: 'resolved'
  },
  {
    id: 'perf-large-bundle',
    name: 'Large Bundle Warning',
    description: 'JS module exceeding 100KB needs optimization',
    regex: 'bundle.*large|js.*oversized|payload.*heavy',
    autoFix: 'Split module, tree-shake unused code, defer non-critical scripts',
    status: 'monitoring'
  },
  {
    id: 'missing-error-boundary',
    name: 'Missing Error Boundary',
    description: 'API endpoint without try/catch error handling',
    regex: 'unhandled.*error|uncaught.*exception|500.*internal',
    autoFix: 'Wrap all async route handlers in try/catch with structured error response',
    status: 'active'
  },
  {
    id: 'test-failure',
    name: 'Test Suite Failure',
    description: 'Automated test detected a regression',
    regex: 'test.*fail|assert.*false|regression.*detect',
    autoFix: 'Run npm test, check failure details, fix before deploy',
    status: 'active'
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
  },
  // ========== v3.0 Quality Rules ==========
  {
    id: 'missing-type-annotation',
    name: 'Missing Type Annotation',
    description: 'Function parameters without type annotations in TypeScript',
    pattern: /function\s+\w+\s*\(\s*\w+\s*[,)]/g,
    suggestion: 'Add TypeScript type annotations for all parameters',
    priority: 'low' as const
  },
  {
    id: 'unused-import',
    name: 'Potentially Unused Import',
    description: 'Imported symbol that may not be referenced',
    pattern: /import\s+\{[^}]{200,}\}/g,
    suggestion: 'Review large import blocks for unused symbols',
    priority: 'low' as const
  },
  {
    id: 'no-test-coverage',
    name: 'No Test Coverage',
    description: 'New route or feature without corresponding test',
    pattern: /app\.(get|post|put|delete)\('[^']+'/g,
    suggestion: 'Add test in tests/run-tests.js for every new endpoint',
    priority: 'high' as const
  }
];

