/**
 * CBC-aligned structured lesson plans via generateAIObject + LessonPlanSchema.
 */
import { generateAIObject, GROQ_MODEL } from '@/lib/ai/client'
import { LessonPlanSchema } from '@/lib/ai/schemas'
import { structuredLessonPlanToPlainText } from '@/lib/ai/lesson-plan-formatter'
import {
  buildMandatoryWorkedExamplesBlock,
  resolveCanonicalSubject,
} from '@/lib/ai/subject-adaptive-prompts'
import { buildLessonPlanVisualGuidanceBlock } from '@/lib/ai/lesson-plan-visual-guidance'

const SYSTEM_PROMPT = `You are an expert Zambian CBC curriculum lesson planner aligned with the 2023 ZECF.
Create practical, culturally relevant lesson plans for Zambian classrooms.
Use real Zambian places, names, and contexts. Never use markdown — content is stored as structured data.
Write rich teacher/learner activities suitable for professional table-based Word export.`

/**
 * @param {{
 *   subject: string
 *   form: string
 *   topic: string
 *   subTopic?: string
 *   duration?: number
 *   term?: string
 * }} input
 */
export function buildStructuredLessonPlanPrompt(input, ragBlock = '') {
  const canonical = resolveCanonicalSubject(input.subject)
  const ragSection = String(ragBlock || '').trim()
    ? `\n\nSchool reference materials (cite as [Ref N] when used):\n${String(ragBlock).trim()}\n`
    : ''
  const duration = Number(input.duration) || 40
  const subTopic = String(input.subTopic || input.topic).trim()
  const mandatoryBlock = buildMandatoryWorkedExamplesBlock({
    subject: canonical,
    grade: input.form,
    topic: input.topic,
    duration,
  })
  const visualBlock = buildLessonPlanVisualGuidanceBlock(canonical, input.topic)

  return `Create a complete CBC lesson plan as structured data for a professional Word document with tables.
${ragSection}
Subject: ${canonical}
Form/Grade: ${input.form}
Topic: ${input.topic}
Sub-topic: ${subTopic}
Duration: ${duration} minutes
Term: ${input.term || 'Term 1'}

${mandatoryBlock}

${visualBlock}

QUALITY REQUIREMENTS:
- Include ALL three phases: Introduction, Development, Conclusion (at least 3 activities).
- Each activity must have detailed teacherAction and learnerAction (not one-liners).
- Add assessmentCheck on Development activities (quick oral/written check).
- Include workedExamples (1–3 short board examples tied to the topic).
- Include differentiation.support and differentiation.challenge.
- Include homework that practises THIS topic.
- Stay strictly on TOPIC — do not drift into unrelated shopping/business stories unless the topic is financial maths.
- Reference Zambian cultural context in activities and realWorldZambianContext.`
}

/**
 * @param {Parameters<typeof buildStructuredLessonPlanPrompt>[0]} input
 */
export async function generateStructuredLessonPlan(input, options = {}) {
  const userPrompt = buildStructuredLessonPlanPrompt(input, options.ragBlock || '')
  const { object, usage } = await generateAIObject(LessonPlanSchema, SYSTEM_PROMPT, userPrompt, {
    maxTokens: 6000,
    temperature: 0.65,
  })

  const content = structuredLessonPlanToPlainText(object)
  return {
    structuredContent: object,
    content,
    tokensUsed: usage.outputTokens,
    aiModel: GROQ_MODEL,
  }
}
