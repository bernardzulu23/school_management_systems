/**
 * Creates clean, professional .docx lesson plan files for printing.
 * Structured chat plans render as scheme-of-work-style tables with optional visuals.
 */

import {
  AlignmentType,
  BorderStyle,
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
  VerticalAlign,
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
  /** Optional PNG of a Mermaid diagram (chat Phase 3, legacy single image). */
  diagramPng?: Buffer | null
  /** Multiple rendered visual aids with captions. */
  visualImages?: Array<{ title: string; caption?: string; png: Buffer }> | null
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

const THIN = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN }

function headerCell(text: string, width = 30) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    shading: { fill: 'E8E8E8', type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18 })],
      }),
    ],
  })
}

function valueCell(text: string, width = 70) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || 'N/A', size: 18 })],
      }),
    ],
  })
}

function tableHeaderCell(text: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    shading: { fill: '1F4788', type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF' })],
      }),
    ],
  })
}

function bodyCell(text: string, width: number, opts?: { bold?: boolean; fill?: string }) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: BORDERS,
    shading: opts?.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: String(text || '')
      .split('\n')
      .filter((line, i, arr) => line.trim() || arr.length === 1)
      .map(
        (line) =>
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: line || ' ', bold: opts?.bold, size: 16 })],
          })
      ),
  })
}

function sectionParagraph(text: string, opts?: { bold?: boolean; color?: string; size?: number }) {
  return new Paragraph({
    spacing: { before: opts?.bold ? 320 : 160, after: opts?.bold ? 120 : 80 },
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
    spacing: { before: 80, after: 80 },
    indent: indent ? { left: 720 } : undefined,
    children: [new TextRun({ text, size: 18 })],
  })
}

function bullet(text: string) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text: `• ${text}`, size: 18 })],
  })
}

function titleBlock(params: { departmentName?: string | null }): FileChild[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
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
      spacing: { after: 200 },
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
    }),
  ]
}

function approvalBlock(
  approvalStatus?: LessonPlanDocParams['approvalStatus'],
  approvalNotes?: string
): FileChild[] {
  if (!approvalStatus) return []
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
  const out: FileChild[] = [
    new Paragraph({ spacing: { before: 160 } }),
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
    }),
  ]
  if (approvalNotes) {
    out.push(
      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: `Notes: ${approvalNotes}`,
            italics: true,
            color: '4B5563',
            size: 18,
          }),
        ],
      })
    )
  }
  return out
}

function embedVisuals(
  visualImages?: LessonPlanDocParams['visualImages'],
  diagramPng?: Buffer | null
): FileChild[] {
  const images =
    Array.isArray(visualImages) && visualImages.length
      ? visualImages
      : diagramPng && Buffer.isBuffer(diagramPng) && diagramPng.length > 0
        ? [{ title: 'DIAGRAM', png: diagramPng }]
        : []

  const children: FileChild[] = []
  for (const img of images) {
    if (!img?.png || !Buffer.isBuffer(img.png) || img.png.length === 0) continue
    try {
      children.push(
        sectionParagraph(img.title || 'VISUAL AID', { bold: true, color: '1F4788', size: 22 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [
            new ImageRun({
              type: 'png',
              data: img.png,
              transformation: { width: 520, height: 300 },
            }),
          ],
        })
      )
      if (img.caption) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new TextRun({ text: img.caption, italics: true, size: 16, color: '4B5563' }),
            ],
          })
        )
      }
    } catch {
      // Image embed failed — continue without this visual.
    }
  }
  return children
}

/**
 * Plain-text lesson content → Word (legacy / non-structured callers).
 */
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
    children.push(...titleBlock({ departmentName: params.departmentName }))

    children.push(
      new Table({
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
    )
  }

  children.push(...approvalBlock(approvalStatus, approvalNotes))
  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(...embedVisuals(params.visualImages, params.diagramPng))

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
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}

function isChatLessonPlan(value: unknown): value is ChatLessonPlan {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.activities) &&
    v.activities.length > 0 &&
    Array.isArray(v.objectives) &&
    typeof v.title === 'string'
  )
}

/**
 * Structured lesson plan → professional table-based Word document.
 */
export async function generateStructuredLessonPlanWordDoc(
  params: StructuredLessonPlanDocParams
): Promise<Buffer> {
  const plan = params.structured as ChatLessonPlan
  const subject = params.subject || plan.subject || ''
  const form = params.form || plan.gradeOrForm || ''
  const topic = params.topic || plan.topic || plan.title || ''
  const subTopic = params.subTopic || plan.subTopic || plan.title || ''
  const duration = Number(params.duration || plan.duration || 40)

  const children: FileChild[] = [
    ...titleBlock({ departmentName: params.departmentName }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [headerCell('School:'), valueCell(params.schoolName || '[School Name]')],
        }),
        new TableRow({
          children: [
            headerCell('Teacher:'),
            valueCell(
              `${params.teacherName || '[Teacher Name]'}${params.teacherGender ? ` (${params.teacherGender})` : ''}`
            ),
          ],
        }),
        new TableRow({
          children: [
            headerCell('Date:'),
            valueCell(params.date || new Date().toLocaleDateString()),
          ],
        }),
        new TableRow({ children: [headerCell('Subject:'), valueCell(subject)] }),
        new TableRow({ children: [headerCell('Form/Class:'), valueCell(form)] }),
        new TableRow({ children: [headerCell('Topic:'), valueCell(topic)] }),
        new TableRow({ children: [headerCell('Sub-Topic:'), valueCell(subTopic || 'N/A')] }),
        new TableRow({ children: [headerCell('Duration:'), valueCell(`${duration} minutes`)] }),
        new TableRow({ children: [headerCell('Title:'), valueCell(plan.title || topic)] }),
      ],
    }),
    ...approvalBlock(params.approvalStatus, params.approvalNotes),
  ]

  // Objectives table
  children.push(
    sectionParagraph('1. LEARNING OBJECTIVES', { bold: true, color: '1F4788', size: 22 })
  )
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            tableHeaderCell('#', 8),
            tableHeaderCell('Objective', 44),
            tableHeaderCell("Bloom's Level", 20),
            tableHeaderCell('Competency', 28),
          ],
        }),
        ...(plan.objectives || []).map(
          (obj, i) =>
            new TableRow({
              children: [
                bodyCell(String(i + 1), 8),
                bodyCell(obj.objective, 44),
                bodyCell(obj.bloomsLevel, 20),
                bodyCell(obj.competency, 28),
              ],
            })
        ),
      ],
    })
  )

  children.push(sectionParagraph('2. PRIOR KNOWLEDGE', { bold: true, color: '1F4788', size: 22 }))
  children.push(contentParagraph(plan.priorKnowledge || ''))

  children.push(
    sectionParagraph('3. MATERIALS / RESOURCES', { bold: true, color: '1F4788', size: 22 })
  )
  for (const m of plan.materialsRequired || []) children.push(bullet(m))

  // Lesson procedure — scheme-of-work style
  children.push(sectionParagraph('4. LESSON PROCEDURE', { bold: true, color: '1F4788', size: 22 }))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            tableHeaderCell('Phase', 12),
            tableHeaderCell('Time', 8),
            tableHeaderCell('Teacher Activity', 24),
            tableHeaderCell('Learner Activity', 24),
            tableHeaderCell('Resources', 14),
            tableHeaderCell('Assessment', 18),
          ],
        }),
        ...(plan.activities || []).map((act) => {
          const phaseFill =
            act.phase === 'Introduction'
              ? 'EEF2FF'
              : act.phase === 'Conclusion'
                ? 'ECFDF5'
                : 'FFF7ED'
          return new TableRow({
            children: [
              bodyCell(act.phase, 12, { bold: true, fill: phaseFill }),
              bodyCell(`${act.durationMinutes} min`, 8, { fill: phaseFill }),
              bodyCell(`${act.activity}\n\nTeacher: ${act.teacherAction}`, 24),
              bodyCell(act.learnerAction, 24),
              bodyCell((act.resources || []).join('; '), 14),
              bodyCell(act.assessmentCheck || 'Oral Q&A / observation', 18),
            ],
          })
        }),
      ],
    })
  )

  if (plan.workedExamples?.length) {
    children.push(sectionParagraph('5. WORKED EXAMPLES', { bold: true, color: '1F4788', size: 22 }))
    plan.workedExamples.forEach((ex, i) => children.push(bullet(`${i + 1}. ${ex}`)))
  }

  children.push(...embedVisuals(params.visualImages, params.diagramPng))

  children.push(sectionParagraph('6. ASSESSMENT', { bold: true, color: '1F4788', size: 22 }))
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            tableHeaderCell('Method', 33),
            tableHeaderCell('Tool', 33),
            tableHeaderCell('Criteria', 34),
          ],
        }),
        new TableRow({
          children: [
            bodyCell(plan.assessment?.method || '', 33),
            bodyCell(plan.assessment?.tool || '', 33),
            bodyCell(plan.assessment?.criteria || '', 34),
          ],
        }),
      ],
    })
  )

  if (plan.differentiation?.support || plan.differentiation?.challenge) {
    children.push(sectionParagraph('7. DIFFERENTIATION', { bold: true, color: '1F4788', size: 22 }))
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [tableHeaderCell('Support', 50), tableHeaderCell('Challenge', 50)],
          }),
          new TableRow({
            children: [
              bodyCell(plan.differentiation?.support || '—', 50),
              bodyCell(plan.differentiation?.challenge || '—', 50),
            ],
          }),
        ],
      })
    )
  }

  if (plan.homework) {
    children.push(sectionParagraph('8. HOMEWORK', { bold: true, color: '1F4788', size: 22 }))
    children.push(contentParagraph(plan.homework))
  }

  children.push(
    sectionParagraph('9. CROSS-CUTTING THEMES & COMPETENCIES', {
      bold: true,
      color: '1F4788',
      size: 22,
    })
  )
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            tableHeaderCell('Cross-cutting themes', 50),
            tableHeaderCell('Core competencies', 50),
          ],
        }),
        new TableRow({
          children: [
            bodyCell((plan.crossCuttingThemes || []).join('; '), 50),
            bodyCell((plan.coreCompetencies || []).join('; '), 50),
          ],
        }),
      ],
    })
  )

  children.push(
    sectionParagraph('10. REAL-WORLD ZAMBIAN CONTEXT', { bold: true, color: '1F4788', size: 22 })
  )
  children.push(contentParagraph(plan.realWorldZambianContext || ''))

  if (plan.teacherReflectionPrompts?.length) {
    children.push(
      sectionParagraph('11. TEACHER REFLECTION', { bold: true, color: '1F4788', size: 22 })
    )
    plan.teacherReflectionPrompts.forEach((p, i) => children.push(bullet(`${i + 1}. ${p}`)))
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
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
 * Accept chat-generated (Zod-validated) lesson-plan JSON and produce a .docx.
 * Structured plans use the table layout; malformed/legacy objects fall back to plain text.
 */
export async function generateLessonPlanWordDocFromStructured(
  params: StructuredLessonPlanDocParams
): Promise<Buffer> {
  const structured = params.structured

  if (isChatLessonPlan(structured)) {
    return generateStructuredLessonPlanWordDoc(params)
  }

  const plain = structuredLessonPlanToPlainText(structured as any)
  return generateLessonPlanWordDoc({
    schoolName: params.schoolName,
    teacherName: params.teacherName,
    teacherGender: params.teacherGender,
    departmentName: params.departmentName,
    date: params.date,
    subject: params.subject || '',
    form: params.form || '',
    topic: params.topic || '',
    subTopic: params.subTopic || '',
    duration: Number(params.duration || 40),
    lessonContent: plain,
    approvalStatus: params.approvalStatus,
    approvalNotes: params.approvalNotes,
    diagramPng: params.diagramPng,
    visualImages: params.visualImages,
  })
}
