export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  // 1. Get User and School Data
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

  // 2. Get Teaching Assignments (Reuse logic from /api/teaching-assignments)
  let assignments = []

  // Resolve teacherId if user is a teacher
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
      // Fallback to virtual assignments if no explicit assignments exist
      const teacher = await prisma.teacher.findFirst({
        where: { id: resolvedTeacherId, schoolId },
        include: {
          classes: { select: { id: true, name: true } },
          subjects: { select: { id: true, name: true } },
        },
      })

      if (teacher) {
        for (const c of teacher.classes) {
          for (const s of teacher.subjects) {
            assignments.push({
              id: `virtual:${c.id}:${s.id}`,
              classId: c.id,
              className: c.name || null,
              subjectId: s.id,
              subjectName: s.name || null,
            })
          }
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
}
