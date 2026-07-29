import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveReviewerUserId } from '@/lib/lesson-plans/reviewer'
import { mockPrisma } from '../setup.js'

describe('resolveReviewerUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers active Senior Teacher assignments for primary reviews', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({ level: 'primary' })
    mockPrisma.seniorTeacherAssignment.findMany.mockResolvedValue([
      { userId: 'senior-1', assignedAt: new Date('2026-01-01') },
      { userId: 'senior-2', assignedAt: new Date('2026-01-02') },
    ])

    const reviewerUserId = await resolveReviewerUserId({
      schoolId: 'school-1',
      teacherUserId: 'teacher-1',
      grade: 'Grade 6',
      subject: 'Mathematics',
    })

    expect(['senior-1', 'senior-2']).toContain(reviewerUserId)
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled()
  })

  it('falls back to headteacher when no primary senior teacher exists', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({ level: 'primary' })
    mockPrisma.seniorTeacherAssignment.findMany.mockResolvedValue([])
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'head-1' })

    const reviewerUserId = await resolveReviewerUserId({
      schoolId: 'school-1',
      teacherUserId: 'teacher-1',
      grade: 'Grade 2',
      subject: 'Literacy',
    })

    expect(reviewerUserId).toBe('head-1')
  })
})
