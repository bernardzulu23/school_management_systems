import { describe, it, expect } from 'vitest'
import { buildTeacherAssessmentOverview } from '@/lib/assessments/teacherOverview'

describe('buildTeacherAssessmentOverview', () => {
  it('groups assessments by teacher and computes average performance %', () => {
    const assessments = [
      {
        id: 'a1',
        title: 'Math Quiz 1',
        type: 'quiz',
        subject: 'Mathematics',
        class: 'Form 1A',
        status: 'PUBLISHED',
        date: '2026-06-01',
        createdByUserId: 't1',
        publishedAssignmentId: 'asg1',
        description: null,
        createdBy: { name: 'Jane Teacher', email: 'jane@school.test' },
      },
      {
        id: 'a2',
        title: 'Math Quiz 2',
        type: 'quiz',
        subject: 'Mathematics',
        class: 'Form 1B',
        status: 'PUBLISHED',
        date: '2026-06-05',
        createdByUserId: 't1',
        publishedAssignmentId: 'asg2',
        description: null,
        createdBy: { name: 'Jane Teacher', email: 'jane@school.test' },
      },
      {
        id: 'a3',
        title: 'English Test',
        type: 'quiz',
        subject: 'English',
        class: 'Form 2A',
        status: 'DRAFT',
        date: '2026-06-08',
        createdByUserId: 't2',
        publishedAssignmentId: null,
        description: null,
        createdBy: { name: 'John Teacher', email: 'john@school.test' },
      },
    ]

    const submissions = [
      { assignmentId: 'asg1', studentId: 's1', grade: 80, status: 'submitted' },
      { assignmentId: 'asg1', studentId: 's2', grade: 60, status: 'submitted' },
      { assignmentId: 'asg2', studentId: 's3', grade: 90, status: 'submitted' },
    ]

    const result = buildTeacherAssessmentOverview(assessments, submissions)

    expect(result.summary.teacherCount).toBe(2)
    expect(result.summary.totalAssessments).toBe(3)
    expect(result.summary.studentAttempts).toBe(3)
    expect(result.summary.schoolAveragePct).toBe(77)

    const jane = result.teachers.find((t) => t.teacherId === 't1')
    expect(jane.totalAssessments).toBe(2)
    expect(jane.publishedAssessments).toBe(2)
    expect(jane.studentAttempts).toBe(3)
    expect(jane.averagePerformancePct).toBe(77)
    expect(jane.assessments[0].averagePercentage).toBe(90)

    const john = result.teachers.find((t) => t.teacherId === 't2')
    expect(john.totalAssessments).toBe(1)
    expect(john.publishedAssessments).toBe(0)
    expect(john.averagePerformancePct).toBeNull()
  })
})
