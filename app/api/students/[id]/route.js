import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request, { params }) {
  try {
    const auth = authMiddleware(request)
    if (!auth.isAuthenticated) return auth.response

    if (
      !roleCheck(auth.user, [
        'ADMIN',
        'headteacher',
        'HOD',
        'hod',
        'TEACHER',
        'teacher',
        'STUDENT',
        'student',
      ])
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = String(params?.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Student id is required' }, { status: 400 })

    const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
    if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_picture_url: true,
            contact_number: true,
          },
        },
        results: true,
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        subjectEnrollments: { include: { subject: true, class: true } },
        gamificationProfile: true,
      },
    })

    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Map user fields to top level
    const shaped = {
      ...student,
      email: student.user?.email ?? null,
      profilePicture: student.user?.profile_picture_url ?? null,
      contactNumber: student.user?.contact_number ?? null,
    }

    if (roleCheck(auth.user, ['STUDENT', 'student']) && student.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...shaped,
        updatedAt: student.updatedAt,
      },
    })
  } catch (error) {
    console.error('GET /api/students/[id] error:', error)
    return NextResponse.json({ error: 'Failed to load student' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const baseUpdatedAt = body.baseUpdatedAt ? new Date(body.baseUpdatedAt) : null
  const resolution = body.resolution ? String(body.resolution) : null

  const existing = await prisma.student.findFirst({
    where: { id: params.id, schoolId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (baseUpdatedAt && existing.updatedAt.getTime() !== baseUpdatedAt.getTime() && !resolution) {
    return NextResponse.json(
      {
        success: false,
        conflict: true,
        server: { ...existing, updatedAt: existing.updatedAt },
      },
      { status: 409 }
    )
  }

  if (resolution === 'keep_server') {
    return NextResponse.json({
      success: true,
      data: { ...existing, updatedAt: existing.updatedAt },
    })
  }

  const allowed = [
    'name',
    'class',
    'exam_number',
    'selected_subjects',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'emergency_contact_address',
    'blood_type',
    'medical_aid_scheme',
    'medical_aid_number',
    'family_doctor_name',
    'family_doctor_contact',
    'medical_conditions',
    'allergies',
  ]

  const data = {}
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const updated = await prisma.$transaction(async (tx) => {
    const yearGroup = body.year_group ? String(body.year_group).trim() : null
    const section = body.section ? String(body.section).trim() : null
    const classNameFromParts = yearGroup && section ? `${yearGroup}${section}` : null

    const classId = body.classId ? String(body.classId).trim() : null
    const classRecord = classId
      ? await tx.class.findFirst({
          where: { id: classId, schoolId },
          select: { id: true, name: true },
        })
      : classNameFromParts
        ? await tx.class.upsert({
            where: { schoolId_name: { schoolId, name: classNameFromParts } },
            create: {
              schoolId,
              name: classNameFromParts,
              year_group: yearGroup,
              section,
            },
            update: {},
            select: { id: true, name: true },
          })
        : null

    if (classRecord) {
      data.class = classRecord.name
    }

    const studentUpdated = await tx.student.update({
      where: { id: existing.id },
      data,
    })

    if (existing.userId) {
      const userUpdates = {}
      if (body.user?.name !== undefined) userUpdates.name = String(body.user.name)
      if (body.user?.email !== undefined) userUpdates.email = String(body.user.email)
      if (body.user?.contact_number !== undefined)
        userUpdates.contact_number = String(body.user.contact_number)

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdates,
        })
      }
    }

    const subjects = Array.isArray(body.selected_subjects)
      ? body.selected_subjects.map(String).filter(Boolean)
      : null

    if (subjects && classRecord) {
      const subjectRecords = await Promise.all(
        subjects.map((subjectName) =>
          tx.subject.upsert({
            where: { schoolId_name: { schoolId, name: subjectName } },
            create: { schoolId, name: subjectName, topics: [] },
            update: {},
            select: { id: true },
          })
        )
      )

      await tx.pupilSubjectEnrollment.deleteMany({
        where: { schoolId, pupilId: existing.id },
      })

      await tx.pupilSubjectEnrollment.createMany({
        data: subjectRecords.map((s) => ({
          schoolId,
          pupilId: existing.id,
          subjectId: s.id,
          classId: classRecord.id,
        })),
        skipDuplicates: true,
      })
    }

    return studentUpdated
  })

  return NextResponse.json({ success: true, data: { ...updated, updatedAt: updated.updatedAt } })
}

export async function DELETE(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.student.findFirst({
    where: { id: params.id, schoolId },
    select: { id: true, userId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    await tx.pupilSubjectEnrollment.deleteMany({ where: { schoolId, pupilId: existing.id } })
    await tx.student.delete({ where: { id: existing.id } })
    if (existing.userId) {
      await tx.user.delete({ where: { id: existing.userId } })
    }
  })

  return NextResponse.json({ success: true })
}
