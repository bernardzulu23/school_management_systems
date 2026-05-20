export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request) {
  const auth = await authMiddleware(request)
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
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, name: true, year_group: true, section: true },
    })

    if (classRecord) {
      const yearGroup = String(classRecord.year_group || '').trim()
      const section = String(classRecord.section || '').trim()
      const compact = `${yearGroup}${section}`.trim()
      const spaced = `${yearGroup} ${section}`.trim()
      const classCandidates = Array.from(
        new Set(
          [
            classRecord.name,
            classRecord.id,
            yearGroup,
            compact,
            spaced,
            String(classRecord.name || '').replace(/\s+/g, ''),
          ]
            .map((v) => String(v || '').trim())
            .filter(Boolean)
        )
      )
      students = await prisma.student.findMany({
        where: {
          schoolId,
          OR: [{ classId: classRecord.id }, { class: { in: classCandidates } }],
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
