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
  entityName?: string
}

export type FeasibilityUiConflict = {
  id: string
  type: 'FEASIBILITY_ERROR'
  severity: 'error'
  description: string
  suggestedFix: string
  code: string
  entityId?: string
  entityName?: string
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

function aggregatePeriodsByTeacher(allocations: SchedulerAllocation[]) {
  const map = new Map<string, { name: string; total: number }>()
  for (const a of allocations) {
    const tid = String(a.teacherId)
    const periods = Number(a.periodsPerWeek || 0)
    if (periods <= 0) continue
    const name = String(a.teacher?.name || tid).trim() || tid
    const row = map.get(tid) || { name, total: 0 }
    row.total += periods
    map.set(tid, row)
  }
  return map
}

function aggregatePeriodsByClass(allocations: SchedulerAllocation[]) {
  const map = new Map<string, { name: string; total: number }>()
  for (const a of allocations) {
    const cid = String(a.classId)
    const periods = Number(a.periodsPerWeek || 0)
    if (periods <= 0) continue
    const name = String(a.class?.name || cid).trim() || cid
    const row = map.get(cid) || { name, total: 0 }
    row.total += periods
    map.set(cid, row)
  }
  return map
}

export function mapPreflightBlockingToConflicts(
  blocking: PreflightWarning[]
): FeasibilityUiConflict[] {
  return (blocking || []).map((b, i) => ({
    id: `feasibility_${i + 1}`,
    type: 'FEASIBILITY_ERROR',
    severity: 'error',
    description: b.message,
    suggestedFix:
      b.code === 'TEACHER_OVERLOAD' || b.code === 'CLASS_OVERLOAD'
        ? 'Reduce allocations in Department Allocations before generating.'
        : 'Adjust the bell schedule, locks, or HOD allocations before generating.',
    code: b.code,
    entityId: b.entityId,
    entityName: b.entityName,
  }))
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
  const availableSlotsPerWeek = teachingSlots
  const blocks = expandAllocationsIntoBlocks(allocations)
  const breakAfterPeriods = deriveBreakAfterPeriods(daySlots)
  const classDemand = blockDemandByEntity(blocks, 'classId')
  const teacherDemand = blockDemandByEntity(blocks, 'teacherId')
  const teacherPeriods = aggregatePeriodsByTeacher(allocations)
  const classPeriods = aggregatePeriodsByClass(allocations)

  for (const [classId, row] of classPeriods.entries()) {
    if (row.total > availableSlotsPerWeek) {
      const message = `${row.name} is over-allocated: ${row.total} periods assigned but only ${availableSlotsPerWeek} slots available per week. Reduce allocations in Department Allocations before generating.`
      blocking.push({
        code: 'CLASS_OVERLOAD',
        message,
        entityId: classId,
        entityName: row.name,
      })
      details.push(message)
    } else if (row.total > availableSlotsPerWeek * 0.92) {
      warnings.push({
        code: 'CLASS_TIGHT',
        message: `${row.name} timetable is very tight: ${row.total}/${availableSlotsPerWeek} periods.`,
        entityId: classId,
        entityName: row.name,
      })
    }
  }

  for (const [teacherId, row] of teacherPeriods.entries()) {
    if (row.total > availableSlotsPerWeek) {
      const message = `Teacher ${row.name} is over-allocated: ${row.total} periods assigned but only ${availableSlotsPerWeek} slots available per week. Reduce allocations in Department Allocations before generating.`
      blocking.push({
        code: 'TEACHER_OVERLOAD',
        message,
        entityId: teacherId,
        entityName: row.name,
      })
      details.push(message)
    } else if (row.total > availableSlotsPerWeek * 0.85) {
      warnings.push({
        code: 'TEACHER_TIGHT',
        message: `Teacher ${row.name} load is high (${row.total}/${availableSlotsPerWeek} periods).`,
        entityId: teacherId,
        entityName: row.name,
      })
    }
  }

  for (const [classId, demand] of classDemand.entries()) {
    if (demand > availableSlotsPerWeek) {
      if (!blocking.some((b) => b.code === 'CLASS_OVERLOAD' && b.entityId === classId)) {
        const name = classPeriods.get(classId)?.name || classId
        const message = `${name} requires ${demand} lesson blocks but only ${availableSlotsPerWeek} slot positions are available (${days} days × ${ppd} periods).`
        blocking.push({
          code: 'CLASS_BLOCK_OVERLOAD',
          message,
          entityId: classId,
          entityName: name,
        })
        details.push(message)
      }
    }
  }

  for (const [teacherId, demand] of teacherDemand.entries()) {
    if (demand > availableSlotsPerWeek) {
      if (!blocking.some((b) => b.code === 'TEACHER_OVERLOAD' && b.entityId === teacherId)) {
        const name = teacherPeriods.get(teacherId)?.name || teacherId
        const message = `Teacher ${name} requires ${demand} lesson blocks but only ${availableSlotsPerWeek} slot positions are available per week.`
        blocking.push({
          code: 'TEACHER_BLOCK_OVERLOAD',
          message,
          entityId: teacherId,
          entityName: name,
        })
        details.push(message)
      }
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
        message:
          blocking[0]?.message ||
          'Timetable allocations cannot fit the bell schedule. Reduce allocations before generating.',
        details: details.length ? details : blocking.map((b) => b.message),
      }

  return { ok, warnings, blocking, infeasibility }
}
