/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and deployment verification.
 * Returns status of: database, email (Resend), AI (Groq), SMS, payments.
 *
 * Used by:
 * - Vercel deployment checks
 * - Uptime monitoring
 * - Admin dashboard status widgets
 *
 * Query params:
 * - `live=1` — fast liveness only (no database probe); always 200
 *
 * Returns 200 if database is reachable, 503 otherwise.
 * Individual optional service flags may be false while overall status stays healthy.
 */
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { env } from '@/lib/config/env'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const dynamic = 'force-dynamic'

export const GET = withSecureApi(async function GET(request) {
  const liveOnly = request.nextUrl.searchParams.get('live') === '1'

  if (liveOnly) {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 })
  }

  const checks = {
    database: false,
    email: env.features.email,
    ai: env.features.ai,
    sms: env.features.sms,
    payments: env.features.payments,
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }

  const allHealthy = checks.database

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.3',
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  )
})
