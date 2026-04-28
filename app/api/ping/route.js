export const dynamic = 'force-dynamic'
/** Minimal liveness check - no imports, no DB. Use for Railway healthcheck. */
export async function GET() {
  return Response.json({ ok: true, t: Date.now() }, { status: 200 })
}
