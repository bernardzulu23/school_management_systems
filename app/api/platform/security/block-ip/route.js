export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { resolvePlatformAdminRecord } from '@/lib/platform/platformAdminAuth'
import { withSecureHandler } from '@/lib/middleware/secureApi'

export const POST = withSecureHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const body = await request.json().catch(() => ({}))
  const ip = String(body.ip || '')
    .trim()
    .split(',')[0]
    ?.trim()
  if (!ip || ip === 'unknown' || ip === 'system') {
    return NextResponse.json({ error: 'Valid ip required' }, { status: 400 })
  }

  const reason = String(body.reason || 'Manual block by superadmin').trim()
  const admin = await resolvePlatformAdminRecord(auth.user)
  const blockedBy = admin?.id || auth.user?.id || auth.user?.email || 'platform'

  await prisma.blockedIp.upsert({
    where: { ip },
    create: { ip, reason, blockedBy: String(blockedBy) },
    update: { reason, blockedBy: String(blockedBy) },
  })

  return NextResponse.json({ success: true })
})
