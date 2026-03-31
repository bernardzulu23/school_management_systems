import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export async function POST(request) {
  const auth = authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(request))
  if (!schoolId) return NextResponse.json({ error: 'School context required' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const dateStr = String(body?.date || '')
  const records = Array.isArray(body?.records) ? body.records : []

  if (!dateStr) return NextResponse.json({ error: 'date is required' }, { status: 400 })
  if (records.length === 0)
    return NextResponse.json({ error: 'records are required' }, { status: 400 })

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )

  const writes = records
    .map((r) => ({
      studentId: String(r?.studentId || ''),
      status: String(r?.status || ''),
      remarks: r?.remarks !== undefined ? String(r.remarks || '') : null,
    }))
    .filter((r) => r.studentId && r.status)

  if (writes.length === 0) {
    return NextResponse.json({ error: 'No valid records' }, { status: 400 })
  }

  await prisma.$transaction(
    writes.map((r) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: normalized } },
        create: {
          schoolId,
          studentId: r.studentId,
          date: normalized,
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
}
