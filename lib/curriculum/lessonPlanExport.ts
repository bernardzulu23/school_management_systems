/**
 * Word export for curriculum-studio lesson plans.
 * Reuses styling helpers from the main lesson-plan word generator.
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
  ShadingType,
} from 'docx'
import { generateLessonPlanWordDoc } from '@/lib/ai/lesson-plan-word-generator'
import { structuredLessonPlanToPlainText } from '@/lib/ai/lesson-plan-formatter'

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

function heading(text: string) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  })
}

function body(text: string) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: String(text || '') })],
  })
}

/**
 * Prefer structured Word layout when activities are present; else fall back to plain content doc.
 */
export async function exportLessonPlanToWord(lessonPlan: {
  subject?: string
  grade?: string
  gradeOrForm?: string
  topic?: string
  title?: string
  duration?: number
  schoolName?: string
  teacherName?: string
  content?: string
  structuredContent?: any
  introduction?: string
  development?: string
  conclusion?: string
  assessment?: {
    formative?: string
    summative?: string
    method?: string
    tool?: string
    criteria?: string
  }
  teaching_aids_needed?: string[] | string
  materialsRequired?: string[]
  differentiation_strategies?: string | string[]
  homework?: string
}) {
  const structured = lessonPlan.structuredContent
  if (structured && !lessonPlan.introduction) {
    const plain = structuredLessonPlanToPlainText(structured)
    return generateLessonPlanWordDoc({
      schoolName: lessonPlan.schoolName || '',
      teacherName: lessonPlan.teacherName || '',
      date: new Date().toLocaleDateString(),
      subject: lessonPlan.subject || structured.subject || '',
      form: lessonPlan.grade || lessonPlan.gradeOrForm || structured.gradeOrForm || '',
      topic: lessonPlan.topic || structured.title || '',
      subTopic: structured.title || lessonPlan.topic || '',
      duration: Number(lessonPlan.duration || structured.duration || 40),
      lessonContent: plain,
    })
  }

  if (lessonPlan.content && !lessonPlan.introduction) {
    return generateLessonPlanWordDoc({
      schoolName: lessonPlan.schoolName || '',
      teacherName: lessonPlan.teacherName || '',
      date: new Date().toLocaleDateString(),
      subject: lessonPlan.subject || '',
      form: String(lessonPlan.grade || lessonPlan.gradeOrForm || ''),
      topic: lessonPlan.topic || lessonPlan.title || '',
      subTopic: lessonPlan.topic || '',
      duration: Number(lessonPlan.duration || 40),
      lessonContent: lessonPlan.content,
    })
  }

  const aids = Array.isArray(lessonPlan.teaching_aids_needed)
    ? lessonPlan.teaching_aids_needed.join(', ')
    : Array.isArray(lessonPlan.materialsRequired)
      ? lessonPlan.materialsRequired.join(', ')
      : String(lessonPlan.teaching_aids_needed || '')

  const differentiation = Array.isArray(lessonPlan.differentiation_strategies)
    ? lessonPlan.differentiation_strategies.join('\n')
    : String(lessonPlan.differentiation_strategies || '')

  const assessment = lessonPlan.assessment || {}

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `Lesson Plan: ${lessonPlan.topic || lessonPlan.title || 'Untitled'}`,
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [headerCell('Subject'), valueCell(String(lessonPlan.subject || ''))],
              }),
              new TableRow({
                children: [
                  headerCell('Grade'),
                  valueCell(String(lessonPlan.grade || lessonPlan.gradeOrForm || '')),
                ],
              }),
              new TableRow({
                children: [
                  headerCell('Duration'),
                  valueCell(`${lessonPlan.duration || 40} minutes`),
                ],
              }),
            ],
          }),
          heading('Introduction'),
          body(lessonPlan.introduction || ''),
          heading('Development'),
          body(lessonPlan.development || ''),
          heading('Conclusion'),
          body(lessonPlan.conclusion || ''),
          heading('Assessment'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  headerCell('Formative'),
                  valueCell(String(assessment.formative || assessment.method || '')),
                ],
              }),
              new TableRow({
                children: [
                  headerCell('Summative'),
                  valueCell(String(assessment.summative || assessment.criteria || '')),
                ],
              }),
            ],
          }),
          heading('Teaching Aids'),
          body(aids),
          heading('Differentiation'),
          body(differentiation),
          heading('Homework'),
          body(String(lessonPlan.homework || '')),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
