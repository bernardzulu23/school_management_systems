import ExcelJS from 'exceljs'

/**
 * Unwrap ExcelJS cell values to plain strings for bulk upload / sheet export.
 * Handles Date, hyperlinks, rich text, and formula results — never returns "[object Object]".
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCellValue(value) {
  if (value == null) return ''

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const year = value.getUTCFullYear()
    const month = String(value.getUTCMonth() + 1).padStart(2, '0')
    const day = String(value.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    return String(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText
        .map((part) => part?.text || '')
        .join('')
        .trim()
    }
    if (value.result != null && value.result !== value) {
      return normalizeCellValue(value.result).trim()
    }
    if (value.text != null || value.hyperlink != null) {
      const text = value.text != null ? String(value.text).trim() : ''
      if (text) return text
      const link = String(value.hyperlink || '').trim()
      if (!link) return ''
      return link.replace(/^mailto:/i, '').trim()
    }
    // Avoid leaking "[object Object]" into validators / error reports.
    return ''
  }

  return String(value).trim()
}

/** @deprecated Use normalizeCellValue — kept as alias for any older call sites. */
export const cellValueToString = normalizeCellValue

export function createWorkbook() {
  return new ExcelJS.Workbook()
}

export function addAoaSheet(workbook, sheetName, rows, { colWidths } = {}) {
  const ws = workbook.addWorksheet(sheetName)
  for (const row of rows) {
    ws.addRow(row)
  }
  if (colWidths?.length) {
    colWidths.forEach((width, index) => {
      ws.getColumn(index + 1).width = width
    })
  }
  return ws
}

export function addJsonSheet(workbook, sheetName, objects) {
  const ws = workbook.addWorksheet(sheetName)
  if (!objects?.length) return ws
  const keys = Object.keys(objects[0])
  ws.addRow(keys)
  for (const obj of objects) {
    ws.addRow(keys.map((key) => obj[key] ?? ''))
  }
  return ws
}

export function getWorksheet(workbook, name) {
  return workbook.getWorksheet(name)
}

export function getSheetNames(workbook) {
  return workbook.worksheets.map((ws) => ws.name)
}

export function sheetToAoa(worksheet) {
  const rows = []
  if (!worksheet) return rows
  const colCount = Math.max(worksheet.columnCount || 0, 1)
  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex)
    const values = []
    for (let colIndex = 1; colIndex <= colCount; colIndex++) {
      values.push(normalizeCellValue(row.getCell(colIndex).value))
    }
    rows.push(values)
  }
  return rows
}

export async function readWorkbookFromBuffer(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  return workbook
}

export async function workbookToBuffer(workbook) {
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

/** Browser download helper (client components). */
export async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
