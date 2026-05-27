/**
 * E2E: Health and system checks (deployment smoke).
 */
import { test, expect } from '@playwright/test'

test.describe('System health', () => {
  test('GET /api/health returns healthy or degraded with JSON', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBeLessThan(600)
    const body = await response.json()
    expect(body.status).toMatch(/healthy|degraded/)
    expect(typeof body.checks).toBe('object')
  })

  test('GET /api/health?live=1 returns ok', async ({ request }) => {
    const response = await request.get('/api/health?live=1')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
  })

  test('marketing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).not.toBeEmpty()
    const text = await page.locator('body').innerText()
    expect(text.toLowerCase()).not.toMatch(/internal server error/)
  })
})
