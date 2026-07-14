/**
 * Persist solver/OR-Tools placement rows as TimetableAllocationEntry drafts.
 * teacherId on input may be Teacher profile id or User id — normalized to User.id.
 */
import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'
import { timetableExcludeConflictResponse } from '@/lib/timetable/excludeConstraintError'

function normalizeDayOfWeek(day) {
  const d = String(day || '')
    .trim()
    .toLowerCase()
  const map = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  }
  return map[d] || ''
}

function durationMinutes(startTime, endTime, fallback = 40) {
  const parse = (t) => {
    const m = String(t || '').match(/(\d{1,2}):(\d{2})/)
    if (!m) return null
    return Number(m[1]) * 60 + Number(m[2])
  }
  const a = parse(startTime)
  const b = parse(endTime)
  if (a == null || b == null || b <= a) return fallback
  return b - a
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   schoolId: string
 *   term?: string
 *   academicYear?: string
 *   replaceExisting?: boolean
 *   actor?: { userId?: string|null, name?: string|null, role?: string|null }
 *   rows: Array<{
 *     teacherId?: string
 *     subjectId?: string
 *     classId?: string
 *     dayOfWeek?: string
 *     startTime?: string
 *     endTime?: string
 *     period?: number
 *     periodNumber?: number
 *     durationMin?: number
 *     periodType?: string
 *     classroomId?: string | null
 *     roomId?: string | null
 *   }>
 * }} opts
 */
export async function persistSolverDraft(prisma, opts) {
  const schoolId = String(opts.schoolId || '')
  const term = String(opts.term || 'Term 1').trim() || 'Term 1'
  const academicYear =
    String(opts.academicYear || new Date().getFullYear()).trim() || String(new Date().getFullYear())
  const replaceExisting = opts.replaceExisting !== false
  const rows = Array.isArray(opts.rows) ? opts.rows : []

  if (!schoolId) {
    return { ok: false, status: 400, error: 'schoolId required' }
  }
  if (!rows.length) {
    return { ok: false, status: 400, error: 'No assignments to persist' }
  }

  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    select: { id: true, userId: true },
  })
  const profileToUser = new Map(teachers.map((t) => [String(t.id), String(t.userId)]))
  const userIds = new Set(teachers.map((t) => String(t.userId)))

  const toUserTeacherId = (raw) => {
    const id = String(raw || '').trim()
    if (!id) return null
    if (profileToUser.has(id)) return profileToUser.get(id)
    if (userIds.has(id)) return id
    return id
  }

  const allocations = await prisma.teacherAllocation.findMany({
    where: { schoolId, term, academicYear, status: { in: ['pushed', 'scheduled'] } },
    select: { id: true, teacherId: true, subjectId: true, classId: true, classroomId: true },
  })
  const allocKey = (teacherId, subjectId, classId) => `${teacherId}|${subjectId}|${classId}`
  const allocByKey = new Map(
    allocations.map((a) => [allocKey(a.teacherId, a.subjectId, a.classId), a])
  )

  const toCreate = []
  const skipped = []

  for (const row of rows) {
    const teacherId = toUserTeacherId(row?.teacherId)
    const subjectId = String(row?.subjectId || '').trim()
    const classId = String(row?.classId || '').trim()
    const dayOfWeek = normalizeDayOfWeek(row?.dayOfWeek)
    const startTime = String(row?.startTime || '').trim()
    const endTime = String(row?.endTime || '').trim()
    const periodNumber = Number(row?.period ?? row?.periodNumber)
    const durationMin = Number(row?.durationMin) || durationMinutes(startTime, endTime)
    const classroomId = String(row?.classroomId || row?.roomId || '').trim() || null

    if (!teacherId || !subjectId || !classId || !dayOfWeek || !startTime || !endTime) {
      skipped.push({ reason: 'missing_fields' })
      continue
    }

    let alloc = allocByKey.get(allocKey(teacherId, subjectId, classId))
    if (!alloc) {
      alloc = await prisma.teacherAllocation.findFirst({
        where: { schoolId, term, academicYear, teacherId, subjectId, classId },
        select: { id: true, teacherId: true, subjectId: true, classId: true, classroomId: true },
      })
    }
    if (!alloc?.id) {
      skipped.push({ reason: 'no_allocation', teacherId, subjectId, classId })
      continue
    }

    const resolvedClassroomId =
      classroomId || (alloc.classroomId ? String(alloc.classroomId) : null)

    toCreate.push({
      schoolId,
      allocationId: alloc.id,
      teacherId,
      subjectId,
      classId,
      classroomId: resolvedClassroomId,
      dayOfWeek,
      startTime,
      endTime,
      durationMin,
      periodType: String(row?.periodType || 'single'),
      periodNumber: Number.isFinite(periodNumber) ? periodNumber : 1,
      term,
      academicYear,
      status: 'draft',
    })
  }

  if (!toCreate.length) {
    return {
      ok: false,
      status: 422,
      error: 'No rows could be matched to HOD allocations',
      skipped: skipped.length,
      details: skipped.slice(0, 20),
    }
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        if (replaceExisting) {
          await tx.timetableAllocationEntry.deleteMany({
            where: { schoolId, term, academicYear, status: 'draft' },
          })
        }
        await tx.timetableAllocationEntry.createMany({ data: toCreate, skipDuplicates: true })
      },
      { maxWait: 15_000, timeout: 60_000 }
    )
  } catch (err) {
    const conflict = timetableExcludeConflictResponse(err)
    if (conflict) {
      return { ok: false, status: conflict.status, response: conflict }
    }
    throw err
  }

  await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear })

  if (opts.actor) {
    const { recordChangeLog, actorFromUser } = await import('@/lib/changelog/record')
    const { CHANGE_LOG_ACTIONS, CHANGE_LOG_MODULES, buildActorLabel } =
      await import('@/lib/changelog/constants')
    const a = actorFromUser(opts.actor)
    await recordChangeLog({
      schoolId,
      actor: a,
      action: CHANGE_LOG_ACTIONS.CREATED,
      module: CHANGE_LOG_MODULES.TIMETABLE,
      entityType: 'TimetableDraft',
      entityId: `${term}|${academicYear}`,
      entityLabel: `${term} ${academicYear} draft timetable`,
      summary: `${buildActorLabel(a)} saved a draft timetable for ${term} ${academicYear} (${toCreate.length} period${toCreate.length === 1 ? '' : 's'})`,
      after: { term, academicYear, saved: toCreate.length, replaceExisting },
      metadata: { term, academicYear },
    })
  }

  return {
    ok: true,
    saved: toCreate.length,
    skipped: skipped.length,
    term,
    academicYear,
  }
}

/**
 * Expand greedy lessonId→slotId map into persistable rows.
 */
export function greedyAssignmentsToRows(assignments, slotSpans, lessons, slots) {
  const lessonById = new Map((lessons || []).map((l) => [String(l.id), l]))
  const slotById = new Map((slots || []).map((s) => [String(s.id), s]))
  const out = []
  for (const [lessonId, slotId] of Object.entries(assignments || {})) {
    const lesson = lessonById.get(String(lessonId))
    const spanIds = slotSpans?.[lessonId]?.length ? slotSpans[lessonId] : [slotId]
    const slot = slotById.get(String(slotId))
    const lastSlot = slotById.get(String(spanIds[spanIds.length - 1] || slotId))
    if (!lesson || !slot || slot.isBreak) continue
    out.push({
      teacherId: lesson.teacherId,
      subjectId: lesson.subjectId,
      classId: lesson.classId,
      classroomId: lesson.classroomId || lesson.roomId || null,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: lastSlot?.endTime || slot.endTime,
      period: Number(slot.period) || 1,
      periodType: spanIds.length >= 2 ? 'double' : 'single',
    })
  }
  return out
}

/**
 * Normalize OR-Tools assignment array into persistable rows.
 */
export function ortoolsAssignmentsToRows(assignments) {
  return (Array.isArray(assignments) ? assignments : []).map((a) => ({
    teacherId: a?.teacherId,
    subjectId: a?.subjectId,
    classId: a?.classId,
    classroomId: a?.classroomId || a?.roomId || null,
    dayOfWeek: a?.dayOfWeek || a?.day,
    startTime: a?.startTime,
    endTime: a?.endTime,
    period: a?.period,
    periodType: 'single',
  }))
}
