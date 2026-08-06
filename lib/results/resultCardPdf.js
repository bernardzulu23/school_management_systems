/**
 * PDF result card — subject scores/grades only (no teacher names).
 */

import { jsPDF } from 'jspdf'
import { pdfToBuffer } from '@/lib/ai/pdf-generator'

const MARGIN = 48
const PRIMARY = [31, 71, 136]
const TEXT = [17, 24, 39]
const MUTED = [107, 114, 128]
const HEADER_BG = [232, 240, 254]
const LINE = [209, 213, 219]

function drawCentered(doc, text, y, size, color, bold = false) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...color)
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.text(String(text || ''), pageWidth / 2, y, { align: 'center' })
}

/**
 * @param {Awaited<ReturnType<typeof import('./resultCardData').loadStudentResultCard>>} card
 */
export function buildResultCardPdf(card) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  const ensure = (needed) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  drawCentered(doc, String(card.school?.name || 'School').toUpperCase(), y, 16, PRIMARY, true)
  y += 20
  drawCentered(doc, 'STUDENT RESULT CARD', y, 13, PRIMARY, true)
  y += 18
  if (card.school?.address) {
    drawCentered(doc, card.school.address, y, 9, MUTED, false)
    y += 14
  }
  y += 6

  const info = [
    ['Student', card.student?.name || ''],
    ['Class', card.student?.class || 'N/A'],
    ...(card.student?.examNumber ? [['Exam No.', card.student.examNumber]] : []),
    ...(card.filters?.term ? [['Term', card.filters.term]] : []),
    ...(card.filters?.year != null ? [['Year', String(card.filters.year)]] : []),
    ...(card.filters?.resultType
      ? [['Result type', card.filters.resultType.replace(/_/g, ' ')]]
      : [['Coverage', 'All entered results']]),
    [
      'Overall average',
      card.summary?.overallAverage != null ? `${card.summary.overallAverage}%` : 'N/A',
    ],
  ]

  for (const [label, value] of info) {
    ensure(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    doc.text(`${label}:`, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value || 'N/A'), MARGIN + 110, y)
    y += 15
  }
  y += 8

  const groups = Array.isArray(card.groups) ? card.groups : []
  if (!groups.length) {
    ensure(20)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(...MUTED)
    doc.text('No results found for the selected filters.', MARGIN, y)
  }

  const colSubject = MARGIN
  const colScore = MARGIN + contentWidth * 0.55
  const colGrade = MARGIN + contentWidth * 0.75
  const rowH = 18

  for (const group of groups) {
    ensure(50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...PRIMARY)
    const title = `${group.term || ''} ${group.year || ''} — ${group.resultTypeLabel || group.resultType}`
    doc.text(title.trim(), MARGIN, y)
    y += 14
    if (group.average != null) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      doc.text(`Group average: ${group.average}% · ${group.subjectCount} subject(s)`, MARGIN, y)
      y += 12
    }

    // table header
    ensure(rowH + 4)
    doc.setFillColor(...HEADER_BG)
    doc.rect(MARGIN, y - 12, contentWidth, rowH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...TEXT)
    doc.text('Subject', colSubject + 4, y)
    doc.text('Score (%)', colScore, y)
    doc.text('Grade', colGrade, y)
    y += 8
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, y, MARGIN + contentWidth, y)
    y += 12

    for (const row of group.rows || []) {
      ensure(rowH)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT)
      const subjectLines = doc.splitTextToSize(String(row.subject || ''), contentWidth * 0.5)
      const lineCount = Math.max(1, subjectLines.length)
      const blockH = lineCount * 12
      ensure(blockH + 4)
      let sy = y
      for (const line of subjectLines) {
        doc.text(line, colSubject + 4, sy)
        sy += 12
      }
      doc.text(row.score != null ? String(row.score) : '—', colScore, y)
      doc.text(String(row.grade || '—'), colGrade, y)
      y += blockH + 4
      doc.setDrawColor(...LINE)
      doc.line(MARGIN, y - 2, MARGIN + contentWidth, y - 2)
    }
    y += 14
  }

  ensure(30)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const generated = card.generatedAt
    ? new Date(card.generatedAt).toLocaleString('en-GB')
    : new Date().toLocaleString('en-GB')
  doc.text(
    `Generated ${generated}. This card shows assessment results only; teacher names are not included.`,
    MARGIN,
    y,
    { maxWidth: contentWidth }
  )

  return doc
}

export function resultCardPdfBuffer(card) {
  return pdfToBuffer(buildResultCardPdf(card))
}
