import { test, expect, goTo } from './fixtures/app'
import type { Page } from 'playwright'

type Reason = 'rate_limit' | 'credit_balance' | 'overloaded' | 'auth'

async function triggerLock(page: Page, reason: Reason): Promise<void> {
  await page.evaluate(
    (r) => (window as unknown as { testApi: { triggerClaudeQuotaLock(r: string): Promise<void> } })
      .testApi.triggerClaudeQuotaLock(r),
    reason,
  )
}

test.describe('Claude quota lock', () => {
  test('triggering the lock surfaces a banner in Settings with the correct reason', async ({ page }) => {
    await goTo(page, 'Settings')
    await expect(page.getByTestId('settings-claude-quota-banner')).toHaveCount(0)

    await triggerLock(page, 'rate_limit')

    const banner = page.getByTestId('settings-claude-quota-banner')
    await expect(banner).toBeVisible({ timeout: 5_000 })
    await expect(banner).toContainText(/rate limit/i)
    await expect(page.getByTestId('settings-lock-claudeQuotaLock').getByText('Locked')).toBeVisible()
  })

  test('clicking a Claude-dependent nav opens the quota modal naming the error class', async ({ page }) => {
    // Set an API key so Resume isn't locked by claudeApiKey — we want to prove the
    // quota lock is what's blocking, not the missing-key lock.
    await goTo(page, 'Settings')
    await page.getByTestId('settings-api-key-input').fill('sk-ant-test-key-0000000000000000')
    await page.getByTestId('settings-api-key-save').click()

    await triggerLock(page, 'credit_balance')

    // Resume nav should now show the locked badge
    const resumeBtn = page.getByTestId('nav-resume')
    await expect(resumeBtn.locator('.lock-badge')).toBeVisible({ timeout: 5_000 })

    await resumeBtn.click()
    const modal = page.getByTestId('claude-quota-locked-modal')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText(/credits exhausted/i)
    await expect(modal).toContainText('credit_balance')
  })

  test('Jobs and Search nav also surface the quota modal when the lock is active', async ({ page }) => {
    await triggerLock(page, 'overloaded')

    const jobsBtn = page.getByTestId('nav-jobs')
    await expect(jobsBtn.locator('.lock-badge')).toBeVisible({ timeout: 5_000 })
    await jobsBtn.click()
    await expect(page.getByTestId('claude-quota-locked-modal')).toBeVisible()
    await expect(page.getByTestId('claude-quota-locked-modal')).toContainText(/temporarily overloaded/i)

    // Close and try Search
    await page.getByTestId('claude-quota-locked-modal').press('Escape').catch(() => undefined)
    await page.getByRole('button', { name: /^Close$/ }).click()
    await expect(page.getByTestId('claude-quota-locked-modal')).toHaveCount(0)

    const searchBtn = page.getByTestId('nav-search')
    await expect(searchBtn.locator('.lock-badge')).toBeVisible()
    await searchBtn.click()
    await expect(page.getByTestId('claude-quota-locked-modal')).toBeVisible()
  })

  test('quota modal takes precedence over ResumeLockedModal when both would apply', async ({ page }) => {
    // Fresh app: no API key, so Resume normally opens ResumeLockedModal.
    await triggerLock(page, 'auth')

    await page.getByTestId('nav-resume').click()

    // Should see the quota modal, not the resume-locked modal
    await expect(page.getByTestId('claude-quota-locked-modal')).toBeVisible()
    await expect(page.getByText(/Resume Unavailable/i)).toHaveCount(0)
    await expect(page.getByTestId('claude-quota-locked-modal')).toContainText(/authentication failed/i)
  })

  test('Retry Claude Connectivity button clears the lock and removes the banner', async ({ page }) => {
    await goTo(page, 'Settings')
    await triggerLock(page, 'rate_limit')

    const banner = page.getByTestId('settings-claude-quota-banner')
    await expect(banner).toBeVisible({ timeout: 5_000 })

    await page.getByTestId('settings-clear-quota-lock-btn').click()

    // Banner disappears once the lock is cleared
    await expect(banner).toHaveCount(0, { timeout: 5_000 })
    await expect(page.getByTestId('settings-lock-claudeQuotaLock').getByText('OK')).toBeVisible()
  })

  test('after clearing, Jobs nav unlocks (assuming no other locks apply)', async ({ page }) => {
    await triggerLock(page, 'rate_limit')
    await expect(page.getByTestId('nav-jobs').locator('.lock-badge')).toBeVisible({ timeout: 5_000 })

    await goTo(page, 'Settings')
    await page.getByTestId('settings-clear-quota-lock-btn').click()

    await expect(page.getByTestId('nav-jobs').locator('.lock-badge')).toHaveCount(0, { timeout: 5_000 })
  })
})
