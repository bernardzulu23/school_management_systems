/**
 * Real .docx export for assessment papers (quiz, ECZ, project, flashcards).
 */

import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import type { FileChild } from 'docx'
import {
  assessmentPaperToPdfParams,
  assessmentPaperToSections,
  type AssessmentPaperPayload,
} from '@/lib/exports/assessmentPaper'

function heading(text: string, size = 28) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size, color: '1F4788' })],
  })
}

function body(text: string) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: text || '', size: 22 })],
  })
}

function metaLine(label: string, value: string) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: `${label} `, bold: true, size: 20 }),
      new TextRun({ text: value || 'N/A', size: 20 }),
    ],
  })
}

export async function generateAssessmentWordDoc(paper: AssessmentPaperPayload): Promise<Buffer> {
  const pdfModel = assessmentPaperToPdfParams(paper)
  const sections = assessmentPaperToSections(paper)
  const children: FileChild[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: pdfModel.title, bold: true, size: 32, color: '1F4788' })],
    }),
  ]

  if (pdfModel.subtitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: pdfModel.subtitle, bold: true, size: 22 })],
      })
    )
  }

  for (const row of pdfModel.infoRows || []) {
    children.push(metaLine(row.label, row.value))
  }

  children.push(new Paragraph({ spacing: { before: 120, after: 120 }, children: [] }))

  for (const section of sections) {
    if (section.heading) children.push(heading(section.heading, 24))
    for (const line of String(section.body || '').split('\n')) {
      if (line.trim()) children.push(body(line.trim()))
    }
  }

  if (pdfModel.footer) {
    children.push(
      new Paragraph({
        spacing: { before: 400 },
        children: [
          new TextRun({ text: pdfModel.footer, italics: true, size: 18, color: '6B7280' }),
        ],
      })
    )
  }

  const doc = new Document({
    sections: [{ children }],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}
