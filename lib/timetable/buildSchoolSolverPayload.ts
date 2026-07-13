/**
 * Load timetable solver payload for a school (shared by greedy + OR-Tools routes).
 */
import type { PrismaClient } from '@prisma/client'
import { syncTimeSlotsFromConfig } from '@/lib/timetable/syncTimeSlots'
import { resolveLessonsForSolver, type SolverPayload } from '@/lib/timetable/greedySolver'

type Db = PrismaClient

export type BuildPayloadOptions = {
  maxSolutions?: number
  name?: string
  maxExecutionMs?: number
}

export async function buildSchoolSolverPayload(
  prisma: Db,
  schoolId: string,
  options: BuildPayloadOptions = {}
): Promise<{
  payload: SolverPayload
  effectiveLessons: ReturnType<typeof resolveLessonsForSolver>
}> {
  let slots = await prisma.timeSlot.findMany({
    where: { schoolId },
    orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  })
  if (!slots.length) {
    await syncTimeSlotsFromConfig(prisma, schoolId)
    slots = await prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    })
  }

  const [
    teachers,
    classes,
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
          select: { id: true, type: true, priority: true, config: true },
        },
      },
    }),
    prisma.teacherAllocation.findMany({
      where: { schoolId, status: { in: ['pushed', 'scheduled'] } },
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

  const teacherIdByUserId = new Map(
    teachers.map((t) => [String((t as { userId?: string }).userId || ''), String(t.id)])
  )
  const mappedAllocations = teacherAllocations.map((a) => ({
    ...a,
    teacherId: teacherIdByUserId.get(String(a.teacherId)) || String(a.teacherId),
  }))

  const payload: SolverPayload = {
    name: options.name || 'Draft',
    maxSolutions: Math.max(1, Number(options.maxSolutions) || 500),
    maxExecutionMs: options.maxExecutionMs,
    teachers,
    classes,
    slots: slots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      period: s.period,
      startTime: s.startTime,
      endTime: s.endTime,
      isBreak: s.isBreak,
      isDouble: Boolean((s as { isDouble?: boolean }).isDouble),
      duration: (s as { duration?: number | null }).duration ?? null,
    })),
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
  return { payload, effectiveLessons }
}

/**
 * Lessons with periodsPerWeek for OR-Tools CP-SAT service.
 */
export function buildOrtoolsLessons(
  payload: SolverPayload,
  effectiveLessons: ReturnType<typeof resolveLessonsForSolver>
) {
  const allocations = payload.teacherAllocations || []
  if (allocations.length) {
    return allocations.map((a) => ({
      id: String(a.id),
      teacherId: String(a.teacherId),
      classId: String(a.classId),
      subjectId: String(a.subjectId),
      periodsPerWeek: Math.max(1, Number(a.periodsPerWeek) || 1),
    }))
  }

  const grouped = new Map<
    string,
    { id: string; teacherId: string; classId: string; subjectId: string; periodsPerWeek: number }
  >()
  for (const l of effectiveLessons) {
    const key = `${l.teacherId}:${l.classId}:${l.subjectId}`
    const row = grouped.get(key) || {
      id: key,
      teacherId: l.teacherId,
      classId: l.classId,
      subjectId: l.subjectId,
      periodsPerWeek: 0,
    }
    row.periodsPerWeek += Math.max(1, Number(l.consecutivePeriods) || 1)
    grouped.set(key, row)
  }
  return Array.from(grouped.values())
}
