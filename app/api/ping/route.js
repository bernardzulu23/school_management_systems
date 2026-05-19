import { withSecureApi } from '@/lib/middleware/secureApi'

export const dynamic = 'force-dynamic'
/** Minimal liveness check - no imports, no DB. Use for Cloudflare / container healthchecks. */
export const GET = withSecureApi(async function GET(request) {
  return Response.json({ ok: true, t: Date.now() }, { status: 200 })
})
