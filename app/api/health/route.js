/**
 * Lightweight health check - no DB dependency.
 * Returns 200 immediately so Railway healthcheck passes while app starts.
 * DB is checked separately to avoid blocking/crashing on cold start.
 */
export async function GET() {
  let database = 'unknown'
  try {
    const mod = await import('@/lib/prisma')
    const prisma = mod.prisma ?? mod.default
    if (prisma) await prisma.$queryRaw`SELECT 1`
    database = 'connected'
  } catch (err) {
    database = 'disconnected'
    console.error('Health DB check:', err?.message)
  }

  return Response.json(
    { status: 'ok', database, timestamp: new Date().toISOString() },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
