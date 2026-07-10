/**
 * Curriculum-aware lesson plan generation via existing generateAIObject path.
 */

import { generateStructuredLessonPlan } from '@/lib/ai/structured-lesson-plan'
import { getCachedAIResponse, setCachedAIResponse } from '@/lib/ai/cache'
import { validateAIGuardrails } from '@/lib/ai/guardrails'
import { resolveCurriculum } from '@/lib/curriculum/resolveCurriculum'

export type CurriculumLessonPlanInput = {
  schoolId?: string | null
  subject: string
  grade: string | number
  unit?: string
  topic: string
  learningOutcomes?: string[]
  duration?: number
  teacherNotes?: string
  term?: string
  ragBlock?: string
}

export async function generateLessonPlan(input: CurriculumLessonPlanInput) {
  const subject = String(input.subject || '').trim()
  const grade = String(input.grade || '').trim()
  const topic = String(input.topic || '').trim()
  const duration = Math.max(20, Math.min(120, Number(input.duration) || 40))
  const unit = String(input.unit || '').trim()
  const teacherNotes = String(input.teacherNotes || '').trim()

  const guard = validateAIGuardrails({
    text: `${subject} ${grade} ${topic} ${unit} lesson plan curriculum CBC ${teacherNotes}`,
  })
  if (!guard.ok) {
    throw Object.assign(new Error('Content flagged by safety guardrails.'), {
      status: 400,
      response: guard.response,
    })
  }

  let outcomes = Array.isArray(input.learningOutcomes)
    ? input.learningOutcomes.map(String).filter(Boolean)
    : []

  if (!outcomes.length && input.schoolId) {
    const curriculum = await resolveCurriculum({
      schoolId: input.schoolId,
      subject,
      gradeOrForm: grade,
    })
    const match =
      curriculum.units.find(
        (u) =>
          u.title.toLowerCase() === topic.toLowerCase() ||
          u.title.toLowerCase() === unit.toLowerCase() ||
          u.topics.some((t) => t.toLowerCase() === topic.toLowerCase())
      ) || curriculum.units[0]
    if (match?.outcomes?.length) outcomes = match.outcomes.slice(0, 8)
  }

  const cachePayload = {
    subject,
    grade,
    topic,
    unit,
    duration,
    outcomes,
    teacherNotes,
    term: input.term || 'Term 1',
  }

  const cached = await getCachedAIResponse<{
    structuredContent: unknown
    content: string
    tokensUsed: number
    aiModel: string | null
  }>('curriculum-lesson-plan', cachePayload)
  if (cached?.content) return { ...cached, fromCache: true as const }

  const notesBlock = [
    outcomes.length ? `Learning outcomes to address:\n- ${outcomes.join('\n- ')}` : '',
    unit ? `Unit: ${unit}` : '',
    teacherNotes ? `Teacher notes: ${teacherNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const ragBlock = [input.ragBlock || '', notesBlock].filter(Boolean).join('\n\n')

  const result = await generateStructuredLessonPlan(
    {
      subject,
      form: grade,
      topic,
      subTopic: unit || topic,
      duration,
      term: input.term || 'Term 1',
    },
    { ragBlock }
  )

  const payload = {
    structuredContent: result.structuredContent,
    content: result.content,
    tokensUsed: result.tokensUsed,
    aiModel: result.aiModel,
  }
  await setCachedAIResponse('curriculum-lesson-plan', cachePayload, payload)
  return { ...payload, fromCache: false as const }
}
