/**
 * ══════════════════════════════════════════════════════════════════
 *   Structured Logger — JSON-formatted logs with correlation IDs
 *   Designed for Cloudflare Workers observability.
 * ══════════════════════════════════════════════════════════════════
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  correlationId?: string
  route?: string
  method?: string
  statusCode?: number
  durationMs?: number
  error?: string
  meta?: Record<string, unknown>
}

function generateCorrelationId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function emit(entry: LogEntry): void {
  const output = JSON.stringify(entry)
  switch (entry.level) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    case 'debug':
      console.debug(output)
      break
    default:
      console.log(output)
  }
}

export const logger = {
  correlationId: generateCorrelationId,

  info(message: string, meta?: Record<string, unknown>): void {
    emit({ timestamp: new Date().toISOString(), level: 'info', message, meta })
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    emit({ timestamp: new Date().toISOString(), level: 'warn', message, meta })
  },

  error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
    emit({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error instanceof Error ? error.message : String(error),
      meta,
    })
  },

  request(method: string, route: string, statusCode: number, durationMs: number, correlationId?: string): void {
    emit({
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      message: `${method} ${route} ${statusCode}`,
      method,
      route,
      statusCode,
      durationMs,
      correlationId,
    })
  },
}

export type { LogEntry, LogLevel }
