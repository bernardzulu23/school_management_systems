export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSchoolId } from '@/lib/utils/resolveSchoolId'
import { getAuthUser } from '@/lib/middleware/auth'
import { guardSchoolOnlyTimetable } from '@/lib/timetable/guardSchoolOnly'

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

function findGradeDoubleBookings(rows) {
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
        message: 'Grade is double-booked',
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
export async function POST(req) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await resolveSchoolId(req, user)
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 401 })

  const typeCheck = await guardSchoolOnlyTimetable(schoolId)
  if (!typeCheck.allowed) return typeCheck.response

  const role = String(user.role || '').toLowerCase()
  if (!['headteacher', 'administrator', 'admin', 'superadmin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const term = String(body?.term || 'Term 1').trim()
  const academicYear = String(body?.academicYear || new Date().getFullYear()).trim()
  const rows = Array.isArray(body?.assignments) ? body.assignments : []
  const replaceExisting = body?.replaceExisting !== false

  if (!rows.length) {
    return NextResponse.json({ error: 'assignments array is required' }, { status: 400 })
  }

  const allocations = await prisma.teacherAllocation.findMany({
    where: { schoolId, term, academicYear, status: { in: ['pushed', 'scheduled'] } },
    select: { id: true, teacherId: true, subjectId: true, classId: true },
  })

  const allocKey = (teacherId, subjectId, classId) => `${teacherId}|${subjectId}|${classId}`
  const allocByKey = new Map(
    allocations.map((a) => [allocKey(a.teacherId, a.subjectId, a.classId), a.id])
  )

  const toCreate = []
  const skipped = []

  for (const row of rows) {
    const teacherId = String(row?.teacherId || '').trim()
    const subjectId = String(row?.subjectId || '').trim()
    const classId = String(row?.classId || '').trim()
    const dayOfWeek = normalizeDayOfWeek(row?.dayOfWeek)
    const startTime = String(row?.startTime || '').trim()
    const endTime = String(row?.endTime || '').trim()
    const periodNumber = Number(row?.period ?? row?.periodNumber)
    const durationMin = Number(row?.durationMin || 40)

    if (!teacherId || !subjectId || !classId || !dayOfWeek || !startTime || !endTime) {
      skipped.push({ reason: 'missing_fields', row })
      continue
    }

    let allocationId = allocByKey.get(allocKey(teacherId, subjectId, classId))
    if (!allocationId) {
      const alloc = await prisma.teacherAllocation.findFirst({
        where: { schoolId, term, academicYear, teacherId, subjectId, classId },
        select: { id: true },
      })
      allocationId = alloc?.id
    }
    if (!allocationId) {
      skipped.push({ reason: 'no_allocation', teacherId, subjectId, classId })
      continue
    }

    toCreate.push({
      schoolId,
      allocationId,
      teacherId,
      subjectId,
      classId,
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

  const gradeConflicts = findGradeDoubleBookings(toCreate)
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

  await prisma.$transaction(async (tx) => {
    if (replaceExisting) {
      await tx.timetableAllocationEntry.deleteMany({
        where: { schoolId, term, academicYear, status: 'draft' },
      })
    }
    await tx.timetableAllocationEntry.createMany({ data: toCreate, skipDuplicates: true })
  })

  return NextResponse.json({
    success: true,
    saved: toCreate.length,
    skipped: skipped.length,
  })
}
