import Anthropic from '@anthropic-ai/sdk'

export type ClaudeQuotaReason = 'rate_limit' | 'credit_balance' | 'overloaded' | 'auth'

export interface ClaudeQuotaError {
  reason: ClaudeQuotaReason
  message: string
  raw: string
}

export function classifyClaudeError(err: unknown): ClaudeQuotaError | null {
  if (!(err instanceof Anthropic.APIError)) return null
  const status = err.status
  const raw = err.message ?? String(err)

  if (status === 429) {
    return { reason: 'rate_limit', message: 'Claude API rate limit exceeded.', raw }
  }
  if (status === 529) {
    return { reason: 'overloaded', message: 'Claude API is temporarily overloaded.', raw }
  }
  if (status === 401 || status === 403) {
    return { reason: 'auth', message: 'Claude API authentication failed.', raw }
  }
  if (status === 400 && /credit balance/i.test(raw)) {
    return { reason: 'credit_balance', message: 'Claude API account is out of credits.', raw }
  }
  return null
}
