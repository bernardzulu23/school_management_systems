/**
 * Prompt 7 follow-up live scan: workload checks are OFF by default.
 * Confirms Consecutive Overload / day / break issues are not emitted unless
 * school opts in. Does not change timetable entry data — report only.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { describe, expect, it, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import { loadPublishedTimetableEntries } from '@/lib/timetable/clonePublishedToDraft'
import {
  validateTimetable,
  getHardConflicts,
  getSoftConflicts,
} from '@/lib/timetable/validateTimetable'
import { parseSchedulingRulesJson } from '@/lib/timetable/teacherClassSessionRules'
import {
  ensureTimetableConfig,
  normalizeTimetableConfig,
} from '@/lib/timetable/timeSlotsFromConfig'
import {
  DEFAULT_TEACHER_WORKLOAD_RULES,
  TEACHER_BREAK_OVERLAP,
  TEACHER_CONSECUTIVE_LIMIT,
  TEACHER_DAY_OVERLOAD,
} from '@/lib/timetable/teacherWorkloadRules'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
const SCHOOL = '818097ac-d9d6-44cc-9526-7056237814fb'
const YEAR = '2026'

describe.skipIf(!url)('Prompt 7 teacher workload live scan', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('Term 1/2 published: workload overload warnings off by default; data unchanged', async () => {
    const cfg = await ensureTimetableConfig(prisma, SCHOOL)
    const normalized = normalizeTimetableConfig(cfg)
    const rules = parseSchedulingRulesJson(normalized.schedulingRules)
    const breakSlots = normalized.breakSlots || []

    console.log('[Prompt7-opt-in] school rules', {
      maxPeriodsPerDayEnabled: rules.maxPeriodsPerDayEnabled,
      maxConsecutivePeriodsEnabled: rules.maxConsecutivePeriodsEnabled,
      requireBreakCoverageEnabled: rules.requireBreakCoverageEnabled,
      maxPeriodsPerDay: rules.maxPeriodsPerDay,
      maxConsecutivePeriods: rules.maxConsecutivePeriods,
      breakSlots: breakSlots.map((b) => `${b.label || 'Break'} ${b.start}–${b.end}`),
      defaults: DEFAULT_TEACHER_WORKLOAD_RULES,
    })

    expect(rules.maxPeriodsPerDayEnabled).toBe(false)
    expect(rules.maxConsecutivePeriodsEnabled).toBe(false)
    expect(rules.requireBreakCoverageEnabled).toBe(false)

    const summary: Record<string, unknown> = {}
    const entryCounts: Record<string, number> = {}

    for (const term of ['Term 1', 'Term 2'] as const) {
      const published = await loadPublishedTimetableEntries(prisma, {
        schoolId: SCHOOL,
        term,
        academicYear: YEAR,
      })
      entryCounts[term] = published.length
      const assignments = mapDbEntriesToAssignments(published)
      const validation = validateTimetable(assignments, {
        teacherClassSessionRules: rules,
        teacherWorkloadRules: rules,
        breakSlots,
      })
      const hard = getHardConflicts(validation)
      const soft = getSoftConflicts(validation)

      const byType = (list: typeof validation, type: string) => list.filter((c) => c.type === type)

      const day = byType(validation, TEACHER_DAY_OVERLOAD)
      const consec = byType(validation, TEACHER_CONSECUTIVE_LIMIT)
      const brk = byType(validation, TEACHER_BREAK_OVERLAP)

      summary[term] = {
        publishedEntries: published.length,
        hardTotal: hard.length,
        softTotal: soft.length,
        TEACHER_DAY_OVERLOAD: day.length,
        TEACHER_CONSECUTIVE_LIMIT: consec.length,
        TEACHER_BREAK_OVERLAP: brk.length,
      }
      console.log(`[Prompt7-opt-in] ${term}`, JSON.stringify(summary[term], null, 2))

      // Detection-behavior change only — overload checks must be silent by default.
      expect(day).toHaveLength(0)
      expect(consec).toHaveLength(0)
      expect(brk).toHaveLength(0)
    }

    expect(entryCounts['Term 1']).toBeGreaterThan(0)
    expect(entryCounts['Term 2']).toBeGreaterThan(0)
    expect(summary['Term 1']).toBeTruthy()
    expect(summary['Term 2']).toBeTruthy()
  }, 120_000)
})
