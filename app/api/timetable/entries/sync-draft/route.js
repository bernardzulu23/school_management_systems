export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { getHardConflictsForDraftEntries } from '@/lib/timetable/draftHardConflictCheck'
import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'
import { gradeDoubleBookedMessage } from '@/lib/timetable/zambiaTerminology'
import {
  canManageTimetableDraft,
  timetableForbiddenResponse,
} from '@/lib/timetable/timetableRouteAuth'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { timetableExcludeConflictResponse } from '@/lib/timetable/excludeConstraintError'

const MAX_SYNC_ASSIGNMENTS = 500

function toMinutes(t) {
  const [h, m] = String(t || '0:0')
    .split(':')
    .map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

function timesOverlap(a, b) {
  if (String(a.dayOfWeek) !== String(b.dayOfWeek)) return false
  const a0 = toMinutes(a.startTime)
  const a1 = toMinutes(a.endTime)
  const b0 = toMinutes(b.startTime)
  const b1 = toMinutes(b.endTime)
  if (a1 <= a0 || b1 <= b0) return false
  return a0 < b1 && b0 < a1
}

function findGradeDoubleBookings(rows, classNameById = new Map()) {
  const conflicts = []
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]
      const b = rows[j]
      if (String(a.classId) !== String(b.classId)) continue
      if (!timesOverlap(a, b)) continue
      conflicts.push({
        classId: a.classId,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        message: gradeDoubleBookedMessage(classNameById.get(String(a.classId))),
      })
    }
  }
  return conflicts
}

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

/**
 * POST /api/timetable/entries/sync-draft
 * Persist in-memory solver/UI assignments to TimetableAllocationEntry (draft).
 */
export const POST = withErrorHandler(async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  if (!canManageTimetableDraft(user)) return timetableForbiddenResponse()

  const body = await req.json().catch(() => ({}))
  const term = safeQueryString(body?.term, { defaultValue: 'Term 1', maxLength: 64 })
  const academicYear = safeQueryString(body?.academicYear, {
    defaultValue: String(new Date().getFullYear()),
    maxLength: 16,
  })
  const rows = (Array.isArray(body?.assignments) ? body.assignments : []).slice(
    0,
    MAX_SYNC_ASSIGNMENTS
  )
  const replaceExisting = body?.replaceExisting !== false

  if (!rows.length) {
    return NextResponse.json({ error: 'assignments array is required' }, { status: 400 })
  }
  if (Array.isArray(body?.assignments) && body.assignments.length > MAX_SYNC_ASSIGNMENTS) {
    return NextResponse.json(
      { error: `assignments exceeds limit of ${MAX_SYNC_ASSIGNMENTS}` },
      { status: 400 }
    )
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
    const teacherId = safeStringId(row?.teacherId)
    const subjectId = safeStringId(row?.subjectId)
    const classId = safeStringId(row?.classId)
    const dayOfWeek = normalizeDayOfWeek(row?.dayOfWeek)
    const startTime = String(row?.startTime || '').trim()
    const endTime = String(row?.endTime || '').trim()
    const periodNumber = Number(row?.period ?? row?.periodNumber)
    const durationMin = Number(row?.durationMin || 40)
    const rowClassroomId = String(row?.classroomId || row?.roomId || '').trim() || null

    if (!teacherId || !subjectId || !classId || !dayOfWeek || !startTime || !endTime) {
      skipped.push({ reason: 'missing_fields', row })
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

    toCreate.push({
      schoolId,
      allocationId: alloc.id,
      teacherId,
      subjectId,
      classId,
      classroomId: rowClassroomId || (alloc.classroomId ? String(alloc.classroomId) : null),
      dayOfWeek,
      startTime,
      endTime,
      durationMin: Number.isFinite(durationMin) ? durationMin : 40,
      periodType: String(row?.periodType || 'single'),
      periodNumber: Number.isFinite(periodNumber) ? periodNumber : 1,
      term,
      academicYear,
      status: 'draft',
    })
  }

  if (!toCreate.length) {
    return NextResponse.json(
      { error: 'No rows could be matched to HOD allocations', skipped: skipped.length },
      { status: 422 }
    )
  }

  const classIds = [...new Set(toCreate.map((row) => String(row.classId)).filter(Boolean))]
  const classRows =
    classIds.length > 0
      ? await prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, name: true },
        })
      : []
  const classNameById = new Map(classRows.map((c) => [String(c.id), c.name]))
  for (const row of rows) {
    const classId = String(row?.classId || '').trim()
    const className = String(row?.className || '').trim()
    if (classId && className && !classNameById.has(classId)) {
      classNameById.set(classId, className)
    }
  }

  const gradeConflicts = findGradeDoubleBookings(toCreate, classNameById)
  if (gradeConflicts.length > 0) {
    return NextResponse.json(
      {
        error:
          'Draft contains grade double-bookings (two subjects in the same period for one grade). Fix conflicts before saving.',
        conflicts: gradeConflicts.slice(0, 20),
      },
      { status: 422 }
    )
  }

  const hardRows = toCreate.map((row, index) => ({
    ...row,
    id: row.id || `sync_${index}`,
    allocation: {},
  }))
  const hardConflicts = getHardConflictsForDraftEntries(hardRows)
  if (hardConflicts.length > 0) {
    return NextResponse.json(
      {
        error:
          'Draft contains hard timetable conflicts (teacher, class, or room double-booked). Fix conflicts before saving.',
        hardConflicts: hardConflicts.slice(0, 20),
        code: 'SYNC_BLOCKED_BY_CONFLICTS',
      },
      { status: 422 }
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.timetableAllocationEntry.deleteMany({
          where: { schoolId, term, academicYear, status: 'draft' },
        })
      }
      await tx.timetableAllocationEntry.createMany({ data: toCreate, skipDuplicates: true })
    })
  } catch (err) {
    const conflict = timetableExcludeConflictResponse(err)
    if (conflict) return conflict
    throw err
  }

  await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear })

  return NextResponse.json({
    success: true,
    saved: toCreate.length,
    skipped: skipped.length,
  })
})
