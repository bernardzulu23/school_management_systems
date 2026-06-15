import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import {
  ensureTimetableConfig,
  normalizeWorkingDays,
  parseBreakSlots,
  timeToMin,
  minToTime,
} from '@/lib/timetable/timeSlotsFromConfig'
import { type DayPeriodSlot } from '@/lib/timetable/scheduler'
import { hybridGenerateTimetable, mergePlacements } from '@/lib/timetable/hybridGenerate'
import { resolveConflictsWithLLM } from '@/lib/timetable/llm-resolver'
import { requireSchoolType } from '@/lib/middleware/individual-gate'
import {
  loadLockedSlotReservations,
  loadSchoolTimeSlots,
} from '@/lib/timetable/loadGenerationContext'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req as any, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
  if (!typeCheck.allowed) return typeCheck.response

  const config = await prisma.timetableConfig.findUnique({ where: { schoolId } })
  return NextResponse.json({ config })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req as any, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
  if (!typeCheck.allowed) return typeCheck.response

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json(
      { error: 'Only school administrators can generate the master timetable' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const term = String((body as any)?.term || 'Term 1').trim()
  const academicYear = String((body as any)?.academicYear || new Date().getFullYear()).trim()
  const departments = (body as any)?.departments
  const replaceExisting = (body as any)?.replaceExisting !== false
  const useLlm = (body as any)?.useLlm === true
  const allowPartial = (body as any)?.allowPartial === true
  const maxExecutionMs = Math.min(
    60000,
    Math.max(5000, Number((body as any)?.maxExecutionMs) || 30000)
  )

  const config = await ensureTimetableConfig(prisma, schoolId)

  const allocationWhere: any = {
    schoolId,
    term,
    academicYear,
    status: 'pushed',
    ...(Array.isArray(departments) && departments.length
      ? { hod: { hodProfile: { department: { in: departments } } } }
      : {}),
  }

  const [allocations, recipes, dbConstraints, lockedSlots, dbTimeSlots] = await Promise.all([
    prisma.teacherAllocation.findMany({
      where: allocationWhere,
      include: {
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        hod: { select: { hodProfile: { select: { department: true } } } },
      },
    }),
    prisma.schedulingRecipe.findMany({
      where: { schoolId, isValid: true, status: { not: 'ARCHIVED' } },
      select: {
        teacherId: true,
        classId: true,
        subjectId: true,
        blocks: {
          select: {
            forbiddenDays: true,
            forbiddenPeriods: true,
            preferredDays: true,
            preferredPeriods: true,
          },
        },
      },
    }),
    prisma.constraint.findMany({
      where: { schoolId, active: true },
      select: { type: true, scope: true, targetId: true, active: true, config: true },
    }),
    loadLockedSlotReservations(prisma, schoolId),
    loadSchoolTimeSlots(prisma, schoolId),
  ])

  if (allocations.length === 0) {
    return NextResponse.json(
      {
        error: `No approved teaching allocations found for ${term} ${academicYear}. HODs must submit class allocations and you must approve them on the Department Allocations tab (same term/year) before generating.`,
      },
      { status: 400 }
    )
  }

  const breakSlots = parseBreakSlots((config as any).breakSlots)
  const workingDays = normalizeWorkingDays((config as any).workingDays)
  const singleMin = Number((config as any).singleDuration || 40)

  const daySlots = buildDaySlots(
    String((config as any).startTime),
    String((config as any).endTime),
    singleMin,
    breakSlots,
    workingDays
  )

  let scheduleResult = await hybridGenerateTimetable(allocations as any[], daySlots, {
    lockedSlots,
    dbTimeSlots,
    recipes: recipes as any[],
    constraints: dbConstraints as any[],
    options: {
      singleMin,
      maxExecutionMs,
      useLlm,
      solverUrl: process.env.ORTOOLS_SOLVER_URL,
    },
  })

  if (scheduleResult.unplacedBlocks.length > 0 && useLlm) {
    try {
      const llm = await resolveConflictsWithLLM({
        daySlots: daySlots as Record<string, DayPeriodSlot[]>,
        singleMin,
        placed: scheduleResult.placedBlocks,
        unplacedBlocks: scheduleResult.unplacedBlocks,
      })
      if (llm.placed.length) {
        scheduleResult = {
          ...mergePlacements(scheduleResult, llm.placed, singleMin),
          engine: scheduleResult.engine,
          preflight: scheduleResult.preflight,
          preflightWarnings: scheduleResult.preflightWarnings,
          infeasibility: scheduleResult.infeasibility,
          hardValidationCount: scheduleResult.hardValidationCount,
        }
        if (llm.errors.length) {
          scheduleResult.conflicts.push(
            ...llm.errors.slice(0, 5).map((msg) => ({
              allocationId: '',
              type: 'LLM',
              message: msg,
            }))
          )
        }
      }
    } catch {
      // LLM is best-effort
    }
  }

  const { entries, conflicts } = scheduleResult

  if (!scheduleResult.preflight.ok && scheduleResult.infeasibility) {
    return NextResponse.json(
      {
        error: scheduleResult.infeasibility.message,
        infeasibility: scheduleResult.infeasibility,
        preflightWarnings: scheduleResult.preflightWarnings,
        conflicts,
        stats: scheduleResult.stats,
        partial: true,
      },
      { status: 422 }
    )
  }

  if (conflicts.length > 0 && entries.length === 0) {
    return NextResponse.json(
      {
        error: 'Could not generate a conflict-free timetable. Too many constraints.',
        conflicts,
        infeasibility: scheduleResult.infeasibility,
        preflightWarnings: scheduleResult.preflightWarnings,
      },
      { status: 422 }
    )
  }

  if (scheduleResult.unplacedBlocks.length > 0 && !allowPartial) {
    return NextResponse.json(
      {
        error: `Incomplete timetable: ${scheduleResult.unplacedBlocks.length} lesson block(s) could not be placed.`,
        conflicts,
        stats: scheduleResult.stats,
        engine: scheduleResult.engine,
        infeasibility: scheduleResult.infeasibility,
        preflightWarnings: scheduleResult.preflightWarnings,
        partial: true,
      },
      { status: 422 }
    )
  }

  if (scheduleResult.hardValidationCount > 0 && !allowPartial) {
    return NextResponse.json(
      {
        error: `Generated timetable has ${scheduleResult.hardValidationCount} hard conflict(s).`,
        conflicts,
        stats: scheduleResult.stats,
        engine: scheduleResult.engine,
        partial: true,
      },
      { status: 422 }
    )
  }

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      await tx.timetableAllocationEntry.deleteMany({
        where: { schoolId, term, academicYear, status: 'draft' },
      })
    }

    await tx.timetableAllocationEntry.createMany({
      data: entries.map((e: any) => ({
        schoolId,
        allocationId: e.allocationId,
        teacherId: e.teacherId,
        subjectId: e.subjectId,
        classId: e.classId,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        durationMin: e.durationMin,
        periodType: e.periodType,
        periodNumber: e.periodNumber,
        term,
        academicYear,
        status: 'draft',
      })),
      skipDuplicates: true,
    })
  })

  const saved = await prisma.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, status: 'draft' },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })

  return NextResponse.json({
    success: true,
    generated: saved.length,
    schedule: saved,
    conflicts: conflicts.length > 0 ? conflicts : [],
    entries: saved,
    stats: scheduleResult.stats,
    engine: scheduleResult.engine,
    preflightWarnings: scheduleResult.preflightWarnings,
    summary: {
      days: workingDays.length,
      allocationsScheduled: [...new Set(saved.map((e: any) => e.allocationId))].length,
      totalAllocations: allocations.length,
      teachers: [...new Set(saved.map((e: any) => e.teacherId))].length,
      classes: [...new Set(saved.map((e: any) => e.classId))].length,
      placed: scheduleResult.stats.placed,
      unplaced: scheduleResult.stats.unplaced,
      backtracks: scheduleResult.stats.backtracks,
      restarts: scheduleResult.stats.restarts,
      llmUsed: scheduleResult.stats.llmUsed,
      lockedSlots: lockedSlots.length,
    },
  })
}

function buildDaySlots(
  startTime: string,
  endTime: string,
  singleMin: number,
  breakSlots: any[],
  workingDays: string[]
) {
  const startMin = timeToMin(startTime)
  const endMin = timeToMin(endTime)

  const breaks = (breakSlots || []).map((b: any) => ({
    start: timeToMin(String(b.start)),
    end: timeToMin(String(b.end)),
    label: b.label,
    isLunch: Boolean(b.isLunch),
  }))

  const daySlots: Record<string, any[]> = {}
  for (const day of workingDays) {
    const slots: any[] = []
    let cursor = startMin
    let periodNum = 1

    while (cursor < endMin) {
      const inBreak = breaks.find((b: any) => cursor >= b.start && cursor < b.end)
      if (inBreak) {
        slots.push({
          type: 'break',
          label: inBreak.label,
          start: inBreak.start,
          end: inBreak.end,
          isLunch: inBreak.isLunch,
        })
        cursor = inBreak.end
        continue
      }

      const nextBreak = breaks.find((b: any) => b.start > cursor)
      const ceilMin = nextBreak ? Math.min(endMin, nextBreak.start) : endMin

      if (cursor + singleMin <= ceilMin) {
        slots.push({
          type: 'period',
          periodNumber: periodNum,
          start: cursor,
          end: cursor + singleMin,
          startTime: minToTime(cursor),
          endTime: minToTime(cursor + singleMin),
          durationMin: singleMin,
          day,
        })
        cursor += singleMin
        periodNum++
      } else {
        cursor = nextBreak ? nextBreak.start : endMin
      }
    }

    daySlots[day] = slots
  }

  return daySlots
}
