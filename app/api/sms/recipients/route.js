export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { withErrorHandler, ApiError } from '@/lib/middleware/errorHandler'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { normalizeZmPhoneNumber } from '@/lib/sms'
import prisma from '@/lib/prisma'

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
    throw new ApiError('Forbidden', 403)
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) throw new ApiError('School context required', 400)

  const { searchParams } = new URL(request.url)
  const classId = searchParams.get('classId')
  const source = searchParams.get('source') || 'parents'

  const where = { schoolId }
  if (classId) where.classId = classId

  const students = await prisma.student.findMany({
    where,
    select: {
      id: true,
      name: true,
      class: true,
      parent_father_contact: true,
      parent_mother_contact: true,
      guardian_contact: true,
      emergency_contact_phone: true,
    },
    take: 5000,
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
          source,
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
