import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateECZExport, formatForECZSubmission } from '@/lib/ecz/export-validator'

describe('validateECZExport', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects Form 4', () => {
    const r = validateECZExport({
      form: 'Form 4',
      academicYear: 2026,
      scores: [{ studentId: '1', studentName: 'A', total: 50 }],
      enrolledStudents: [{ id: '1', name: 'A' }],
      subject: 'Mathematics',
    })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /form 4/i.test(e))).toBe(true)
  })

  it('errors when deadline passed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-02-15T12:00:00Z'))
    const r = validateECZExport({
      form: 'Form 2',
      academicYear: 2025,
      scores: [{ studentId: '1', studentName: 'A', total: 50, learnerNumber: 'LN1' }],
      enrolledStudents: [{ id: '1', name: 'A' }],
      subject: 'Mathematics',
    })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /deadline/i.test(e))).toBe(true)
  })

  it('errors when enrolled learners missing scores', () => {
    const r = validateECZExport({
      form: 'Form 1',
      academicYear: 2026,
      scores: [],
      enrolledStudents: [
        { id: '1', name: 'Chanda' },
        { id: '2', name: 'Mwamba' },
      ],
      subject: 'Mathematics',
      now: new Date('2026-05-01'),
    })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => /no sba scores/i.test(e))).toBe(true)
  })

  it('passes when all data valid', () => {
    const r = validateECZExport({
      form: 'Form 3',
      academicYear: 2026,
      scores: [
        { studentId: '1', studentName: 'A', total: 72, learnerNumber: 'E001' },
        { studentId: '2', studentName: 'B', total: 65, learnerNumber: 'E002' },
      ],
      enrolledStudents: [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ],
      subject: 'Mathematics',
      now: new Date('2026-05-01'),
    })
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('warns on PE with wrong weight', () => {
    const r = validateECZExport({
      form: 'Form 2',
      academicYear: 2026,
      submission: { sbaWeight: 30 },
      scores: [{ studentId: '1', studentName: 'A', total: 80, learnerNumber: 'X' }],
      enrolledStudents: [{ id: '1', name: 'A' }],
      subject: 'Physical Education',
      now: new Date('2026-05-01'),
    })
    expect(r.warnings.some((w) => /40%/.test(w))).toBe(true)
  })

  it('warns on missing learner numbers', () => {
    const r = validateECZExport({
      form: 'Form 1',
      academicYear: 2026,
      scores: [{ studentId: '1', studentName: 'A', total: 50 }],
      enrolledStudents: [{ id: '1', name: 'A' }],
      subject: 'English',
      now: new Date('2026-05-01'),
    })
    expect(r.warnings.some((w) => /learner number/i.test(w))).toBe(true)
  })
})

describe('formatForECZSubmission', () => {
  it('rounds scores and adds serial numbers', () => {
    const rows = formatForECZSubmission([{ studentName: 'Test', learnerNumber: 'N1', total: 72.6 }])
    expect(rows[0].sn).toBe(1)
    expect(rows[0].sbaScore).toBe(73)
  })
})
