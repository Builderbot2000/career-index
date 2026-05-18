import { describe, it, expect, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { classifyClaudeError } from './quotaErrors'
import { withQuotaGuard } from './withQuotaGuard'

function makeApiError(status: number, message: string): InstanceType<typeof Anthropic.APIError> {
  return new Anthropic.APIError(status, undefined, message, undefined)
}

describe('classifyClaudeError', () => {
  it('returns null for non-Anthropic errors', () => {
    expect(classifyClaudeError(new Error('boom'))).toBeNull()
    expect(classifyClaudeError('boom')).toBeNull()
    expect(classifyClaudeError(null)).toBeNull()
  })

  it('classifies 429 as rate_limit', () => {
    const result = classifyClaudeError(makeApiError(429, 'rate limited'))
    expect(result?.reason).toBe('rate_limit')
  })

  it('classifies 529 as overloaded', () => {
    const result = classifyClaudeError(makeApiError(529, 'overloaded'))
    expect(result?.reason).toBe('overloaded')
  })

  it('classifies 401 and 403 as auth', () => {
    expect(classifyClaudeError(makeApiError(401, 'unauthorized'))?.reason).toBe('auth')
    expect(classifyClaudeError(makeApiError(403, 'forbidden'))?.reason).toBe('auth')
  })

  it('classifies 400 with credit balance message as credit_balance', () => {
    const result = classifyClaudeError(
      makeApiError(400, 'Your credit balance is too low to access the API.'),
    )
    expect(result?.reason).toBe('credit_balance')
  })

  it('returns null for 400 without credit balance message', () => {
    expect(classifyClaudeError(makeApiError(400, 'bad request'))).toBeNull()
  })

  it('returns null for 500 and other non-quota statuses', () => {
    expect(classifyClaudeError(makeApiError(500, 'server error'))).toBeNull()
  })
})

describe('withQuotaGuard', () => {
  it('returns the value on success without invoking callback', async () => {
    const cb = vi.fn()
    const out = await withQuotaGuard(async () => 42, cb)
    expect(out).toBe(42)
    expect(cb).not.toHaveBeenCalled()
  })

  it('fires callback once and rethrows on classified error', async () => {
    const cb = vi.fn()
    const err = makeApiError(429, 'rate limited')
    await expect(withQuotaGuard(async () => { throw err }, cb)).rejects.toBe(err)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0].reason).toBe('rate_limit')
  })

  it('does not fire callback for non-classified errors but still rethrows', async () => {
    const cb = vi.fn()
    const err = new Error('something else')
    await expect(withQuotaGuard(async () => { throw err }, cb)).rejects.toBe(err)
    expect(cb).not.toHaveBeenCalled()
  })

  it('works without a callback', async () => {
    await expect(withQuotaGuard(async () => 'ok')).resolves.toBe('ok')
    const err = makeApiError(429, 'rate limited')
    await expect(withQuotaGuard(async () => { throw err })).rejects.toBe(err)
  })
})
