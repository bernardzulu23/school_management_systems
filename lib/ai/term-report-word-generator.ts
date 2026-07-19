/**
 * Creates clean, professional .docx end-of-term report files for printing.
 * Mirrors the structure/conventions of lib/ai/lesson-plan-word-generator.ts.
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
} from 'docx'
import type { FileChild } from 'docx'
import { sanitizeText } from '@/lib/lesson-plans/text'

export type TermReportSection = {
  heading: string
  body: string
}

export type TermReportDocParams = {
  schoolName?: string | null
  studentName: string
  className?: string | null
  term: number
  academicYear: number
  status?: string | null
  attendancePercent?: number | null
  sbaAverage?: number | null
  overallGrade?: string | null
  /** Ordered narrative sections (opening, academic progress, etc.). */
  sections: TermReportSection[]
  /** Fallback flat narrative when structured sections are unavailable. */
  narrative?: string | null
  generatedOn?: string
}

const TERM_REPORT_SECTION_LABELS: Array<{ key: string; label: string }> = [
  { key: 'opening', label: 'Opening Remarks' },
  { key: 'academicProgress', label: 'Academic Progress' },
  { key: 'attendanceComment', label: 'Attendance' },
  { key: 'conductAndParticipation', label: 'Conduct & Participation' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'closing', label: 'Closing Remarks' },
]

function headerCell(text: string) {
  return new TableCell({
    width: { size: 30, type: WidthType.PERCENTAGE },
    shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
  })
}

function valueCell(text: string) {
  return new TableCell({
    width: { size: 70, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: text || 'N/A' })] })],
  })
}

function sectionParagraph(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new Paragraph({
    spacing: { before: opts?.bold ? 400 : 200, after: opts?.bold ? 200 : 100 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        color: opts?.color,
        size: opts?.size,
      }),
    ],
  })
}

function contentParagraph(text: string) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text })],
  })
}

/**
 * Normalise a persisted TermReport row into ordered display sections.
 * The `content` JSON follows lib/ai/term-report-schema.js.
 */
export function extractTermReportSections(content: unknown): TermReportSection[] {
  const report =
    content && typeof content === 'object' && 'report' in content
      ? (content as { report?: Record<string, unknown> }).report
      : undefined

  if (!report || typeof report !== 'object') return []

  const sections: TermReportSection[] = []
  for (const { key, label } of TERM_REPORT_SECTION_LABELS) {
    const value = report[key as keyof typeof report]
    const text = typeof value === 'string' ? value.trim() : ''
    if (text) sections.push({ heading: label, body: text })
  }
  return sections
}

export async function generateTermReportWordDoc(params: TermReportDocParams): Promise<Buffer> {
  const {
    schoolName,
    studentName,
    className,
    term,
    academicYear,
    status,
    attendancePercent,
    sbaAverage,
    overallGrade,
    sections,
    narrative,
    generatedOn,
  } = params

  const children: FileChild[] = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: (schoolName || 'School').toUpperCase(),
          bold: true,
          size: 24,
          color: '1F4788',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `END OF TERM REPORT — TERM ${term}, ${academicYear}`,
          bold: true,
          size: 22,
          color: '1F4788',
        }),
      ],
    })
  )

  const infoRows: TableRow[] = [
    new TableRow({ children: [headerCell('Student:'), valueCell(studentName || 'N/A')] }),
    new TableRow({ children: [headerCell('Class:'), valueCell(className || 'N/A')] }),
    new TableRow({ children: [headerCell('Term:'), valueCell(String(term))] }),
    new TableRow({ children: [headerCell('Academic Year:'), valueCell(String(academicYear))] }),
  ]

  if (attendancePercent != null) {
    infoRows.push(
      new TableRow({
        children: [headerCell('Attendance:'), valueCell(`${Math.round(attendancePercent)}%`)],
      })
    )
  }
  if (sbaAverage != null) {
    infoRows.push(
      new TableRow({
        children: [headerCell('SBA Average:'), valueCell(`${Math.round(sbaAverage)}%`)],
      })
    )
  }
  if (overallGrade) {
    infoRows.push(
      new TableRow({ children: [headerCell('Overall Grade:'), valueCell(overallGrade)] })
    )
  }
  if (status) {
    infoRows.push(new TableRow({ children: [headerCell('Status:'), valueCell(status)] }))
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows,
    })
  )

  children.push(new Paragraph({ spacing: { before: 200 } }))

  if (sections.length > 0) {
    for (const section of sections) {
      children.push(sectionParagraph(section.heading, { bold: true, color: '1F4788', size: 22 }))
      const clean = sanitizeText(section.body)
      for (const line of clean.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) {
          children.push(new Paragraph(''))
          continue
        }
        children.push(contentParagraph(trimmed))
      }
    }
  } else if (narrative) {
    const clean = sanitizeText(narrative)
    for (const line of clean.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) {
        children.push(new Paragraph(''))
        continue
      }
      children.push(contentParagraph(trimmed))
    }
  } else {
    children.push(contentParagraph('No report narrative available.'))
  }

  children.push(
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on ${generatedOn || new Date().toLocaleDateString('en-GB')}`,
          italics: true,
          color: '6B7280',
          size: 18,
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}

export function generateTermReportFilename(
  studentName: string,
  term: number,
  academicYear: number,
  ext: 'docx' | 'pdf' = 'docx'
): string {
  const sanitized = `${studentName}_Term${term}_${academicYear}`
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)

  return `TermReport_${sanitized}.${ext}`
}
