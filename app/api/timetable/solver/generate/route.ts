/**
 * POST /api/timetable/solver/generate
 * Greedy timetable solver — runs on Vercel + Neon with no external services.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'
import {
  resolveLessonsForSolver,
  solveTimetable,
  type SolverPayload,
} from '@/lib/timetable/greedySolver'
import { syncTimeSlotsFromConfig } from '@/lib/timetable/syncTimeSlots'

export const dynamic = 'force-dynamic'

type GenerateBody = {
  maxSolutions?: number
  timeoutMs?: number
  name?: string
}

function safeNumber(value: unknown, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function safeString(value: unknown) {
  return String(value ?? '').trim()
}

function formatHHMM(t: unknown): string {
  const s = String(t ?? '').trim()
  if (!s) return '08:00'
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (!m) return '08:00'
  const hh = String(Number(m[1])).padStart(2, '0')
  const mm = String(Number(m[2])).padStart(2, '0')
  return `${hh}:${mm}`
}

function normalizeDayOfWeek(d: unknown): string {
  return String(d ?? 'monday')
    .trim()
    .toLowerCase()
}

async function expandSolverAssignmentsToUi(
  schoolId: string,
  raw: Record<string, string>,
  slotSpans: Record<string, string[]>,
  lessons: Array<{
    id: string
    teacherId: string
    classId: string
    subjectId: string
    consecutivePeriods?: number
  }>,
  slots: Array<{
    id: string
    dayOfWeek: string
    period: number
    startTime: string
    endTime: string
    isBreak: boolean
    isDouble?: boolean
    duration?: number | null
  }>,
  teachers: Array<{ id: string; user?: { name: string | null } | null }>,
  classes: Array<{ id: string; name: string }>
) {
  const lessonById = new Map(lessons.map((l) => [l.id, l]))
  const slotById = new Map(slots.map((s) => [s.id, s]))
  const teacherById = new Map(teachers.map((t) => [t.id, t]))
  const classById = new Map(classes.map((c) => [c.id, c]))
  const subjectIds = Array.from(new Set(lessons.map((l) => l.subjectId).filter(Boolean)))
  const subjects =
    subjectIds.length > 0
      ? await prisma.subject.findMany({
          where: { schoolId, id: { in: subjectIds as string[] } },
          select: { id: true, name: true },
        })
      : []
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]))

  const out: Record<string, unknown>[] = []
  for (const [lessonId, slotId] of Object.entries(raw || {})) {
    const lesson = lessonById.get(lessonId)
    const spanIds = slotSpans?.[lessonId]?.length ? slotSpans[lessonId] : [slotId]
    const slot = slotById.get(slotId)
    const lastSlot = slotById.get(spanIds[spanIds.length - 1] || slotId)
    if (!lesson || !slot || slot.isBreak) continue

    const teacher = teacherById.get(lesson.teacherId)
    const cls = classById.get(lesson.classId)

    const cp = Math.max(1, Number(lesson.consecutivePeriods) || spanIds.length)
    const isDoublePeriod = cp >= 2 || Boolean(slot.isDouble)

    out.push({
      id: lessonId,
      season: 'normal',
      dayOfWeek: normalizeDayOfWeek(slot.dayOfWeek),
      timeSlotId: slot.id,
      startTime: formatHHMM(slot.startTime),
      endTime: formatHHMM(lastSlot?.endTime || slot.endTime),
      period: Number(slot.period) || 1,
      isBreak: false,
      teacherId: lesson.teacherId,
      teacherName: teacher?.user?.name ?? undefined,
      classId: lesson.classId,
      className: cls?.name,
      subjectId: lesson.subjectId,
      subjectName: subjectById.get(lesson.subjectId) || 'Subject',
      consecutivePeriods: isDoublePeriod ? Math.max(2, cp) : cp,
      isDoublePeriod,
      source: 'generated',
    })
  }
  return out
}

export async function POST(req: NextRequest) {
  const auth = await authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN', 'headteacher', 'HEADTEACHER'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = auth.user?.schoolId || (await getSchoolIdFromRequest(req as any))
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school context' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody
  const maxSolutions = Math.max(1, Math.min(5000, safeNumber(body.maxSolutions, 500)))
  const versionName = safeString(body.name) || 'Draft (Greedy Solver)'

  try {
    const [
      teachers,
      classes,
      slotsAfterSync,
      lessons,
      constraints,
      lockedPeriodAssignments,
      recipes,
      teacherAllocations,
    ] = await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId },
        select: {
          id: true,
          userId: true,
          assignedSubjects: true,
          user: { select: { name: true } },
        },
      }),
      prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      (async () => {
        let slots = await prisma.timeSlot.findMany({
          where: { schoolId },
          select: {
            id: true,
            dayOfWeek: true,
            period: true,
            startTime: true,
            endTime: true,
            isBreak: true,
            isDouble: true,
            duration: true,
          },
          orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
        })
        if (!slots.length) {
          await syncTimeSlotsFromConfig(prisma, schoolId)
          slots = await prisma.timeSlot.findMany({
            where: { schoolId },
            select: {
              id: true,
              dayOfWeek: true,
              period: true,
              startTime: true,
              endTime: true,
              isBreak: true,
              isDouble: true,
              duration: true,
            },
            orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
          })
        }
        return slots
      })(),
      prisma.teachingAssignment.findMany({
        where: { schoolId },
        select: { id: true, teacherId: true, classId: true, subjectId: true },
      }),
      prisma.constraint.findMany({
        where: { schoolId, active: true },
        select: { id: true, type: true, scope: true, targetId: true, priority: true, config: true },
      }),
      prisma.teacherPeriodAssignment.findMany({
        where: { schoolId, lockedForGeneration: true },
        select: { teacherId: true, timeSlotId: true },
      }),
      prisma.schedulingRecipe.findMany({
        where: { schoolId, isValid: true, status: { not: 'ARCHIVED' } },
        select: {
          id: true,
          teachingAssignmentId: true,
          teacherId: true,
          classId: true,
          subjectId: true,
          expectedPeriodsPerWeek: true,
          blocks: {
            select: {
              id: true,
              size: true,
              quantity: true,
              placementPriority: true,
              preferredDays: true,
              preferredPeriods: true,
              forbiddenDays: true,
              forbiddenPeriods: true,
              allowSplitAcrossBreaks: true,
              isLocked: true,
            },
          },
          constraints: {
            select: {
              id: true,
              type: true,
              priority: true,
              config: true,
            },
          },
        },
      }),
      prisma.teacherAllocation.findMany({
        where: { schoolId, status: 'pushed' },
        select: {
          id: true,
          teacherId: true,
          classId: true,
          subjectId: true,
          periodsPerWeek: true,
          blockType: true,
          singlePeriods: true,
          doublePeriods: true,
          triplePeriods: true,
        },
      }),
    ])

    const slots = slotsAfterSync

    if (!slots.length) {
      return NextResponse.json(
        {
          error: 'No time slots configured. Go to Settings and save to configure time slots.',
        },
        { status: 400 }
      )
    }

    if (!lessons.length && !recipes.length) {
      return NextResponse.json(
        {
          error: 'No teaching assignments found. Add teacher-class-subject assignments first.',
        },
        { status: 400 }
      )
    }

    const teacherIdByUserId = new Map(
      teachers.map((t) => [String((t as { userId?: string }).userId || ''), String(t.id)])
    )
    const mappedAllocations = teacherAllocations.map((a) => ({
      ...a,
      teacherId: teacherIdByUserId.get(String(a.teacherId)) || String(a.teacherId),
    }))

    const payload: SolverPayload = {
      name: versionName,
      maxSolutions,
      teachers,
      classes,
      slots,
      lessons,
      constraints,
      lockedAssignments: lockedPeriodAssignments.map((x) => ({
        teacherId: x.teacherId,
        slotId: x.timeSlotId,
      })),
      recipes,
      teacherAllocations: mappedAllocations,
    }

    const effectiveLessons = resolveLessonsForSolver(payload)
    if (!effectiveLessons.length) {
      return NextResponse.json(
        {
          error: 'No lessons to schedule. Add teaching assignments or valid scheduling recipes.',
        },
        { status: 400 }
      )
    }

    const result = solveTimetable(payload)

    if (!result.stats.success) {
      console.warn(
        `Greedy solver: ${result.stats.assigned}/${result.stats.total} — ${result.stats.notes}`
      )
    }

    const assignmentsForUi = await expandSolverAssignmentsToUi(
      schoolId,
      result.assignments || {},
      result.slotSpans || {},
      effectiveLessons,
      slots,
      teachers,
      classes
    )

    return NextResponse.json({
      assignments: result.assignments,
      assignmentsForUi,
      version: {
        id: null,
        name: versionName,
        optimizationScore: result.optimizationScore,
      },
      stats: result.stats,
      source: result.stats.solver,
    })
  } catch (err: unknown) {
    console.error('Solver error:', err)
    const msg = err instanceof Error ? err.message : 'Solver generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
