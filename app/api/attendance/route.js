import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

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

  return NextResponse.json({ success: true })
})
