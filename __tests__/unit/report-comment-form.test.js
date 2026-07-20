import { describe, expect, it } from 'vitest'
import {
  RESULT_MAX_MARKS,
  attendanceFromRecords,
  buildReportCommentPayload,
  canGenerateReportComment,
  gradeLabelFromClass,
  marksFromResult,
  pickLatestResult,
  subjectsForClass,
  uniqueClassesFromAssignments,
} from '@/lib/ai/reportCommentForm'

describe('reportCommentForm helpers', () => {
  const assignments = [
    {
      id: 'a1',
      classId: 'c1',
      className: 'Form 1A',
      classYearGroup: 'Form 1',
      subjectId: 's1',
      subjectName: 'Mathematics',
    },
    {
      id: 'a2',
      classId: 'c1',
      className: 'Form 1A',
      classYearGroup: 'Form 1',
      subjectId: 's2',
      subjectName: 'English',
    },
    {
      id: 'a3',
      classId: 'c2',
      className: 'Form 2B',
      classYearGroup: 'Form 2',
      subjectId: 's1',
      subjectName: 'Mathematics',
    },
  ]

  it('lists unique classes from teaching assignments', () => {
    expect(uniqueClassesFromAssignments(assignments)).toEqual([
      { classId: 'c1', className: 'Form 1A', classYearGroup: 'Form 1' },
      { classId: 'c2', className: 'Form 2B', classYearGroup: 'Form 2' },
    ])
  })

  it('lists subjects for a selected class', () => {
    expect(subjectsForClass(assignments, 'c1').map((s) => s.subjectName)).toEqual([
      'English',
      'Mathematics',
    ])
  })

  it('derives grade from year_group, not a hardcoded Form 1', () => {
    expect(gradeLabelFromClass({ classYearGroup: 'Form 3', className: '3A' })).toBe('Form 3')
    expect(gradeLabelFromClass({ classYearGroup: '', className: 'Grade 10B' })).toBe('Grade 10B')
  })

  it('does not invent attendance when there are no records', () => {
    expect(attendanceFromRecords([])).toEqual({ rate: null, label: '' })
    expect(attendanceFromRecords(null).label).toBe('')
  })

  it('labels attendance from present/late ratio', () => {
    const records = [
      { status: 'present' },
      { status: 'present' },
      { status: 'late' },
      { status: 'absent' },
    ]
    expect(attendanceFromRecords(records)).toEqual({ rate: 75, label: 'Regular (75%)' })
  })

  it('picks the latest result for a subject', () => {
    const latest = pickLatestResult(
      [
        { subjectId: 's1', score: 40, updatedAt: '2026-01-01T00:00:00.000Z' },
        { subjectId: 's1', score: 72, updatedAt: '2026-06-01T00:00:00.000Z' },
        { subjectId: 's2', score: 90, updatedAt: '2026-07-01T00:00:00.000Z' },
      ],
      's1'
    )
    expect(latest.score).toBe(72)
  })

  it('leaves marks empty when no result exists (no misleading 0/100)', () => {
    expect(marksFromResult(null)).toEqual({ marks: '', maxMarks: '' })
    expect(marksFromResult({ score: 68 })).toEqual({ marks: 68, maxMarks: RESULT_MAX_MARKS })
  })

  it('builds the API payload with optional ids and split lists', () => {
    expect(
      buildReportCommentPayload({
        studentId: 'stu-1',
        subjectId: 'sub-1',
        studentName: 'Ada',
        grade: 'Form 1',
        subject: 'Mathematics',
        marks: 68,
        maxMarks: 100,
        behavior: 'Cooperative',
        attendance: 'Regular (80%)',
        strengths: 'algebra, effort',
        areasForImprovement: ' homework ',
      })
    ).toEqual({
      studentId: 'stu-1',
      subjectId: 'sub-1',
      studentName: 'Ada',
      grade: 'Form 1',
      subject: 'Mathematics',
      marks: 68,
      maxMarks: 100,
      behavior: 'Cooperative',
      attendance: 'Regular (80%)',
      strengths: ['algebra', 'effort'],
      areasForImprovement: ['homework'],
    })
  })

  it('requires real marks before generate is allowed', () => {
    expect(
      canGenerateReportComment({
        studentName: 'Ada',
        grade: 'Form 1',
        subject: 'Math',
        marks: '',
        maxMarks: '',
      })
    ).toBe(false)
    expect(
      canGenerateReportComment({
        studentName: 'Ada',
        grade: 'Form 1',
        subject: 'Math',
        marks: 55,
        maxMarks: 100,
      })
    ).toBe(true)
  })
})
