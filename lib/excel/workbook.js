import ExcelJS from 'exceljs'

function cellValueToString(value) {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if (value.text != null) return String(value.text)
    if (value.result != null) return String(value.result)
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('')
    }
    if (value.hyperlink) return String(value.text || value.hyperlink)
  }
  return String(value)
}

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
      values.push(cellValueToString(row.getCell(colIndex).value))
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
