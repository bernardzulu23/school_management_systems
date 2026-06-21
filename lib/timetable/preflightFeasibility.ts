import {
  consecutivePeriodsAreValid,
  deriveBreakAfterPeriods,
  expandAllocationsIntoBlocks,
  getCandidateSlots,
  normalizeDay,
  type DayPeriodSlot,
  type SchedulerAllocation,
} from '@/lib/timetable/scheduler'

export type LockedSlotReservation = {
  teacherId: string
  day: string
  periodNumber: number
  timeSlotId?: string
}

export type PreflightWarning = {
  code: string
  message: string
  entityId?: string
}

export type PreflightInfeasibility = {
  code: string
  message: string
  details: string[]
}

export type PreflightResult = {
  ok: boolean
  warnings: PreflightWarning[]
  blocking: PreflightWarning[]
  infeasibility?: PreflightInfeasibility
}

function countTeachingSlots(daySlots: Record<string, DayPeriodSlot[]>): number {
  let total = 0
  for (const day of Object.keys(daySlots)) {
    total += (daySlots[day] || []).filter((s) => s.type === 'period').length
  }
  return total
}

function periodsPerDay(daySlots: Record<string, DayPeriodSlot[]>): number {
  const firstDay = Object.keys(daySlots)[0]
  if (!firstDay) return 0
  return (daySlots[firstDay] || []).filter((s) => s.type === 'period').length
}

function blockDemandByEntity(
  blocks: ReturnType<typeof expandAllocationsIntoBlocks>,
  key: 'classId' | 'teacherId'
): Map<string, number> {
  const map = new Map<string, number>()
  for (const block of blocks) {
    const id = String(block[key])
    map.set(id, (map.get(id) || 0) + 1)
  }
  return map
}

function lockKey(teacherId: string, day: string, period: number) {
  return `${teacherId}|${normalizeDay(day)}|${period}`
}

/**
 * Preflight checks before timetable generation: capacity, teacher load, locks, break-span blocks.
 */
export function runPreflightFeasibility(opts: {
  allocations: SchedulerAllocation[]
  daySlots: Record<string, DayPeriodSlot[]>
  lockedSlots?: LockedSlotReservation[]
  singleMin?: number
}): PreflightResult {
  const warnings: PreflightWarning[] = []
  const blocking: PreflightWarning[] = []
  const details: string[] = []

  const { allocations, daySlots } = opts
  const singleMin = Math.max(1, Number(opts.singleMin) || 40)
  const lockedSlots = opts.lockedSlots || []

  const teachingSlots = countTeachingSlots(daySlots)
  const days = Object.keys(daySlots).length
  const ppd = periodsPerDay(daySlots)
  const availableSlotsPerClass = teachingSlots
  const blocks = expandAllocationsIntoBlocks(allocations)
  const breakAfterPeriods = deriveBreakAfterPeriods(daySlots)
  const classDemand = blockDemandByEntity(blocks, 'classId')
  const teacherDemand = blockDemandByEntity(blocks, 'teacherId')
  const teacherCapacity = teachingSlots

  for (const [classId, demand] of classDemand.entries()) {
    if (demand > availableSlotsPerClass) {
      blocking.push({
        code: 'CLASS_OVERLOAD',
        message: `Class ${classId} has ${demand} lesson blocks but only ${availableSlotsPerClass} slot positions available per week.`,
        entityId: classId,
      })
      details.push(
        `Class ${classId}: ${demand} lesson blocks required, ${availableSlotsPerClass} slot positions available (${days} days × ~${ppd} periods).`
      )
    } else if (demand > availableSlotsPerClass * 0.92) {
      warnings.push({
        code: 'CLASS_TIGHT',
        message: `Class ${classId} timetable is very tight: ${demand}/${availableSlotsPerClass} lesson blocks.`,
        entityId: classId,
      })
    }
  }

  for (const [teacherId, demand] of teacherDemand.entries()) {
    if (demand > teacherCapacity) {
      blocking.push({
        code: 'TEACHER_OVERLOAD',
        message: `Teacher ${teacherId} has ${demand} lesson blocks but only ${teacherCapacity} slot positions available per week.`,
        entityId: teacherId,
      })
      details.push(
        `Teacher ${teacherId}: ${demand} lesson blocks required, ${teacherCapacity} slot positions available.`
      )
    } else if (demand > teacherCapacity * 0.85) {
      warnings.push({
        code: 'TEACHER_TIGHT',
        message: `Teacher ${teacherId} load is high (${demand}/${teacherCapacity} lesson blocks).`,
        entityId: teacherId,
      })
    }
  }

  const lockCounts = new Map<string, number>()
  for (const lock of lockedSlots) {
    const key = lockKey(lock.teacherId, lock.day, lock.periodNumber)
    lockCounts.set(key, (lockCounts.get(key) || 0) + 1)
    if ((lockCounts.get(key) || 0) > 1) {
      blocking.push({
        code: 'LOCK_DUPLICATE',
        message: `Duplicate lock on teacher ${lock.teacherId} at ${lock.day} P${lock.periodNumber}.`,
        entityId: lock.teacherId,
      })
    }
  }

  for (const [teacherId, demand] of teacherDemand.entries()) {
    const locksForTeacher = lockedSlots.filter((l) => l.teacherId === teacherId).length
    if (locksForTeacher > demand) {
      warnings.push({
        code: 'LOCK_EXCESS',
        message: `Teacher ${teacherId} has ${locksForTeacher} locked slots but only ${demand} periods to schedule.`,
        entityId: teacherId,
      })
    }
  }

  for (const block of blocks) {
    if (block.span <= 1) continue
    const candidates = getCandidateSlots(block, daySlots, singleMin, breakAfterPeriods)
    if (candidates.length === 0) {
      blocking.push({
        code: 'BLOCK_NO_RUN',
        message: `No valid ${block.unitType} placement for allocation ${block.allocationId} (break-span rule).`,
        entityId: block.allocationId,
      })
      details.push(
        `${block.unitType} block ${block.blockId} cannot fit on any day without crossing break after P${breakAfterPeriods.join('/')}.`
      )
    }
  }

  for (const block of blocks) {
    if (block.span <= 1) continue
    let anyValid = false
    for (const day of Object.keys(daySlots)) {
      const periods = (daySlots[day] || [])
        .filter((s) => s.type === 'period')
        .map((s) => Number(s.periodNumber))
      for (const p of periods) {
        if (consecutivePeriodsAreValid(p, block.span, breakAfterPeriods)) {
          anyValid = true
          break
        }
      }
      if (anyValid) break
    }
    if (!anyValid && !blocking.some((b) => b.entityId === block.allocationId)) {
      blocking.push({
        code: 'BLOCK_IMPOSSIBLE',
        message: `${block.unitType} block for allocation ${block.allocationId} cannot span legally on this bell schedule.`,
        entityId: block.allocationId,
      })
    }
  }

  const ok = blocking.length === 0
  const infeasibility: PreflightInfeasibility | undefined = ok
    ? undefined
    : {
        code: blocking[0]?.code || 'INFEASIBLE',
        message: blocking[0]?.message || 'Timetable inputs are infeasible.',
        details: details.length ? details : blocking.map((b) => b.message),
      }

  return { ok, warnings, blocking, infeasibility }
}
