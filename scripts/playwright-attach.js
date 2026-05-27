/**
 * Run Playwright without starting a web server (dev must already be running).
 * Usage: npm run dev   (terminal 1)
 *        npm run test:e2e:attach   (terminal 2)
 */
process.env.PLAYWRIGHT_SKIP_WEBSERVER = '1'

const { spawnSync } = require('child_process')

const args = ['playwright', 'test', ...process.argv.slice(2)]
const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status === null ? 1 : result.status)
