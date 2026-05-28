export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { getPlatformDistrictStats } from '@/lib/platform/platformStats'
import { withSecureApi } from '@/lib/middleware/secureApi'

/** GET /api/platform/stats/districts?province=Lusaka */
export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { searchParams } = new URL(request.url)
  const province = searchParams.get('province') || ''

  const data = await getPlatformDistrictStats(province)
  return NextResponse.json({ success: true, data })
})
