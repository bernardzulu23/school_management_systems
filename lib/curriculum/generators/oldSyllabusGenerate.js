/**
 * Old-syllabus content generation (topic-atomized; past-paper structure for tests).
 */
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { generateAIObject } from '@/lib/ai/client'
import { QuizGenerationSchema, parseQuizObject, coerceQuizObject } from '@/lib/ai/schemas'
import { similarity } from '@/lib/text/similarity'

export class MissingPastPaperError extends Error {
  constructor(subject) {
    super(
      `No validated past paper structure available for ${subject} — cannot generate a structurally accurate test yet`
    )
    this.name = 'MissingPastPaperError'
    this.code = 'MISSING_PAST_PAPER'
  }
}

function flattenTopics(contentJson, grade) {
  const out = []
  for (const g of contentJson?.gradeContent || []) {
    if (grade && Number(g.grade) !== Number(grade)) continue
    for (const topic of g.topics || []) {
      for (const st of topic.subtopics || []) {
        for (const o of st.specificOutcomes || []) {
          out.push({
            topicId: topic.topicId,
            topicName: topic.topicName,
            domain: topic.domain,
            subtopicId: st.subtopicId,
            subtopicName: st.subtopicName,
            outcomeId: o.outcomeId,
            statement: o.statement,
            knowledge: o.knowledge,
            skills: o.skills,
            values: o.values,
          })
        }
      }
    }
  }
  return out
}

async function resolveSyllabusSubject(subject) {
  const direct = await prisma.oldSyllabusDocument.findFirst({
    where: { subject, validationStatus: 'VALID' },
    orderBy: { ingestedAt: 'desc' },
  })
  if (direct) return direct

  // English Language papers often map to Literature In English syllabus corpus
  if (/^english$/i.test(subject)) {
    return prisma.oldSyllabusDocument.findFirst({
      where: { subject: 'Literature In English', validationStatus: 'VALID' },
      orderBy: { ingestedAt: 'desc' },
    })
  }
  if (/^maths$/i.test(subject)) {
    return prisma.oldSyllabusDocument.findFirst({
      where: { subject: 'Mathematics', validationStatus: 'VALID' },
      orderBy: { ingestedAt: 'desc' },
    })
  }
  return null
}

async function loadValidPastPaper(subject) {
  return prisma.pastPaper.findFirst({
    where: { subject, syllabusVersion: 'OLD_SYLLABUS', validationStatus: 'VALID' },
    orderBy: [{ year: 'desc' }, { paperNumber: 'asc' }],
  })
}

function sectionPlan(structureJson, contentType) {
  const sections = structureJson?.sections || []
  if (!sections.length) {
    return { questionCount: 10, requiredCount: 10, choiceRule: 'answer_all', sections: [] }
  }
  if (contentType === 'quiz') {
    return { questionCount: 8, requiredCount: 8, choiceRule: 'answer_all', sections }
  }
  const totalQ = sections.reduce((n, s) => n + Number(s.questionCount || 0), 0) || 10
  let required = 0
  for (const s of sections) {
    if (s.choiceRule === 'answer_n_of_m') required += Number(s.chooseCount || 0)
    else required += Number(s.questionCount || 0)
  }
  return {
    questionCount: totalQ,
    requiredCount: required || totalQ,
    choiceRule: sections.some((s) => s.choiceRule === 'answer_n_of_m')
      ? 'answer_n_of_m'
      : 'answer_all',
    sections,
  }
}

function checkSimilarityAgainstPaper(questions, structureJson) {
  const refs = []
  for (const t of structureJson?.topicCoverage || []) {
    for (const r of t.questionRefs || []) refs.push(String(r))
  }
  const paperBlob = JSON.stringify(structureJson || {}).slice(0, 4000)
  const flagged = []
  for (const q of questions || []) {
    const text = String(q.question || q.zambianScenario || '')
    const score = similarity(text, paperBlob)
    if (score >= 0.55) {
      flagged.push({ id: q.id, score, question: text.slice(0, 120) })
    }
  }
  return {
    holdForReview: flagged.length > 0,
    flagged,
  }
}

/**
 * Generate old-syllabus content (topic-atomized items).
 */
export async function generateFromOldSyllabus(params) {
  const { contentType, subject, displayLabel, grade, selectedTopicIds = [], questionCount } = params

  const doc = await resolveSyllabusSubject(subject)
  if (!doc) {
    throw new Error(`No validated OldSyllabusDocument for ${subject}`)
  }

  const outcomes = flattenTopics(doc.contentJson, grade)
  const selected =
    selectedTopicIds.length > 0
      ? outcomes.filter(
          (o) =>
            selectedTopicIds.includes(o.topicId) ||
            selectedTopicIds.includes(o.subtopicId) ||
            selectedTopicIds.includes(o.outcomeId)
        )
      : outcomes.slice(0, 12)

  if (!selected.length) {
    throw new Error('No outcomes selected for generation')
  }

  const needsPastPaper = contentType === 'test' || contentType === 'termAssessment'
  let pastPaper = null
  let plan = { questionCount: questionCount || 10, requiredCount: questionCount || 10 }

  if (needsPastPaper) {
    pastPaper = await loadValidPastPaper(subject)
    if (!pastPaper) throw new MissingPastPaperError(subject)
    const structure = pastPaper.structureJson || {}
    if (structure.needsReview && !structure.topicCoverageReviewed) {
      throw new Error(
        `Past paper topic coverage for ${subject} still needsReview — confirm tags before generating tests`
      )
    }
    plan = sectionPlan(structure, contentType)
    if (questionCount) {
      plan.questionCount = Math.min(plan.questionCount, Number(questionCount))
      plan.requiredCount = Math.min(plan.requiredCount, plan.questionCount)
    }
  }

  const topicBlock = selected
    .slice(0, 20)
    .map(
      (o) =>
        `- ${o.topicName} / ${o.subtopicName}: ${o.statement} (K:${(o.knowledge || []).join('; ')} S:${(o.skills || []).join('; ')})`
    )
    .join('\n')

  const system = `You are an ECZ O-Level assessment writer for the pre-CBC (old) Zambian syllabus.
Generate TOPIC-ATOMIZED items: each question assesses ONE topic/outcome only.
Do NOT braid multiple topics into a single scenario (that is CBC style).
Use Zambian classroom contexts. Return JSON with a questions array.`

  const user = [
    `Content type: ${contentType}`,
    `Subject: ${subject}`,
    `Level label: ${displayLabel}`,
    `Question count: ${plan.questionCount}`,
    needsPastPaper
      ? `Paper template: ${pastPaper.paperCode}/${pastPaper.paperNumber} (${pastPaper.year}); required answers: ${plan.requiredCount} of ${plan.questionCount}`
      : '',
    '',
    'Outcomes to cover (one topic per question):',
    topicBlock,
  ]
    .filter(Boolean)
    .join('\n')

  const { object } = await generateAIObject(QuizGenerationSchema, system, user, {
    temperature: 0.55,
    maxOutputTokens: 4500,
    repair: coerceQuizObject,
    maxRetries: 3,
  })

  const parsed = parseQuizObject(object)
  const questions = (parsed.success ? parsed.data.questions : []).map((q, i) => {
    const outcome = selected[i % selected.length]
    return {
      ...q,
      id: q.id || crypto.randomUUID(),
      topicId: outcome.topicId,
      topicName: outcome.topicName,
      outcomeId: outcome.outcomeId,
      required: i < plan.requiredCount,
    }
  })

  const similarityCheck = needsPastPaper
    ? checkSimilarityAgainstPaper(questions, pastPaper.structureJson)
    : { holdForReview: false, flagged: [] }

  return {
    syllabusVersion: 'OLD_SYLLABUS',
    contentType,
    subject,
    displayLabel,
    grade,
    questions,
    pastPaper: pastPaper
      ? {
          id: pastPaper.id,
          paperCode: pastPaper.paperCode,
          paperNumber: pastPaper.paperNumber,
          year: pastPaper.year,
          sections: pastPaper.structureJson?.sections || [],
          needsReview: Boolean(pastPaper.structureJson?.needsReview),
        }
      : null,
    plan,
    similarityCheck,
    canSave: !similarityCheck.holdForReview,
  }
}

/** Stub that keeps CBC path untouched — callers should use existing CBC generators. */
export async function generateFromCBC(params) {
  return {
    syllabusVersion: 'CBC',
    redirectHint: 'Use existing CBC Teaching Studio generators',
    params,
  }
}
