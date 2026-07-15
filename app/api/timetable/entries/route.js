export const dynamic = 'force-dynamic'
// app/api/timetable/entries/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { validatePatchedDraftEntries } from '@/lib/timetable/draftHardConflictCheck'
import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'
import {
  canManageTimetableDraft,
  timetableForbiddenResponse,
} from '@/lib/timetable/timetableRouteAuth'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'
import { timetableExcludeConflictResponse } from '@/lib/timetable/excludeConstraintError'

const ENTRY_LIST_LIMIT = 2000
const DRAFT_SCAN_LIMIT = 2000

function normalizeDayOfWeek(day) {
  const d = String(day || '')
    .trim()
    .toLowerCase()
  if (d === 'monday') return 'Monday'
  if (d === 'tuesday') return 'Tuesday'
  if (d === 'wednesday') return 'Wednesday'
  if (d === 'thursday') return 'Thursday'
  if (d === 'friday') return 'Friday'
  if (d === 'saturday') return 'Saturday'
  if (d === 'sunday') return 'Sunday'
  return ''
}

export const GET = withErrorHandler(async function GET(req) {
  const user = await getAuthUser(req)
  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const { searchParams } = new URL(req.url)
  const term = safeQueryString(searchParams.get('term'), { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(searchParams.get('academicYear'), {
    defaultValue: String(new Date().getFullYear()),
  })
  const status = safeQueryString(searchParams.get('status'))

  const entries = await prisma.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, ...(status ? { status } : {}) },
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
    take: ENTRY_LIST_LIMIT,
  })

  return NextResponse.json({ entries })
})

export const PATCH = withErrorHandler(async function PATCH(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageTimetableDraft(user)) return timetableForbiddenResponse()

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = safeStringId(body?.id)
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const dayOfWeek = body?.dayOfWeek !== undefined ? normalizeDayOfWeek(body?.dayOfWeek) : ''
  const startTime = body?.startTime !== undefined ? String(body?.startTime || '').trim() : ''
  const endTime = body?.endTime !== undefined ? String(body?.endTime || '').trim() : ''
  const periodNumber = body?.periodNumber !== undefined ? Number(body?.periodNumber) : Number.NaN
  const teacherId = body?.teacherId !== undefined ? safeStringId(body?.teacherId) : undefined
  const classroomIdRaw =
    body?.classroomId !== undefined || body?.roomId !== undefined
      ? body?.classroomId !== undefined
        ? body.classroomId
        : body.roomId
      : undefined
  const classroomId =
    classroomIdRaw === null || classroomIdRaw === ''
      ? null
      : classroomIdRaw !== undefined
        ? safeStringId(classroomIdRaw)
        : undefined

  if (body?.dayOfWeek !== undefined && !dayOfWeek) {
    return NextResponse.json({ error: 'Invalid dayOfWeek' }, { status: 400 })
  }
  if ((body?.startTime !== undefined || body?.endTime !== undefined) && (!startTime || !endTime)) {
    return NextResponse.json({ error: 'startTime and endTime required' }, { status: 400 })
  }
  if (body?.periodNumber !== undefined && (!Number.isFinite(periodNumber) || periodNumber < 1)) {
    return NextResponse.json({ error: 'Invalid periodNumber' }, { status: 400 })
  }
  if (
    classroomIdRaw !== undefined &&
    classroomIdRaw !== null &&
    classroomIdRaw !== '' &&
    !classroomId
  ) {
    return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 })
  }

  const entry = await prisma.timetableAllocationEntry.findFirst({
    where: { id, schoolId },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
        },
      },
      classroom: { select: { id: true, name: true } },
    },
  })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  if (String(entry.status) !== 'draft') {
    return NextResponse.json(
      { error: 'Only draft entries can be edited. Generate a draft first.' },
      { status: 409 }
    )
  }

  const data = {}
  if (dayOfWeek) data.dayOfWeek = dayOfWeek
  if (startTime) data.startTime = startTime
  if (endTime) data.endTime = endTime
  if (Number.isFinite(periodNumber)) data.periodNumber = periodNumber
  if (teacherId) data.teacherId = teacherId
  if (classroomId !== undefined) data.classroomId = classroomId

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  if (data.classroomId) {
    const room = await prisma.classroom.findFirst({
      where: { id: data.classroomId, schoolId },
      select: { id: true, name: true },
    })
    if (!room) {
      return NextResponse.json({ error: 'Classroom not found for this school' }, { status: 404 })
    }
  }

  const allDraft = await prisma.timetableAllocationEntry.findMany({
    where: {
      schoolId,
      term: entry.term,
      academicYear: entry.academicYear,
      status: 'draft',
    },
    include: {
      allocation: {
        include: {
          teacher: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
    take: DRAFT_SCAN_LIMIT,
  })

  const hardConflicts = validatePatchedDraftEntries(allDraft, id, data)
  if (hardConflicts.length > 0) {
    return NextResponse.json(
      {
        error: 'This change would introduce a hard timetable conflict.',
        hardConflicts: hardConflicts.slice(0, 10),
        code: 'PATCH_BLOCKED_BY_CONFLICTS',
      },
      { status: 422 }
    )
  }

  let updated
  try {
    const updateResult = await prisma.timetableAllocationEntry.updateMany({
      where: { id, schoolId },
      data,
    })
    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    updated = await prisma.timetableAllocationEntry.findFirst({
      where: { id, schoolId },
      include: {
        allocation: {
          include: {
            teacher: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
    })
  } catch (err) {
    const conflict = timetableExcludeConflictResponse(err, {
      teacherName: entry?.allocation?.teacher?.name,
      className: entry?.allocation?.class?.name,
      roomName: entry?.classroom?.name,
      dayOfWeek: data.dayOfWeek || entry.dayOfWeek,
      startTime: data.startTime || entry.startTime,
      endTime: data.endTime || entry.endTime,
    })
    if (conflict) return conflict
    throw err
  }

  await rescanAndPersistDraftMeta(prisma, {
    schoolId,
    term: entry.term,
    academicYear: entry.academicYear,
  })

  return NextResponse.json({ entry: updated })
})

export const DELETE = withErrorHandler(async function DELETE(req) {
  /** Single entry: `{ id }`. Bulk clear: `{ clearAll: true, term, academicYear }` (draft only). */
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const clearAll = body?.clearAll === true
  const term = safeQueryString(body?.term, { defaultValue: 'Term 1' })
  const academicYear = safeQueryString(body?.academicYear, {
    defaultValue: String(new Date().getFullYear()),
  })

  if (clearAll) {
    if (!canManageTimetableDraft(user)) return timetableForbiddenResponse()

    const result = await prisma.timetableAllocationEntry.deleteMany({
      where: { schoolId, term, academicYear, status: 'draft' },
    })

    await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear })

    return NextResponse.json({ success: true, deletedCount: result.count })
  }

  const entryId = safeStringId(body?.id)
  if (!entryId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  if (!canManageTimetableDraft(user)) return timetableForbiddenResponse()

  const entry = await prisma.timetableAllocationEntry.findFirst({
    where: { id: entryId, schoolId },
  })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  const entryStatus = String(entry.status || '').toLowerCase()
  if (entryStatus !== 'draft' && entryStatus !== 'published') {
    return NextResponse.json(
      { error: `Cannot delete timetable entry with status "${entry.status}".` },
      { status: 409 }
    )
  }

  const deleteResult = await prisma.timetableAllocationEntry.deleteMany({
    where: { id: entryId, schoolId },
  })
  if (deleteResult.count === 0) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  await rescanAndPersistDraftMeta(prisma, {
    schoolId,
    term: entry.term,
    academicYear: entry.academicYear,
  })

  return NextResponse.json({ success: true })
})
