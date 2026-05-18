import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { getDb } from '../../db/database'
import { getApiKey, getApiKeyPresent } from '../settings'
import { logger } from '../logger'
import type { BaseAdapter, CrawlController } from '../../core/jobs/adapters/base'
import { runScrape, createCrawlController } from '../../core/jobs/aggregator'
import { getFilteredRankedPostings, getRankedPostings } from '../../core/jobs/ranker'
import { scorePosting } from '../../core/jobs/scorer'
import { getUserAdapterDir } from '../../core/jobs/pluginLoader'
import { updatePostingStatus, deletePostings } from '../../core/tracker/repository'
import type { BanListEntry, FeatureLocks, ClaudeQuotaLock } from '../../src/shared/ipc-types'
import type { ClaudeQuotaError } from '../../core/llm/quotaErrors'
import type { PostingStatus } from '../../core/tracker/models'
import { randomUUID } from 'crypto'

// ─── ReDoS guard ──────────────────────────────────────────────────────────────

function isSafeRegex(pattern: string): boolean {
  if (pattern.length > 200) return false
  // Nested quantifiers cause catastrophic backtracking: (x+)+, (x*)+, (x+)*, etc.
  if (/\([^)]*[+*][^)]*\)[+*?]/.test(pattern)) return false
  // Alternation under quantifier: (a|b)+
  if (/\([^)]*\|[^)]*\)[+*]/.test(pattern)) return false
  return true
}

// ─── Adapter display metadata ─────────────────────────────────────────────────

const ADAPTER_META: Record<string, { name: string; description: string }> = {
  mock: { name: 'Mock Adapter', description: 'Returns hardcoded sample postings — for development and testing' },
  linkedin: { name: 'LinkedIn', description: 'Scrapes LinkedIn public job search (no login required)' },
  indeed: { name: 'Indeed', description: 'Scrapes Indeed public job search (no login required)' },
  glassdoor: { name: 'Glassdoor', description: 'Scrapes Glassdoor job search, including salary estimates (no login required)' },
  ycombinator: { name: 'YCombinator Jobs', description: 'YC startup job feed from news.ycombinator.com/jobs (no login required)' },
  hnhiring: { name: 'HN Hiring', description: 'Monthly "Who is Hiring?" posts formatted at hnhiring.com (no login required)' },
}

// ─── Registration ─────────────────────────────────────────────────────────────

export interface JobsHandlerDeps {
  getMainWindow: () => BrowserWindow | null
  pushFeatureLocks: (patch: Partial<FeatureLocks>) => void
  getAllAdapters: () => BaseAdapter[]
  getCrawlController: () => CrawlController | null
  setCrawlController: (c: CrawlController | null) => void
  captchaResolvers: Map<string, () => void>
  loginResolvers: Map<string, () => void>
  streamScoringLimit: (fn: () => Promise<unknown>) => Promise<unknown>
  getUserDataPath: () => string
  triggerClaudeQuotaLock: (err: ClaudeQuotaError) => void
  getClaudeQuotaLock: () => ClaudeQuotaLock | null
}

export function registerJobsHandlers(deps: JobsHandlerDeps): void {
  const {
    getMainWindow,
    pushFeatureLocks,
    getAllAdapters,
    getCrawlController,
    setCrawlController,
    captchaResolvers,
    loginResolvers,
    streamScoringLimit,
    getUserDataPath,
    triggerClaudeQuotaLock,
    getClaudeQuotaLock,
  } = deps

  ipcMain.handle('jobs:list-adapters', () =>
    getAllAdapters().map((a) => ({
      id: a.id,
      name: ADAPTER_META[a.id]?.name ?? a.id,
      description: ADAPTER_META[a.id]?.description ?? `Plugin adapter: ${a.id}`,
      available: true,
      supportsLogin: a.supportsLogin,
      requiresChromium: a.requiresChromium,
    })),
  )

  ipcMain.handle('playwright:install-chromium', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registry } = require('playwright-core/lib/server/registry/index') as {
      registry: {
        findExecutable(n: string): { executablePath(): string | undefined } | undefined
        install(execs: unknown[]): Promise<void>
      }
    }
    const chromiumExec = registry.findExecutable('chromium')
    if (!chromiumExec) throw new Error('Chromium not found in Playwright registry')
    await registry.install([chromiumExec])
    const newLockValue = !chromiumExec.executablePath()
    pushFeatureLocks({ playwrightChromium: newLockValue })
  })

  ipcMain.handle('adapters:get-plugin-dir', () => getUserAdapterDir(getUserDataPath()))

  ipcMain.handle('jobs:run-scrape', async (_event, adapterIds?: string[], loginAdapterIds?: string[]) => {
    const adapters = adapterIds ? getAllAdapters().filter((a) => adapterIds.includes(a.id)) : getAllAdapters()
    const controller = createCrawlController()
    setCrawlController(controller)
    try {
      const summary = await runScrape(
        getDb(),
        adapters,
        (p) => { getMainWindow()?.webContents.send('jobs:adapter-progress', p) },
        (adapterId) => {
          const adapterName = ADAPTER_META[adapterId]?.name ?? adapterId
          getMainWindow()?.webContents.send('jobs:captcha-required', { adapterId, adapterName })
          return new Promise<void>((resolve) => {
            captchaResolvers.set(adapterId, resolve)
          })
        },
        (posting) => {
          getMainWindow()?.webContents.send('jobs:posting-committed', posting)
          const key = getApiKey()
          if (key && !getClaudeQuotaLock()) {
            streamScoringLimit(() => scorePosting(getDb(), key, posting, triggerClaudeQuotaLock))
              .then((scored) => getMainWindow()?.webContents.send('jobs:posting-scored', scored))
              .catch((err) => logger.error('Streaming scoring failed', err))
          }
        },
        controller,
        loginAdapterIds,
        (adapterId) => {
          const adapterName = ADAPTER_META[adapterId]?.name ?? adapterId
          getMainWindow()?.webContents.send('jobs:login-required', { adapterId, adapterName })
          return new Promise<void>((resolve) => {
            loginResolvers.set(adapterId, resolve)
          })
        },
      )
      logger.info('Scrape complete', summary)
      getMainWindow()?.webContents.send('jobs:scrape-committed')
      if (getApiKeyPresent() && !getClaudeQuotaLock()) {
        const key = getApiKey()
        if (key) {
          getRankedPostings(getDb(), key, triggerClaudeQuotaLock)
            .then((postings) => getMainWindow()?.webContents.send('jobs:affinity-updated', postings))
            .catch((err) => logger.error('Background affinity scoring failed', err))
        }
      }
      return summary
    } finally {
      setCrawlController(null)
    }
  })

  ipcMain.handle('jobs:captcha-resolved', (_event, adapterId: string) => {
    captchaResolvers.get(adapterId)?.()
    captchaResolvers.delete(adapterId)
  })

  ipcMain.handle('jobs:login-resolved', (_event, adapterId: string) => {
    loginResolvers.get(adapterId)?.()
    loginResolvers.delete(adapterId)
  })

  ipcMain.handle('jobs:pause-scrape', () => {
    getCrawlController()?.pause()
    logger.info('Scrape paused')
  })

  ipcMain.handle('jobs:resume-scrape', () => {
    getCrawlController()?.resume()
    logger.info('Scrape resumed')
  })

  ipcMain.handle('jobs:abort-scrape', () => {
    getCrawlController()?.abort()
    logger.info('Scrape aborted')
  })

  ipcMain.handle('jobs:get-postings', () => {
    const postings = getFilteredRankedPostings(getDb())
    if (getApiKeyPresent() && !getClaudeQuotaLock()) {
      const key = getApiKey()
      if (key && postings.some((p) => p.affinity_score === null && !p.affinity_skipped)) {
        getRankedPostings(getDb(), key, triggerClaudeQuotaLock)
          .then((scored) => getMainWindow()?.webContents.send('jobs:affinity-updated', scored))
          .catch((err) => logger.error('Background affinity scoring failed', err))
      }
    }
    return postings
  })

  ipcMain.handle('jobs:update-status', (_event, { id, status }: { id: string; status: string }) => {
    updatePostingStatus(getDb(), id, status as PostingStatus)
  })

  ipcMain.handle('jobs:delete-postings', (_event, { ids }: { ids: string[] }) => {
    deletePostings(getDb(), ids)
  })

  // ─── Ban List ───────────────────────────────────────────────────────────────

  ipcMain.handle('ban-list:get', () => {
    return getDb().prepare('SELECT * FROM ban_list ORDER BY type, value').all()
  })

  ipcMain.handle(
    'ban-list:preview',
    (_event, { type, value }: { type: 'company' | 'domain'; value: string }) => {
      const db = getDb()
      if (type === 'domain') {
        const rows = db
          .prepare('SELECT resolved_domain, url FROM job_postings')
          .all() as { resolved_domain: string | null; url: string }[]
        return rows.filter((r) => {
          const domain = r.resolved_domain ?? (() => { try { return new URL(r.url).hostname } catch { return null } })()
          return domain === value
        }).length
      }
      const companies = db
        .prepare('SELECT DISTINCT company FROM job_postings')
        .all() as { company: string }[]
      let pattern: RegExp
      try {
        if (!isSafeRegex(value)) throw new Error('unsafe')
        pattern = new RegExp(value, 'i')
      } catch {
        pattern = new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      }
      return companies.filter((r) => pattern.test(r.company)).length
    },
  )

  ipcMain.handle(
    'ban-list:add',
    (
      _event,
      { type, value, reason }: { type: 'company' | 'domain'; value: string; reason?: string },
    ) => {
      if (!value.trim()) throw new Error('Value cannot be empty')
      if (type === 'company' && !isSafeRegex(value.trim())) {
        throw new Error('Pattern is too complex or may cause excessive backtracking')
      }
      const db = getDb()
      const id = randomUUID()
      const now = new Date().toISOString()
      db.prepare(
        'INSERT INTO ban_list (id, type, value, reason, created_at) VALUES (?, ?, ?, ?, ?)',
      ).run(id, type, value.trim(), reason ?? null, now)

      let deletedCount = 0
      if (type === 'domain') {
        const rows = db
          .prepare('SELECT id, resolved_domain, url FROM job_postings')
          .all() as { id: string; resolved_domain: string | null; url: string }[]
        const toDelete = rows.filter((r) => {
          const domain = r.resolved_domain ?? (() => { try { return new URL(r.url).hostname } catch { return null } })()
          return domain === value.trim()
        }).map((r) => r.id)
        if (toDelete.length > 0) {
          const placeholders = toDelete.map(() => '?').join(',')
          db.prepare(`DELETE FROM job_postings WHERE id IN (${placeholders})`).run(...toDelete)
          deletedCount = toDelete.length
        }
      } else {
        const all = db.prepare('SELECT id, company FROM job_postings').all() as {
          id: string
          company: string
        }[]
        let pattern: RegExp
        try {
          pattern = new RegExp(value.trim(), 'i')
        } catch {
          pattern = new RegExp(value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        }
        const toDelete = all.filter((r) => pattern.test(r.company)).map((r) => r.id)
        if (toDelete.length > 0) {
          const placeholders = toDelete.map(() => '?').join(',')
          db.prepare(`DELETE FROM job_postings WHERE id IN (${placeholders})`).run(toDelete)
          deletedCount = toDelete.length
        }
      }

      const entry: BanListEntry = { id, type, value: value.trim(), reason: reason ?? null, created_at: now }
      logger.info('Ban entry added', { type, value, deletedCount })
      return { entry, deletedCount }
    },
  )

  ipcMain.handle('ban-list:remove', (_event, id: string) => {
    getDb().prepare('DELETE FROM ban_list WHERE id = ?').run(id)
  })
}
