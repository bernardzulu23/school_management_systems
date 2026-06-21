import { describe, expect, it, vi } from 'vitest'
import { normalizePushedAllocations } from '@/lib/timetable/normalizePushedAllocations'
import { remapEntriesToValidAllocationIds } from '@/lib/timetable/resolveTimetableEntryAllocationIds'

describe('normalizePushedAllocations', () => {
  it('upserts missing per-class rows instead of synthetic ids', async () => {
    const deptId = '11111111-1111-1111-1111-111111111111'
    const templateId = '22222222-2222-2222-2222-222222222222'
    const classA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const classB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const upsertedId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

    const template = {
      id: templateId,
      schoolId: 'school-1',
      teacherId: 'teacher-1',
      subjectId: 'subject-1',
      classId: classA,
      hodId: 'hod-1',
      term: 'Term 1',
      academicYear: '2026',
      periodsPerWeek: 6,
      blockType: 'DOUBLE',
      singlePeriods: 0,
      doublePeriods: 3,
      triplePeriods: 0,
      notes: `departmentAllocation:${deptId}`,
      class: { id: classA, name: 'Form 1A' },
      teacher: { id: 'teacher-1', name: 'Teacher' },
      subject: { id: 'subject-1', name: 'PE' },
      hod: { hodProfile: { department: 'Sports' } },
    }

    const upsert = vi.fn().mockResolvedValue({
      ...template,
      id: upsertedId,
      classId: classB,
      class: { id: classB, name: 'Form 2B' },
    })

    const db = {
      departmentAllocation: {
        findFirst: vi.fn().mockResolvedValue({
          allocationData: {
            classes: ['Form 1A', 'Form 2B'],
            subject: 'PE',
            teacherId: 'teacher-1',
          },
        }),
      },
      class: {
        findFirst: vi
          .fn()
          .mockImplementation(({ where }: { where: { name?: { equals?: string } } }) =>
            Promise.resolve(
              where.name?.equals === 'Form 1A'
                ? { id: classA, name: 'Form 1A' }
                : where.name?.equals === 'Form 2B'
                  ? { id: classB, name: 'Form 2B' }
                  : null
            )
          ),
        findMany: vi.fn().mockResolvedValue([]),
      },
      teacherAllocation: { upsert },
    }

    const result = await normalizePushedAllocations(db as any, 'school-1', [template as any])

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(expect.arrayContaining([templateId, upsertedId]))
    expect(upsert).toHaveBeenCalledOnce()
    expect(String(result.find((r) => r.classId === classB)?.id)).toBe(upsertedId)
    expect(result.every((r) => !String(r.id).includes(`${templateId}-`))).toBe(true)
  })
})

describe('remapEntriesToValidAllocationIds', () => {
  it('remaps synthetic allocation ids using teacher/subject/class lookup', async () => {
    const realId = 'real-allocation-id'
    const db = {
      teacherAllocation: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: realId }),
      },
    }

    const { entries, invalid } = await remapEntriesToValidAllocationIds(
      db as any,
      'school-1',
      [
        {
          allocationId: 'fake-id-classB',
          teacherId: 't1',
          subjectId: 's1',
          classId: 'c2',
        },
      ],
      'Term 1',
      '2026'
    )

    expect(invalid).toHaveLength(0)
    expect(entries[0].allocationId).toBe(realId)
  })
})
