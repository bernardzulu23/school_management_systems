/**
 * E2E: Authentication flow
 *
 * Tests login page render and invalid credentials (no 500).
 */
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expect(page.locator('[name="email"]')).toBeVisible()
    await expect(page.locator('[name="password"]')).toBeVisible()
  })

  test('wrong password shows error without crashing', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'nobody@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/login/)
    await page.waitForTimeout(1500)
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).not.toMatch(/internal server error|500/)
  })
})
