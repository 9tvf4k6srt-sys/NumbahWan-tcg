/**
 * Unit tests for src/logger.ts — Structured logging
 */
import { describe, expect, it, vi } from 'vitest'
import { logger } from '../logger'

describe('logger', () => {
  it('should generate unique correlation IDs', () => {
    const id1 = logger.correlationId()
    const id2 = logger.correlationId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^req-/)
  })

  it('should log info messages as JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.info('test message', { key: 'value' })

    expect(spy).toHaveBeenCalledOnce()
    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.level).toBe('info')
    expect(parsed.message).toBe('test message')
    expect(parsed.meta.key).toBe('value')
    expect(parsed.timestamp).toBeDefined()

    spy.mockRestore()
  })

  it('should log warnings to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('watch out')

    expect(spy).toHaveBeenCalledOnce()
    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.level).toBe('warn')

    spy.mockRestore()
  })

  it('should log errors with error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('fail', new Error('boom'))

    expect(spy).toHaveBeenCalledOnce()
    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.level).toBe('error')
    expect(parsed.error).toBe('boom')

    spy.mockRestore()
  })

  it('should log request with proper level based on status code', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.request('GET', '/api/health', 200, 15)
    expect(logSpy).toHaveBeenCalled()

    logger.request('POST', '/api/cards', 400, 25)
    expect(warnSpy).toHaveBeenCalled()

    logger.request('GET', '/api/crash', 500, 100)
    expect(errorSpy).toHaveBeenCalled()

    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('should include correlation ID in request logs', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.request('GET', '/test', 200, 5, 'req-abc123')

    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.correlationId).toBe('req-abc123')

    spy.mockRestore()
  })
})
