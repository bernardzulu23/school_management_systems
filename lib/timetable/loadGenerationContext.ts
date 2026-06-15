/**
 * Load locked teacher period reservations for timetable generation.
 */
import type { PrismaClient } from '@prisma/client'
import { normalizeDay } from '@/lib/timetable/scheduler'
import type { LockedSlotReservation } from '@/lib/timetable/preflightFeasibility'
import { syncTimeSlotsFromConfig } from '@/lib/timetable/syncTimeSlots'

export type DbTimeSlotRow = {
  id: string
  dayOfWeek: string
  period: number
  startTime: string
  endTime: string
  isBreak: boolean
}

export async function loadSchoolTimeSlots(
  prisma: PrismaClient,
  schoolId: string
): Promise<DbTimeSlotRow[]> {
  let rows = await prisma.timeSlot.findMany({
    where: { schoolId },
    orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  })
  if (!rows.length) {
    await syncTimeSlotsFromConfig(prisma, schoolId)
    rows = await prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    })
  }
  return rows.map((s) => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    period: s.period,
    startTime: s.startTime,
    endTime: s.endTime,
    isBreak: s.isBreak,
  }))
}

export async function loadLockedSlotReservations(
  prisma: PrismaClient,
  schoolId: string
): Promise<LockedSlotReservation[]> {
  const assignments = await prisma.teacherPeriodAssignment.findMany({
    where: { schoolId, lockedForGeneration: true },
    select: {
      teacherId: true,
      timeSlotId: true,
      timeSlot: {
        select: { dayOfWeek: true, period: true, isBreak: true },
      },
    },
  })

  const out: LockedSlotReservation[] = []
  for (const a of assignments) {
    if (a.timeSlot?.isBreak) continue
    out.push({
      teacherId: String(a.teacherId),
      day: normalizeDay(a.timeSlot?.dayOfWeek || 'monday'),
      periodNumber: Number(a.timeSlot?.period) || 1,
      timeSlotId: String(a.timeSlotId),
    })
  }
  return out
}
