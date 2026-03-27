import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function GET(request, { params }) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const student = await prisma.student.findFirst({
    where: { id: params.id, schoolId },
    include: { user: true },
  })

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (roleCheck(auth.user, ['STUDENT', 'student']) && student.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

  return NextResponse.json({
    success: true,
    data: {
      ...student,
      updatedAt: student.updatedAt,
    },
  })
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

  const updated = await prisma.student.update({
    where: { id: existing.id },
    data,
  })

  return NextResponse.json({ success: true, data: { ...updated, updatedAt: updated.updatedAt } })
}
