/**
 * NW-SENTINEL — Type definitions & lightweight runtime interface
 * ══════════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE:
 *   sentinel.cjs   → Build-time CLI tool (Node.js, uses fs/crypto)
 *   sentinel.ts    → Runtime types + API helpers (Workers-safe)
 *   sentinel route → Serves pre-generated report via API
 *
 * WHY: Workers/Edge runtimes don't have fs access.
 * Sentinel analysis runs at build time, results served at runtime.
 * This is the correct pattern for any edge deployment.
 */

// ════════════════════════════════════════════════════════════════════
// TYPES — Portable, framework-agnostic
// ════════════════════════════════════════════════════════════════════

export interface SentinelReport {
  engine: string
  version: string
  timestamp: number
  project: string
  summary: SentinelSummary
  metrics: SentinelMetrics
  issues: SentinelIssue[]
  plan: SentinelPlan
  topFiles: SentinelFile[]
  config: { thresholds: SentinelThresholds; ignore: string[] }
}

export interface SentinelSummary {
  healthScore: number
  grade: string
  critical: number
  warnings: number
  suggestions: number
  trend: string
  recommendation: string
  bloatBudget: { used: number; limit: number; percent: number; status: string }
}

export interface SentinelMetrics {
  source: { files: number; lines: number }
  staticCode: { files: number; lines: number }
  pages: { files: number; lines: number }
  data: { files: number }
  tests: { files: number }
  totalFiles: number
  averageSourceFileSize: number
  largestFile: { path: string; lines: number }
  routeHandlers: number
  dependencies: number
  duplicateGroups: number
}

export interface SentinelIssue {
  id: string
  severity: 'critical' | 'warning' | 'info'
  category: 'bloat' | 'complexity' | 'duplication' | 'architecture' | 'stale'
  title: string
  file?: string
  metric?: number
  threshold?: number
  fix?: { type: string; action: string; effort: string; linesRecoverable: number; command?: string }
}

export interface SentinelFile {
  path: string
  lines: number
  complexity: number
  functions: number
  routeHandlers: number
  category: string
  stale: boolean
}

export interface SentinelPlan {
  steps: Array<{
    priority: number
    action: string
    impact: string
    effort: string
    linesRecoverable: number
    command?: string
  }>
  totalRecoverable: number
  topPriority: string
}

export interface SentinelThresholds {
  maxFileLines: number
  maxFunctionLines: number
  maxRouteHandlers: number
  maxDuplicateRatio: number
  maxTotalLines: number
  maxComplexity: number
  maxDependencies: number
  staleFileDays: number
}
