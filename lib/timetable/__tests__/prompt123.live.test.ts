/**
 * Live Prompt 1–3 verification against Neon (skipped if no DB URL).
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { describe, expect, it, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  auditDraftTimetable,
  filterIgnoredConflicts,
  getConflictAuditKey,
  resolveExpectedPeriods,
  countPlacedPeriodWeight,
} from '@/lib/timetable/conflictAudit'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
const SCHOOL = '818097ac-d9d6-44cc-9526-7056237814fb'

describe.skipIf(!url)('Prompt 1–3 live audit (Term 1 / 2026)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('P1: CLASS_DOUBLE_BOOKED has unique audit keys (no pairwise duplicates)', async () => {
    const summary = await auditDraftTimetable(prisma, {
      schoolId: SCHOOL,
      term: 'Term 1',
      academicYear: '2026',
    })
    const classRows = (summary.conflicts || []).filter((c: any) => c.type === 'CLASS_DOUBLE_BOOKED')
    const keys = classRows.map((c: any) => getConflictAuditKey(c))
    expect(new Set(keys).size).toBe(keys.length)
    console.log(
      JSON.stringify({
        source: summary.source,
        entryCount: summary.entryCount,
        classDoubleBooked: classRows.length,
        byType: summary.byType,
        sample: classRows.slice(0, 3).map((c: any) => ({
          key: getConflictAuditKey(c),
          description: c.description,
        })),
      })
    )
  }, 60_000)

  it('P2: dismissing a soft audit warning filters it via ignored keys', async () => {
    const summary = await auditDraftTimetable(prisma, {
      schoolId: SCHOOL,
      term: 'Term 2',
      academicYear: '2026',
    })
    const soft = (summary.conflicts || []).find(
      (c: any) =>
        c.type === 'MISSING_PERIODS' ||
        c.severity === 'warning' ||
        String(c.severity || '').toLowerCase() === 'warning'
    )
    if (!soft) {
      // Fall back: synthesise filter behaviour with a fabricated key against Term 1 list
      const t1 = await auditDraftTimetable(prisma, {
        schoolId: SCHOOL,
        term: 'Term 1',
        academicYear: '2026',
      })
      const any = (t1.conflicts || [])[0]
      if (!any) return
      const key = getConflictAuditKey(any)
      // Hard errors are not dismissible in UI, but filterIgnored still applies keys if stored
      const filtered = filterIgnoredConflicts(t1.conflicts, [key])
      expect(filtered.length).toBe(t1.conflicts.length - 1)
      return
    }
    const key = getConflictAuditKey(soft)
    expect(key.length).toBeGreaterThan(0)
    const filtered = filterIgnoredConflicts(summary.conflicts, [key])
    expect(filtered.some((c: any) => getConflictAuditKey(c) === key)).toBe(false)
  }, 60_000)

  it('P3: BWALYA Chemistry — custom expected periods; no false MISSING_PERIODS when filled', async () => {
    const allocs = await prisma.teacherAllocation.findMany({
      where: {
        schoolId: SCHOOL,
        academicYear: '2026',
        term: { in: ['Term 1', 'Term 2'] },
        OR: [
          { teacher: { name: { contains: 'BWALYA', mode: 'insensitive' } } },
          { teacher: { name: { contains: 'CHISENGA', mode: 'insensitive' } } },
        ],
        subject: { name: { contains: 'Chem', mode: 'insensitive' } },
      },
      include: {
        teacher: { select: { name: true } },
        subject: { select: { name: true } },
        class: { select: { name: true } },
      },
    })

    const entries = await prisma.timetableAllocationEntry.findMany({
      where: {
        schoolId: SCHOOL,
        academicYear: '2026',
        status: { in: ['draft', 'published'] },
      },
    })

    const summaryT1 = await auditDraftTimetable(prisma, {
      schoolId: SCHOOL,
      term: 'Term 1',
      academicYear: '2026',
    })

    const report = allocs.map((a) => {
      const expected = resolveExpectedPeriods(a)
      const termEntries = entries.filter((e) => e.term === a.term)
      const placed = countPlacedPeriodWeight(termEntries, a.id)
      const flagged = (summaryT1.conflicts || []).find(
        (c: any) => c.type === 'MISSING_PERIODS' && c.allocationId === a.id
      )
      const active = ['pushed', 'scheduled'].includes(String(a.status))
      return {
        id: a.id,
        term: a.term,
        status: a.status,
        class: a.class?.name,
        subject: a.subject?.name,
        teacher: a.teacher?.name,
        periodsPerWeek: a.periodsPerWeek,
        singles: a.singlePeriods,
        doubles: a.doublePeriods,
        triples: a.triplePeriods,
        expected,
        placed,
        wronglyFlagged: a.term === 'Term 1' && active && placed >= expected && Boolean(flagged),
        flaggedDescription: flagged?.description || null,
        reviewHrefOk: !flagged || String(flagged.reviewHref || '').includes('tab=allocations'),
      }
    })

    console.log(JSON.stringify({ bwalyaChem: report }, null, 2))
    expect(report.every((r) => !r.wronglyFlagged)).toBe(true)
    expect(report.filter((r) => r.flaggedDescription).every((r) => r.reviewHrefOk)).toBe(true)
  }, 90_000)
})
