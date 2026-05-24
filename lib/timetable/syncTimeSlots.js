import {
  buildTimeSlotsFromConfig,
  ensureTimetableConfig,
  normalizeTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'

function timeToMin(t) {
  const [h, m] = String(t || '0:0')
    .split(':')
    .map(Number)
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

/**
 * Persist TimetableConfig grid rows into the TimeSlot table (required by the solver).
 */
export async function syncTimeSlotsFromConfig(prisma, schoolId) {
  const config = await ensureTimetableConfig(prisma, schoolId)
  const normalized = normalizeTimetableConfig(config)
  const built = buildTimeSlotsFromConfig(normalized)

  let upserted = 0
  for (const slot of built) {
    const dayOfWeek = String(slot.dayOfWeek || 'monday').toLowerCase()
    const period = Number(slot.period) || 0
    const existing = await prisma.timeSlot.findFirst({
      where: { schoolId, dayOfWeek, period },
      select: { id: true, isDouble: true },
    })

    const data = {
      startTime: String(slot.startTime || '08:00'),
      endTime: String(slot.endTime || '08:40'),
      isBreak: Boolean(slot.isBreak),
      label: slot.label ? String(slot.label) : null,
      breakName: slot.isBreak ? String(slot.label || 'Break') : null,
      duration: slot.isBreak
        ? timeToMin(slot.endTime) - timeToMin(slot.startTime)
        : Number(normalized.singleDuration),
      isDouble: existing?.isDouble ?? false,
    }

    if (existing) {
      await prisma.timeSlot.update({ where: { id: existing.id }, data })
    } else {
      await prisma.timeSlot.create({
        data: {
          schoolId,
          dayOfWeek,
          period,
          ...data,
        },
      })
    }
    upserted += 1
  }

  return { upserted, config: normalized }
}
