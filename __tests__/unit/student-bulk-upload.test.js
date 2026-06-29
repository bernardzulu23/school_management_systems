import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  parseStudentExcel,
  buildStudentUploadWorkbook,
  TEMPLATE_HEADERS,
  TEMPLATE_EXAMPLE_ROW,
} from '@/lib/uploads/parseStudentExcel'
import {
  normalizeUploadYearGroup,
  parseSubjectNames,
  validateSubjectCount,
  studentRowSchema,
  prepareStudentRow,
} from '@/lib/uploads/studentUploadSchema'

describe('student bulk upload schema', () => {
  it('normalizes numeric and labeled year groups', () => {
    expect(normalizeUploadYearGroup(1)).toBe('Grade 1')
    expect(normalizeUploadYearGroup('Form 2')).toBe('Form 2')
    expect(normalizeUploadYearGroup(8)).toBe('Form 1')
  })

  it('parses comma-separated subjects', () => {
    expect(parseSubjectNames('Math, English; Biology')).toEqual(['Math', 'English', 'Biology'])
  })

  it('validates subject count for secondary grade', () => {
    const names = Array.from({ length: 7 }, (_, i) => `Subject ${i + 1}`)
    const errors = validateSubjectCount({
      subjectNames: names,
      yearGroup: 'Form 1',
      schoolLevel: 'secondary',
    })
    expect(errors.length).toBe(0)
  })

  it('accepts a valid student row', () => {
    const row = {
      full_name: 'Test Student',
      date_of_birth: '2010-01-15',
      gender: 'Female',
      email: 'test@school.edu.zm',
      password: 'SecurePass1!',
      exam_number: 'ECZ999',
      year_group: 'Form 1',
      section: 'A',
      subjects: 'Mathematics, English, Biology, Chemistry, Physics, History, Geography',
      father_full_name: 'Parent Name',
      father_contact: '0977123456',
    }
    const prepared = prepareStudentRow(row)
    expect(prepared.gender).toBe('female')
    expect(prepared.year_group).toBe('Form 1')
    expect(prepared.subjectNames).toHaveLength(7)
  })

  it('rejects weak passwords', () => {
    const result = studentRowSchema.safeParse({
      full_name: 'Test',
      date_of_birth: '2010-01-15',
      gender: 'Male',
      email: 'a@b.co',
      password: 'weak',
      exam_number: '1',
      year_group: '1',
      subjects: 'Math',
    })
    expect(result.success).toBe(false)
  })
})

describe('parseStudentExcel', () => {
  it('reads rows from the Student Data sheet', () => {
    const wb = buildStudentUploadWorkbook()
    const extra = [
      'Another Student',
      '2011-02-02',
      'Male',
      'x@y.zm',
      'SecurePass1!',
      'ECZ2',
      '2',
      'B',
      'Math, English, Biology, Chemistry, Physics, History, Geography',
      '',
      '',
    ]
    const ws = wb.Sheets['Student Data']
    XLSX.utils.sheet_add_aoa(ws, [extra], { origin: 'A4' })
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const rows = parseStudentExcel(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0].full_name).toBe('Another Student')
    expect(rows[0]._excelRow).toBe(4)
  })

  it('throws when Student Data sheet is missing', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x']]), 'Other')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    expect(() => parseStudentExcel(buffer)).toThrow(/Student Data/)
  })

  it('template has expected headers', () => {
    expect(TEMPLATE_HEADERS[0]).toBe('Full Name *')
    expect(TEMPLATE_EXAMPLE_ROW[0]).toBe('Chanda Banda')
  })
})
