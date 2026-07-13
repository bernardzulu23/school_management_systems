/**
 * Prompt 3 live verification: published Term 1/2 hard error counts + Friday adjacent pairs.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { describe, expect, it, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { auditDraftTimetable } from '@/lib/timetable/conflictAudit'
import { halfOpenTimeRangesOverlap } from '@/lib/timetable/timeRangeOverlap'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
} from '@/lib/timetable/validateTimetable'
import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import { loadPublishedTimetableEntries } from '@/lib/timetable/clonePublishedToDraft'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
const SCHOOL = '818097ac-d9d6-44cc-9526-7056237814fb'
const YEAR = '2026'

function sameSubjectSameDayGroups(entries) {
  const map = new Map()
  for (const e of entries) {
    const day = String(e.dayOfWeek || '').toLowerCase()
    const k = `${e.classId}|${e.subjectId}|${day}`
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(e)
  }
  const out = []
  for (const [, list] of map) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]
        out.push({
          className: a.allocation?.class?.name || a.className,
          subject: a.allocation?.subject?.name || a.subjectName,
          day: String(a.dayOfWeek).toLowerCase(),
          a: `${a.startTime}–${a.endTime}`,
          b: `${b.startTime}–${b.endTime}`,
          overlaps: halfOpenTimeRangesOverlap(
            a.dayOfWeek,
            a.startTime,
            a.endTime,
            b.dayOfWeek,
            b.startTime,
            b.endTime
          ),
        })
      }
    }
  }
  return out
}

describe.skipIf(!url)('Prompt 3 published overlap-only regression', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('Term 1 + Term 2 published: hard CLASS_DOUBLE_BOOKED matches time overlap only', async () => {
    const report: Record<string, unknown> = {}

    for (const term of ['Term 1', 'Term 2'] as const) {
      const published = await loadPublishedTimetableEntries(prisma, {
        schoolId: SCHOOL,
        term,
        academicYear: YEAR,
      })
      const assignments = mapDbEntriesToAssignments(published)
      const validation = validateTimetable(assignments)
      const hard = getHardConflicts(validation)
      const soft = getSoftConflicts(validation)
      const groups = sameSubjectSameDayGroups(published)
      const friday = groups.filter((g) => g.day === 'friday')

      const defaultAudit = await auditDraftTimetable(prisma, {
        schoolId: SCHOOL,
        term,
        academicYear: YEAR,
      })
      const hardUi = (defaultAudit.conflicts || []).filter(
        (c: { severity?: string }) =>
          c.severity === 'error' || String(c.severity).toLowerCase() === 'hard'
      )

      report[term] = {
        publishedRows: published.length,
        validateHard: hard.length,
        validateSoft: soft.length,
        classDoubleBookedHard: hard.filter((c) => c.type === 'CLASS_DOUBLE_BOOKED').length,
        teacherDoubleBookedHard: hard.filter((c) => c.type === 'TEACHER_DOUBLE_BOOKED').length,
        subjectDistributionSoft: soft.filter((c) => c.type === 'SUBJECT_DISTRIBUTION').length,
        sameSubjectSameDayPairs: groups.length,
        overlappingSameSubjectPairs: groups.filter((g) => g.overlaps).length,
        fridayPairs: friday,
        uiSource: defaultAudit.source,
        uiHardErrors: hardUi.length,
        uiByType: defaultAudit.byType,
        surfacesShow: hardUi.length,
      }
    }

    console.log(JSON.stringify(report, null, 2))

    for (const term of ['Term 1', 'Term 2'] as const) {
      const r = report[term] as {
        overlappingSameSubjectPairs: number
        classDoubleBookedHard: number
        fridayPairs: Array<{ overlaps: boolean }>
      }
      expect(r.fridayPairs.every((p) => typeof p.overlaps === 'boolean')).toBe(true)
      if (r.overlappingSameSubjectPairs === 0) {
        expect(r.classDoubleBookedHard).toBe(0)
      }
    }
  }, 120_000)
})
