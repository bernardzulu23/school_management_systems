/**
 * Prompt 6 live scan: room/venue conflicts on published Term 1/2 before enforcement.
 * Run: npx vitest run lib/timetable/__tests__/roomVenue.live.test.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { describe, expect, it, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mapDbEntriesToAssignments } from '@/lib/timetable/mapEntriesToAssignments'
import { loadPublishedTimetableEntries } from '@/lib/timetable/clonePublishedToDraft'
import { validateTimetable, getHardConflicts } from '@/lib/timetable/validateTimetable'
import { roomSlotsOverlap } from '@/lib/timetable/timeRangeOverlap'

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
const SCHOOL = '818097ac-d9d6-44cc-9526-7056237814fb'
const YEAR = '2026'

describe.skipIf(!url)('Prompt 6 room/venue live scan', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('reports Classroom inventory + published Term 1/2 ROOM_DOUBLE_BOOKED', async () => {
    const rooms = await prisma.classroom.findMany({
      where: { schoolId: SCHOOL },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    console.log(
      `[Prompt6] classrooms=${rooms.length}`,
      rooms.map((r) => r.name).join(', ') || '(none)'
    )

    const exclude = await prisma.$queryRawUnsafe(
      `SELECT conname FROM pg_constraint WHERE conname = 'TimetableAllocationEntry_no_room_overlap'`
    )
    console.log('[Prompt6] EXCLUDE present:', Array.isArray(exclude) && exclude.length > 0)

    const report = {}

    for (const term of ['Term 1', 'Term 2']) {
      const published = await loadPublishedTimetableEntries(prisma, {
        schoolId: SCHOOL,
        term,
        academicYear: YEAR,
      })
      const withRoom = published.filter((e) => e.classroomId)
      const assignments = mapDbEntriesToAssignments(published)
      const hard = getHardConflicts(validateTimetable(assignments))
      const roomHard = hard.filter((c) => c.type === 'ROOM_DOUBLE_BOOKED')

      // Defensive pairwise scan (same twin as EXCLUDE) in case mapper drops classroomId
      const pairwise = []
      for (let i = 0; i < published.length; i++) {
        for (let j = i + 1; j < published.length; j++) {
          const a = published[i]
          const b = published[j]
          if (
            roomSlotsOverlap(
              {
                classroomId: a.classroomId,
                dayOfWeek: a.dayOfWeek,
                startTime: a.startTime,
                endTime: a.endTime,
              },
              {
                classroomId: b.classroomId,
                dayOfWeek: b.dayOfWeek,
                startTime: b.startTime,
                endTime: b.endTime,
              }
            )
          ) {
            pairwise.push({
              roomId: a.classroomId,
              day: a.dayOfWeek,
              a: `${a.startTime}–${a.endTime} class=${a.classId}`,
              b: `${b.startTime}–${b.endTime} class=${b.classId}`,
            })
          }
        }
      }

      report[term] = {
        publishedEntries: published.length,
        entriesWithClassroomId: withRoom.length,
        roomHardConflicts: roomHard.length,
        pairwiseRoomOverlaps: pairwise.length,
        sample: roomHard.slice(0, 5).map((c) => c.message),
        pairwiseSample: pairwise.slice(0, 5),
      }
      console.log(`[Prompt6] ${term}`, JSON.stringify(report[term], null, 2))
    }

    // Pre-enforcement baseline: no rooms assigned ⇒ no detectable room clashes
    expect(report['Term 1'].roomHardConflicts).toBe(0)
    expect(report['Term 2'].roomHardConflicts).toBe(0)
    expect(report['Term 1'].pairwiseRoomOverlaps).toBe(0)
    expect(report['Term 2'].pairwiseRoomOverlaps).toBe(0)
  }, 120_000)
})
