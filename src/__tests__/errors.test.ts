/**
 * Tests for src/errors.ts — Custom Error Types
 */
import { describe, expect, it } from 'vitest'
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  toErrorResponse,
  UnauthorizedError,
  ValidationError,
} from '../errors'

describe('AppError', () => {
  it('should create error with defaults', () => {
    const err = new AppError('something broke')
    expect(err.message).toBe('something broke')
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.name).toBe('AppError')
    expect(err).toBeInstanceOf(Error)
  })

  it('should accept custom status and code', () => {
    const err = new AppError('custom', 418, 'TEAPOT', { key: 'val' })
    expect(err.statusCode).toBe(418)
    expect(err.code).toBe('TEAPOT')
    expect(err.meta).toEqual({ key: 'val' })
  })
})

describe('ValidationError', () => {
  it('should be a 400 error', () => {
    const err = new ValidationError('invalid input')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.name).toBe('ValidationError')
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('UnauthorizedError', () => {
  it('should be a 401 error with default message', () => {
    const err = new UnauthorizedError()
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe('Unauthorized')
    expect(err.code).toBe('UNAUTHORIZED')
  })
})

describe('ForbiddenError', () => {
  it('should be a 403 error', () => {
    const err = new ForbiddenError('no access')
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
  })
})

describe('NotFoundError', () => {
  it('should format message with resource and id', () => {
    const err = new NotFoundError('Card', 42)
    expect(err.message).toBe('Card #42 not found')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.meta).toEqual({ resource: 'Card', id: 42 })
  })

  it('should format message without id', () => {
    const err = new NotFoundError('Wallet')
    expect(err.message).toBe('Wallet not found')
  })
})

describe('ConflictError', () => {
  it('should be a 409 error', () => {
    const err = new ConflictError('duplicate card')
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('CONFLICT')
  })
})

describe('RateLimitError', () => {
  it('should be a 429 error with retryAfterMs', () => {
    const err = new RateLimitError(30_000)
    expect(err.statusCode).toBe(429)
    expect(err.retryAfterMs).toBe(30_000)
    expect(err.code).toBe('RATE_LIMIT')
  })

  it('should default to 60s retry', () => {
    const err = new RateLimitError()
    expect(err.retryAfterMs).toBe(60_000)
  })
})

describe('ServiceUnavailableError', () => {
  it('should be a 503 error', () => {
    const err = new ServiceUnavailableError('OpenAI')
    expect(err.statusCode).toBe(503)
    expect(err.message).toBe('OpenAI is temporarily unavailable')
    expect(err.meta?.service).toBe('OpenAI')
  })
})

describe('toErrorResponse', () => {
  it('should convert AppError to structured response', () => {
    const err = new NotFoundError('Card', 7)
    const { body, status } = toErrorResponse(err)
    expect(status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Card #7 not found')
    expect(body.code).toBe('NOT_FOUND')
  })

  it('should convert generic Error to 500', () => {
    const { body, status } = toErrorResponse(new Error('oops'))
    expect(status).toBe(500)
    expect(body.code).toBe('INTERNAL_ERROR')
    expect(body.error).toBe('oops')
  })

  it('should convert string to 500', () => {
    const { body, status } = toErrorResponse('raw string error')
    expect(status).toBe(500)
    expect(body.error).toBe('raw string error')
  })
})
