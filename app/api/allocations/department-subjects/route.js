export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { getHodProfile, resolveHodDepartmentIds } from '@/lib/utils/hodDepartmentScope'
import { canManageDepartmentAllocations, isSchoolAdminOrHead } from '@/lib/utils/hodAccess'
import { assertHodSchoolAccess } from '@/lib/school/hodAccess'

function uniqueNames(values) {
  const seen = new Set()
  const out = []
  for (const v of values) {
    const name = String(v || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  await assertHodSchoolAccess(schoolId)

  const hodProfile = await getHodProfile(prisma, auth.user.id, schoolId)
  if (!canManageDepartmentAllocations(auth.user, hodProfile)) {
    throw new ApiError('Forbidden', 403)
  }

  const { searchParams } = new URL(request.url)
  const departmentId = String(searchParams.get('departmentId') || '').trim()
  const teacherUserId = String(searchParams.get('teacherUserId') || '').trim()

  if (!departmentId) throw new ApiError('departmentId is required', 400)
  if (!teacherUserId) throw new ApiError('teacherUserId is required', 400)

  if (!isSchoolAdminOrHead(auth.user) && hodProfile) {
    const allowedIds = await resolveHodDepartmentIds(prisma, schoolId, hodProfile)
    if (allowedIds.length > 0 && !allowedIds.includes(departmentId)) {
      throw new ApiError('Department not in your scope', 403)
    }
  }

  const dept = await prisma.department.findFirst({
    where: { id: departmentId, schoolId },
    select: { id: true, name: true },
  })
  if (!dept) throw new ApiError('Department not found', 404)

  const teacher = await prisma.teacher.findFirst({
    where: { userId: teacherUserId, schoolId },
    select: {
      id: true,
      assignedSubjects: true,
      subjects: { select: { name: true } },
      departments: { where: { departmentId }, select: { departmentId: true } },
      teachingAssignments: {
        select: { subject: { select: { name: true } } },
        take: 100,
      },
    },
  })

  if (!teacher) throw new ApiError('Teacher not found', 404)

  let subjects = uniqueNames([
    ...(teacher.assignedSubjects || []),
    ...teacher.subjects.map((s) => s.name),
    ...teacher.teachingAssignments.map((a) => a.subject?.name),
  ])

  if (subjects.length === 0) {
    const match = await prisma.subject.findFirst({
      where: {
        schoolId,
        name: { equals: dept.name, mode: 'insensitive' },
      },
      select: { name: true },
    })
    if (match?.name) subjects = [match.name]
    else if (dept.name) subjects = [dept.name]
  }

  return NextResponse.json({
    success: true,
    subjects,
    autoSubject: subjects.length === 1 ? subjects[0] : null,
    department: { id: dept.id, name: dept.name },
    teacherId: teacher.id,
  })
})
