// server.js — optional entrypoint: Railway (railway.toml), or Render with dockerCommand override.
// Default Dockerfile CMD runs Next standalone only; set SKIP_STARTUP_MIGRATE=true if you use this file on Render and migrations are managed elsewhere.
const path = require('path')
const { spawn } = require('child_process')

function pick(...keys) {
  return keys.map((k) => process.env[k]).find((v) => typeof v === 'string' && v.trim().length > 0)
}

function runMigrateOnce() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`prisma migrate deploy exited with code ${code}`))
    })
  })
}

async function runMigrationsAtStartup() {
  const dbUrl = pick(
    'DATABASE_URL',
    'DATABASE_PUBLIC_URL',
    'DIRECT_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_URL'
  )

  if (['1', 'true', 'yes'].includes(String(process.env.SKIP_STARTUP_MIGRATE || '').toLowerCase())) {
    console.log('Skipping prisma migrate deploy (SKIP_STARTUP_MIGRATE is set).')
    if (!process.env.DATABASE_URL && dbUrl) process.env.DATABASE_URL = dbUrl
    return
  }

  if (!dbUrl) {
    console.log('Skipping prisma migrate deploy: no database URL in environment')
    return
  }
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = dbUrl

  const maxAttempts = 5
  const delayMs = 8000
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runMigrateOnce()
      console.log('Database migrations applied successfully.')
      return
    } catch (err) {
      console.warn(
        `Startup migration attempt ${attempt}/${maxAttempts} failed:`,
        err?.message || err
      )
      if (attempt === maxAttempts) {
        console.warn('Giving up on migrations at startup; booting app (tables may be missing).')
        return
      }
      console.warn(`Retrying in ${delayMs / 1000}s…`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

;(async () => {
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify({
    distDir: '.next',
  })

  try {
    const { validateProductionEnv } = await import('./lib/security/env.js')
    validateProductionEnv()
  } catch (err) {
    console.error('[security]', err?.message || err)
    if (process.env.ENFORCE_PRODUCTION_SECRETS === 'true') {
      process.exit(1)
    }
  }

  await runMigrationsAtStartup()

  require(path.join(__dirname, '.next', 'standalone', 'server.js'))
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
