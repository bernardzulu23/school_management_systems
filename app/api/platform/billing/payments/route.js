export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { listPlatformPayments } from '@/lib/platform/platformBilling'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const GET = withSecureApi(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page')) || 1
  const limit = Number(searchParams.get('limit')) || 20

  const data = await listPlatformPayments({ page, limit })
  return NextResponse.json({ success: true, ...data })
})
