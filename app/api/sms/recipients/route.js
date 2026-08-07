/**
 * SMS recipients — parents (default) or teachers.
 */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { normalizeZmPhoneNumber } from '@/lib/sms'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'
import prisma from '@/lib/prisma'

const RECIPIENT_STUDENT_LIMIT = 500
const RECIPIENT_TEACHER_LIMIT = 500

function collectParentPhones(student) {
  const raw = [
    student.parent_father_contact,
    student.parent_mother_contact,
    student.guardian_contact,
    student.emergency_contact_phone,
  ]
  return raw.map(normalizeZmPhoneNumber).filter(Boolean)
}

export const GET = withErrorHandler(async function GET(request) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod', 'TEACHER', 'teacher'])) {
    throw new ApiError('You are not authorized to load SMS recipients', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const classId = safeStringId(searchParams.get('classId'))
  const source = safeQueryString(searchParams.get('source'), { defaultValue: 'parents' })
    .toLowerCase()
    .trim()

  if (source === 'teachers') {
    if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HOD', 'hod'])) {
      throw new ApiError('Only headteachers and HODs can load teacher SMS contacts', 403)
    }

    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: {
        id: true,
        user: { select: { id: true, name: true, contact_number: true, email: true } },
      },
      take: RECIPIENT_TEACHER_LIMIT,
    })

    const phones = new Set()
    const rows = []
    for (const t of teachers) {
      const phone = normalizeZmPhoneNumber(t.user?.contact_number)
      if (!phone || phones.has(phone)) continue
      phones.add(phone)
      rows.push({
        phone,
        teacherName: t.user?.name || 'Teacher',
        teacherId: t.id,
        source: 'teachers',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        count: rows.length,
        recipients: rows,
        phoneNumbers: [...phones],
      },
    })
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      ...(classId ? { classId } : {}),
    },
    select: {
      id: true,
      name: true,
      class: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
      emergency_contact_phone: true,
    },
    take: RECIPIENT_STUDENT_LIMIT,
  })

  const phones = new Set()
  const rows = []

  for (const s of students) {
    const nums = collectParentPhones(s)
    for (const phone of nums) {
      if (!phones.has(phone)) {
        phones.add(phone)
        rows.push({
          phone,
          studentName: s.name,
          className: s.class,
          source: 'parents',
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      count: rows.length,
      recipients: rows,
      phoneNumbers: [...phones],
    },
  })
})
