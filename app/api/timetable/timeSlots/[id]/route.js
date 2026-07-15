export const dynamic = 'force-dynamic'
/**
 * Bell schedule period editing (start/end, break, double-period continuation).
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { timeToMin } from '@/lib/timetable/timeSlotsFromConfig'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeRouteParam } from '@/lib/security/safeQueryValue'

function formatHHMM(totalMin) {
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

async function resolveDoublePeriodEnd(prisma, schoolId, slot, isDouble) {
  if (!isDouble || slot.isBreak) {
    return { endTime: slot.endTime, duration: timeToMin(slot.endTime) - timeToMin(slot.startTime) }
  }

  const config = await prisma.timetableConfig.findUnique({
    where: { schoolId },
    select: { doublePeriodDuration: true, singleDuration: true },
  })
  const doubleMin = Number(config?.doublePeriodDuration || config?.singleDuration * 2 || 80)

  const daySlots = await prisma.timeSlot.findMany({
    where: { schoolId, dayOfWeek: slot.dayOfWeek, isBreak: false },
    orderBy: { period: 'asc' },
  })
  const idx = daySlots.findIndex((s) => s.id === slot.id)
  const next = idx >= 0 ? daySlots[idx + 1] : null

  if (next) {
    return {
      endTime: next.endTime,
      duration: timeToMin(next.endTime) - timeToMin(slot.startTime),
      continuationSlotId: next.id,
    }
  }

  const endMin = timeToMin(slot.startTime) + doubleMin
  return {
    endTime: formatHHMM(endMin),
    duration: doubleMin,
  }
}

export const PATCH = withErrorHandler(async function PATCH(req, { params }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const slotId = await safeRouteParam(params, 'id')
  if (!slotId) return NextResponse.json({ error: 'Slot id required' }, { status: 400 })

  const existing = await prisma.timeSlot.findFirst({
    where: { id: slotId, schoolId },
  })
  if (!existing) return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  let startTime = body?.startTime ? String(body.startTime).slice(0, 5) : existing.startTime
  let endTime = body?.endTime ? String(body.endTime).slice(0, 5) : existing.endTime
  const label = body?.label != null ? String(body.label) : existing.label
  const isDouble = body?.isDouble != null ? Boolean(body.isDouble) : existing.isDouble

  if (isDouble && body?.isDouble === true) {
    const resolved = await resolveDoublePeriodEnd(
      prisma,
      schoolId,
      { ...existing, startTime },
      true
    )
    endTime = resolved.endTime
    if (resolved.continuationSlotId) {
      await prisma.timeSlot.updateMany({
        where: { id: resolved.continuationSlotId, schoolId },
        data: { isDouble: false, duration: null },
      })
    }
  } else if (body?.isDouble === false && existing.isDouble) {
    const config = await prisma.timetableConfig.findUnique({
      where: { schoolId },
      select: { singleDuration: true },
    })
    const singleMin = Number(config?.singleDuration || 40)
    endTime = formatHHMM(timeToMin(startTime) + singleMin)
  }

  if (timeToMin(endTime) <= timeToMin(startTime)) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  }

  const duration = timeToMin(endTime) - timeToMin(startTime)

  const updateResult = await prisma.timeSlot.updateMany({
    where: { id: existing.id, schoolId },
    data: {
      startTime,
      endTime,
      label,
      isDouble,
      duration,
    },
  })
  if (updateResult.count === 0) {
    return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })
  }
  const updated = await prisma.timeSlot.findFirst({
    where: { id: existing.id, schoolId },
  })

  return NextResponse.json({ period: updated })
})
