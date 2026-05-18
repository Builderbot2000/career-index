import { classifyClaudeError, type ClaudeQuotaError } from './quotaErrors'

export type QuotaErrorCallback = (err: ClaudeQuotaError) => void

export async function withQuotaGuard<T>(
  fn: () => Promise<T>,
  onQuotaError?: QuotaErrorCallback,
): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (onQuotaError) {
      const classified = classifyClaudeError(e)
      if (classified) onQuotaError(classified)
    }
    throw e
  }
}

export class ClaudeLockedError extends Error {
  constructor(public readonly reason: ClaudeQuotaError['reason']) {
    super(`Claude features are locked (${reason}). Clear the lock in Settings.`)
    this.name = 'ClaudeLockedError'
  }
}
