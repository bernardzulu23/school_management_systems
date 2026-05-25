import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'

export async function GET(request, { params }) {
  try {
    const auth = await authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response
    if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    // In this route structure, the 'id' parameter corresponds to the class name
    // when accessing /api/classes/[className]/students
    const className = id

    // Decode URI component just in case (e.g. "Form%201A")
    const decodedClass = decodeURIComponent(className)

    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')

    const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
    if (!tenant.ok) return tenant.response
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    if (subject) {
      const [classRecord, subjectRecord] = await Promise.all([
        prisma.class.findUnique({
          where: { schoolId_name: { schoolId, name: decodedClass } },
        }),
        prisma.subject.findUnique({
          where: { schoolId_name: { schoolId, name: subject } },
        }),
      ])

      if (classRecord && subjectRecord) {
        const enrollments = await prisma.pupilSubjectEnrollment.findMany({
          where: {
            schoolId,
            classId: classRecord.id,
            subjectId: subjectRecord.id,
          },
          include: {
            pupil: true,
          },
          orderBy: {
            pupil: { name: 'asc' },
          },
        })

        return NextResponse.json(
          enrollments.map((e) => ({
            ...e.pupil,
            currentScore: null,
          }))
        )
      }
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        class: decodedClass,
        ...(subject ? { selected_subjects: { has: subject } } : {}),
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(
      students.map((s) => ({
        ...s,
        currentScore: null,
      }))
    )
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
