import { test, expect, goTo, runAndCommitScrape } from './fixtures/app'
import type { Page } from '@playwright/test'

// `testApi` is exposed on window by preload.ts when APP_TEST=1.
declare global {
  interface Window {
    testApi: {
      archiveOldest(n: number): Promise<string[]>
      backdatePostings(ids: string[], status: string): Promise<void>
      runArchiveSweep(retentionDays: number): Promise<number>
      archiveFavorited(): Promise<void>
      countArchived(): Promise<number>
      getAllPostingIds(): Promise<string[]>
      getRawText(id: string): Promise<string | null>
    }
  }
}

async function archiveOldest(page: Page, n: number): Promise<string[]> {
  return await page.evaluate((count) => window.testApi.archiveOldest(count), n)
}

async function countArchived(page: Page): Promise<number> {
  return await page.evaluate(() => window.testApi.countArchived())
}

async function getAllPostingIds(page: Page): Promise<string[]> {
  return await page.evaluate(() => window.testApi.getAllPostingIds())
}

async function backdate(page: Page, ids: string[], status: string): Promise<void> {
  await page.evaluate(
    (args) => window.testApi.backdatePostings(args.ids, args.status),
    { ids, status },
  )
}

async function runSweep(page: Page, retentionDays = 14): Promise<number> {
  return await page.evaluate((days) => window.testApi.runArchiveSweep(days), retentionDays)
}

async function reloadJobBoard(page: Page): Promise<void> {
  await goTo(page, 'Settings')
  await goTo(page, 'Jobs')
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Job Board archive', () => {
  test.beforeEach(async ({ page }) => {
    await runAndCommitScrape(page)
    await goTo(page, 'Jobs')
  })

  test('shows "Show archived (0)" toggle when no postings are archived', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Show archived \(0\)/i })).toBeVisible()
  })

  test('toggle text updates to reflect archived count', async ({ page }) => {
    await archiveOldest(page, 3)
    await reloadJobBoard(page)
    await expect(page.getByRole('button', { name: /Show archived \(3\)/i })).toBeVisible()
  })

  test('archived postings do not appear in the active view', async ({ page }) => {
    const ids = await archiveOldest(page, 2)
    await reloadJobBoard(page)

    await expect(page.getByRole('heading', { name: /^Jobs/ })).toContainText('(13)')

    for (const id of ids) {
      await expect(page.getByTestId(`job-row-${id}`)).toHaveCount(0)
    }
  })

  test('clicking "Show archived" reveals archived postings', async ({ page }) => {
    await archiveOldest(page, 4)
    await reloadJobBoard(page)

    await page.getByRole('button', { name: /Show archived \(4\)/i }).click()

    await expect(page.getByRole('heading', { name: /Archived Jobs/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Archived Jobs/i })).toContainText('(4)')
    await expect(page.locator('table tbody tr')).toHaveCount(4)
  })

  test('"Show active" button returns to the active view', async ({ page }) => {
    await archiveOldest(page, 2)
    await reloadJobBoard(page)

    await page.getByRole('button', { name: /Show archived/i }).click()
    await expect(page.getByRole('heading', { name: /Archived Jobs/i })).toBeVisible()

    await page.getByRole('button', { name: /Show active/i }).click()
    await expect(page.getByRole('heading', { name: /^Jobs/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Jobs/ })).toContainText('(13)')
  })

  test('archive view shows an "Unarchive" button per row, not "Tailor Resume"', async ({ page }) => {
    await archiveOldest(page, 1)
    await reloadJobBoard(page)

    await page.getByRole('button', { name: /Show archived/i }).click()

    const row = page.locator('table tbody tr').first()
    await expect(row.getByRole('button', { name: /Unarchive/i })).toBeVisible()
    await expect(row.getByRole('button', { name: /Tailor Resume/i })).toHaveCount(0)
  })

  test('clicking Unarchive moves the posting back to active', async ({ page }) => {
    await archiveOldest(page, 1)
    await reloadJobBoard(page)

    await page.getByRole('button', { name: /Show archived/i }).click()
    await expect(page.locator('table tbody tr')).toHaveCount(1)

    await page.getByRole('button', { name: /Unarchive/i }).click()

    await expect(page.getByText(/No archived postings/i)).toBeVisible()
    expect(await countArchived(page)).toBe(0)

    await page.getByRole('button', { name: /Show active/i }).click()
    await expect(page.getByRole('heading', { name: /^Jobs/ })).toContainText('(15)')
  })

  test('"Delete all archived" appears only in archive view when archives exist', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Delete all archived/i })).toHaveCount(0)

    await archiveOldest(page, 2)
    await reloadJobBoard(page)

    await expect(page.getByRole('button', { name: /Delete all archived/i })).toHaveCount(0)

    await page.getByRole('button', { name: /Show archived/i }).click()
    await expect(page.getByRole('button', { name: /Delete all archived \(2\)/i })).toBeVisible()
  })

  test('"Delete all archived" removes every archived posting', async ({ page }) => {
    await archiveOldest(page, 3)
    await reloadJobBoard(page)
    const totalBefore = (await getAllPostingIds(page)).length

    await page.getByRole('button', { name: /Show archived/i }).click()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Delete all archived/i }).click()

    await expect(page.getByText(/No archived postings/i)).toBeVisible()
    expect(await countArchived(page)).toBe(0)

    const totalAfter = (await getAllPostingIds(page)).length
    expect(totalAfter).toBe(totalBefore - 3)
  })

  test('dismissing the confirm dialog cancels the delete', async ({ page }) => {
    await archiveOldest(page, 2)
    await reloadJobBoard(page)

    await page.getByRole('button', { name: /Show archived/i }).click()

    page.once('dialog', (dialog) => dialog.dismiss())
    await page.getByRole('button', { name: /Delete all archived/i }).click()

    expect(await countArchived(page)).toBe(2)
    await expect(page.locator('table tbody tr')).toHaveCount(2)
  })

  test('Tracker view does not list archived postings even if status is favorited', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.locator('select').selectOption('favorited')

    await goTo(page, 'Tracker')
    await expect(page.locator('table tbody tr')).toHaveCount(1)

    await page.evaluate(() => window.testApi.archiveFavorited())

    await goTo(page, 'Jobs')
    await goTo(page, 'Tracker')
    await expect(page.locator('table tbody tr')).toHaveCount(0)
  })
})

test.describe('Auto-archive sweep', () => {
  test.beforeEach(async ({ page }) => {
    await runAndCommitScrape(page)
    await goTo(page, 'Jobs')
  })

  test('archives stale new postings beyond the retention window', async ({ page }) => {
    const ids = await getAllPostingIds(page)
    await backdate(page, ids.slice(0, 5), 'new')

    const archived = await runSweep(page, 14)
    expect(archived).toBe(5)
    expect(await countArchived(page)).toBe(5)
  })

  test('archives stale viewed postings as well', async ({ page }) => {
    const ids = await getAllPostingIds(page)
    await backdate(page, ids.slice(0, 2), 'viewed')

    const archived = await runSweep(page, 14)
    expect(archived).toBe(2)
  })

  test('does NOT archive Tracker-pipeline statuses (favorited, applied)', async ({ page }) => {
    const ids = await getAllPostingIds(page)
    await backdate(page, ids.slice(0, 2), 'favorited')
    await backdate(page, ids.slice(2, 4), 'applied')

    const archived = await runSweep(page, 14)
    expect(archived).toBe(0)
    expect(await countArchived(page)).toBe(0)
  })

  test('does NOT archive fresh new postings within the retention window', async ({ page }) => {
    const archived = await runSweep(page, 14)
    expect(archived).toBe(0)
  })

  test('sweep nulls raw_text on archived postings', async ({ page }) => {
    const ids = await getAllPostingIds(page)
    await backdate(page, [ids[0]], 'new')
    await runSweep(page, 14)

    const rawText = await page.evaluate((id) => window.testApi.getRawText(id), ids[0])
    expect(rawText).toBeNull()
  })

  test('sweep is idempotent — re-running does not re-archive', async ({ page }) => {
    const ids = await getAllPostingIds(page)
    await backdate(page, ids.slice(0, 3), 'new')

    expect(await runSweep(page, 14)).toBe(3)
    expect(await runSweep(page, 14)).toBe(0)
  })
})
