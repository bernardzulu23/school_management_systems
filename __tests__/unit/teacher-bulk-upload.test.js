import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseTeacherExcel,
  buildTeacherUploadWorkbook,
  TEMPLATE_HEADERS,
  TEMPLATE_EXAMPLE_ROW,
} from '@/lib/uploads/parseTeacherExcel'
import {
  parseDepartmentNames,
  parseTeachingAssignmentPairs,
  teacherRowSchema,
  prepareTeacherRow,
} from '@/lib/uploads/teacherUploadSchema'

describe('teacher bulk upload schema', () => {
  it('parses department names', () => {
    expect(parseDepartmentNames('Math, Sciences')).toEqual(['Math', 'Sciences'])
  })

  it('parses teaching assignment pairs', () => {
    expect(parseTeachingAssignmentPairs('Form 1A:Mathematics; Form 2B:English')).toEqual([
      { className: 'Form 1A', subjectName: 'Mathematics' },
      { className: 'Form 2B', subjectName: 'English' },
    ])
  })

  it('accepts a valid teacher row', () => {
    const row = {
      full_name: 'Mary Phiri',
      email: 'mary@school.edu.zm',
      password: 'SecurePass1!',
      departments: 'Mathematics',
      ts_number: 'TS-1',
      teaching_assignments: 'Form 1A:Mathematics',
    }
    const prepared = prepareTeacherRow(row)
    expect(prepared.departmentNames).toEqual(['Mathematics'])
    expect(prepared.teachingPairs).toHaveLength(1)
  })

  it('rejects missing TS number', () => {
    const result = teacherRowSchema.safeParse({
      full_name: 'Test',
      email: 'a@b.co',
      password: 'SecurePass1!',
      departments: 'Math',
      ts_number: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('parseTeacherExcel', () => {
  it('reads rows from the Teacher Data sheet', () => {
    const wb = buildTeacherUploadWorkbook()
    expect(wb.SheetNames).toContain('Database Mapping')
    const extra = [
      'John Banda',
      'john@school.edu.zm',
      'SecurePass1!',
      '',
      'Male',
      '',
      '',
      'Sciences',
      'TS-99',
      '',
      '',
      'Biology',
      'Form 3A:Biology',
    ]
    const ws = wb.Sheets['Teacher Data']
    XLSX.utils.sheet_add_aoa(ws, [extra], { origin: 'A4' })
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const rows = parseTeacherExcel(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0].full_name).toBe('John Banda')
    expect(rows[0]._excelRow).toBe(4)
  })

  it('template has expected headers', () => {
    expect(TEMPLATE_HEADERS[0]).toBe('Full Name *')
    expect(TEMPLATE_EXAMPLE_ROW[0]).toBe('Mary Phiri')
  })
})
