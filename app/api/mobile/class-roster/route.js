import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const subjectId = searchParams.get('subjectId')
  const includeFaceData = searchParams.get('includeFaceData') === 'true'

  if (!classId) {
    return NextResponse.json({ error: 'classId is required' }, { status: 400 })
  }

  let students = []

  if (subjectId) {
    // Query PupilSubjectEnrollment to get only students enrolled in BOTH classId AND subjectId
    const enrollments = await prisma.pupilSubjectEnrollment.findMany({
      where: {
        schoolId,
        classId,
        subjectId,
      },
      include: {
        pupil: true,
      },
    })
    students = enrollments.map((e) => e.pupil)
  } else {
    // Return all students in the class via Student.class field match
    // Note: The schema has Student.class as a String (e.g., 'Form 1A')
    // but also a Class model. Let's find the class name first if classId is a UUID.
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { name: true },
    })

    if (classRecord) {
      students = await prisma.student.findMany({
        where: {
          schoolId,
          class: classRecord.name,
        },
      })
    }
  }

  const responseData = students.map((s) => ({
    id: s.id,
    name: s.name,
    class: s.class,
    qrCode: s.exam_number || null, // Using exam_number as QR code if available
    faceEmbedding: includeFaceData ? s.faceEmbedding : null,
  }))

  return NextResponse.json(responseData)
}
