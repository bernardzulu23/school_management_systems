import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware, roleCheck } from '@/lib/middleware/auth'
import { getSchoolIdFromRequest } from '@/lib/utils/getSchoolId'

export const dynamic = 'force-dynamic'

type GenerateBody = {
  maxSolutions?: number
  timeoutMs?: number
  name?: string
}

function withTimeout(ms: number) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return { controller, cancel: () => clearTimeout(id) }
}

function safeNumber(value: unknown, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function safeString(value: unknown) {
  const s = String(value ?? '').trim()
  return s
}

export async function POST(req: NextRequest) {
  const auth = authMiddleware(req as any)
  if (!auth.isAuthenticated) return auth.response
  if (!roleCheck(auth.user, ['ADMIN'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schoolId = await getSchoolIdFromRequest(req as any)
  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school context' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody
  const maxSolutions = Math.max(1, Math.min(5000, safeNumber(body.maxSolutions, 500)))
  const timeoutMs = Math.max(1000, Math.min(120_000, safeNumber(body.timeoutMs, 15_000)))
  const versionName = safeString(body.name) || 'Draft (Solver)'

  const [teachers, rooms, classes, slots, lessons, constraints, lockedPeriodAssignments, recipes] =
    await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId },
        select: {
          id: true,
          assignedSubjects: true,
          user: { select: { name: true } },
        },
      }),
      prisma.classroom.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      }),
      prisma.timeSlot.findMany({
        where: { schoolId },
        select: {
          id: true,
          dayOfWeek: true,
          period: true,
          startTime: true,
          endTime: true,
          isBreak: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      }),
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
    ])

  if (!slots.length) {
    return NextResponse.json(
      { error: 'No time slots configured for this school. Create TimeSlot records first.' },
      { status: 422 }
    )
  }
  if (!lessons.length) {
    return NextResponse.json(
      { error: 'No teaching assignments found. Create TeachingAssignment records first.' },
      { status: 422 }
    )
  }

  const solverUrl = safeString(process.env.SOLVER_SERVICE_URL) || 'http://localhost:8001'
  const solveEndpoint = `${solverUrl.replace(/\/+$/, '')}/solve`

  const slotRows = slots.map((s) => ({
    id: String(s.id),
    dayOfWeek: safeString(s.dayOfWeek).toLowerCase(),
    period: Number(s.period),
    startTime: safeString(s.startTime),
    endTime: safeString(s.endTime),
    isBreak: Boolean(s.isBreak),
  }))

  const recipeByTeachingAssignmentId = new Map<string, (typeof recipes)[number]>()
  for (const r of recipes) recipeByTeachingAssignmentId.set(String(r.teachingAssignmentId), r)

  const expandedLessons: Array<{
    id: string
    teacherId: string
    classId: string
    subjectId: string
    teachingAssignmentId: string
  }> = []
  const atomicGroups: Array<{
    lessonIds: string[]
    allowedDays?: string[] | null
    preferMorning?: boolean
  }> = []

  const makeInstanceId = (teachingAssignmentId: string, i: number) =>
    `${teachingAssignmentId}::${i}`

  const recipePayload = recipes.map((r) => {
    const blocks = (r.blocks || []).map((b) => {
      const preferredDays = (b.preferredDays || [])
        .map((d) => safeString(d).toLowerCase())
        .filter(Boolean)
      const preferMorning =
        Array.isArray(b.preferredPeriods) &&
        b.preferredPeriods.length > 0 &&
        b.preferredPeriods.every((p) => Number(p) > 0 && Number(p) <= 4)
      return {
        size: Number(b.size),
        count: Number(b.quantity),
        mustBeAtomic: true,
        preferMorning,
        allowedDays: preferredDays.length ? preferredDays : null,
      }
    })
    return {
      recipeId: String(r.id),
      teachingAssignmentId: String(r.teachingAssignmentId),
      blocks,
      constraints: (r.constraints || []).map((c: any) => ({
        id: String(c.id),
        type: String(c.type),
        priority: Number(c.priority),
        config: c.config,
      })),
    }
  })

  for (const ta of lessons) {
    const baseId = String(ta.id)
    const recipe = recipeByTeachingAssignmentId.get(baseId)
    const blocks = recipe?.blocks || []
    const totalFromBlocks = blocks.reduce((acc, b) => acc + Number(b.size) * Number(b.quantity), 0)
    const expected = recipe?.expectedPeriodsPerWeek ?? null
    const totalPeriods = Math.max(1, expected != null ? Number(expected) : totalFromBlocks || 1)

    let cursor = 0
    if (blocks.length) {
      const sortedBlocks = blocks
        .slice()
        .sort((a, b) => Number(a.placementPriority) - Number(b.placementPriority))
      for (const b of sortedBlocks) {
        for (let rep = 0; rep < Number(b.quantity); rep++) {
          const ids: string[] = []
          for (let k = 0; k < Number(b.size); k++) {
            const instanceId = makeInstanceId(baseId, cursor)
            cursor += 1
            ids.push(instanceId)
            expandedLessons.push({
              id: instanceId,
              teacherId: String(ta.teacherId),
              classId: String(ta.classId),
              subjectId: String(ta.subjectId),
              teachingAssignmentId: baseId,
            })
          }

          const preferredDays = (b.preferredDays || [])
            .map((d) => safeString(d).toLowerCase())
            .filter(Boolean)
          const preferMorning =
            Array.isArray(b.preferredPeriods) &&
            b.preferredPeriods.length > 0 &&
            b.preferredPeriods.every((p) => Number(p) > 0 && Number(p) <= 4)

          atomicGroups.push({
            lessonIds: ids,
            allowedDays: preferredDays.length ? preferredDays : null,
            preferMorning,
          })
        }
      }
    }

    for (; cursor < totalPeriods; cursor += 1) {
      const instanceId = makeInstanceId(baseId, cursor)
      expandedLessons.push({
        id: instanceId,
        teacherId: String(ta.teacherId),
        classId: String(ta.classId),
        subjectId: String(ta.subjectId),
        teachingAssignmentId: baseId,
      })
    }
  }

  const payload = {
    teachers: teachers.map((t) => ({
      id: String(t.id),
      name: safeString(t.user?.name) || 'Teacher',
      maxHoursPerWeek: 25,
      subjectIds: Array.isArray(t.assignedSubjects) ? t.assignedSubjects.map(String) : [],
    })),
    rooms: rooms.map((r) => ({ id: String(r.id), name: safeString(r.name) })),
    classes: classes.map((c) => ({ id: String(c.id), name: safeString(c.name) })),
    slots: slotRows,
    lessons: expandedLessons.map((l) => ({
      id: String(l.id),
      teacherId: String(l.teacherId),
      classId: String(l.classId),
      subjectId: String(l.subjectId),
      roomId: null as null,
    })),
    constraints: constraints.map((c) => ({
      id: String(c.id),
      type: String(c.type),
      scope: String(c.scope),
      targetId: c.targetId ? String(c.targetId) : null,
      priority: Number(c.priority),
      config: c.config,
    })),
    lockedAssignments: lockedPeriodAssignments.map((la) => ({
      teacherId: String(la.teacherId),
      slotId: String(la.timeSlotId),
    })),
    atomicGroups,
    recipes: recipePayload,
    maxSolutions,
    timeoutMs,
  }

  const timeout = withTimeout(timeoutMs + 5000)
  try {
    const solverRes = await fetch(solveEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: timeout.controller.signal,
    })

    const solverJson = await solverRes.json().catch(() => null)
    if (!solverRes.ok) {
      return NextResponse.json(
        {
          error: 'Solver service failed',
          details: solverJson ?? { status: solverRes.status },
        },
        { status: 502 }
      )
    }

    const assignments: Record<string, string> = solverJson?.assignments || {}
    const optimizationScore = safeNumber(solverJson?.optimizationScore, 0)
    const stats = solverJson?.stats || {}

    const version = await prisma.timetableVersion.create({
      data: {
        schoolId,
        status: 'DRAFT',
        generationStatus: 'SOLVED',
        season: 'normal',
        solverScore: optimizationScore,
        solverStats: stats,
        periodAssignmentsLocked: lockedPeriodAssignments.length,
        name: versionName,
        createdByUserId: auth.user?.id ? String(auth.user.id) : null,
      },
      select: { id: true, status: true, createdAt: true },
    })

    const lessonById = new Map<
      string,
      {
        id: string
        teacherId: string
        classId: string
        subjectId: string
        teachingAssignmentId: string
      }
    >(expandedLessons.map((l) => [String(l.id), l]))
    const slotById = new Map<
      string,
      {
        id: string
        dayOfWeek: string
        period: number
        startTime: string
        endTime: string
        isBreak: boolean
      }
    >(slots.map((s: any) => [String(s.id), s]))

    const entriesData = Object.entries(assignments)
      .map(([lessonId, slotId]) => {
        const lesson = lessonById.get(String(lessonId))
        const slot = slotById.get(String(slotId))
        if (!lesson || !slot) return null
        return {
          schoolId,
          versionId: version.id,
          timeSlotId: String(slot.id),
          teacherId: String(lesson.teacherId),
          classId: String(lesson.classId),
          subjectId: String(lesson.subjectId),
          teachingAssignmentId: String(lesson.teachingAssignmentId),
          classroomId: null as string | null,
          isLockedPeriodAssignment: false,
          solvedByAlgorithm: true,
        }
      })
      .filter(Boolean) as Array<{
      schoolId: string
      versionId: string
      timeSlotId: string
      teacherId: string
      classId: string
      subjectId: string
      teachingAssignmentId: string
      classroomId: string | null
      isLockedPeriodAssignment: boolean
      solvedByAlgorithm: boolean
    }>

    if (!entriesData.length) {
      return NextResponse.json(
        { error: 'Solver returned empty schedule', details: { optimizationScore, stats } },
        { status: 502 }
      )
    }

    await prisma.timetableEntry.createMany({ data: entriesData })

    const uiAssignments = entriesData
      .map((e) => {
        const slot = slotById.get(String(e.timeSlotId))
        if (!slot) return null
        return {
          id: `${version.id}:${e.timeSlotId}:${e.teacherId}:${e.classId}`,
          season: 'normal',
          dayOfWeek: String(slot.dayOfWeek),
          timeSlotId: String(slot.id),
          startTime: String(slot.startTime),
          endTime: String(slot.endTime),
          period: Number(slot.period),
          isBreak: Boolean(slot.isBreak),
          teacherId: String(e.teacherId),
          classId: String(e.classId),
          subjectId: String(e.subjectId),
          classroomId: e.classroomId ? String(e.classroomId) : 'room-unassigned',
          source: 'generated',
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        status: version.status,
        createdAt: version.createdAt,
        optimizationScore,
        stats,
      },
      assignments: uiAssignments,
    })
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'Solver request failed'
    const aborted = String(e?.name || '')
      .toLowerCase()
      .includes('abort')
    return NextResponse.json(
      { error: aborted ? 'Solver timed out' : 'Solver request failed', details: message },
      { status: aborted ? 504 : 502 }
    )
  } finally {
    timeout.cancel()
  }
}
