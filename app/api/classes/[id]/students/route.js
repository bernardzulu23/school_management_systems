import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request, { params }) {
  try {
    const { id } = params
    // In this route structure, the 'id' parameter corresponds to the class name
    // when accessing /api/classes/[className]/students
    const className = id

    // Decode URI component just in case (e.g. "Form%201A")
    const decodedClass = decodeURIComponent(className)

    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')

    const schoolId = await getSchoolIdFromRequest(request)

    if (subject) {
      const [classRecord, subjectRecord] = await Promise.all([
        schoolId
          ? prisma.class.findUnique({
              where: { schoolId_name: { schoolId, name: decodedClass } },
            })
          : Promise.resolve(null),
        schoolId
          ? prisma.subject.findUnique({
              where: { schoolId_name: { schoolId, name: subject } },
            })
          : Promise.resolve(null),
      ])

      if (schoolId && classRecord && subjectRecord) {
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
