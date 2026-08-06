/**
 * DOCX result card — subject scores/grades only (no teacher names).
 */

import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx'

function cell(text, opts = {}) {
  const { bold = false, fill = null, width = 25 } = opts
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text ?? ''), bold, size: 20 })],
      }),
    ],
  })
}

/**
 * @param {Awaited<ReturnType<typeof import('./resultCardData').loadStudentResultCard>>} card
 */
export async function buildResultCardDocx(card) {
  const children = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: String(card.school?.name || 'School').toUpperCase(),
          bold: true,
          size: 28,
          color: '1F4788',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'STUDENT RESULT CARD',
          bold: true,
          size: 24,
          color: '1F4788',
        }),
      ],
    })
  )

  const infoRows = [
    ['Student', card.student?.name || ''],
    ['Class', card.student?.class || 'N/A'],
  ]
  if (card.student?.examNumber) infoRows.push(['Exam No.', card.student.examNumber])
  if (card.filters?.term) infoRows.push(['Term', card.filters.term])
  if (card.filters?.year != null) infoRows.push(['Year', String(card.filters.year)])
  if (card.filters?.resultType) {
    infoRows.push(['Result type', String(card.filters.resultType).replace(/_/g, ' ')])
  } else {
    infoRows.push(['Coverage', 'All entered results'])
  }
  infoRows.push([
    'Overall average',
    card.summary?.overallAverage != null ? `${card.summary.overallAverage}%` : 'N/A',
  ])

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              cell(label, { bold: true, fill: 'E8E8E8', width: 30 }),
              cell(value, { width: 70 }),
            ],
          })
      ),
    })
  )

  children.push(new Paragraph({ spacing: { before: 240 } }))

  const groups = Array.isArray(card.groups) ? card.groups : []
  if (!groups.length) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'No results found for the selected filters.',
            italics: true,
            color: '6B7280',
          }),
        ],
      })
    )
  }

  for (const group of groups) {
    children.push(
      new Paragraph({
        spacing: { before: 280, after: 80 },
        children: [
          new TextRun({
            text: `${group.term || ''} ${group.year || ''} — ${group.resultTypeLabel || group.resultType}`.trim(),
            bold: true,
            size: 22,
            color: '1F4788',
          }),
        ],
      })
    )
    if (group.average != null) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `Group average: ${group.average}% · ${group.subjectCount} subject(s)`,
              size: 18,
              color: '6B7280',
            }),
          ],
        })
      )
    }

    const tableRows = [
      new TableRow({
        children: [
          cell('Subject', { bold: true, fill: 'E8F0FE', width: 55 }),
          cell('Score (%)', { bold: true, fill: 'E8F0FE', width: 25 }),
          cell('Grade', { bold: true, fill: 'E8F0FE', width: 20 }),
        ],
      }),
      ...(group.rows || []).map(
        (row) =>
          new TableRow({
            children: [
              cell(row.subject, { width: 55 }),
              cell(row.score != null ? String(row.score) : '—', { width: 25 }),
              cell(row.grade || '—', { width: 20 }),
            ],
          })
      ),
    ]

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      })
    )
  }

  const generated = card.generatedAt
    ? new Date(card.generatedAt).toLocaleString('en-GB')
    : new Date().toLocaleString('en-GB')

  children.push(
    new Paragraph({ spacing: { before: 360 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated ${generated}. This card shows assessment results only; teacher names are not included.`,
          italics: true,
          size: 16,
          color: '6B7280',
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
