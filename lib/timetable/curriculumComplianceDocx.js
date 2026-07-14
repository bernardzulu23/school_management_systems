/**
 * DOCX export for curriculum period-compliance report (ECZ CBC expected vs scheduled).
 */

import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  HeadingLevel,
} from 'docx'

function cell(text, { bold = false, width = 1500 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text ?? ''), bold, size: 18 })],
      }),
    ],
  })
}

/**
 * @param {{
 *   schoolName?: string
 *   term: string
 *   academicYear: string
 *   summary: object
 *   rows: Array<object>
 * }} report
 */
export async function buildCurriculumComplianceDocx(report) {
  const school = String(report.schoolName || 'School').trim() || 'School'
  const title = `Curriculum period compliance — ${report.term} ${report.academicYear}`
  const header = new TableRow({
    children: [
      cell('Teacher', { bold: true, width: 2200 }),
      cell('Subject', { bold: true, width: 2000 }),
      cell('Class', { bold: true, width: 1600 }),
      cell('Required', { bold: true, width: 1000 }),
      cell('Scheduled', { bold: true, width: 1000 }),
      cell('Delta', { bold: true, width: 900 }),
      cell('Status', { bold: true, width: 1200 }),
    ],
  })

  const bodyRows = (report.rows || []).map(
    (r) =>
      new TableRow({
        children: [
          cell(r.teacherName, { width: 2200 }),
          cell(r.subjectName, { width: 2000 }),
          cell(r.className, { width: 1600 }),
          cell(r.expectedPeriods, { width: 1000 }),
          cell(r.placedPeriods, { width: 1000 }),
          cell(r.delta > 0 ? `+${r.delta}` : String(r.delta), { width: 900 }),
          cell(r.status, { width: 1200 }),
        ],
      })
  )

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: school, bold: true })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: title, size: 24 })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Allocations: ${report.summary?.allocations ?? 0} · Compliant: ${report.summary?.compliant ?? 0} · Short: ${report.summary?.short ?? 0} · Over: ${report.summary?.over ?? 0}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Required periods use the same ECZ CBC allocation math as MISSING_PERIODS (period weight: double=2).',
                italics: true,
                size: 16,
              }),
            ],
          }),
          new Table({
            width: { size: 9900, type: WidthType.DXA },
            rows: [header, ...bodyRows],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: `Generated ${new Date(report.generatedAt || Date.now()).toLocaleString()}`,
                size: 16,
              }),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
