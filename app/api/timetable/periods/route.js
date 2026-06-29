export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import {
  ensureTimetableConfig,
  buildTimeSlotsFromConfig,
} from '@/lib/timetable/timeSlotsFromConfig'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { syncTimeSlotsFromConfig } from '@/lib/timetable/syncTimeSlots'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'

const PERIOD_SLOT_LIMIT = 50

function normalizeDay(day) {
  const s = String(day || 'monday')
    .trim()
    .toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(req.url)
  const dayParam = safeQueryString(searchParams.get('day'), { defaultValue: 'monday' })
  const dayKey = dayParam.toLowerCase()
  const includeBreaks = safeQueryString(searchParams.get('includeBreaks')) === 'true'

  await syncTimeSlotsFromConfig(prisma, schoolId).catch(() => {})

  const dbSlots = await prisma.timeSlot.findMany({
    where: { schoolId, dayOfWeek: dayKey },
    orderBy: [{ period: 'asc' }, { startTime: 'asc' }],
    take: PERIOD_SLOT_LIMIT,
  })

  let periods = dbSlots
  if (!periods.length) {
    const config = await ensureTimetableConfig(prisma, schoolId)
    const built = buildTimeSlotsFromConfig(config)
    periods = built.filter((s) => s.dayOfWeek === dayKey)
  }

  const filtered = includeBreaks ? periods : periods.filter((p) => !p.isBreak)

  return NextResponse.json({
    day: dayKey,
    dayLabel: normalizeDay(dayKey),
    periods: filtered.map((p) => ({
      id: p.id,
      dayOfWeek: p.dayOfWeek,
      periodNumber: p.period,
      periodName: p.label || (p.isBreak ? p.breakName || 'Break' : `Period ${p.period}`),
      startTime: p.startTime,
      endTime: p.endTime,
      duration: p.duration || null,
      isDouble: Boolean(p.isDouble),
      breakTime: Boolean(p.isBreak),
      breakName: p.breakName || null,
    })),
  })
})
