export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withSecureApi } from '@/lib/middleware/secureApi'

const CAN_MANAGE = ['HOD', 'hod', 'ADMIN', 'headteacher', 'admin']

export const PATCH = withSecureApi(async function PATCH(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_MANAGE)) {
    return NextResponse.json({ error: 'Only HOD or headteacher can approve' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const routeParams = await params
  const id = String(routeParams?.id || '')
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || 'approve')

  const existing = await prisma.specialAccommodation.findFirst({
    where: { id, schoolId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
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
  } catch (error) {
    console.error('ECZ accommodation PATCH:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
})

export const DELETE = withSecureApi(async function DELETE(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, CAN_MANAGE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const routeParams = await params
  const id = String(routeParams?.id || '')

  const existing = await prisma.specialAccommodation.findFirst({ where: { id, schoolId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.specialAccommodation.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Accommodation removed' })
})
