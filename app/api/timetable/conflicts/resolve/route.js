export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'
import { timesOverlap } from '@/lib/timetable/validateTimetable'
import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'
import { withErrorHandler } from '@/lib/middleware/errorHandler'
import { safeQueryString, safeStringId } from '@/lib/security/safeQueryValue'
import { timetableExcludeConflictResponse } from '@/lib/timetable/excludeConstraintError'

const RESOLVE_ROLES = new Set(['headteacher', 'administrator', 'admin', 'superadmin'])

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

async function verifyDraftEntry(entryId, schoolId) {
  const entry = await prisma.timetableAllocationEntry.findFirst({
    where: { id: entryId, schoolId },
  })
  if (!entry) {
    throw Object.assign(new Error(`Entry ${entryId} not found`), { status: 404 })
  }
  if (String(entry.status) !== 'draft') {
    throw Object.assign(new Error('Only draft entries can be modified'), { status: 409 })
  }
  return entry
}

function entryInclude() {
  return {
    allocation: {
      include: {
        teacher: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
    },
  }
}

async function rescanAndPersist(schoolId, term, academicYear) {
  return rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear })
}

/**
 * POST /api/timetable/conflicts/resolve
 * Apply a resolution action to draft timetable allocation entries.
 */
export const POST = withErrorHandler(async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = String(user.role || '').toLowerCase()
  if (!RESOLVE_ROLES.has(role)) {
    return NextResponse.json(
      { error: 'Only headteachers and administrators can resolve conflicts' },
      { status: 403 }
    )
  }

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const body = await req.json().catch(() => ({}))
  const action = safeQueryString(body?.action, { defaultValue: '' })

  try {
    switch (action) {
      case 'REASSIGN_TEACHER': {
        const entryId = safeStringId(body?.entryId)
        const newTeacherId = safeStringId(body?.newTeacherId)
        if (!entryId || !newTeacherId) {
          return NextResponse.json(
            { error: 'entryId and newTeacherId are required' },
            { status: 400 }
          )
        }

        const entry = await verifyDraftEntry(entryId, schoolId)
        const teacher = await prisma.user.findFirst({
          where: { id: newTeacherId, schoolId },
          select: { id: true, name: true, role: true },
        })
        if (!teacher) {
          return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
        }

        let updated
        try {
          updated = await prisma.timetableAllocationEntry.update({
            where: { id: entryId },
            data: { teacherId: newTeacherId },
            include: entryInclude(),
          })
        } catch (err) {
          const conflict = timetableExcludeConflictResponse(err, {
            teacherName: teacher.name || undefined,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
          })
          if (conflict) return conflict
          throw err
        }

        const summary = await rescanAndPersist(schoolId, entry.term, entry.academicYear)

        return NextResponse.json({
          success: true,
          action,
          updated,
          message: `Teacher changed to ${teacher.name || 'teacher'}`,
          conflictSummary: {
            total: summary.totalConflicts,
            errors: summary.errorCount,
            warnings: summary.warningCount,
            canPublish: summary.canPublish,
          },
        })
      }

      case 'MOVE_TO_SLOT':
      case 'APPLY_SUGGESTION': {
        const entryId = safeStringId(body?.entryId) || safeStringId(body?.originalAssignmentId)
        if (!entryId) {
          return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
        }

        const entry = await verifyDraftEntry(entryId, schoolId)
        const targetEntryId = safeStringId(body?.targetEntryId)

        let slotData = {}
        if (targetEntryId) {
          const target = await verifyDraftEntry(targetEntryId, schoolId)
          slotData = {
            dayOfWeek: target.dayOfWeek,
            startTime: target.startTime,
            endTime: target.endTime,
            periodNumber: target.periodNumber,
            durationMin: target.durationMin,
          }
        } else {
          const dayOfWeek = normalizeDayOfWeek(body?.newDayOfWeek || body?.dayOfWeek)
          const startTime = String(body?.newStartTime || body?.startTime || '').trim()
          const endTime = String(body?.newEndTime || body?.endTime || '').trim()
          const periodNumber = Number(body?.newPeriodNumber ?? body?.periodNumber)
          const durationMin = Number(body?.newDurationMin || entry.durationMin)

          if (!dayOfWeek || !startTime || !endTime || !Number.isFinite(periodNumber)) {
            return NextResponse.json(
              {
                error:
                  'Provide targetEntryId or newDayOfWeek, newStartTime, newEndTime, newPeriodNumber',
              },
              { status: 400 }
            )
          }
          slotData = { dayOfWeek, startTime, endTime, periodNumber, durationMin }
        }

        const warnings = []
        const others = await prisma.timetableAllocationEntry.findMany({
          where: {
            schoolId,
            term: entry.term,
            academicYear: entry.academicYear,
            status: 'draft',
            id: { not: entryId },
          },
        })

        for (const other of others) {
          if (
            String(other.teacherId) === String(entry.teacherId) &&
            timesOverlap(
              {
                dayOfWeek: slotData.dayOfWeek,
                startTime: slotData.startTime,
                endTime: slotData.endTime,
              },
              { dayOfWeek: other.dayOfWeek, startTime: other.startTime, endTime: other.endTime }
            )
          ) {
            warnings.push('Teacher may be double-booked in the new slot')
            break
          }
        }

        for (const other of others) {
          if (
            String(other.classId) === String(entry.classId) &&
            timesOverlap(
              {
                dayOfWeek: slotData.dayOfWeek,
                startTime: slotData.startTime,
                endTime: slotData.endTime,
              },
              { dayOfWeek: other.dayOfWeek, startTime: other.startTime, endTime: other.endTime }
            )
          ) {
            warnings.push('Class may be double-booked in the new slot')
            break
          }
        }

        let updated
        try {
          updated = await prisma.timetableAllocationEntry.update({
            where: { id: entryId },
            data: slotData,
            include: entryInclude(),
          })
        } catch (err) {
          const conflict = timetableExcludeConflictResponse(err, {
            dayOfWeek: slotData.dayOfWeek,
            startTime: slotData.startTime,
            endTime: slotData.endTime,
          })
          if (conflict) return conflict
          throw err
        }

        const summary = await rescanAndPersist(schoolId, entry.term, entry.academicYear)

        return NextResponse.json({
          success: true,
          action,
          updated,
          warnings,
          message: `Entry moved to ${slotData.dayOfWeek} ${slotData.startTime}`,
          conflictSummary: {
            total: summary.totalConflicts,
            errors: summary.errorCount,
            warnings: summary.warningCount,
            canPublish: summary.canPublish,
          },
        })
      }

      case 'REMOVE_ENTRY': {
        const entryId = safeStringId(body?.entryId)
        if (!entryId) {
          return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
        }

        const entry = await verifyDraftEntry(entryId, schoolId)
        await prisma.timetableAllocationEntry.delete({ where: { id: entryId } })

        const summary = await rescanAndPersist(schoolId, entry.term, entry.academicYear)

        return NextResponse.json({
          success: true,
          action,
          removedId: entryId,
          message: 'Timetable entry removed',
          conflictSummary: {
            total: summary.totalConflicts,
            errors: summary.errorCount,
            warnings: summary.warningCount,
            canPublish: summary.canPublish,
          },
        })
      }

      case 'SWAP_SLOTS': {
        const entryAId = safeStringId(body?.entryAId)
        const entryBId = safeStringId(body?.entryBId)
        if (!entryAId || !entryBId) {
          return NextResponse.json({ error: 'entryAId and entryBId are required' }, { status: 400 })
        }

        const [entryA, entryB] = await Promise.all([
          verifyDraftEntry(entryAId, schoolId),
          verifyDraftEntry(entryBId, schoolId),
        ])

        let updatedA
        let updatedB
        try {
          ;[updatedA, updatedB] = await prisma.$transaction([
            prisma.timetableAllocationEntry.update({
              where: { id: entryAId },
              data: {
                dayOfWeek: entryB.dayOfWeek,
                startTime: entryB.startTime,
                endTime: entryB.endTime,
                periodNumber: entryB.periodNumber,
                durationMin: entryB.durationMin,
              },
              include: entryInclude(),
            }),
            prisma.timetableAllocationEntry.update({
              where: { id: entryBId },
              data: {
                dayOfWeek: entryA.dayOfWeek,
                startTime: entryA.startTime,
                endTime: entryA.endTime,
                periodNumber: entryA.periodNumber,
                durationMin: entryA.durationMin,
              },
              include: entryInclude(),
            }),
          ])
        } catch (err) {
          const conflict = timetableExcludeConflictResponse(err)
          if (conflict) return conflict
          throw err
        }

        const summary = await rescanAndPersist(schoolId, entryA.term, entryA.academicYear)

        return NextResponse.json({
          success: true,
          action,
          updatedA,
          updatedB,
          message: 'Time slots swapped between the two entries',
          conflictSummary: {
            total: summary.totalConflicts,
            errors: summary.errorCount,
            warnings: summary.warningCount,
            canPublish: summary.canPublish,
          },
        })
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid: REASSIGN_TEACHER, MOVE_TO_SLOT, REMOVE_ENTRY, SWAP_SLOTS, APPLY_SUGGESTION`,
          },
          { status: 400 }
        )
    }
  } catch (err) {
    const excludeRes = timetableExcludeConflictResponse(err)
    if (excludeRes) return excludeRes
    const status = err?.status || 500
    return NextResponse.json({ error: err?.message || 'Resolution failed' }, { status })
  }
})
