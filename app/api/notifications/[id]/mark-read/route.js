export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

export const PATCH = withErrorHandler(async function PATCH(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const row = await prisma.notification.findFirst({
    where: { id, userId: auth.user.id, schoolId },
  })
  if (!row) throw new ApiError('Not found', 404)

  const updateResult = await prisma.notification.updateMany({
    where: { id, userId: auth.user.id, schoolId },
    data: {
      readAt: new Date(),
      status: row.status === 'SENT' || row.status === 'QUEUED' ? 'READ' : row.status,
    },
  })
  if (updateResult.count === 0) throw new ApiError('Not found', 404)

  const updated = await prisma.notification.findFirst({
    where: { id, userId: auth.user.id, schoolId },
  })

  return NextResponse.json({ success: true, data: updated })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const id = await safeRouteParam(params, 'id')
  if (!id) throw new ApiError('id is required', 400)

  const row = await prisma.notification.findFirst({
    where: { id, userId: auth.user.id, schoolId },
  })
  if (!row) throw new ApiError('Not found', 404)

  const deleteResult = await prisma.notification.deleteMany({
    where: { id, userId: auth.user.id, schoolId },
  })
  if (deleteResult.count === 0) throw new ApiError('Not found', 404)
  return NextResponse.json({ success: true })
})
