import { normalizeDayKey } from '@/lib/timetable/timeSlotsFromConfig'
import { inferAssignmentDoubleFields } from '@/lib/timetable/doublePeriodUtils'

export function mapDbEntriesToAssignments(entries) {
  return (entries || []).map((e) => {
    const doubleFields = inferAssignmentDoubleFields(e)
    return {
      id: e.id,
      season: 'normal',
      dayOfWeek: normalizeDayKey(e.dayOfWeek),
      startTime: e.startTime,
      endTime: e.endTime,
      period: Number(e.periodNumber || 0),
      teacherId: e.teacherId,
      teacherName: e.allocation?.teacher?.name || e.teacherName || '',
      classId: e.classId,
      className: e.allocation?.class?.name || e.className || '',
      subjectId: e.subjectId,
      subjectName: e.allocation?.subject?.name || e.subjectName || '',
      periodType: doubleFields.periodType,
      isDoublePeriod: doubleFields.isDoublePeriod,
      consecutivePeriods: doubleFields.consecutivePeriods,
      source: 'generated',
    }
  })
}

export function buildTeacherWorkloadSummary(assignments) {
  const byTeacher = new Map()

  for (const a of assignments || []) {
    const tid = String(a.teacherId || '')
    if (!tid) continue
    if (!byTeacher.has(tid)) {
      byTeacher.set(tid, {
        teacherId: tid,
        teacherName: a.teacherName || 'Teacher',
        totalPeriods: 0,
        subjects: new Map(),
      })
    }
    const row = byTeacher.get(tid)
    row.totalPeriods += 1
    const subKey = String(a.subjectId || a.subjectName || 'subject')
    if (!row.subjects.has(subKey)) {
      row.subjects.set(subKey, {
        subjectId: a.subjectId,
        subjectName: a.subjectName || 'Subject',
        classes: new Set(),
        periods: 0,
      })
    }
    const sub = row.subjects.get(subKey)
    sub.periods += 1
    if (a.className) sub.classes.add(a.className)
    else if (a.classId) sub.classes.add(String(a.classId))
  }

  return Array.from(byTeacher.values()).map((t) => ({
    teacherId: t.teacherId,
    teacherName: t.teacherName,
    totalPeriods: t.totalPeriods,
    subjects: Array.from(t.subjects.values()).map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      classes: Array.from(s.classes),
      periods: s.periods,
    })),
  }))
}
