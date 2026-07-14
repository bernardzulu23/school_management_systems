/**
 * POST /api/timetable/solver/ortools
 * Tries OR-Tools service (ORTOOLS_SOLVER_URL) then falls back to greedy solver.
 * Persists placements to draft TimetableAllocationEntry by default (persist: false to preview only).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { callOrtoolsHttp } from '@/lib/timetable/ortoolsClient'
import {
  buildOrtoolsLessons,
  buildSchoolSolverPayload,
} from '@/lib/timetable/buildSchoolSolverPayload'
import { solveTimetable } from '@/lib/timetable/greedySolver'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import {
  ensureTimetableConfig,
  normalizeTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'
import {
  parseSchedulingRulesJson,
  rulesForSolverPayload,
} from '@/lib/timetable/teacherClassSessionRules'
import {
  canManageTimetableDraft,
  timetableForbiddenResponse,
} from '@/lib/timetable/timetableRouteAuth'
import { safeQueryString } from '@/lib/security/safeQueryValue'
import {
  greedyAssignmentsToRows,
  ortoolsAssignmentsToRows,
  persistSolverDraft,
} from '@/lib/timetable/persistSolverDraft'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const auth = await authMiddleware(request)
  if (!auth.isAuthenticated) return auth.response

  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'hod', 'HOD'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenant = await resolveAuthenticatedSchoolId(request, auth.user)
  if (!tenant.ok) return tenant.response
  const schoolId = tenant.schoolId
  if (!schoolId) {
    return NextResponse.json({ error: 'School context required' }, { status: 400 })
  }

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const body = await request.json().catch(() => ({}))
  const persistRequested = (body as { persist?: boolean }).persist !== false
  const replaceExisting = (body as { replaceExisting?: boolean }).replaceExisting !== false
  const term = safeQueryString((body as { term?: string }).term, {
    defaultValue: 'Term 1',
    maxLength: 64,
  })
  const academicYear = safeQueryString((body as { academicYear?: string }).academicYear, {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })

  const persist = persistRequested && canManageTimetableDraft(auth.user)
  if (persistRequested && !persist && (body as { persist?: boolean }).persist === true) {
    return timetableForbiddenResponse()
  }

  const solverUrl = String(process.env.ORTOOLS_SOLVER_URL || '').trim()

  const { payload, effectiveLessons } = await buildSchoolSolverPayload(prisma, schoolId, {
    name: 'OR-Tools draft',
    maxSolutions: 1,
    maxExecutionMs: 45000,
  })

  if (!payload.slots.filter((s) => !s.isBreak).length) {
    return NextResponse.json({ error: 'No time slots configured' }, { status: 400 })
  }
  if (!effectiveLessons.length) {
    return NextResponse.json({ error: 'No lessons to schedule' }, { status: 400 })
  }

  const ortoolsLessons = buildOrtoolsLessons(payload, effectiveLessons)
  const timeoutSec = Math.max(
    5,
    Math.min(120, Number((body as { timeoutSec?: number }).timeoutSec) || 45)
  )

  let sessionRules = rulesForSolverPayload(parseSchedulingRulesJson(null))
  try {
    const cfg = await ensureTimetableConfig(prisma, schoolId)
    sessionRules = rulesForSolverPayload(
      parseSchedulingRulesJson(normalizeTimetableConfig(cfg).schedulingRules)
    )
  } catch {
    /* defaults */
  }

  const ortoolsPayload = {
    teachers: payload.teachers.map((t) => ({ id: t.id, maxPeriods: 25 })),
    classes: payload.classes.map((c) => ({ id: c.id })),
    lessons: ortoolsLessons,
    slots: payload.slots
      .filter((s) => !s.isBreak)
      .map((s) => ({
        day: s.dayOfWeek,
        period: s.period,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    sessionRules,
    timeoutSec,
  }

  let engine = 'greedy-fallback'
  let status: string | undefined
  let message: string | undefined
  let rows: ReturnType<typeof ortoolsAssignmentsToRows> = []
  let assignments: unknown = []
  let stats: unknown

  if (solverUrl) {
    const result = await callOrtoolsHttp(solverUrl, ortoolsPayload)
    if (result.assignments?.length) {
      engine = 'ortools'
      status = result.status
      assignments = result.assignments
      rows = ortoolsAssignmentsToRows(result.assignments)
    }
  }

  if (!rows.length) {
    const greedy = solveTimetable({ ...payload, maxSolutions: 1 })
    engine = 'greedy-fallback'
    message = solverUrl
      ? 'OR-Tools unavailable or infeasible; used greedy solver'
      : 'Set ORTOOLS_SOLVER_URL for CP-SAT; used greedy solver'
    stats = greedy.stats
    assignments = greedy.assignments
    rows = greedyAssignmentsToRows(
      greedy.assignments || {},
      greedy.slotSpans || {},
      effectiveLessons,
      payload.slots
    )
  }

  let persisted: Awaited<ReturnType<typeof persistSolverDraft>> | null = null
  if (persist) {
    persisted = await persistSolverDraft(prisma, {
      schoolId,
      term,
      academicYear,
      replaceExisting,
      rows,
      actor: auth.user,
    })
    if (!persisted.ok) {
      if (persisted.response) return persisted.response
      return NextResponse.json(
        {
          success: false,
          engine,
          status,
          message: persisted.error,
          skipped: persisted.skipped,
          details: persisted.details,
          assignments,
          stats,
        },
        { status: persisted.status || 422 }
      )
    }
  }

  return NextResponse.json({
    success: true,
    engine,
    status,
    message,
    stats,
    assignments,
    persisted: persist
      ? {
          saved: persisted?.saved ?? 0,
          skipped: persisted?.skipped ?? 0,
          term,
          academicYear,
        }
      : null,
    ...(persistRequested && !persist
      ? {
          persistSkipped:
            'Draft write requires headteacher/admin. Results returned without saving; use persist:false to silence this.',
        }
      : {}),
  })
})
