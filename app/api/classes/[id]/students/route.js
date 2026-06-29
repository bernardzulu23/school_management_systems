export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam, safeQueryString } from '@/lib/security/safeQueryValue'

export const GET = withErrorHandler(async function GET(request, { params }) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['TEACHER', 'teacher', 'HOD', 'hod', 'ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const classNameParam = await safeRouteParam(params, 'id')
  if (!classNameParam) return NextResponse.json({ error: 'Invalid class' }, { status: 400 })

  const decodedClass = decodeURIComponent(classNameParam)
  const className = safeQueryString(decodedClass, { maxLength: 128 })
  if (!className) return NextResponse.json({ error: 'Invalid class' }, { status: 400 })

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const subject = safeQueryString(searchParams.get('subject'))

  if (subject) {
    const [classRecord, subjectRecord] = await Promise.all([
      prisma.class.findUnique({
        where: { schoolId_name: { schoolId, name: className } },
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
        take: 500,
      })

      return NextResponse.json({
        success: true,
        data: enrollments.map((e) => ({
          ...e.pupil,
          currentScore: null,
        })),
      })
    }
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      class: className,
      ...(subject ? { selected_subjects: { has: subject } } : {}),
    },
    orderBy: {
      name: 'asc',
    },
    take: 500,
  })

  return NextResponse.json({
    success: true,
    data: students.map((s) => ({
      ...s,
      currentScore: null,
    })),
  })
})
