import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveTeacherLoad } from '@/lib/teachers/resolveTeacherLoad'

function createTx(overrides = {}) {
  return {
    subject: {
      findMany: vi.fn().mockResolvedValue(overrides.subjects || []),
    },
    teacherAllocation: {
      findMany: vi.fn().mockResolvedValue(overrides.allocations || []),
    },
    class: {
      findMany: vi.fn().mockResolvedValue(overrides.homeroomClasses || []),
    },
  }
}

describe('resolveTeacherLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merges virtual assignments from TeacherAllocation rows', async () => {
    const tx = createTx({
      allocations: [
        {
          id: 'alloc-1',
          subjectId: 'sub-1',
          classId: 'class-1',
          class: { id: 'class-1', name: 'Form 1A' },
          subject: { id: 'sub-1', name: 'Mathematics' },
        },
      ],
    })

    const result = await resolveTeacherLoad({
      schoolId: 'school-1',
      teacher: {
        id: 'teacher-1',
        userId: 'user-1',
        teachingAssignments: [],
        classes: [],
        subjects: [],
        assignedSubjects: [],
      },
      tx,
    })

    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0].id).toBe('alloc:alloc-1')
    expect(result.classById.get('class-1')?.name).toBe('Form 1A')
    expect(result.subjectById.get('sub-1')?.name).toBe('Mathematics')
    expect(tx.teacherAllocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teacherId: 'user-1', schoolId: 'school-1' }),
      })
    )
  })

  it('dedupes classes resolved from assignedSubjects names', async () => {
    const tx = createTx({
      subjects: [
        { id: 'sub-a', name: 'English', classId: 'class-2' },
        { id: 'sub-b', name: 'English', classId: 'class-2' },
      ],
      homeroomClasses: [],
    })
    tx.class.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'class-2', name: 'Form 2B' }])

    const result = await resolveTeacherLoad({
      schoolId: 'school-1',
      teacher: {
        id: 'teacher-1',
        userId: 'user-1',
        teachingAssignments: [],
        classes: [],
        subjects: [],
        assignedSubjects: ['English'],
      },
      tx,
    })

    expect(result.assignments.length).toBeGreaterThanOrEqual(1)
    const keys = result.assignments.map((a) => `${a.classId}|${a.subjectId}`)
    expect(new Set(keys).size).toBe(keys.length)
    expect(result.classById.get('class-2')?.name).toBe('Form 2B')
  })
})
