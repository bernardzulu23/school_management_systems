import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Liveness: respond immediately so load balancers (Railway, etc.) do not time out
 * while Prisma/DB warms up. Use GET /api/health?db=1 for a readiness/DB probe.
 */
export async function GET(request) {
  const checkDb = request.nextUrl.searchParams.get('db') === '1'
  const strict = process.env.HEALTHCHECK_STRICT === 'true'

  if (!checkDb) {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 })
  }

  try {
    const mod = await import('@/lib/prisma')
    const prisma = mod?.default || mod?.prisma
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', db: 'connected', timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch (error) {
    const sanitize = (value) =>
      String(value || '')
        .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://***')
        .replace(/password=[^&\s]+/gi, 'password=***')
        .slice(0, 2000)

    return NextResponse.json(
      { status: 'error', db: 'disconnected', error: sanitize(error?.message || error) },
      { status: strict ? 503 : 200 }
    )
  }
}
