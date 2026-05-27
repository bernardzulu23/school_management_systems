/**
 * E2E: QR attendance public page
 */
import { test, expect } from '@playwright/test'

test.describe('QR Attendance', () => {
  test('/attend page handles invalid token', async ({ page }) => {
    await page.goto('/attend?t=invalid-token')
    await expect(page.locator('body')).toContainText(/expired|invalid|cannot|error/i)
  })

  test('/attend without token shows missing link message', async ({ page }) => {
    await page.goto('/attend')
    await expect(page.locator('body')).toContainText(/missing|scan|qr/i)
  })
})
