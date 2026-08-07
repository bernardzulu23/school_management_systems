export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { requirePlatformAdmin } from '@/lib/middleware/platformAuth'
import { resolvePlatformAdminRecord } from '@/lib/platform/platformAdminAuth'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const PATCH = withSecureHandler(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const gate = requirePlatformAdmin(auth.user)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const routeParams = typeof params?.then === 'function' ? await params : params
  const id = safeStringId(routeParams?.id)
  if (!id) {
    return NextResponse.json({ error: 'Alert id required' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const resolved = Boolean(body.resolved)

  const admin = await resolvePlatformAdminRecord(auth.user)
  const resolvedBy = admin?.id || auth.user?.id || auth.user?.email || 'platform'

  const existing = await prisma.securityAlert.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  const updated = await prisma.securityAlert.update({
    where: { id },
    data: {
      resolved,
      resolvedAt: resolved ? new Date() : null,
      resolvedBy: resolved ? String(resolvedBy) : null,
    },
  })

  return NextResponse.json({ success: true, alert: updated })
})
