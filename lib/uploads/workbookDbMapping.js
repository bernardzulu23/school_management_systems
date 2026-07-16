import { addAoaSheet } from '@/lib/excel/workbook'

const MAPPING_HEADERS = ['Excel column', 'Required', 'Database table', 'Database field', 'Notes']

/**
 * Append a read-only "Database Mapping" sheet documenting Excel → Prisma alignment.
 * Server-side only (ExcelJS). Browser downloads must use `@/lib/uploads/clientDownload`.
 */
export function appendDbMappingSheet(wb, { title, rows }) {
  const sheetData = [
    [title],
    MAPPING_HEADERS,
    ...rows.map((r) => [r.column, r.required ? 'Yes' : 'No', r.table, r.field, r.notes || '']),
  ]
  addAoaSheet(wb, 'Database Mapping', sheetData, {
    colWidths: [32, 10, 22, 22, 48],
  })
}
