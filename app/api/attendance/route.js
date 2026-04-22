import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  buildAttendanceSmsMessage,
  normalizePhoneNumbers,
  pushSmsLog,
  sendAfricasTalkingSms,
} from '@/lib/sms'

export const GET = withErrorHandler(async function GET(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const classId = String(searchParams.get('classId') || '').trim()
  const dateStr = String(searchParams.get('date') || '').trim()
  if (!classId || !dateStr) {
    return NextResponse.json({ error: 'classId and date are required' }, { status: 400 })
  }

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )

  const students = await prisma.student.findMany({
    where: { schoolId, classId },
    select: { id: true },
  })
  const ids = students.map((s) => s.id)
  if (ids.length === 0) return NextResponse.json({ success: true, data: [] })

  const records = await prisma.attendance.findMany({
    where: { schoolId, date: normalized, studentId: { in: ids } },
    select: { studentId: true, status: true, remarks: true },
  })

  return NextResponse.json({ success: true, data: records })
})

export const POST = withErrorHandler(async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const rawBody = await request.json().catch(() => ({}))

  // Handle both { date, records: [] } and directly [ { studentId, date, status, remarks }, ... ]
  let dateStr = ''
  let records = []

  if (Array.isArray(rawBody)) {
    records = rawBody
  } else {
    dateStr = String(rawBody?.date || '')
    records = Array.isArray(rawBody?.records) ? rawBody.records : []
  }

  if (records.length === 0)
    return NextResponse.json({ error: 'records are required' }, { status: 400 })

  const validStatuses = ['present', 'absent', 'late', 'excused']

  const writes = records
    .map((r) => {
      const rDateStr = r.date || dateStr
      if (!rDateStr) return null

      const date = new Date(rDateStr)
      if (Number.isNaN(date.getTime())) return null

      const normalized = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      )

      const status = String(r?.status || '').toLowerCase()
      if (!validStatuses.includes(status)) return { error: `Invalid status: ${status}` }

      return {
        studentId: String(r?.studentId || ''),
        status,
        remarks: r?.remarks !== undefined ? String(r.remarks || '') : null,
        date: normalized,
      }
    })
    .filter(Boolean)

  const firstError = writes.find((w) => w.error)
  if (firstError) return NextResponse.json({ error: firstError.error }, { status: 400 })

  const finalWrites = writes.filter((w) => w.studentId && w.status && w.date)

  if (finalWrites.length === 0) {
    return NextResponse.json({ error: 'No valid records' }, { status: 400 })
  }

  await prisma.$transaction(
    finalWrites.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: r.date } },
        create: {
          schoolId,
          studentId: r.studentId,
          date: r.date,
          status: r.status,
          remarks: r.remarks,
        },
        update: {
          status: r.status,
          remarks: r.remarks,
        },
      })
    )
  )

  const notifyWrites = finalWrites.filter((r) => ['present', 'absent', 'late'].includes(r.status))
  let smsSummary = { attempted: 0, sent: 0, skipped: 0, failed: 0 }

  if (notifyWrites.length > 0) {
    const studentIds = Array.from(new Set(notifyWrites.map((r) => r.studentId)))

    const [school, students] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
      prisma.student.findMany({
        where: { schoolId, id: { in: studentIds } },
        select: {
          id: true,
          name: true,
          parent_father_contact: true,
          parent_mother_contact: true,
          guardian_contact: true,
        },
      }),
    ])

    const schoolName = school?.name || 'School'
    const studentById = new Map(students.map((s) => [s.id, s]))

    const results = await Promise.allSettled(
      notifyWrites.map(async (r) => {
        smsSummary.attempted += 1

        const student = studentById.get(r.studentId)
        if (!student) {
          smsSummary.skipped += 1
          return
        }

        const recipients = normalizePhoneNumbers([
          student.parent_father_contact,
          student.parent_mother_contact,
          student.guardian_contact,
        ])

        if (recipients.length === 0) {
          smsSummary.skipped += 1
          return
        }

        const message = buildAttendanceSmsMessage({
          schoolName,
          studentName: student.name,
          status: r.status,
          dateIso: r.date.toISOString(),
        })

        const sent = await sendAfricasTalkingSms({ to: recipients, message })

        pushSmsLog({
          direction: 'out',
          schoolId,
          to: sent.recipients,
          message,
          event: 'attendance_status',
          studentId: student.id,
          status: r.status,
          date: r.date.toISOString(),
        })

        smsSummary.sent += 1
      })
    )

    for (const r of results) {
      if (r.status === 'rejected') smsSummary.failed += 1
    }
  }

  return NextResponse.json({ success: true, sms: smsSummary })
})
