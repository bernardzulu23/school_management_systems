import { rescanAndPersistDraftMeta } from '@/lib/timetable/conflictAudit'
import { interpretTimetableExcludeError } from '@/lib/timetable/excludeConstraintError'

const ENTRY_INCLUDE = {
  allocation: {
    include: {
      teacher: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
      classroom: { select: { id: true, name: true } },
    },
  },
  classroom: { select: { id: true, name: true } },
}

export async function loadPublishedTimetableEntries(prisma, { schoolId, term, academicYear }) {
  return prisma.timetableAllocationEntry.findMany({
    where: { schoolId, term, academicYear, status: 'published' },
    include: ENTRY_INCLUDE,
    orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
  })
}

/**
 * Copy published TimetableAllocationEntry rows into a new editable draft (same term/year).
 * Published rows are left unchanged until the headteacher publishes again.
 */
export async function clonePublishedEntriesToDraft(prisma, { schoolId, term, academicYear }) {
  const draftCount = await prisma.timetableAllocationEntry.count({
    where: { schoolId, term, academicYear, status: 'draft' },
  })

  if (draftCount > 0) {
    return {
      success: true,
      created: 0,
      alreadyExists: true,
      message: 'Draft timetable already exists for this term.',
    }
  }

  const published = await loadPublishedTimetableEntries(prisma, { schoolId, term, academicYear })
  if (!published.length) {
    return {
      success: false,
      created: 0,
      code: 'NO_PUBLISHED',
      message: 'No published timetable found for this term.',
    }
  }

  const data = published.map((e) => ({
    schoolId: e.schoolId,
    allocationId: e.allocationId,
    teacherId: e.teacherId,
    subjectId: e.subjectId,
    classId: e.classId,
    classroomId: e.classroomId || null,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime,
    endTime: e.endTime,
    durationMin: e.durationMin,
    periodType: e.periodType,
    periodNumber: e.periodNumber,
    term: e.term,
    academicYear: e.academicYear,
    status: 'draft',
  }))

  let result
  try {
    result = await prisma.timetableAllocationEntry.createMany({ data })
  } catch (err) {
    const mapped = interpretTimetableExcludeError(err)
    if (mapped.isExcludeViolation) {
      return {
        success: false,
        created: 0,
        code: mapped.code,
        message:
          'Cannot create draft from published timetable: the published schedule still has overlapping lessons. Remove those overlaps first, or regenerate a clean draft.',
      }
    }
    throw err
  }
  await rescanAndPersistDraftMeta(prisma, { schoolId, term, academicYear }).catch(() => {})

  return {
    success: true,
    created: result.count,
    message: `Created editable draft with ${result.count} period(s) copied from the published timetable.`,
  }
}
