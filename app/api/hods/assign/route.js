export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { requireHodSchoolAccess } from '@/lib/school/hodAccess'
import { requireFeature } from '@/lib/middleware/planGate-zambia'

export const POST = withErrorHandler(async function POST(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'hod-management')
  if (featureBlock) return featureBlock

  const hodLevelCheck = await requireHodSchoolAccess(schoolId)
  if (!hodLevelCheck.ok) return hodLevelCheck.response

  const body = await request.json()
  const teacherId = String(body?.teacherId || '')
  const departmentId = String(body?.departmentId || '')

  if (!teacherId || !departmentId) {
    throw new ApiError('teacherId and departmentId are required', 400)
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
    select: { id: true, userId: true },
  })
  if (!teacher) throw new ApiError('Teacher not found', 404)

  const department = await prisma.department.findFirst({
    where: { id: departmentId, schoolId },
    select: { id: true, name: true },
  })
  if (!department) throw new ApiError('Department not found', 404)

  const existingDeptHod = await prisma.headOfDepartment.findFirst({
    where: { schoolId, departmentId: department.id },
    select: { id: true, userId: true },
  })

  if (existingDeptHod && existingDeptHod.userId !== teacher.userId) {
    await prisma.headOfDepartment.deleteMany({
      where: { id: existingDeptHod.id, schoolId },
    })
  }

  await prisma.teacherDepartment.upsert({
    where: { teacherId_departmentId: { teacherId: teacher.id, departmentId: department.id } },
    create: { teacherId: teacher.id, departmentId: department.id, ...(schoolId ? {} : {}) },
    update: { ...(schoolId ? {} : {}) },
  })

  const hod = await prisma.headOfDepartment.upsert({
    where: { userId: teacher.userId },
    create: {
      schoolId,
      userId: teacher.userId,
      department: department.name,
      departmentId: department.id,
    },
    update: {
      department: department.name,
      departmentId: department.id,
    },
    include: { user: true, departmentRef: true },
  })

  return NextResponse.json({ success: true, data: hod })
})

export const DELETE = withErrorHandler(async function DELETE(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const isAdminOrHead = roleCheck(auth.user, ['ADMIN', 'headteacher'])
  const isHod = roleCheck(auth.user, ['HOD', 'hod'])
  if (!isAdminOrHead && !isHod) {
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const featureBlock = await requireFeature(schoolId, 'hod-management')
  if (featureBlock) return featureBlock

  const hodLevelCheck = await requireHodSchoolAccess(schoolId)
  if (!hodLevelCheck.ok) return hodLevelCheck.response

  const body = await request.json().catch(() => ({}))
  const hodId = String(body?.hodId || '')

  if (!hodId) throw new ApiError('hodId is required', 400)

  const existing = await prisma.headOfDepartment.findFirst({
    where: { id: hodId, schoolId },
    select: { id: true, userId: true },
  })
  if (!existing) throw new ApiError('HOD assignment not found', 404)

  if (isHod && !isAdminOrHead && String(existing.userId) !== String(auth.user.id)) {
    throw new ApiError('Forbidden', 403)
  }

  const deleteResult = await prisma.headOfDepartment.deleteMany({ where: { id: hodId, schoolId } })
  if (deleteResult.count === 0) throw new ApiError('HOD assignment not found', 404)
  return NextResponse.json({ success: true })
})
