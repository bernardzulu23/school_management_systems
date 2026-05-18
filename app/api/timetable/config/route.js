export const dynamic = 'force-dynamic'
// app/api/timetable/config/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import {
  buildTimeSlotsFromConfig,
  ensureTimetableConfig,
  normalizeTimetableConfig,
  validateTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'

function configResponse(config) {
  const normalized = normalizeTimetableConfig(config)
  const timeSlots = buildTimeSlotsFromConfig(normalized)
  return NextResponse.json({
    config: normalized,
    timeSlots,
    periodsPerDay: timeSlots.filter((s) => s.dayOfWeek === 'monday' && !s.isBreak).length,
  })
}

export async function GET(req) {
  const user = await getAuthUser(req)
  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const config = await ensureTimetableConfig(prisma, schoolId)
  return configResponse(config)
}

export async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json(
      { error: 'Only school administrators can change timetable hours' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const { valid, errors, config: normalized } = validateTimetableConfig(body)
  if (!valid) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 })
  }

  const config = await prisma.timetableConfig.upsert({
    where: { schoolId },
    update: {
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      singleDuration: normalized.singleDuration,
      workingDays: normalized.workingDays,
      breakSlots: normalized.breakSlots,
    },
    create: {
      schoolId,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      singleDuration: normalized.singleDuration,
      workingDays: normalized.workingDays,
      breakSlots: normalized.breakSlots,
    },
  })

  return configResponse(config)
}
