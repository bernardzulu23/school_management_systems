/**
 * Old-syllabus content generation.
 * Schemes / lesson plans / RoW mirror CBC pipelines; quizzes/tests stay topic-atomized.
 */
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { generateAIObject } from '@/lib/ai/client'
import {
  QuizGenerationSchema,
  parseQuizObject,
  coerceQuizObject,
  FlashcardDeckSchema,
  LessonPlanSchema,
} from '@/lib/ai/schemas'
import { similarity } from '@/lib/text/similarity'
import { distributeUnitsAcrossTerm } from '@/lib/curriculum/schemeOfWorkGenerator'
import { buildTopicKey } from '@/lib/curriculum/topicKey'
import { structuredLessonPlanToPlainText } from '@/lib/ai/lesson-plan-formatter'
import {
  buildMandatoryWorkedExamplesBlock,
  resolveCanonicalSubject,
} from '@/lib/ai/subject-adaptive-prompts'
import { exportSchemeToWord } from '@/lib/curriculum/schemeOfWorkExport'
import { exportLessonPlanToWord } from '@/lib/curriculum/lessonPlanExport'

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

/** Map old-syllabus topics → CBC-shaped curriculum units for scheme distribution. */
function topicsToCurriculumUnits(contentJson, grade, selectedTopicIds = []) {
  const gradeBlock = (contentJson?.gradeContent || []).find(
    (g) => Number(g.grade) === Number(grade)
  )
  let topics = gradeBlock?.topics || []
  if (selectedTopicIds.length) {
    topics = topics.filter(
      (t) =>
        selectedTopicIds.includes(t.topicId) ||
        (t.subtopics || []).some((st) => selectedTopicIds.includes(st.subtopicId))
    )
  }
  return topics.map((topic, sortOrder) => {
    const subtopics = topic.subtopics || []
    const outcomes = []
    const activities = []
    const topicTitles = []
    const topicKeys = []
    for (const [ti, st] of subtopics.entries()) {
      topicTitles.push(st.subtopicName || st.subtopicId || `Subtopic ${ti + 1}`)
      topicKeys.push(
        buildTopicKey({
          cdcId: st.subtopicId || topic.topicId,
          subject: contentJson?.subject,
          gradeOrForm: String(grade),
          unitNumber: sortOrder + 1,
          topicIndex: ti,
          topicTitle: st.subtopicName || topic.topicName,
        })
      )
      for (const o of st.specificOutcomes || []) {
        if (o.statement) outcomes.push(o.statement)
        for (const k of o.knowledge || []) activities.push(`Teach: ${k}`)
        for (const s of o.skills || []) activities.push(`Practice: ${s}`)
      }
    }
    if (!topicTitles.length) topicTitles.push(topic.topicName)
    if (!outcomes.length) outcomes.push(`Cover ${topic.topicName} per ECZ O-Level syllabus`)
    if (!activities.length) {
      activities.push(
        `Teacher exposition and worked examples on ${topic.topicName}`,
        `Guided practice and board work`,
        `Homework review of ${topic.topicName}`
      )
    }
    const weekHint = Math.max(1, Math.min(4, subtopics.length || 1))
    return {
      title: topic.topicName || topic.topicId || `Topic ${sortOrder + 1}`,
      outcomes: outcomes.slice(0, 12),
      activities: [...new Set(activities)].slice(0, 10),
      assessment: ['Oral questioning', 'Class exercise', 'End-of-week quiz'],
      resources: ['ECZ O-Level syllabus', 'Textbook', 'Chalkboard / charts'],
      weekHint,
      sortOrder,
      unitNumber: sortOrder + 1,
      topics: topicTitles,
      topicKeys,
    }
  })
}

async function resolveSyllabusSubject(subject) {
  const direct = await prisma.oldSyllabusDocument.findFirst({
    where: { subject, validationStatus: 'VALID' },
    orderBy: { ingestedAt: 'desc' },
  })
  if (direct) return direct

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

function bufferToDataUrl(buf, mime) {
  return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
}

async function generateOldSyllabusScheme(params, doc) {
  const {
    subject,
    displayLabel,
    grade,
    selectedTopicIds = [],
    weekCount = 12,
    term = 'Term 1',
    academicYear,
    midTermWeek: midTermWeekIn,
    midTermWeekEnd: midTermWeekEndIn,
    endOfTermWeek: endOfTermWeekIn,
    endOfTermWeekEnd: endOfTermWeekEndIn,
    carryOverTopics = [],
    schoolId = null,
    teacherId = null,
    save = true,
  } = params
  const year = Number(academicYear) || new Date().getFullYear()
  const weeksTotal = Math.max(4, Math.min(20, Number(weekCount) || 12))
  const { carryOverTopicsToUnits } = await import('@/lib/curriculum/schemeCarryOver')
  const carryUnits = carryOverTopicsToUnits(carryOverTopics)
  const units = [
    ...carryUnits,
    ...topicsToCurriculumUnits(doc.contentJson, grade, selectedTopicIds),
  ]
  if (!units.length) throw new Error('No topics available to build a scheme of work')

  // Same defaults as CBC Curriculum Studio: mid ~ half term, EOT last 1–2 weeks.
  const midDefault = Math.min(weeksTotal, Math.ceil(weeksTotal / 2))
  const eotStartDefault = Math.max(1, weeksTotal - 1)
  const clampWeek = (raw, fallback) => {
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 1 || n > weeksTotal) return fallback
    return n
  }
  const midTermWeek = clampWeek(midTermWeekIn, midDefault)
  const midTermWeekEnd = clampWeek(midTermWeekEndIn, midTermWeek)
  const endOfTermWeek = clampWeek(endOfTermWeekIn, eotStartDefault)
  const endOfTermWeekEnd = clampWeek(endOfTermWeekEndIn, weeksTotal)

  const testSchedule = {
    midTermWeek,
    midTermWeekEnd,
    endOfTermWeek,
    endOfTermWeekEnd,
  }

  const weeks = distributeUnitsAcrossTerm(units, weeksTotal, testSchedule, {
    subject,
    gradeOrForm: String(grade || displayLabel || ''),
  })

  let downloadUrl = null
  try {
    const docx = await exportSchemeToWord({
      subject,
      gradeOrForm: String(grade || displayLabel || ''),
      term: String(term),
      year,
      weeks,
    })
    downloadUrl = bufferToDataUrl(
      docx,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  } catch (e) {
    console.warn('[old-syllabus] scheme Word export failed', e?.message || e)
  }

  let schemeId = null
  if (save !== false && schoolId && teacherId) {
    try {
      const row = await prisma.schemeOfWork.create({
        data: {
          id: crypto.randomUUID(),
          schoolId: String(schoolId),
          teacherId: String(teacherId),
          subject,
          gradeOrForm: String(grade || displayLabel || ''),
          term: String(term),
          year,
          weeks,
          status: 'DRAFT',
        },
      })
      schemeId = row.id
      await prisma.schemeTestSchedule.upsert({
        where: { schemeId },
        create: {
          schoolId: String(schoolId),
          schemeId,
          teacherId: String(teacherId),
          midTermWeek,
          midTermWeekEnd,
          endOfTermWeek,
          endOfTermWeekEnd,
        },
        update: {
          midTermWeek,
          midTermWeekEnd,
          endOfTermWeek,
          endOfTermWeekEnd,
        },
      })
    } catch (e) {
      console.warn('[old-syllabus] scheme persist failed', e?.message || e)
    }
  }

  return {
    syllabusVersion: 'OLD_SYLLABUS',
    contentType: 'scheme',
    subject,
    displayLabel,
    grade,
    term,
    year,
    weekCount: weeksTotal,
    testSchedule,
    schemeId,
    carryOverCount: carryUnits.length,
    source:
      carryUnits.length > 0
        ? 'old-syllabus-corpus+cbc-distribution+carry-over'
        : 'old-syllabus-corpus+cbc-distribution',
    weeks,
    downloadUrl,
    downloadFilename: `${subject.replace(/\s+/g, '-')}-G${grade}-scheme.docx`,
    questions: [],
    canSave: true,
  }
}

async function generateOldSyllabusLessonPlan(params, selected) {
  const { subject, displayLabel, grade, term = 'Term 1' } = params
  const primary = selected[0]
  const topic = primary.topicName
  const subTopic = primary.subtopicName || primary.topicName
  const outcomesBlock = selected
    .slice(0, 8)
    .map(
      (o) =>
        `- ${o.topicName} / ${o.subtopicName}: ${o.statement}\n  Knowledge: ${(o.knowledge || []).join('; ')}\n  Skills: ${(o.skills || []).join('; ')}\n  Values: ${(o.values || []).join('; ')}`
    )
    .join('\n')

  const canonical = resolveCanonicalSubject(subject)
  const system = `You are an expert Zambian ECZ O-Level (pre-CBC / old syllabus) lesson planner.
Create practical, MoE-style lesson plans for Zambian secondary classrooms.
Ground every activity in the provided syllabus outcomes (Knowledge / Skills / Values).
Use real Zambian places, names, and contexts. Never use markdown — content is stored as structured data.
Do NOT invent CBC competency codes; use ECZ O-Level topic language.`

  const mandatoryBlock = buildMandatoryWorkedExamplesBlock({
    subject: canonical,
    grade: String(grade || displayLabel || ''),
    topic,
    duration: 40,
  })

  const user = `Create a complete ECZ O-Level (old syllabus) lesson plan as structured data.

Subject: ${canonical}
Form/Grade: ${grade || displayLabel}
Topic: ${topic}
Sub-topic: ${subTopic}
Duration: 40 minutes
Term: ${term}

Syllabus outcomes to cover:
${outcomesBlock}

${mandatoryBlock}

Include at least 2 lesson activities (Introduction, Development, Conclusion).
Reference Zambian cultural context in activities and realWorldZambianContext.`

  const { object, usage } = await generateAIObject(LessonPlanSchema, system, user, {
    maxTokens: 6000,
    temperature: 0.65,
  })
  const content = structuredLessonPlanToPlainText(object)

  let downloadUrl = null
  try {
    if (typeof exportLessonPlanToWord === 'function') {
      const docx = await exportLessonPlanToWord({
        subject,
        grade: String(grade || displayLabel || ''),
        topic,
        structuredContent: object,
        content,
      })
      downloadUrl = bufferToDataUrl(
        docx,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    }
  } catch (e) {
    console.warn('[old-syllabus] lesson plan Word export failed', e?.message || e)
  }

  return {
    syllabusVersion: 'OLD_SYLLABUS',
    contentType: 'lessonPlan',
    subject,
    displayLabel,
    grade,
    structuredContent: object,
    content,
    downloadUrl,
    downloadFilename: `${subject.replace(/\s+/g, '-')}-lesson-plan.docx`,
    tokensUsed: usage?.outputTokens,
    questions: [],
    canSave: true,
  }
}

async function generateOldSyllabusRecordOfWork(params, doc) {
  const scheme = await generateOldSyllabusScheme(params, doc)
  return {
    ...scheme,
    contentType: 'recordOfWork',
    recordWeeks: (scheme.weeks || []).map((w) => ({
      week: w.week,
      topic: w.topic,
      weekType: w.weekType || 'teaching',
      topicKey: w.topicKey,
      taught: false,
      remarks: '',
    })),
  }
}

async function generateOldSyllabusFlashcards(params, selected) {
  const { subject, displayLabel, grade } = params
  const topicBlock = selected
    .slice(0, 16)
    .map((o) => `- ${o.topicName} / ${o.subtopicName}: ${o.statement}`)
    .join('\n')

  const system = `You are an ECZ O-Level study coach for the pre-CBC Zambian syllabus.
Create flashcards that are topic-atomized (one idea per card). Use Zambian classroom contexts.`
  const user = `Subject: ${subject}
Level: ${displayLabel || grade}
Create 12 flashcards from these outcomes:
${topicBlock}`

  const { object } = await generateAIObject(FlashcardDeckSchema, system, user, {
    temperature: 0.5,
    maxOutputTokens: 3500,
    maxRetries: 2,
  })

  return {
    syllabusVersion: 'OLD_SYLLABUS',
    contentType: 'flashcards',
    subject,
    displayLabel,
    grade,
    flashcards: object?.cards || object?.flashcards || [],
    questions: [],
    canSave: true,
  }
}

async function generateOldSyllabusQuizOrTest(params, selected) {
  const { contentType, subject, displayLabel, grade, questionCount } = params

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

/**
 * Generate old-syllabus content — branches by contentType like CBC Teaching Studio.
 */
export async function generateFromOldSyllabus(params) {
  const { contentType, subject, displayLabel, grade, selectedTopicIds = [] } = params

  const doc = await resolveSyllabusSubject(subject)
  if (!doc) {
    throw new Error(`No validated OldSyllabusDocument for ${subject}`)
  }

  if (contentType === 'scheme') {
    return generateOldSyllabusScheme(params, doc)
  }
  if (contentType === 'recordOfWork') {
    return generateOldSyllabusRecordOfWork(params, doc)
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

  if (contentType === 'lessonPlan') {
    return generateOldSyllabusLessonPlan(params, selected)
  }
  if (contentType === 'flashcards') {
    return generateOldSyllabusFlashcards(params, selected)
  }

  return generateOldSyllabusQuizOrTest(params, selected)
}

/** Stub that keeps CBC path untouched — callers should use existing CBC generators. */
export async function generateFromCBC(params) {
  return {
    syllabusVersion: 'CBC',
    redirectHint: 'Use existing CBC Teaching Studio generators',
    params,
  }
}
