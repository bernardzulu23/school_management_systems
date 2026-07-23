/**
 * GET /api/health — production health check (no auth).
 * ?live=1 — liveness only (always 200).
 */
import { NextResponse } from 'next/server'
import { basePrisma } from '@/lib/prisma/client'
import { env } from '@/lib/config/env'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const dynamic = 'force-dynamic'

const VERSION = process.env.npm_package_version || process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0'

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET']

const RECOMMENDED_ENV = ['GROQ_API_KEY', 'NEXT_PUBLIC_SENTRY_DSN']

async function checkDatabase() {
  const start = Date.now()
  await basePrisma.$queryRaw`SELECT 1 AS ok`
  return { status: 'ok', responseMs: Date.now() - start }
}

async function checkDbPool() {
  try {
    const rows = await basePrisma.$queryRaw`SELECT count(*)::int AS c FROM pg_stat_activity`
    const connections = Number(rows?.[0]?.c ?? 0)
    return {
      status: connections > 80 ? 'warn' : 'ok',
      connections,
    }
  } catch {
    return { status: 'skipped', connections: null }
  }
}

function checkEnvironment() {
  const missing = []
  for (const key of REQUIRED_ENV) {
    if (!String(process.env[key] || '').trim()) missing.push(key)
  }
  const missingRecommended = []
  for (const key of RECOMMENDED_ENV) {
    if (!String(process.env[key] || '').trim()) missingRecommended.push(key)
  }
  return {
    status: missing.length ? 'fail' : 'ok',
    missing,
    missingRecommended,
  }
}

async function checkRedis() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || '').trim()
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()
  if (!url || !token) return { status: 'skipped' }

  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    return { status: res.ok ? 'ok' : 'fail' }
  } catch {
    return { status: 'fail' }
  }
}

export const GET = withSecureApi(async function GET(request) {
  const liveOnly = request.nextUrl.searchParams.get('live') === '1'

  if (liveOnly) {
    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString(), version: VERSION },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache' },
      }
    )
  }

  const [dbResult, poolResult, envResult, redisResult] = await Promise.allSettled([
    checkDatabase(),
    checkDbPool(),
    Promise.resolve(checkEnvironment()),
    checkRedis(),
  ])

  const database =
    dbResult.status === 'fulfilled' ? dbResult.value : { status: 'fail', responseMs: null }
  const dbPool =
    poolResult.status === 'fulfilled' ? poolResult.value : { status: 'skipped', connections: null }
  const environment =
    envResult.status === 'fulfilled' ? envResult.value : { status: 'fail', missing: ['unknown'] }
  const redis = redisResult.status === 'fulfilled' ? redisResult.value : { status: 'fail' }

  const criticalFail =
    database.status === 'fail' || environment.status === 'fail' || redis.status === 'fail'

  const degraded = dbPool.status === 'warn' || environment.missingRecommended?.length > 0

  let status = 'ok'
  if (criticalFail) status = 'down'
  else if (degraded) status = 'degraded'

  const httpStatus = criticalFail ? 503 : 200

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: VERSION,
      checks: {
        database,
        dbPool,
        environment,
        redis,
        email: { status: env.features.email ? 'ok' : 'skipped' },
        ai: { status: env.features.ai ? 'ok' : 'skipped' },
        sms: { status: env.features.sms ? 'ok' : 'skipped' },
      },
    },
    {
      status: httpStatus,
      headers: { 'Cache-Control': 'no-store, no-cache' },
    }
  )
})
