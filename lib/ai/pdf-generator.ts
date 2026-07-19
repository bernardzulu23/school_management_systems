/**
 * Shared PDF generator built on the already-bundled `jspdf` dependency.
 *
 * One code path is reused everywhere we emit a PDF (lesson-plan export route,
 * term-report export route, and the quiz maker). Routes/components build a
 * simple document model (title, info rows, ordered blocks) and this module
 * handles layout, wrapping, and pagination.
 *
 * `buildPdfDocument` returns the raw jsPDF instance so callers can choose the
 * output form: `pdfToBuffer(doc)` on the server for a download Response, or
 * `doc.save(filename)` in the browser.
 */

import { jsPDF } from 'jspdf'

export type PdfInfoRow = { label: string; value: string }

export type PdfBlock = {
  type: 'heading' | 'subheading' | 'paragraph' | 'spacer'
  text?: string
}

export type PdfDocParams = {
  title: string
  subtitle?: string | null
  infoRows?: PdfInfoRow[]
  blocks: PdfBlock[]
  footer?: string | null
}

const MARGIN = 56
const PRIMARY: [number, number, number] = [31, 71, 136] // 1F4788
const HEADING2: [number, number, number] = [55, 65, 81] // 374151
const TEXT: [number, number, number] = [17, 24, 39] // 111827
const MUTED: [number, number, number] = [107, 114, 128] // 6B7280

export function buildPdfDocument(params: PdfDocParams): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  const writeLines = (
    text: string,
    opts: {
      font: 'normal' | 'bold' | 'italic'
      size: number
      color: [number, number, number]
      lineHeight: number
      align?: 'left' | 'center'
      x?: number
    }
  ) => {
    doc.setFont('helvetica', opts.font)
    doc.setFontSize(opts.size)
    doc.setTextColor(opts.color[0], opts.color[1], opts.color[2])
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      ensureSpace(opts.lineHeight)
      const x = opts.align === 'center' ? pageWidth / 2 : (opts.x ?? MARGIN)
      doc.text(line, x, y, opts.align === 'center' ? { align: 'center' } : undefined)
      y += opts.lineHeight
    }
  }

  writeLines(params.title, {
    font: 'bold',
    size: 16,
    color: PRIMARY,
    lineHeight: 20,
    align: 'center',
  })

  if (params.subtitle) {
    writeLines(params.subtitle, {
      font: 'bold',
      size: 12,
      color: PRIMARY,
      lineHeight: 18,
      align: 'center',
    })
  }
  y += 10

  if (params.infoRows?.length) {
    const labelWidth = 130
    for (const row of params.infoRows) {
      const valueLines = doc.splitTextToSize(row.value || 'N/A', contentWidth - labelWidth)
      const rowHeight = Math.max(16, valueLines.length * 14)
      ensureSpace(rowHeight)
      const rowTop = y
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(HEADING2[0], HEADING2[1], HEADING2[2])
      doc.text(row.label, MARGIN, rowTop)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      let vy = rowTop
      for (const line of valueLines) {
        doc.text(line, MARGIN + labelWidth, vy)
        vy += 14
      }
      y = rowTop + rowHeight
    }
    y += 12
  }

  for (const block of params.blocks) {
    if (block.type === 'spacer') {
      y += 10
      continue
    }
    const text = (block.text || '').trim()
    if (!text) continue

    if (block.type === 'heading') {
      y += 8
      writeLines(text, { font: 'bold', size: 13, color: PRIMARY, lineHeight: 18 })
      y += 2
    } else if (block.type === 'subheading') {
      writeLines(text, { font: 'bold', size: 11, color: HEADING2, lineHeight: 16 })
    } else {
      writeLines(text, { font: 'normal', size: 11, color: TEXT, lineHeight: 15 })
      y += 4
    }
  }

  if (params.footer) {
    y += 12
    writeLines(params.footer, { font: 'italic', size: 9, color: MUTED, lineHeight: 12 })
  }

  return doc
}

/** Server-side helper: convert a built PDF into a Buffer for a download Response. */
export function pdfToBuffer(doc: jsPDF): Buffer {
  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
}

/**
 * Convert a flat block of plain text into ordered PDF blocks, mirroring the
 * heading/list heuristics used by lib/ai/lesson-plan-word-generator.ts so the
 * PDF and .docx exports stay visually consistent.
 */
export function plainTextToPdfBlocks(text: string): PdfBlock[] {
  const blocks: PdfBlock[] = []
  for (const rawLine of String(text || '').split('\n')) {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      blocks.push({ type: 'spacer' })
      continue
    }

    if (trimmed.match(/^[0-9]+\.\s+[A-Z]/) || trimmed.match(/^[A-Z][A-Z0-9\s]+:$/)) {
      blocks.push({ type: 'heading', text: trimmed })
    } else if (trimmed.match(/^[A-Z][A-Z\s]+:/) && trimmed.length < 50) {
      blocks.push({ type: 'subheading', text: trimmed })
    } else if (trimmed.match(/^[a-z]\)\s+/) || trimmed.match(/^-\s+/)) {
      blocks.push({ type: 'paragraph', text: trimmed.replace(/^[-a-z)]\s+/, '') })
    } else {
      blocks.push({ type: 'paragraph', text: trimmed })
    }
  }
  return blocks
}

/** Convert titled narrative sections into heading + paragraph PDF blocks. */
export function sectionsToPdfBlocks(
  sections: Array<{ heading: string; body: string }>
): PdfBlock[] {
  const blocks: PdfBlock[] = []
  for (const section of sections) {
    blocks.push({ type: 'heading', text: section.heading })
    for (const line of String(section.body || '').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) {
        blocks.push({ type: 'spacer' })
        continue
      }
      blocks.push({ type: 'paragraph', text: trimmed })
    }
  }
  return blocks
}
