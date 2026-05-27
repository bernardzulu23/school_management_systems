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

const SYSTEM_PROMPT = `You are an expert Zambian CBC curriculum lesson planner aligned with the 2023 ZECF.
Create practical, culturally relevant lesson plans for Zambian classrooms.
Use real Zambian places, names, and contexts. Never use markdown — content is stored as structured data.`

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

  return `Create a complete CBC lesson plan as structured data.
${ragSection}
Subject: ${canonical}
Form/Grade: ${input.form}
Topic: ${input.topic}
Sub-topic: ${subTopic}
Duration: ${duration} minutes
Term: ${input.term || 'Term 1'}

${mandatoryBlock}

Include at least 2 lesson activities (Introduction, Development, Conclusion).
Reference Zambian cultural context in activities and realWorldZambianContext.`
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
