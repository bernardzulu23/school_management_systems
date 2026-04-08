import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (!roleCheck(auth.user, ['STUDENT', 'student'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const student = await prisma.student.findFirst({
      where: { schoolId, userId: auth.user.id },
      select: { id: true, classId: true, class: true, selected_subjects: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Fetch Upcoming Assessments
    const upcoming = await prisma.assessment.findMany({
      where: {
        schoolId,
        ...(student.classId ? { classId: student.classId } : { class: student.class }),
        ...(Array.isArray(student.selected_subjects) && student.selected_subjects.length > 0
          ? { subject: { in: student.selected_subjects } }
          : {}),
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 50,
    })

    const results = await prisma.result.findMany({
      where: {
        schoolId,
        studentId: student.id,
      },
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({
      success: true,
      data: {
        upcoming: upcoming.map((a) => ({
          id: a.id,
          title: a.title,
          subject: a.subject,
          type: a.type,
          date: a.date,
          duration_minutes: a.duration_minutes,
          classId: a.classId || null,
          class: a.class,
        })),
        completed: results.map((r) => ({
          id: r.id,
          subjectId: r.subjectId,
          subject: r.subject?.name || '',
          score: r.score,
          grade: r.grade,
          term: r.term,
          year: r.year,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Fetch student assessments error:', error)
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
  }
}
