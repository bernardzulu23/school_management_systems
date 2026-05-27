/**
 * Playwright helper: authenticate as a local dev test user.
 *
 * Requires `npm run seed:local` and credentials from lib/dev/localTestAccounts.js.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'teacher' | 'headteacher' | 'student'} role
 */
export async function loginAs(page, role) {
  const password = process.env.LOCAL_DEV_PASSWORD || 'ZsmsLocal@Test2026'
  const credentials = {
    teacher: { email: 'teacher@zsms.local', password },
    headteacher: { email: 'headteacher@zsms.local', password },
    student: { email: 'student@zsms.local', password },
  }
  const { email } = credentials[role] || credentials.teacher

  await page.goto('/login')
  await page.fill('[name="email"]', email)
  await page.fill('[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
}
