/**
 * Live report: Rule A / Rule B counts on published Term 1 & Term 2.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { describe, expect, it, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { loadPublishedTimetableEntries } from '@/lib/timetable/clonePublishedToDraft'
import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
} from '@/lib/timetable/validateTimetable'
import {
  TEACHER_CLASS_SUBJECT_SPLIT,
  TEACHER_CLASS_RETURN_TOO_SOON,
  parseSchedulingRulesJson,
} from '@/lib/timetable/teacherClassSessionRules'
import {
  ensureTimetableConfig,
  normalizeTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
const SCHOOL = '818097ac-d9d6-44cc-9526-7056237814fb'
const YEAR = '2026'

describe.skipIf(!url)('Teacher class session rules — live published audit', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('reports Rule A and Rule B counts for Term 1 and Term 2 published', async () => {
    const cfg = await ensureTimetableConfig(prisma, SCHOOL)
    const rules = parseSchedulingRulesJson(normalizeTimetableConfig(cfg).schedulingRules)
    const report: Record<string, unknown> = { rules }

    for (const term of ['Term 1', 'Term 2'] as const) {
      const published = await loadPublishedTimetableEntries(prisma, {
        schoolId: SCHOOL,
        term,
        academicYear: YEAR,
      })
      const assignments = mapDbEntriesToAssignments(published)
      const validation = validateTimetable(assignments, { teacherClassSessionRules: rules })
      const hard = getHardConflicts(validation)
      const soft = getSoftConflicts(validation)
      const ruleA = validation.filter((c) => c.type === TEACHER_CLASS_SUBJECT_SPLIT)
      const ruleB = validation.filter((c) => c.type === TEACHER_CLASS_RETURN_TOO_SOON)

      report[term] = {
        publishedRows: published.length,
        hardTotal: hard.length,
        softTotal: soft.length,
        ruleA_subjectSplit: ruleA.length,
        ruleB_returnTooSoon: ruleB.length,
        ruleASamples: ruleA.slice(0, 8).map((c) => c.message),
        ruleBSamples: ruleB.slice(0, 8).map((c) => c.message),
      }
    }

    console.log(JSON.stringify(report, null, 2))
    expect(report.rules).toBeTruthy()
  }, 120_000)
})
