/**
 * Creates clean, professional .docx lesson plan files for printing.
 */

import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  PageBreak,
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
import { structuredLessonPlanToPlainText } from '@/lib/ai/lesson-plan-formatter'
import type { ChatLessonPlan } from '@/lib/ai/chat/lesson-plan-schema'

export type LessonPlanDocParams = {
  schoolName: string
  teacherName: string
  teacherGender?: string | null
  departmentName?: string | null
  date: string
  subject: string
  form: string
  topic: string
  subTopic: string
  duration: number
  lessonContent: string
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'
  approvalNotes?: string
  /** Optional PNG of a Mermaid diagram (chat Phase 3). */
  diagramPng?: Buffer | null
}

/** Chat-generated structured JSON → Word (extends existing docx layout; no separate template engine). */
export type StructuredLessonPlanDocParams = Omit<
  LessonPlanDocParams,
  'lessonContent' | 'subject' | 'form' | 'topic' | 'subTopic' | 'duration'
> & {
  structured: ChatLessonPlan | Record<string, unknown>
  subject?: string
  form?: string
  topic?: string
  subTopic?: string
  duration?: number
}

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

function contentParagraph(text: string, indent = false) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    indent: indent ? { left: 720 } : undefined,
    children: [new TextRun({ text })],
  })
}

export async function generateLessonPlanWordDoc(params: LessonPlanDocParams): Promise<Buffer> {
  const {
    schoolName,
    teacherName,
    date,
    subject,
    form,
    topic,
    subTopic,
    duration,
    lessonContent,
    approvalStatus,
    approvalNotes,
  } = params

  const clean = sanitizeText(lessonContent)
  const children: FileChild[] = []
  const usesMogeHeader = /^MINISTRY OF GENERAL EDUCATION\b/im.test(clean)

  if (!usesMogeHeader) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: 'MINISTRY OF GENERAL EDUCATION',
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
            text: params.departmentName
              ? `DEPARTMENT OF ${params.departmentName.toUpperCase()} LESSON PLAN`
              : "TEACHER'S LESSON PLAN",
            bold: true,
            size: 22,
            color: '1F4788',
          }),
        ],
      })
    )

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [headerCell('School:'), valueCell(schoolName || '[School Name]')],
        }),
        new TableRow({
          children: [
            headerCell('Teacher:'),
            valueCell(
              `${teacherName || '[Teacher Name]'}${params.teacherGender ? ` (${params.teacherGender})` : ''}`
            ),
          ],
        }),
        new TableRow({
          children: [headerCell('Date:'), valueCell(date || new Date().toLocaleDateString())],
        }),
        new TableRow({ children: [headerCell('Subject:'), valueCell(subject)] }),
        new TableRow({ children: [headerCell('Form/Class:'), valueCell(form)] }),
        new TableRow({ children: [headerCell('Topic:'), valueCell(topic)] }),
        new TableRow({ children: [headerCell('Sub-Topic:'), valueCell(subTopic || 'N/A')] }),
        new TableRow({ children: [headerCell('Duration:'), valueCell(`${duration} minutes`)] }),
      ],
    })

    children.push(headerTable)
  }

  if (approvalStatus) {
    const statusColor: Record<string, string> = {
      APPROVED: '0B8A38',
      REJECTED: 'C41E3A',
      SUBMITTED: 'F59E0B',
      DRAFT: '6B7280',
      REVISION_REQUESTED: 'F59E0B',
    }
    const statusText: Record<string, string> = {
      APPROVED: 'APPROVED BY HEAD OF DEPARTMENT',
      REJECTED: 'REJECTED - REQUIRES REVISION',
      SUBMITTED: 'PENDING HOD APPROVAL',
      DRAFT: 'DRAFT STATUS',
      REVISION_REQUESTED: 'REVISIONS REQUESTED',
    }

    children.push(
      new Paragraph({ spacing: { before: 200 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: statusText[approvalStatus] || approvalStatus,
            bold: true,
            size: 20,
            color: statusColor[approvalStatus] || '374151',
          }),
        ],
      })
    )

    if (approvalNotes) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          children: [
            new TextRun({ text: `Notes: ${approvalNotes}`, italics: true, color: '4B5563' }),
          ],
        })
      )
    }
  }

  children.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  if (params.diagramPng && Buffer.isBuffer(params.diagramPng) && params.diagramPng.length > 0) {
    try {
      children.push(
        sectionParagraph('DIAGRAM', { bold: true, color: '1F4788', size: 22 }),
        new Paragraph({
          spacing: { before: 120, after: 240 },
          children: [
            new ImageRun({
              type: 'png',
              data: params.diagramPng,
              transformation: { width: 480, height: 280 },
            }),
          ],
        })
      )
    } catch {
      // Image embed failed — continue without diagram (optional visual).
    }
  }

  for (const line of clean.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      children.push(new Paragraph(''))
      continue
    }

    if (trimmed.match(/^[0-9]+\.\s+[A-Z]/) || trimmed.match(/^[A-Z][A-Z0-9\s]+:$/)) {
      children.push(sectionParagraph(trimmed, { bold: true, color: '1F4788', size: 22 }))
    } else if (trimmed.match(/^[A-Z][A-Z\s]+:/) && trimmed.length < 50) {
      children.push(sectionParagraph(trimmed, { bold: true, color: '374151', size: 20 }))
    } else if (trimmed.match(/^[0-9]+\.\s+/)) {
      children.push(contentParagraph(trimmed, true))
    } else if (trimmed.match(/^[a-z]\)\s+/) || trimmed.match(/^-\s+/)) {
      children.push(contentParagraph(trimmed.replace(/^[-a-z)]\s+/, ''), true))
    } else {
      children.push(contentParagraph(trimmed))
    }
  }

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

export function generateLessonPlanFilename(subject: string, form: string, topic: string): string {
  const sanitized = `${subject}_${form}_${topic}`
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)

  return `LessonPlan_${sanitized}_${new Date().toISOString().split('T')[0]}.docx`
}

/**
 * Accept chat-generated (Zod-validated) lesson-plan JSON and produce a .docx
 * using the same official header/layout as generateLessonPlanWordDoc.
 * Optional diagramPng is embedded as a fixed-size IMAGE when present.
 */
export async function generateLessonPlanWordDocFromStructured(
  params: StructuredLessonPlanDocParams
): Promise<Buffer> {
  const structured = params.structured as ChatLessonPlan
  const plain = structuredLessonPlanToPlainText(structured as any)

  return generateLessonPlanWordDoc({
    schoolName: params.schoolName,
    teacherName: params.teacherName,
    teacherGender: params.teacherGender,
    departmentName: params.departmentName,
    date: params.date,
    subject: params.subject || structured.subject || '',
    form: params.form || structured.gradeOrForm || '',
    topic: params.topic || structured.topic || structured.title || '',
    subTopic: params.subTopic || structured.subTopic || structured.title || '',
    duration: Number(params.duration || structured.duration || 40),
    lessonContent: plain,
    approvalStatus: params.approvalStatus,
    approvalNotes: params.approvalNotes,
    diagramPng: params.diagramPng,
  })
}
