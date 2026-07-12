export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { authorizeSicAdmin } from '@/lib/sic/routeAuth'
import { getActiveSicAssignment } from '@/lib/sic/sicAccess'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { safeStringId } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const admin = await authorizeSicAdmin(request)
  if (admin.ok) {
    const assignments = await prisma.sicAssignment.findMany({
      where: { schoolId, active: true, revokedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            teacherProfile: { select: { id: true, department: true } },
          },
        },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: assignments })
  }

  const own = await getActiveSicAssignment(prisma, auth.user.id, schoolId)
  if (!own) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ success: true, data: [own] })
})

export const POST = withErrorHandler(async function POST(request) {
  const authz = await authorizeSicAdmin(request)
  if (!authz.ok) return authz.response

  const { auth, schoolId } = authz
  const body = await request.json().catch(() => ({}))
  const teacherId = safeStringId(body?.teacherId)
  if (!teacherId) throw new ApiError('teacherId is required', 400)

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    select: { id: true, userId: true },
  })
  if (!teacher?.userId) throw new ApiError('Teacher not found', 404)

  const assignment = await prisma.sicAssignment.upsert({
    where: { userId: teacher.userId },
    create: {
      schoolId,
      userId: teacher.userId,
      assignedById: auth.user.id,
      active: true,
      revokedAt: null,
    },
    update: {
      schoolId,
      assignedById: auth.user.id,
      active: true,
      revokedAt: null,
      assignedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          teacherProfile: { select: { id: true, department: true } },
        },
      },
      assignedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: assignment }, { status: 201 })
})
