import { describe, it, expect } from 'vitest'
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
import { getWorksheet, getSheetNames, workbookToBuffer } from '@/lib/excel/workbook'

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

  it('accepts flexible DOB and pads numeric contact', () => {
    const prepared = prepareTeacherRow({
      full_name: 'Mary Phiri',
      email: 'mary@school.edu.zm',
      password: '2uyGEBdW#@j&kjE',
      contact_number: '977123456',
      date_of_birth: '12/03/1985',
      departments: 'Mathematics',
      ts_number: 'TS-1',
    })
    expect(prepared.date_of_birth).toBe('1985-03-12')
    expect(prepared.contact_number).toBe('0977123456')
    expect(prepared.password).toBe('2uyGEBdW#@j&kjE')
  })

  it('rejects invalid email without [object Object]', () => {
    const result = teacherRowSchema.safeParse({
      full_name: 'Test',
      email: 'bad',
      password: 'SecurePass1!',
      departments: 'Math',
      ts_number: 'TS-1',
    })
    expect(result.success).toBe(false)
    const msg = result.error.errors.map((e) => e.message).join(' ')
    expect(msg).not.toMatch(/\[object Object\]/)
  })
})

describe('parseTeacherExcel', () => {
  it('reads rows from the Teacher Data sheet', async () => {
    const wb = buildTeacherUploadWorkbook()
    expect(getSheetNames(wb)).toContain('Database Mapping')
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
    const ws = getWorksheet(wb, 'Teacher Data')
    ws.addRow(extra)
    const buffer = await workbookToBuffer(wb)
    const rows = await parseTeacherExcel(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0].full_name).toBe('John Banda')
    expect(rows[0]._excelRow).toBe(4)
  })

  it('unwraps hyperlink email, Date DOB, digit-leading password, and numeric phone', async () => {
    const wb = buildTeacherUploadWorkbook()
    const ws = getWorksheet(wb, 'Teacher Data')
    const row = ws.addRow([
      'Trap Teacher',
      null,
      '2uyGEBdW#@j&kjE',
      null,
      'Female',
      null,
      'EMP-T',
      'Mathematics',
      'TS-TRAP',
      '',
      '',
      'Mathematics',
      'Form 1A:Mathematics',
    ])
    row.getCell(2).value = {
      text: 'trap.teacher@school.edu.zm',
      hyperlink: 'mailto:trap.teacher@school.edu.zm',
    }
    row.getCell(4).value = 977123456
    row.getCell(6).value = new Date(Date.UTC(1985, 2, 12))

    const buffer = await workbookToBuffer(wb)
    const rows = await parseTeacherExcel(buffer)
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe('trap.teacher@school.edu.zm')
    expect(rows[0].email).not.toBe('[object Object]')
    expect(rows[0].password).toBe('2uyGEBdW#@j&kjE')
    expect(rows[0].contact_number).toBe('977123456')
    expect(rows[0].date_of_birth).toBe('1985-03-12')

    const prepared = prepareTeacherRow(rows[0])
    expect(prepared.email).toBe('trap.teacher@school.edu.zm')
    expect(prepared.contact_number).toBe('0977123456')
    expect(prepared.date_of_birth).toBe('1985-03-12')
  })

  it('template has expected headers and Text contact column', () => {
    expect(TEMPLATE_HEADERS[0]).toBe('Full Name *')
    expect(TEMPLATE_EXAMPLE_ROW[0]).toBe('Mary Phiri')
    const wb = buildTeacherUploadWorkbook()
    const ws = getWorksheet(wb, 'Teacher Data')
    expect(ws.getColumn(4).numFmt).toBe('@')
  })
})
