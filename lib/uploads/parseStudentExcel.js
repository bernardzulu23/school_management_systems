import {
  createWorkbook,
  addAoaSheet,
  readWorkbookFromBuffer,
  getWorksheet,
} from '@/lib/excel/workbook'
import { appendDbMappingSheet } from '@/lib/uploads/workbookDbMapping'
import { STUDENT_DB_MAPPING_ROWS } from '@/lib/uploads/studentDbMapping'

export const TEMPLATE_HEADERS = [
  'Full Name *',
  'Date of Birth * (YYYY-MM-DD)',
  'Gender *',
  'Email *',
  'Password * (min 8 chars)',
  'Exam Number *',
  'Year Group / Grade *',
  'Section (A–Z)',
  'Subjects * (comma separated)',
  "Father's Full Name",
  "Father's Contact",
]

export const TEMPLATE_EXAMPLE_ROW = [
  'Chanda Banda',
  '2010-05-15',
  'Female',
  'chanda.banda@school.edu.zm',
  'SecurePass1!',
  'ECZ2025001',
  'Form 1',
  'A',
  'Mathematics, English, Biology, Chemistry, Physics, History, Geography',
  'Peter Banda',
  '0977123456',
]

const COLUMN_MAP = {
  full_name: 'full_name',
  'Full Name *': 'full_name',
  date_of_birth: 'date_of_birth',
  'Date of Birth * (YYYY-MM-DD)': 'date_of_birth',
  gender: 'gender',
  'Gender *': 'gender',
  email: 'email',
  'Email *': 'email',
  password: 'password',
  'Password * (min 8 chars)': 'password',
  exam_number: 'exam_number',
  'Exam Number *': 'exam_number',
  year_group: 'year_group',
  'Year Group / Grade *': 'year_group',
  section: 'section',
  'Section (A–Z)': 'section',
  'Section (A-Z)': 'section',
  subjects: 'subjects',
  'Subjects * (comma separated)': 'subjects',
  father_full_name: 'father_full_name',
  "Father's Full Name": 'father_full_name',
  father_contact: 'father_contact',
  "Father's Contact": 'father_contact',
}

export async function parseStudentExcel(buffer) {
  const wb = await readWorkbookFromBuffer(buffer)
  const ws = getWorksheet(wb, 'Student Data')

  if (!ws) {
    throw new Error('Sheet "Student Data" not found. Use the official ZSMS template.')
  }

  const raw = []
  const colCount = Math.max(ws.columnCount || 0, TEMPLATE_HEADERS.length)
  for (let rowIndex = 1; rowIndex <= ws.rowCount; rowIndex++) {
    const row = ws.getRow(rowIndex)
    const values = []
    for (let colIndex = 1; colIndex <= colCount; colIndex++) {
      const value = row.getCell(colIndex).value
      values.push(value == null ? '' : String(value).trim())
    }
    raw.push(values)
  }

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

export function buildStudentUploadWorkbook({ title = 'ZSMS Student Bulk Upload' } = {}) {
  const wb = createWorkbook()
  const sheetData = [[title], TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW]
  addAoaSheet(wb, 'Student Data', sheetData, {
    colWidths: [22, 24, 12, 28, 22, 16, 18, 14, 48, 22, 16],
  })
  appendDbMappingSheet(wb, {
    title: 'ZSMS student upload — database column mapping',
    rows: STUDENT_DB_MAPPING_ROWS,
  })
  return wb
}

export function buildErrorReportWorkbook(errorRows) {
  const wb = createWorkbook()
  const rows = [
    ['Row #', 'Full Name', 'Email', 'Field', 'Error', 'Fix Required'],
    ...errorRows.flatMap((e) =>
      e.errors.map((err) => [
        e.excelRow,
        e.full_name || '',
        e.email || '',
        err.field,
        err.error,
        'Fix this row in your Excel file and re-upload',
      ])
    ),
  ]
  addAoaSheet(wb, 'Error Report', rows, {
    colWidths: [8, 25, 30, 18, 45, 35],
  })
  return wb
}
