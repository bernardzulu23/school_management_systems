export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { isPlatformToken } from '@/lib/middleware/platformAuth'
import { resolvePlatformAdminRecord } from '@/lib/platform/platformAdminAuth'
import { withSecureApi } from '@/lib/middleware/secureApi'

export const GET = withSecureApi(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!isPlatformToken(auth.user)) {
    return NextResponse.json({ error: 'Not a platform session' }, { status: 403 })
  }

  const record = await resolvePlatformAdminRecord(auth.user)

  return NextResponse.json({
    success: true,
    user: {
      id: record?.id || auth.user.id,
      email: record?.email || auth.user.email,
      name: record?.name || auth.user.name || 'Platform Developer',
      role: 'superadmin',
      isPlatform: true,
      hasDbProfile: Boolean(record),
    },
  })
})
