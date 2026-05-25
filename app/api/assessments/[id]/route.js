import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const assessment = await prisma.assessment.findFirst({
    where: { id: routeParams.id, schoolId },
  })

  if (!assessment) throw new ApiError('Assessment not found', 404)

  return NextResponse.json({ success: true, data: assessment })
})

export const PUT = withErrorHandler(async function PUT(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const data = await request.json().catch(() => ({}))
  const classId = data.classId ? String(data.classId).trim() : ''
  const className = data.class ? String(data.class).trim() : ''

  const classRecord = classId
    ? await prisma.class.findFirst({
        where: { schoolId, id: classId },
        select: { id: true, name: true },
      })
    : className
      ? await prisma.class.findFirst({
          where: { schoolId, name: { equals: className, mode: 'insensitive' } },
          select: { id: true, name: true },
        })
      : null

  const updated = await prisma.assessment.updateMany({
    where: { id: routeParams.id, schoolId },
    data: {
      ...(data.title !== undefined ? { title: String(data.title) } : {}),
      ...(data.type !== undefined ? { type: String(data.type) } : {}),
      ...(data.subject !== undefined ? { subject: String(data.subject) } : {}),
      ...(classId || className
        ? { classId: classRecord?.id || null, class: classRecord?.name || className }
        : {}),
      ...(data.date ? { date: new Date(data.date) } : {}),
      ...(data.duration_minutes !== undefined
        ? { duration_minutes: Number.parseInt(data.duration_minutes) || 60 }
        : {}),
      ...(data.description !== undefined
        ? { description: data.description ? String(data.description) : null }
        : {}),
    },
  })

  if (updated.count === 0) throw new ApiError('Assessment not found', 404)

  const assessment = await prisma.assessment.findFirst({ where: { id: routeParams.id, schoolId } })
  return NextResponse.json({ success: true, data: assessment })
})

export const DELETE = withErrorHandler(async function DELETE(request, { params }) {
  const routeParams = await params
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const deleted = await prisma.assessment.deleteMany({
    where: { id: routeParams.id, schoolId },
  })

  if (deleted.count === 0) throw new ApiError('Assessment not found', 404)

  return NextResponse.json({ success: true })
})
