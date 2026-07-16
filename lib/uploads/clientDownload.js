/**
 * Client-safe blob download helpers (no ExcelJS — keeps CSP free of unsafe-eval).
 */

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

function csvEscape(value) {
  const raw = String(value ?? '')
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

/**
 * Download bulk-upload validation errors as CSV (Excel-openable, no eval).
 * @param {Array<{ excelRow?: number, full_name?: string, email?: string, errors?: Array<{ field?: string, error?: string }> }>} errorRows
 * @param {string} filename
 */
export function downloadBulkUploadErrorCsv(errorRows, filename) {
  const header = ['Row #', 'Full Name', 'Email', 'Field', 'Error', 'Fix Required']
  const lines = [header.map(csvEscape).join(',')]

  for (const row of errorRows || []) {
    const errors = Array.isArray(row.errors)
      ? row.errors
      : [{ field: '', error: String(row.error || '') }]
    for (const err of errors) {
      lines.push(
        [
          row.excelRow ?? '',
          row.full_name || '',
          row.email || '',
          err.field || '',
          err.error || '',
          'Fix this row in your Excel file and re-upload',
        ]
          .map(csvEscape)
          .join(',')
      )
    }
  }

  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
