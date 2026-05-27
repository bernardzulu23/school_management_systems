/**
 * Playwright E2E test configuration for ZSMS.
 *
 * HOW TO RUN:
 *   npm run test:e2e          — starts dev server (or reuses if already running)
 *   npm run test:e2e:attach   — use when `npm run dev` is already running (fastest)
 *   npm run test:e2e:ui       — interactive UI
 *
 * Slow first compile on Windows? Start dev in another terminal, then test:e2e:attach.
 */
import { defineConfig, devices } from '@playwright/test'

const host = process.env.PLAYWRIGHT_HOST || '127.0.0.1'
const port = process.env.PLAYWRIGHT_PORT || '3000'
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`

/** Lightweight liveness — no DB probe, faster than loading `/`. */
const readyUrl = `${baseURL}/api/health?live=1`

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'

const webServer = skipWebServer
  ? undefined
  : {
      command: process.env.PLAYWRIGHT_WEB_SERVER_CMD || 'npm run dev:e2e',
      url: readyUrl,
      reuseExistingServer: !process.env.CI,
      timeout: Number(process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT || 300_000),
      stdout: 'pipe',
      stderr: 'pipe',
    }

export default defineConfig({
  testDir: '__tests__/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['line']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(process.env.PLAYWRIGHT_MOBILE === '1'
      ? [
          {
            name: 'chromium-mobile',
            use: { ...devices['Pixel 5'] },
          },
        ]
      : []),
  ],
  ...(webServer ? { webServer } : {}),
})
