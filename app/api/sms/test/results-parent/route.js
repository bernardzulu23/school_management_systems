export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  buildTermResultsCompleteSmsMessage,
  getSchoolPortalLoginUrls,
  getSchoolSmsFrom,
  normalizePhoneNumbers,
  sendOutboundSms,
} from '@/lib/sms'

/** DEV ONLY — test parent results-complete SMS (does not update ResultsStatus). */
export const POST = withErrorHandler(async function POST(request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId

  const body = await request.json().catch(() => ({}))
  let to = normalizePhoneNumbers(body?.to)
  let studentName = String(body?.studentName || '').trim()
  let schoolName = String(body?.schoolName || '').trim()
  let loginUrl = String(body?.loginUrl || '').trim()
  let studentEmail = String(body?.studentEmail || '').trim()
  let school = null

  const studentId = String(body?.studentId || '').trim()
  if (studentId && schoolId) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        name: true,
        user: { select: { email: true, name: true } },
        guardian_contact: true,
        parent_father_contact: true,
        parent_mother_contact: true,
      },
    })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    if (!to.length) {
      to = normalizePhoneNumbers([
        student.guardian_contact,
        student.parent_father_contact,
        student.parent_mother_contact,
      ])
    }
    studentName = studentName || student.name || student.user?.name || 'your child'
    studentEmail = studentEmail || String(student.user?.email || '').trim()
  }

  if (schoolId) {
    school = await prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true, subdomain: true, domain: true },
    })
    schoolName = schoolName || school?.name || 'School'
    if (!loginUrl) {
      loginUrl = getSchoolPortalLoginUrls(request, school).loginUrl
    }
  }

  if (!to.length) {
    return NextResponse.json(
      { error: 'to or studentId with parent contacts required' },
      { status: 400 }
    )
  }

  schoolName = schoolName || 'School'
  const message = buildTermResultsCompleteSmsMessage({
    studentName: studentName || 'your child',
    studentEmail,
    loginUrl,
    schoolName,
  })
  const from = getSchoolSmsFrom(school)

  const result = await sendOutboundSms({ to, message, from })

  return NextResponse.json({
    ok: result.ok,
    provider: result.provider,
    from,
    message,
    recipients: result.recipients,
    schoolName,
    reason: result.reason || null,
    response: result.response,
  })
})
