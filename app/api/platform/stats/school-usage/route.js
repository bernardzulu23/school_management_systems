export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { getPlatformSchoolUsageStats } from '@/lib/platform/schoolUsageStats'
import { withSecureApi } from '@/lib/middleware/secureApi'

/** Per-school student + teacher counts only (no names, grades, or records). */
export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === '1'

  const data = await getPlatformSchoolUsageStats({ includeInactive })
  return NextResponse.json({ success: true, data })
})
