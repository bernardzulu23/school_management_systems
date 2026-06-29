export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireSecondarySchoolAccess } from '@/lib/subjects/eczAccess'
import { withSecureHandler } from '@/lib/middleware/secureApi'
import { safeRouteParam, safeQueryString } from '@/lib/security/safeQueryValue'
import { isEczManager } from '@/lib/ecz/routeAuth'

const ALLOWED_ACTIONS = new Set(['approve', 'revoke'])

export const PATCH = withSecureHandler(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isEczManager(auth.user)) {
    return NextResponse.json({ error: 'Only HOD or headteacher can approve' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const action = safeQueryString(body.action, { defaultValue: 'approve' })
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const existing = await prisma.specialAccommodation.findFirst({
    where: { id, schoolId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'revoke') {
    await prisma.specialAccommodation.update({
      where: { id },
      data: { approvedAt: null, approvedBy: null },
    })
    return NextResponse.json({ success: true, message: 'Approval revoked' })
  }

  const row = await prisma.specialAccommodation.update({
    where: { id },
    data: { approvedAt: new Date(), approvedBy: auth.user.id },
    include: { student: { select: { name: true } } },
  })
  return NextResponse.json({ success: true, message: 'Accommodation approved', data: row })
})

export const DELETE = withSecureHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!isEczManager(auth.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const eczCheck = await requireSecondarySchoolAccess(schoolId)
  if (!eczCheck.ok) return eczCheck.response

  const id = await safeRouteParam(params, 'id')
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await prisma.specialAccommodation.findFirst({ where: { id, schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.specialAccommodation.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Accommodation removed' })
})
