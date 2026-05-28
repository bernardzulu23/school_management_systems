/**
 * POST /api/timetable/solver/ortools
 * Tries OR-Tools service (ORTOOLS_SOLVER_URL) then falls back to greedy solver.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { resolveAuthenticatedSchoolId } from '@/lib/tenant/resolveSchoolId'
import { callOrtoolsHttp } from '@/lib/timetable/ortoolsClient'
import {
  buildOrtoolsLessons,
  buildSchoolSolverPayload,
} from '@/lib/timetable/buildSchoolSolverPayload'
import { solveTimetable } from '@/lib/timetable/greedySolver'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}))
  const solverUrl = String(process.env.ORTOOLS_SOLVER_URL || '').trim()

  try {
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
      timeoutSec: Number(body.timeoutSec) || 45,
    }

    if (solverUrl) {
      const result = await callOrtoolsHttp(solverUrl, ortoolsPayload)
      if (result.assignments?.length) {
        return NextResponse.json({
          success: true,
          engine: 'ortools',
          status: result.status,
          assignments: result.assignments,
        })
      }
    }

    const greedy = solveTimetable({ ...payload, maxSolutions: 1 })
    return NextResponse.json({
      success: true,
      engine: 'greedy-fallback',
      message: solverUrl
        ? 'OR-Tools unavailable or infeasible; used greedy solver'
        : 'Set ORTOOLS_SOLVER_URL for CP-SAT; used greedy solver',
      stats: greedy.stats,
      assignments: greedy.assignments,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Solver failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
