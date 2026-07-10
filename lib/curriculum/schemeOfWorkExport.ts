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
import type { SchemeWeekRow } from '@/lib/curriculum/schemeOfWorkGenerator'

function cell(text: string, opts?: { bold?: boolean; header?: boolean; width?: number }) {
  return new TableCell({
    width: { size: opts?.width || 14, type: WidthType.PERCENTAGE },
    shading: opts?.header ? { fill: 'E8E8E8', type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: String(text || ''), bold: opts?.bold || opts?.header, size: 18 }),
        ],
      }),
    ],
  })
}

export async function exportSchemeToWord(input: {
  schoolName?: string
  teacherName?: string
  subject: string
  gradeOrForm: string
  term: string
  year: number
  weeks: SchemeWeekRow[]
}): Promise<Buffer> {
  const header = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell('Week', { header: true, width: 8 }),
          cell('Topic', { header: true, width: 18 }),
          cell('Learning Outcomes', { header: true, width: 22 }),
          cell('Teaching Activities', { header: true, width: 22 }),
          cell('Assessment', { header: true, width: 12 }),
          cell('Resources', { header: true, width: 10 }),
          cell('Notes', { header: true, width: 8 }),
        ],
      }),
      ...input.weeks.map(
        (w) =>
          new TableRow({
            children: [
              cell(String(w.week), { width: 8 }),
              cell(w.topic, { width: 18 }),
              cell((w.learningOutcomes || []).join('; '), { width: 22 }),
              cell((w.teachingActivities || []).join('; '), { width: 22 }),
              cell(w.assessmentMethod || '', { width: 12 }),
              cell((w.resources || []).join('; '), { width: 10 }),
              cell(w.notes || '', { width: 8 }),
            ],
          })
      ),
    ],
  })

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'SCHEME OF WORK', bold: true, size: 28, color: '1F4788' }),
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
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `${input.subject} | ${input.gradeOrForm} | ${input.term} ${input.year}`,
                bold: true,
                size: 20,
              }),
            ],
          }),
          header,
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

function csvEscape(value: string): string {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Export scheme of work as CSV (spreadsheet-friendly). */
export function exportSchemeToCsv(input: {
  subject: string
  gradeOrForm: string
  term: string
  year: number
  weeks: SchemeWeekRow[]
}): string {
  const header = [
    'Week',
    'Topic',
    'Learning Outcomes',
    'Teaching Activities',
    'Assessment',
    'Resources',
    'Notes',
    'Homework',
  ]
  const rows = input.weeks.map((w) =>
    [
      String(w.week),
      w.topic,
      (w.learningOutcomes || []).join('; '),
      (w.teachingActivities || []).join('; '),
      w.assessmentMethod || (w.assessmentMethods || []).join('; '),
      (w.resources || []).join('; '),
      w.notes || w.teacherNotes || '',
      w.homeworkTask || '',
    ]
      .map(csvEscape)
      .join(',')
  )
  const meta = `# ${input.subject} | ${input.gradeOrForm} | ${input.term} ${input.year}`
  return [meta, header.join(','), ...rows].join('\n')
}
