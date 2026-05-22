// Skip husky git hooks on Vercel/CI (no .git hooks needed in deploy environments).
if (process.env.CI || process.env.VERCEL || process.env.HUSKY === '0') {
  process.exit(0)
}
const { execSync } = require('child_process')
execSync('husky', { stdio: 'inherit' })
