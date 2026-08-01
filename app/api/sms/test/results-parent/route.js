export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  buildTermResultsCompleteSmsMessage,
  getSchoolSmsFrom,
  normalizePhoneNumbers,
  sendOutboundSms,
} from '@/lib/sms'
import { RESULT_TYPES } from '@/lib/results/resultTypes'

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
  let school = null
  let gradeRows = Array.isArray(body?.results) ? body.results : null

  const studentId = String(body?.studentId || '').trim()
  const term = String(body?.term || 'Term 1').trim()
  const year = Number(body?.year) || new Date().getFullYear()

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

    if (!gradeRows) {
      const finalized = await prisma.result.findMany({
        where: {
          schoolId,
          studentId,
          term,
          year,
          resultType: RESULT_TYPES.END_OF_TERM,
          workflowStatus: 'finalized',
        },
        select: {
          score: true,
          grade: true,
          subject: { select: { name: true } },
        },
        take: 50000,
      })
      gradeRows = (finalized || []).map((r) => ({
        subjectName: r.subject?.name || 'Subject',
        score: r.score,
        grade: r.grade,
      }))
    }
  }

  if (schoolId) {
    school = await prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true, subdomain: true, domain: true },
    })
    schoolName = schoolName || school?.name || 'School'
  }

  if (!to.length) {
    return NextResponse.json(
      { error: 'to or studentId with parent contacts required' },
      { status: 400 }
    )
  }

  if (!gradeRows || gradeRows.length === 0) {
    gradeRows = [
      { subjectName: 'Mathematics', score: 67, grade: 'C' },
      { subjectName: 'English', score: 50, grade: 'D' },
    ]
  }

  schoolName = schoolName || 'School'
  const message = buildTermResultsCompleteSmsMessage({
    studentName: studentName || 'your child',
    schoolName,
    results: gradeRows,
  })

  if (!message) {
    return NextResponse.json({ error: 'No finalized results for SMS' }, { status: 400 })
  }

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
