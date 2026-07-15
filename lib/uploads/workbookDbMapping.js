import { addAoaSheet } from '@/lib/excel/workbook'

const MAPPING_HEADERS = ['Excel column', 'Required', 'Database table', 'Database field', 'Notes']

/**
 * Append a read-only "Database Mapping" sheet documenting Excel → Prisma alignment.
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

export async function downloadWorkbookFromApi(url, filename) {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || data.message || 'Failed to download template')
  }
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
