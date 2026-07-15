export const dynamic = 'force-dynamic'
/**
 * GET/POST school timetable hours + schedulingRules (session rules A/B; optional teacher workload caps:
 * maxPeriodsPerDay / maxConsecutivePeriods / break coverage — each opt-in via *Enabled flags, default off).
 */
// app/api/timetable/config/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { syncTimeSlotsFromConfig } from '@/lib/timetable/syncTimeSlots'
import {
  buildTimeSlotsFromConfig,
  ensureTimetableConfig,
  normalizeTimetableConfig,
  resolveSchoolTimeSlots,
  validateTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { withErrorHandler } from '@/lib/middleware/errorHandler'

function mapDbSlot(s) {
  return {
    id: s.id,
    dayOfWeek: String(s.dayOfWeek || 'monday').toLowerCase(),
    startTime: s.startTime,
    endTime: s.endTime,
    period: Number(s.period) || 0,
    isBreak: Boolean(s.isBreak),
    isDouble: Boolean(s.isDouble),
    duration: s.duration != null ? Number(s.duration) : null,
    label: s.label || (s.isBreak ? s.breakName || 'Break' : `Period ${s.period}`),
  }
}

async function loadTimeSlotsFromDb(prisma, schoolId, normalized) {
  const dbSlots = await prisma.timeSlot.findMany({
    where: { schoolId },
    orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  })
  if (dbSlots.length) return dbSlots.map(mapDbSlot)
  return buildTimeSlotsFromConfig(normalized)
}

function configResponse(config, dbSlots) {
  const normalized = normalizeTimetableConfig(config)
  const slots = resolveSchoolTimeSlots(normalized, dbSlots)
  return NextResponse.json({
    config: normalized,
    timeSlots: slots,
    periodsPerDay: slots.filter((s) => s.dayOfWeek === 'monday' && !s.isBreak).length,
  })
}

export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const config = await ensureTimetableConfig(prisma, schoolId)
  await syncTimeSlotsFromConfig(prisma, schoolId).catch((err) => {
    console.warn('[timetable/config] syncTimeSlotsFromConfig:', err?.message)
  })
  const normalized = normalizeTimetableConfig(config)
  const dbSlots = await loadTimeSlotsFromDb(prisma, schoolId, normalized)
  return configResponse(config, dbSlots)
})

export const POST = withErrorHandler(async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

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
      doublePeriodDuration: normalized.doublePeriodDuration,
      workingDays: normalized.workingDays,
      breakSlots: normalized.breakSlots,
      schedulingRules: normalized.schedulingRules,
      ...(normalized.term ? { term: String(normalized.term) } : {}),
      ...(normalized.academicYear ? { academicYear: String(normalized.academicYear) } : {}),
    },
    create: {
      schoolId,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      singleDuration: normalized.singleDuration,
      doublePeriodDuration: normalized.doublePeriodDuration,
      workingDays: normalized.workingDays,
      breakSlots: normalized.breakSlots,
      schedulingRules: normalized.schedulingRules,
      ...(normalized.term ? { term: String(normalized.term) } : {}),
      ...(normalized.academicYear ? { academicYear: String(normalized.academicYear) } : {}),
    },
  })

  await syncTimeSlotsFromConfig(prisma, schoolId)

  const timeSlots = await loadTimeSlotsFromDb(prisma, schoolId, normalized)
  return configResponse(config, timeSlots)
})
