export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { getPlatformBillingSummary } from '@/lib/platform/platformBilling'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const GET = withSecureHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const data = await getPlatformBillingSummary()
  return NextResponse.json({ success: true, data })
})
