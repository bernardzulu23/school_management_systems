/**
 * Hybrid timetable generation: preflight → backtracking → solver fallback → repair → validate.
 */
import {
  runPreflightFeasibility,
  type LockedSlotReservation,
  type PreflightResult,
} from '@/lib/timetable/preflightFeasibility'
import {
  buildBlockSolverPayload,
  callSolverServiceHttp,
  dbSlotsToSolverSlots,
  mapSolverAssignmentsToResult,
  mergeSolverWithPartial,
  type DbTimeSlotRow,
} from '@/lib/timetable/buildBlockSolverPayload'
import { computeMaxExecutionMs } from '@/lib/timetable/solverTimeout'
import {
  expandAllocationsIntoBlocks,
  generateTimetable,
  generateTimetableOnce,
  mergePlacements,
  schedulerResultFromPlaced,
  type DayPeriodSlot,
  type GenerateTimetableOptions,
  type PlacedBlock,
  type SchedulerAllocation,
  type SchedulerResult,
} from '@/lib/timetable/scheduler'
import { tryGreedySolverPass } from '@/lib/timetable/greedySchedulerFallback'
import { validateTimetable, getHardConflicts } from '@/lib/timetable/validateTimetable'
import type { Assignment, DayOfWeek, LocalTimeHHMM } from '@/lib/timetable/types'
import type { DbConstraintLike, RecipeLikeForRules } from '@/lib/timetable/constraintRules'

export type HybridEngine = 'backtrack' | 'greedy' | 'solver' | 'repair' | 'none'

export type HybridGenerateOptions = {
  singleMin?: number
  maxExecutionMs?: number
  maxRestarts?: number
  solverTimeoutMs?: number
  solverUrl?: string
  strictSoftConstraints?: boolean
  skipPreflight?: boolean
  useLlm?: boolean
  teacherClassSessionRules?: Partial<
    import('@/lib/timetable/teacherClassSessionRules').TeacherClassSessionRulesConfig
  > | null
  teacherWorkloadRules?: Partial<
    import('@/lib/timetable/teacherWorkloadRules').TeacherWorkloadRulesConfig
  > | null
  breakSlots?: import('@/lib/timetable/teacherWorkloadRules').BreakSlotLike[] | null
  maxTeacherPeriodsPerDay?: number
}

export type HybridGenerateResult = SchedulerResult & {
  engine: HybridEngine
  preflight: PreflightResult
  preflightWarnings: string[]
  infeasibility?: PreflightResult['infeasibility']
  hardValidationCount: number
}

function toDayOfWeek(value: string): DayOfWeek {
  const day = String(value || '')
    .trim()
    .toLowerCase()
  const allowed: DayOfWeek[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]
  return (allowed.includes(day as DayOfWeek) ? day : 'monday') as DayOfWeek
}

function toLocalTime(value: string): LocalTimeHHMM {
  const raw = String(value || '00:00').trim()
  const m = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return '00:00' as LocalTimeHHMM
  const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0')
  const mm = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, '0')
  return `${hh}:${mm}` as LocalTimeHHMM
}

function entriesToValidationAssignments(entries: SchedulerResult['entries']): Assignment[] {
  return entries.map((e, i) => ({
    id: `gen-${i}-${e.allocationId}`,
    season: 'normal',
    dayOfWeek: toDayOfWeek(e.dayOfWeek),
    startTime: toLocalTime(e.startTime),
    endTime: toLocalTime(e.endTime),
    period: e.periodNumber,
    teacherId: e.teacherId,
    classId: e.classId,
    subjectId: e.subjectId,
    isBreak: false,
  }))
}

function countHardValidation(entries: SchedulerResult['entries']) {
  const assignments = entriesToValidationAssignments(entries)
  return getHardConflicts(validateTimetable(assignments)).length
}

async function trySolverPass(opts: {
  allocations: SchedulerAllocation[]
  dbTimeSlots: DbTimeSlotRow[]
  lockedSlots: LockedSlotReservation[]
  recipes: RecipeLikeForRules[]
  constraints: DbConstraintLike[]
  unplacedBlocks: ReturnType<typeof expandAllocationsIntoBlocks>
  existingPlaced: PlacedBlock[]
  singleMin: number
  solverUrl: string
  timeoutMs: number
}): Promise<PlacedBlock[] | null> {
  try {
    const payload = buildBlockSolverPayload({
      allocations: opts.allocations,
      dbTimeSlots: opts.dbTimeSlots,
      lockedSlots: opts.lockedSlots,
      recipes: opts.recipes,
      constraints: opts.constraints,
      blocksSubset: opts.unplacedBlocks,
      timeoutMs: opts.timeoutMs,
    })

    const result = await callSolverServiceHttp(opts.solverUrl, payload)
    if (!result.assignments || !Object.keys(result.assignments).length) return null

    const slots = dbSlotsToSolverSlots(opts.dbTimeSlots)
    const { placedBlocks } = mapSolverAssignmentsToResult({
      assignments: result.assignments,
      blocks: opts.unplacedBlocks,
      slots,
      singleMin: opts.singleMin,
    })

    if (placedBlocks.length === 0) return null
    return mergeSolverWithPartial({
      existingPlaced: opts.existingPlaced,
      solverPlaced: placedBlocks,
      allBlocks: opts.unplacedBlocks,
    })
  } catch {
    return null
  }
}

function tryRepairPass(
  allocations: SchedulerAllocation[],
  daySlots: Record<string, DayPeriodSlot[]>,
  base: SchedulerResult,
  options: GenerateTimetableOptions,
  remainingMs: number
): SchedulerResult {
  if (base.unplacedBlocks.length === 0 || remainingMs < 1000) return base

  const repairResult = generateTimetableOnce(allocations, daySlots, {
    ...options,
    maxExecutionMs: remainingMs,
    initialPlaced: base.placedBlocks,
    blocksSubset: base.unplacedBlocks,
    restartSeed: 99,
  })

  if (repairResult.unplacedBlocks.length >= base.unplacedBlocks.length) return base

  const allocById = new Map(allocations.map((a) => [String(a.id), a]))
  const allBlocks = expandAllocationsIntoBlocks(allocations)
  return schedulerResultFromPlaced(
    repairResult.placedBlocks,
    allBlocks,
    options.singleMin || 40,
    allocById,
    {
      backtracks: base.stats.backtracks + repairResult.stats.backtracks,
      restarts: base.stats.restarts,
    }
  )
}

/**
 * Run the full hybrid generation pipeline.
 */
export async function hybridGenerateTimetable(
  allocations: SchedulerAllocation[],
  daySlots: Record<string, DayPeriodSlot[]>,
  opts: {
    lockedSlots?: LockedSlotReservation[]
    dbTimeSlots?: DbTimeSlotRow[]
    recipes?: RecipeLikeForRules[]
    constraints?: DbConstraintLike[]
    options?: HybridGenerateOptions
  }
): Promise<HybridGenerateResult> {
  const options = opts.options || {}
  const singleMin = Math.max(1, Number(options.singleMin) || 40)
  const lessonCount = expandAllocationsIntoBlocks(allocations).length
  const maxMs = computeMaxExecutionMs(lessonCount, options.maxExecutionMs)
  const started = Date.now()

  const lockedSlots = opts.lockedSlots || []
  const recipes = opts.recipes || []
  const constraints = opts.constraints || []

  const preflight = options.skipPreflight
    ? { ok: true, warnings: [], blocking: [] }
    : runPreflightFeasibility({ allocations, daySlots, lockedSlots, singleMin })

  if (!preflight.ok && preflight.infeasibility) {
    return {
      entries: [],
      conflicts: preflight.blocking.map((b) => ({
        allocationId: b.entityId || '',
        type: 'PREFLIGHT',
        message: b.message,
        reason: b.code,
      })),
      unplacedBlocks: expandAllocationsIntoBlocks(allocations),
      placedBlocks: [],
      stats: {
        placed: 0,
        unplaced: expandAllocationsIntoBlocks(allocations).length,
        backtracks: 0,
        llmUsed: false,
        totalBlocks: expandAllocationsIntoBlocks(allocations).length,
      },
      engine: 'none',
      preflight,
      preflightWarnings: preflight.warnings.map((w) => w.message),
      infeasibility: preflight.infeasibility,
      hardValidationCount: 0,
    }
  }

  const schedulerOpts: GenerateTimetableOptions = {
    singleMin,
    maxExecutionMs: maxMs,
    maxRestarts: options.maxRestarts ?? 4,
    recipeRules: recipes,
    teacherConstraintRules: constraints,
    strictSoftConstraints: options.strictSoftConstraints ?? false,
    reservedTeacherSlots: lockedSlots,
    teacherClassSessionRules: options.teacherClassSessionRules,
    teacherWorkloadRules: options.teacherWorkloadRules ?? options.teacherClassSessionRules,
    breakSlots: options.breakSlots,
    maxTeacherPeriodsPerDay: options.maxTeacherPeriodsPerDay,
  }

  let result = generateTimetable(allocations, daySlots, schedulerOpts)
  let engine: HybridEngine = 'backtrack'

  const dbTimeSlots = opts.dbTimeSlots || []

  if (result.unplacedBlocks.length > 0 && dbTimeSlots.length) {
    const remainingMs = Math.max(2000, maxMs - (Date.now() - started))
    const greedyPlaced = tryGreedySolverPass({
      allocations,
      dbTimeSlots,
      lockedSlots,
      recipes,
      constraints,
      singleMin,
      maxExecutionMs: remainingMs,
    })

    if (greedyPlaced && greedyPlaced.length > result.placedBlocks.length) {
      const allocById = new Map(allocations.map((a) => [String(a.id), a]))
      const allBlocks = expandAllocationsIntoBlocks(allocations)
      const greedyResult = schedulerResultFromPlaced(
        greedyPlaced,
        allBlocks,
        singleMin,
        allocById,
        {
          backtracks: result.stats.backtracks,
          restarts: result.stats.restarts,
        }
      )
      if (greedyResult.unplacedBlocks.length < result.unplacedBlocks.length) {
        result = greedyResult
        engine = 'greedy'
      }
    }
  }

  const solverUrl = String(options.solverUrl || process.env.ORTOOLS_SOLVER_URL || '').trim()

  if (result.unplacedBlocks.length > 0 && solverUrl && dbTimeSlots.length) {
    const merged = await trySolverPass({
      allocations,
      dbTimeSlots,
      lockedSlots,
      recipes,
      constraints,
      unplacedBlocks: result.unplacedBlocks,
      existingPlaced: result.placedBlocks,
      singleMin,
      solverUrl,
      timeoutMs: options.solverTimeoutMs ?? Math.min(45000, maxMs),
    })

    if (merged) {
      const allocById = new Map(allocations.map((a) => [String(a.id), a]))
      const allBlocks = expandAllocationsIntoBlocks(allocations)
      const solverResult = schedulerResultFromPlaced(merged, allBlocks, singleMin, allocById, {
        backtracks: result.stats.backtracks,
        restarts: result.stats.restarts,
      })
      if (solverResult.unplacedBlocks.length < result.unplacedBlocks.length) {
        result = solverResult
        engine = 'solver'
      }
    }
  }

  const elapsed = Date.now() - started
  const remainingMs = Math.max(0, maxMs - elapsed)

  if (result.unplacedBlocks.length > 0 && remainingMs >= 1500) {
    const repaired = tryRepairPass(allocations, daySlots, result, schedulerOpts, remainingMs)
    if (repaired.unplacedBlocks.length < result.unplacedBlocks.length) {
      result = repaired
      engine = 'repair'
    }
  }

  const hardValidationCount = countHardValidation(result.entries)

  return {
    ...result,
    engine,
    preflight,
    preflightWarnings: preflight.warnings.map((w) => w.message),
    infeasibility:
      result.unplacedBlocks.length > 0
        ? {
            code: 'UNPLACED_BLOCKS',
            message: `${result.unplacedBlocks.length} lesson block(s) could not be placed.`,
            details: result.conflicts.slice(0, 10).map((c) => c.message),
          }
        : hardValidationCount > 0
          ? {
              code: 'HARD_CONFLICTS',
              message: `${hardValidationCount} hard conflict(s) remain after generation.`,
              details: [],
            }
          : undefined,
    hardValidationCount,
  }
}

export { mergePlacements }
