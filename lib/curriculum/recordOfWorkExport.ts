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
  ShadingType,
} from 'docx'

function cell(text: string, opts?: { bold?: boolean; header?: boolean; width?: number }) {
  return new TableCell({
    width: { size: opts?.width || 20, type: WidthType.PERCENTAGE },
    shading: opts?.header ? { fill: 'E8E8E8', type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text: String(text || ''), bold: opts?.bold || opts?.header, size: 18 }),
        ],
      }),
    ],
  })
}

export type RecordOfWorkWeekRow = {
  week: number
  dateTaught?: string
  topic?: string
  remarks?: string
  signOff?: string
  taught?: boolean
}

/**
 * Record of work — weeks auto-filled only when an APPROVED lesson plan exists.
 * Weeks without an approved plan remain blank (regarded as not taught).
 */
export async function exportRecordOfWorkTemplate(input: {
  schoolName?: string
  teacherName?: string
  subject: string
  gradeOrForm: string
  term: string
  year: number
  weekCount?: number
  weeks?: RecordOfWorkWeekRow[]
}): Promise<Buffer> {
  const weekCount = Math.max(1, Math.min(16, Number(input.weekCount) || 12))
  const byWeek = new Map<number, RecordOfWorkWeekRow>()
  for (const w of input.weeks || []) {
    byWeek.set(Number(w.week), w)
  }

  const rows = [
    new TableRow({
      children: [
        cell('Week', { header: true, width: 8 }),
        cell('Date taught', { header: true, width: 14 }),
        cell('Topic / content covered', { header: true, width: 28 }),
        cell('Remarks / challenges', { header: true, width: 28 }),
        cell('Teacher sign-off', { header: true, width: 22 }),
      ],
    }),
    ...Array.from({ length: weekCount }, (_, i) => {
      const week = i + 1
      const data = byWeek.get(week)
      const taught = Boolean(data?.taught && (data.topic || data.dateTaught))
      return new TableRow({
        children: [
          cell(String(week), { width: 8 }),
          cell(taught ? data?.dateTaught || '' : '', { width: 14 }),
          cell(taught ? data?.topic || '' : '', { width: 28 }),
          cell(taught ? data?.remarks || '' : 'Not taught — no approved lesson plan', {
            width: 28,
          }),
          cell(taught ? data?.signOff || '' : '', { width: 22 }),
        ],
      })
    }),
  ]

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'RECORD OF WORK', bold: true, size: 28, color: '1F4788' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `${input.schoolName || 'School'} — ${input.teacherName || 'Teacher'}`,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `${input.subject} | ${input.gradeOrForm} | ${input.term} ${input.year}`,
                bold: true,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'Auto-filled from APPROVED lesson plans only. Blank / “Not taught” = no approved plan for that week.',
                italics: true,
                size: 16,
                color: '666666',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
