/**
 * ══════════════════════════════════════════════════════════════════
 *   Custom Error Types — Typed HTTP errors with structured context
 *   Replaces ad-hoc error strings throughout the codebase.
 * ══════════════════════════════════════════════════════════════════
 */

/**
 * Base application error — all custom errors extend this.
 * Carries an HTTP status code and optional metadata for logging.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly meta?: Record<string, unknown>

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', meta?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.meta = meta
  }
}

/**
 * 400 — Bad Request: invalid input, missing fields, malformed JSON.
 */
export class ValidationError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', meta)
    this.name = 'ValidationError'
  }
}

/**
 * 401 — Unauthorized: missing or invalid credentials.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', meta?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', meta)
    this.name = 'UnauthorizedError'
  }
}

/**
 * 403 — Forbidden: valid credentials but insufficient permissions.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', meta?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', meta)
    this.name = 'ForbiddenError'
  }
}

/**
 * 404 — Not Found: resource does not exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number, meta?: Record<string, unknown>) {
    const msg = id !== undefined ? `${resource} #${id} not found` : `${resource} not found`
    super(msg, 404, 'NOT_FOUND', { resource, id, ...meta })
    this.name = 'NotFoundError'
  }
}

/**
 * 409 — Conflict: duplicate resource, race condition.
 */
export class ConflictError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', meta)
    this.name = 'ConflictError'
  }
}

/**
 * 429 — Too Many Requests: rate limit exceeded.
 */
export class RateLimitError extends AppError {
  public readonly retryAfterMs: number

  constructor(retryAfterMs = 60_000, meta?: Record<string, unknown>) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT', meta)
    this.name = 'RateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

/**
 * 503 — Service Unavailable: downstream dependency failure.
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, meta?: Record<string, unknown>) {
    super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE', { service, ...meta })
    this.name = 'ServiceUnavailableError'
  }
}

/**
 * Convert any caught error into a structured JSON response object.
 * Safe for returning directly from Hono route handlers.
 */
export function toErrorResponse(err: unknown): { body: { success: false; error: string; code: string }; status: number } {
  if (err instanceof AppError) {
    return {
      body: { success: false, error: err.message, code: err.code },
      status: err.statusCode,
    }
  }
  // Unknown errors get generic 500
  const message = err instanceof Error ? err.message : String(err)
  return {
    body: { success: false, error: message, code: 'INTERNAL_ERROR' },
    status: 500,
  }
}
