import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import {
  ensureTimetableConfig,
  normalizeTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'
import { parseSchedulingRulesJson } from '@/lib/timetable/teacherClassSessionRules'
import { computeMaxExecutionMs } from '@/lib/timetable/solverTimeout'
import { buildDaySlotsFromTimetableConfig } from '@/lib/timetable/buildDaySlotsFromConfig'
import { expandAllocationsIntoBlocks, type DayPeriodSlot } from '@/lib/timetable/scheduler'
import { hybridGenerateTimetable, mergePlacements } from '@/lib/timetable/hybridGenerate'
import { resolveConflictsWithLLM } from '@/lib/timetable/llm-resolver'
import { requireSchoolType } from '@/lib/middleware/individual-gate'
import {
  loadLockedSlotReservations,
  loadSchoolTimeSlots,
} from '@/lib/timetable/loadGenerationContext'
import { auditDraftTimetable } from '@/lib/timetable/conflictAudit'
import { cleanupStaleConflicts } from '@/lib/timetable/cleanupConflicts'
import {
  normalizePushedAllocations,
  applyPendingPushedAllocationUpserts,
} from '@/lib/timetable/normalizePushedAllocations'
import { remapEntriesToValidAllocationIds } from '@/lib/timetable/resolveTimetableEntryAllocationIds'
import { filterConflictFreeSchedulerEntries } from '@/lib/timetable/constraintCheck'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import { timetableExcludeConflictResponse } from '@/lib/timetable/excludeConstraintError'

const GENERATED_ENTRY_LIMIT = 2000

/** Solver + save can exceed the default serverless limit on large schools. */
export const maxDuration = 60

export const GET = withErrorHandler(async function GET(req: NextRequest) {
  const user = await getAuthUser(req as any)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req as any, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await requireSchoolType(schoolId, ['SCHOOL'])
  if (!typeCheck.allowed) return typeCheck.response

  const config = await prisma.timetableConfig.findUnique({ where: { schoolId } })
  return NextResponse.json({ config })
})

export const POST = withErrorHandler(async function POST(req: NextRequest) {
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
  const term = safeQueryString((body as any)?.term, { defaultValue: 'Term 1', maxLength: 64 })
  const academicYear = safeQueryString((body as any)?.academicYear, {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })
  const departments = (body as any)?.departments
  const replaceExisting = (body as any)?.replaceExisting !== false
  const useLlm = (body as any)?.useLlm === true
  const allowPartial = (body as any)?.allowPartial === true
  const requestedMaxMs = Number((body as any)?.maxExecutionMs) || undefined

  const config = await ensureTimetableConfig(prisma, schoolId)

  // Include scheduled (already published once) + newly pushed HOD approvals.
  // Using only `pushed` after a publish left prior departments out of regenerate,
  // then a sparse draft publish wiped the live published timetable.
  const allocationWhere: any = {
    schoolId,
    term,
    academicYear,
    status: { in: ['pushed', 'scheduled'] },
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

  const { allocations: normalizedAllocations, pendingUpserts } = await normalizePushedAllocations(
    prisma,
    schoolId,
    allocations,
    { deferWrites: true }
  )

  const singleMin = Number((config as any).singleDuration || 40)
  const daySlots = buildDaySlotsFromTimetableConfig(config as any)
  const workingDays = Object.keys(daySlots)
  const lessonCount = expandAllocationsIntoBlocks(normalizedAllocations as any[]).length
  const maxExecutionMs = computeMaxExecutionMs(lessonCount, requestedMaxMs)
  const normalizedCfg = normalizeTimetableConfig(config)
  const teacherClassSessionRules = parseSchedulingRulesJson(normalizedCfg.schedulingRules)

  let scheduleResult = await hybridGenerateTimetable(normalizedAllocations as any[], daySlots, {
    lockedSlots,
    dbTimeSlots,
    recipes: recipes as any[],
    constraints: dbConstraints as any[],
    options: {
      singleMin,
      maxExecutionMs,
      useLlm,
      solverUrl: process.env.ORTOOLS_SOLVER_URL,
      teacherClassSessionRules,
      teacherWorkloadRules: teacherClassSessionRules,
      breakSlots: normalizedCfg.breakSlots,
      ...(teacherClassSessionRules.maxPeriodsPerDayEnabled
        ? { maxTeacherPeriodsPerDay: teacherClassSessionRules.maxPeriodsPerDay }
        : {}),
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

  let entriesPrepared = entries
  let invalidAllocationEntries: any[] = []
  let skippedConflicts = 0

  try {
    // Interactive txs default to 5s — upserts + bulk createMany need more headroom.
    await prisma.$transaction(
      async (tx) => {
        const idMap = await applyPendingPushedAllocationUpserts(tx, schoolId, pendingUpserts)
        let working = entries
        if (idMap.size > 0) {
          working = entries.map((e: any) => {
            const nextId = idMap.get(String(e.allocationId || ''))
            return nextId ? { ...e, allocationId: nextId } : e
          })
        }

        const remapped = await remapEntriesToValidAllocationIds(
          tx,
          schoolId,
          working,
          term,
          academicYear
        )
        if (remapped.invalid.length > 0) {
          invalidAllocationEntries = remapped.invalid
          throw Object.assign(new Error('INVALID_ALLOCATION_FK'), {
            code: 'INVALID_ALLOCATION_FK',
          })
        }

        const beforeFilter = remapped.entries.length
        entriesPrepared = filterConflictFreeSchedulerEntries(remapped.entries)
        skippedConflicts = beforeFilter - entriesPrepared.length

        if (replaceExisting) {
          await tx.timetableAllocationEntry.deleteMany({
            where: { schoolId, term, academicYear, status: 'draft' },
          })
        }

        if (entriesPrepared.length > 0) {
          await tx.timetableAllocationEntry.createMany({
            data: entriesPrepared.map((e: any) => ({
              schoolId,
              allocationId: e.allocationId,
              teacherId: e.teacherId,
              subjectId: e.subjectId,
              classId: e.classId,
              classroomId: e.classroomId || null,
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
        }
      },
      { maxWait: 15_000, timeout: 60_000 }
    )
  } catch (err: any) {
    const code = String(err?.code || '')
    const msg = String(err?.message || '')
    if (code === 'INVALID_ALLOCATION_FK' || msg.includes('INVALID_ALLOCATION_FK')) {
      const sample = invalidAllocationEntries[0]
      return NextResponse.json(
        {
          error:
            'Could not save timetable: one or more lesson rows reference missing teaching allocations. Re-approve department allocations or regenerate after HOD resubmits.',
          code: 'INVALID_ALLOCATION_FK',
          invalidCount: invalidAllocationEntries.length,
          sample: {
            teacherId: sample?.teacherId,
            classId: sample?.classId,
            subjectId: sample?.subjectId,
            allocationId: sample?.allocationId,
          },
        },
        { status: 422 }
      )
    }
    if (code === 'P2028' || /transaction.*timeout|timed out/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            'Saving the generated timetable timed out. Try generating again, or generate without replaceExisting after clearing the draft.',
          code: 'GENERATE_SAVE_TIMEOUT',
        },
        { status: 503 }
      )
    }
    if (code === 'P2003' || /foreign key|Foreign key/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            'Could not save timetable periods — a teacher, class, subject, or allocation reference is missing. Re-approve department allocations and regenerate.',
          code: 'GENERATE_SAVE_FK',
        },
        { status: 422 }
      )
    }
    const excludeRes = timetableExcludeConflictResponse(err)
    if (excludeRes) return excludeRes
    throw err
  }

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
    take: GENERATED_ENTRY_LIMIT,
  })

  let conflictAudit: Awaited<ReturnType<typeof auditDraftTimetable>> | null = null
  let conflictCleanup: Awaited<ReturnType<typeof cleanupStaleConflicts>> | null = null
  try {
    conflictCleanup = await cleanupStaleConflicts(prisma, schoolId, { term, academicYear })
    conflictAudit = await auditDraftTimetable(prisma, { schoolId, term, academicYear })
  } catch (conflictError) {
    console.error('[TimetableGenerate] Conflict audit failed:', conflictError)
  }

  return NextResponse.json({
    success: true,
    generated: saved.length,
    schedule: saved,
    conflicts: conflicts.length > 0 ? conflicts : [],
    entries: saved,
    stats: scheduleResult.stats,
    engine: scheduleResult.engine,
    preflightWarnings: scheduleResult.preflightWarnings,
    conflictSummary: conflictAudit
      ? {
          total: conflictAudit.totalConflicts,
          errors: conflictAudit.errorCount,
          warnings: conflictAudit.warningCount,
          canPublish: conflictAudit.canPublish,
          preview: conflictAudit.conflicts.slice(0, 5),
          cleanup: conflictCleanup,
        }
      : null,
    message: conflictAudit
      ? conflictAudit.errorCount === 0
        ? `Timetable generated with ${conflictAudit.warningCount} warning(s)`
        : `Timetable generated with ${conflictAudit.errorCount} error(s) — resolve before publishing`
      : undefined,
    summary: {
      days: workingDays.length,
      allocationsScheduled: [...new Set(saved.map((e: any) => e.allocationId))].length,
      totalAllocations: allocations.length,
      skippedConflicts,
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
})
