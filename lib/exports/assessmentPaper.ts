/**
 * Shared assessment / quiz / project paper model → PDF blocks + DOCX.
 * Used by quiz-maker, topic-test, ECZ scenarios/practice, mock exam, projects, flashcards.
 */

import type { PdfBlock, PdfDocParams, PdfInfoRow } from '@/lib/ai/pdf-generator'

export type AssessmentExportKind =
  | 'quiz'
  | 'topic_test'
  | 'ecz_scenarios'
  | 'ecz_practice'
  | 'mock_exam'
  | 'project'
  | 'flashcards'

export type AssessmentQuestion = {
  question?: string
  options?: string[]
  answer?: string
  explanation?: string
  marks?: number | string
  type?: string
  commandTerm?: string
}

export type AssessmentScenario = {
  questionNumber?: number
  zambianScenario?: string
  elementOfConstruct?: string
  totalMarks?: number | string
  subQuestions?: Array<{
    number?: string
    commandTerm?: string
    question?: string
    marks?: number | string
    modelAnswer?: string
  }>
}

export type AssessmentProject = {
  context?: string
  instructions?: string
  steps?: string[]
  deliverables?: string[]
  timeline?: string
  materials?: string[]
  demonstration?: string
  competencies?: string[]
  criteria?: Array<{
    name?: string
    excellent?: string
    good?: string
    fair?: string
    needsImprovement?: string
    needs_improvement?: string
    needsImpr?: string
  }>
}

export type AssessmentFlashcard = {
  front?: string
  question?: string
  options?: string[]
  answer?: string
  explanation?: string
}

export type AssessmentPaperPayload = {
  kind: AssessmentExportKind
  title: string
  subject?: string
  grade?: string
  topic?: string
  totalMarks?: number | string
  includeAnswers?: boolean
  questions?: AssessmentQuestion[]
  scenarios?: AssessmentScenario[]
  project?: AssessmentProject
  cards?: AssessmentFlashcard[]
  /** Pre-built narrative sections (heading + body). */
  sections?: Array<{ heading: string; body: string }>
}

function pushQuestionBlocks(
  blocks: PdfBlock[],
  q: AssessmentQuestion,
  idx: number,
  includeAnswers: boolean
) {
  const label = q.commandTerm ? `${q.commandTerm}: ` : ''
  const marks = q.marks != null ? ` (${q.marks} marks)` : ''
  blocks.push({
    type: 'subheading',
    text: `Q${idx + 1}. ${label}${String(q.question || '').trim()}${marks}`,
  })
  if (Array.isArray(q.options)) {
    q.options.forEach((o, i) => {
      blocks.push({ type: 'paragraph', text: `${String.fromCharCode(65 + i)}. ${o}` })
    })
  }
  if (includeAnswers) {
    if (q.answer) blocks.push({ type: 'paragraph', text: `Answer: ${q.answer}` })
    if (q.explanation) blocks.push({ type: 'paragraph', text: `Explanation: ${q.explanation}` })
  }
  blocks.push({ type: 'spacer' })
}

function pushScenarioBlocks(
  blocks: PdfBlock[],
  s: AssessmentScenario,
  idx: number,
  includeAnswers: boolean
) {
  const n = s.questionNumber ?? idx + 1
  blocks.push({ type: 'heading', text: `Scenario ${n}` })
  if (s.zambianScenario) {
    blocks.push({ type: 'paragraph', text: String(s.zambianScenario) })
  }
  if (s.elementOfConstruct) {
    blocks.push({ type: 'paragraph', text: `Element of construct: ${s.elementOfConstruct}` })
  }
  if (s.totalMarks != null) {
    blocks.push({ type: 'paragraph', text: `Total marks: ${s.totalMarks}` })
  }
  const subs = Array.isArray(s.subQuestions) ? s.subQuestions : []
  for (const sub of subs) {
    const marks = sub.marks != null ? ` (${sub.marks})` : ''
    const term = sub.commandTerm ? `${sub.commandTerm} ` : ''
    blocks.push({
      type: 'subheading',
      text: `${sub.number || ''} ${term}${String(sub.question || '').trim()}${marks}`.trim(),
    })
    if (includeAnswers && sub.modelAnswer) {
      blocks.push({ type: 'paragraph', text: `Mark scheme: ${sub.modelAnswer}` })
    }
  }
  blocks.push({ type: 'spacer' })
}

function pushProjectBlocks(blocks: PdfBlock[], p: AssessmentProject, includeAnswers: boolean) {
  if (p.context) {
    blocks.push({ type: 'heading', text: 'Zambian context' })
    blocks.push({ type: 'paragraph', text: p.context })
  }
  if (p.instructions) {
    blocks.push({ type: 'heading', text: 'Instructions' })
    blocks.push({ type: 'paragraph', text: p.instructions })
  }
  if (Array.isArray(p.steps) && p.steps.length) {
    blocks.push({ type: 'heading', text: 'Steps' })
    p.steps.forEach((step, i) => blocks.push({ type: 'paragraph', text: `${i + 1}. ${step}` }))
  }
  if (Array.isArray(p.deliverables) && p.deliverables.length) {
    blocks.push({ type: 'heading', text: 'Deliverables' })
    p.deliverables.forEach((d) => blocks.push({ type: 'paragraph', text: `• ${d}` }))
  }
  if (p.timeline) {
    blocks.push({ type: 'heading', text: 'Timeline' })
    blocks.push({ type: 'paragraph', text: p.timeline })
  }
  if (Array.isArray(p.materials) && p.materials.length) {
    blocks.push({ type: 'heading', text: 'Materials' })
    blocks.push({ type: 'paragraph', text: p.materials.join('; ') })
  }
  if (p.demonstration) {
    blocks.push({ type: 'heading', text: 'Demonstration' })
    blocks.push({ type: 'paragraph', text: p.demonstration })
  }
  if (Array.isArray(p.competencies) && p.competencies.length) {
    blocks.push({ type: 'heading', text: 'Competencies' })
    blocks.push({ type: 'paragraph', text: p.competencies.join('; ') })
  }
  if (includeAnswers && Array.isArray(p.criteria) && p.criteria.length) {
    blocks.push({ type: 'heading', text: 'Rubric (4-level)' })
    for (const c of p.criteria) {
      blocks.push({ type: 'subheading', text: c.name || 'Criterion' })
      blocks.push({ type: 'paragraph', text: `Excellent: ${c.excellent || ''}` })
      blocks.push({ type: 'paragraph', text: `Good: ${c.good || ''}` })
      blocks.push({ type: 'paragraph', text: `Fair: ${c.fair || ''}` })
      blocks.push({
        type: 'paragraph',
        text: `Needs Improvement: ${c.needsImprovement || c.needs_improvement || c.needsImpr || ''}`,
      })
    }
  }
}

function pushFlashcardBlocks(
  blocks: PdfBlock[],
  card: AssessmentFlashcard,
  idx: number,
  includeAnswers: boolean
) {
  blocks.push({
    type: 'subheading',
    text: `Card ${idx + 1}. ${String(card.front || card.question || '').trim()}`,
  })
  if (Array.isArray(card.options)) {
    card.options.forEach((o, i) => {
      blocks.push({ type: 'paragraph', text: `${String.fromCharCode(65 + i)}. ${o}` })
    })
  }
  if (includeAnswers) {
    if (card.answer) blocks.push({ type: 'paragraph', text: `Answer: ${card.answer}` })
    if (card.explanation) {
      blocks.push({ type: 'paragraph', text: `Explanation: ${card.explanation}` })
    }
  }
  blocks.push({ type: 'spacer' })
}

/** Build the shared PDF document model from any assessment paper payload. */
export function assessmentPaperToPdfParams(paper: AssessmentPaperPayload): PdfDocParams {
  const includeAnswers = Boolean(paper.includeAnswers)
  const infoRows: PdfInfoRow[] = []
  if (paper.subject) infoRows.push({ label: 'Subject:', value: paper.subject })
  if (paper.grade) infoRows.push({ label: 'Form / grade:', value: paper.grade })
  if (paper.topic) infoRows.push({ label: 'Topic:', value: paper.topic })
  if (paper.totalMarks != null)
    infoRows.push({ label: 'Total marks:', value: String(paper.totalMarks) })
  infoRows.push({ label: 'Type:', value: paper.kind.replace(/_/g, ' ') })

  const blocks: PdfBlock[] = []

  if (Array.isArray(paper.sections)) {
    for (const section of paper.sections) {
      if (section.heading) blocks.push({ type: 'heading', text: section.heading })
      if (section.body) blocks.push({ type: 'paragraph', text: section.body })
      blocks.push({ type: 'spacer' })
    }
  }

  if (Array.isArray(paper.questions)) {
    paper.questions.forEach((q, i) => pushQuestionBlocks(blocks, q, i, includeAnswers))
  }
  if (Array.isArray(paper.scenarios)) {
    paper.scenarios.forEach((s, i) => pushScenarioBlocks(blocks, s, i, includeAnswers))
  }
  if (paper.project) pushProjectBlocks(blocks, paper.project, includeAnswers)
  if (Array.isArray(paper.cards)) {
    paper.cards.forEach((c, i) => pushFlashcardBlocks(blocks, c, i, includeAnswers))
  }

  return {
    title: paper.title || 'Assessment',
    subtitle: [paper.grade, paper.subject, paper.topic].filter(Boolean).join(' • ') || null,
    infoRows,
    blocks,
    footer: `Generated on ${new Date().toLocaleDateString('en-GB')} · ZSMS`,
  }
}

export function assessmentPaperFilename(
  paper: AssessmentPaperPayload,
  ext: 'pdf' | 'docx'
): string {
  const base = [paper.kind, paper.subject, paper.topic || paper.title]
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 60)
  return `${base || 'assessment'}.${ext}`
}

/** Flatten paper into plain text sections for DOCX parity. */
export function assessmentPaperToSections(
  paper: AssessmentPaperPayload
): Array<{ heading: string; body: string }> {
  const params = assessmentPaperToPdfParams(paper)
  const sections: Array<{ heading: string; body: string }> = []
  let current: { heading: string; body: string } | null = null

  const flush = () => {
    if (current && (current.heading || current.body.trim())) sections.push(current)
    current = null
  }

  for (const block of params.blocks) {
    if (block.type === 'spacer') {
      flush()
      continue
    }
    if (block.type === 'heading' || block.type === 'subheading') {
      flush()
      current = { heading: block.text || '', body: '' }
    } else {
      if (!current) current = { heading: '', body: '' }
      current.body = current.body
        ? `${current.body}\n${block.text || ''}`
        : String(block.text || '')
    }
  }
  flush()
  return sections
}
