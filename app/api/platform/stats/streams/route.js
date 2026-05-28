export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { getPlatformReportingStreamStats } from '@/lib/platform/platformStats'
import { withSecureApi } from '@/lib/middleware/secureApi'

/** GET /api/platform/stats/streams — schools grouped by province+district reporting stream */
export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const data = await getPlatformReportingStreamStats()
  return NextResponse.json({ success: true, data })
})
