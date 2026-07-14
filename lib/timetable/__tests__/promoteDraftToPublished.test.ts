import { describe, expect, it, vi, beforeEach } from 'vitest'
import { promoteDraftTimetableToPublished } from '@/lib/timetable/promoteDraftToPublished'

function makeTx(state) {
  return {
    timetableAllocationEntry: {
      count: vi.fn(async ({ where }) => {
        return state.entries.filter(
          (e) =>
            e.schoolId === where.schoolId &&
            e.term === where.term &&
            e.academicYear === where.academicYear &&
            e.status === where.status
        ).length
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const before = state.entries.length
        state.entries = state.entries.filter(
          (e) =>
            !(
              e.schoolId === where.schoolId &&
              e.term === where.term &&
              e.academicYear === where.academicYear &&
              e.status === where.status
            )
        )
        return { count: before - state.entries.length }
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        let count = 0
        state.entries = state.entries.map((e) => {
          if (
            e.schoolId === where.schoolId &&
            e.term === where.term &&
            e.academicYear === where.academicYear &&
            e.status === where.status
          ) {
            count += 1
            return { ...e, ...data }
          }
          return e
        })
        return { count }
      }),
      findMany: vi.fn(async ({ where }) => {
        return state.entries
          .filter(
            (e) =>
              e.schoolId === where.schoolId &&
              e.term === where.term &&
              e.academicYear === where.academicYear &&
              e.status === where.status
          )
          .map((e) => ({
            allocationId: e.allocationId,
            teacherId: e.teacherId || null,
            classId: e.classId || null,
            subjectId: e.subjectId || null,
            dayOfWeek: e.dayOfWeek,
            periodNumber: e.periodNumber,
            startTime: e.startTime,
            endTime: e.endTime,
            classroomId: e.classroomId || null,
          }))
      }),
    },
    teacherAllocation: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  }
}

describe('promoteDraftTimetableToPublished', () => {
  let state
  let prisma

  beforeEach(() => {
    state = {
      entries: [
        {
          id: 'pub-old',
          schoolId: 's1',
          term: 'Term 1',
          academicYear: '2026',
          status: 'published',
          allocationId: 'a1',
          classId: 'c1',
          dayOfWeek: 'monday',
          periodNumber: 1,
          startTime: '07:00',
          endTime: '07:40',
        },
        {
          id: 'draft-1',
          schoolId: 's1',
          term: 'Term 1',
          academicYear: '2026',
          status: 'draft',
          allocationId: 'a1',
          classId: 'c1',
          dayOfWeek: 'monday',
          periodNumber: 1,
          startTime: '07:00',
          endTime: '07:40',
        },
        {
          id: 'draft-2',
          schoolId: 's1',
          term: 'Term 1',
          academicYear: '2026',
          status: 'draft',
          allocationId: 'a1',
          classId: 'c1',
          dayOfWeek: 'tuesday',
          periodNumber: 1,
          startTime: '07:00',
          endTime: '07:40',
        },
      ],
    }
    const tx = makeTx(state)
    prisma = {
      timetableAllocationEntry: {
        count: tx.timetableAllocationEntry.count,
        findMany: tx.timetableAllocationEntry.findMany,
      },
      $transaction: vi.fn(async (fn) => fn(tx)),
    }
  })

  it('deletes prior published rows before promoting draft (no append on republish)', async () => {
    const first = await promoteDraftTimetableToPublished(prisma, {
      schoolId: 's1',
      term: 'Term 1',
      academicYear: '2026',
      notifyTeachers: false,
    })
    expect(first.ok).toBe(true)
    expect(first.deletedPublished).toBe(1)
    expect(first.published).toBe(2)
    expect(state.entries.filter((e) => e.status === 'published')).toHaveLength(2)
    expect(state.entries.filter((e) => e.status === 'draft')).toHaveLength(0)

    // Simulate clone-to-draft then edit: copy published back as draft (new ids)
    const published = state.entries.filter((e) => e.status === 'published')
    for (const p of published) {
      state.entries.push({
        ...p,
        id: `draft-again-${p.id}`,
        status: 'draft',
        publishedAt: undefined,
      })
    }

    // Stale behaviour would yield 4 published; replace must keep 2
    const second = await promoteDraftTimetableToPublished(prisma, {
      schoolId: 's1',
      term: 'Term 1',
      academicYear: '2026',
      notifyTeachers: false,
    })
    expect(second.ok).toBe(true)
    expect(second.deletedPublished).toBe(2)
    expect(second.published).toBe(2)
    expect(state.entries.filter((e) => e.status === 'published')).toHaveLength(2)
    expect(state.entries.filter((e) => e.status === 'draft')).toHaveLength(0)

    // Third publish cycle
    const published2 = state.entries.filter((e) => e.status === 'published')
    for (const p of published2) {
      state.entries.push({
        ...p,
        id: `draft-3-${p.id}`,
        status: 'draft',
        publishedAt: undefined,
      })
    }
    const third = await promoteDraftTimetableToPublished(prisma, {
      schoolId: 's1',
      term: 'Term 1',
      academicYear: '2026',
      notifyTeachers: false,
    })
    expect(third.published).toBe(2)
    expect(state.entries.filter((e) => e.status === 'published')).toHaveLength(2)
  })

  it('returns NO_DRAFT when nothing to publish', async () => {
    state.entries = state.entries.filter((e) => e.status !== 'draft')
    const res = await promoteDraftTimetableToPublished(prisma, {
      schoolId: 's1',
      term: 'Term 1',
      academicYear: '2026',
      notifyTeachers: false,
    })
    expect(res.ok).toBe(false)
    expect(res.code).toBe('NO_DRAFT')
  })
})
