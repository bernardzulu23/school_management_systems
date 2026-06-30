import * as XLSX from 'xlsx'
import { appendDbMappingSheet } from '@/lib/uploads/workbookDbMapping'
import { TEACHER_DB_MAPPING_ROWS } from '@/lib/uploads/teacherDbMapping'

export const TEMPLATE_HEADERS = [
  'Full Name *',
  'Email *',
  'Password * (min 8 chars)',
  'Contact Number',
  'Gender',
  'Date of Birth (YYYY-MM-DD)',
  'Employee ID',
  'Department(s) * (comma separated)',
  'TS Number *',
  'Qualifications',
  'Specialization',
  'Assigned Subjects (comma separated)',
  'Teaching Assignments (Class:Subject; …)',
]

export const TEMPLATE_EXAMPLE_ROW = [
  'Mary Phiri',
  'mary.phiri@school.edu.zm',
  'SecurePass1!',
  '0977123456',
  'Female',
  '1985-03-12',
  'EMP-204',
  'Mathematics, Sciences',
  'TS-88421',
  'B.Ed Mathematics',
  'Pure Mathematics',
  'Mathematics, Physics',
  'Form 1A:Mathematics; Form 2B:Mathematics',
]

const COLUMN_MAP = {
  full_name: 'full_name',
  'Full Name *': 'full_name',
  email: 'email',
  'Email *': 'email',
  password: 'password',
  'Password * (min 8 chars)': 'password',
  contact_number: 'contact_number',
  'Contact Number': 'contact_number',
  gender: 'gender',
  Gender: 'gender',
  date_of_birth: 'date_of_birth',
  'Date of Birth (YYYY-MM-DD)': 'date_of_birth',
  employee_id: 'employee_id',
  'Employee ID': 'employee_id',
  departments: 'departments',
  'Department(s) * (comma separated)': 'departments',
  ts_number: 'ts_number',
  'TS Number *': 'ts_number',
  qualifications: 'qualifications',
  Qualifications: 'qualifications',
  specialization: 'specialization',
  Specialization: 'specialization',
  assigned_subjects: 'assigned_subjects',
  'Assigned Subjects (comma separated)': 'assigned_subjects',
  teaching_assignments: 'teaching_assignments',
  'Teaching Assignments (Class:Subject; …)': 'teaching_assignments',
}

export function parseTeacherExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const ws = wb.Sheets['Teacher Data']

  if (!ws) {
    throw new Error('Sheet "Teacher Data" not found. Use the official ZSMS teacher template.')
  }

  const raw = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd',
    defval: '',
  })

  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('Template is empty or missing header row.')
  }

  const headers = raw[1].map((h) => String(h ?? '').trim())
  const dataRows = raw.slice(3)

  return dataRows
    .map((row, i) => {
      const obj = { _excelRow: i + 4 }
      headers.forEach((header, colIdx) => {
        const field = COLUMN_MAP[header]
        if (field) {
          obj[field] = String(row[colIdx] ?? '').trim()
        }
      })
      return obj
    })
    .filter((row) => row.full_name)
}

export function buildTeacherUploadWorkbook({ title = 'ZSMS Teacher Bulk Upload' } = {}) {
  const wb = XLSX.utils.book_new()
  const sheetData = [[title], TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW]
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  ws['!cols'] = [22, 28, 22, 16, 10, 22, 14, 28, 14, 22, 20, 32, 42].map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(wb, ws, 'Teacher Data')
  appendDbMappingSheet(wb, {
    title: 'ZSMS teacher upload — database column mapping',
    rows: TEACHER_DB_MAPPING_ROWS,
  })
  return wb
}
