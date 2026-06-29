export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

const STAFF_ROLES = ['TEACHER', 'teacher', 'ADMIN', 'headteacher', 'HOD', 'hod']
const ASSIGNMENT_LIMIT = 100

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, STAFF_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const [dbUser, school] = await Promise.all([
    prisma.user.findFirst({
      where: { id: auth.user.id, schoolId },
      select: { id: true, name: true, role: true },
    }),
    prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true, logo_url: true },
    }),
  ])

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let assignments = []

  let resolvedTeacherId = null
  if (roleCheck(dbUser, ['TEACHER', 'teacher'])) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    })
    resolvedTeacherId = teacher?.id || null
  }

  if (resolvedTeacherId) {
    const dbAssignments = await prisma.teachingAssignment.findMany({
      where: {
        schoolId,
        teacherId: resolvedTeacherId,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      take: ASSIGNMENT_LIMIT,
    })

    if (dbAssignments.length > 0) {
      assignments = dbAssignments.map((a) => ({
        id: a.id,
        classId: a.classId,
        className: a.class?.name || null,
        subjectId: a.subjectId,
        subjectName: a.subject?.name || null,
      }))
    } else {
      const teacher = await prisma.teacher.findFirst({
        where: { id: resolvedTeacherId, schoolId },
        include: {
          classes: { select: { id: true, name: true }, take: 50 },
          subjects: { select: { id: true, name: true }, take: 50 },
        },
      })

      if (teacher) {
        for (const c of teacher.classes) {
          for (const s of teacher.subjects) {
            if (assignments.length >= ASSIGNMENT_LIMIT) break
            assignments.push({
              id: `virtual:${c.id}:${s.id}`,
              classId: c.id,
              className: c.name || null,
              subjectId: s.id,
              subjectName: s.name || null,
            })
          }
          if (assignments.length >= ASSIGNMENT_LIMIT) break
        }
      }
    }
  }

  return NextResponse.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      role: dbUser.role,
    },
    school: {
      name: school?.name || null,
      logoUrl: school?.logo_url || null,
    },
    assignments,
  })
})
