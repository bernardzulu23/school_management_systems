import { generateAIObject } from '@/lib/ai/client'
import { QuizGenerationSchema, parseQuizObject } from '@/lib/ai/schemas'
import { buildQuizPrompt } from '@/lib/ai/subject-adaptive-prompts'

const QUIZ_SYSTEM =
  'You are a Zambian CBC assessment expert. Return only valid quiz data matching the schema.'

export interface QuizRequest {
  topic: string
  subject?: string
  grade: number | string
  questionCount: number
  questionTypes: ('multipleChoice' | 'trueFalse' | 'shortAnswer')[]
}

export async function generateQuiz(request: QuizRequest) {
  const prompt = `${buildQuizPrompt({
    subject: request.subject || 'English (Core)',
    grade: String(request.grade),
    topic: request.topic,
    numQuestions: request.questionCount,
  })}

Question types to include: ${request.questionTypes.join(', ')}.`

  const { object: raw } = await generateAIObject(QuizGenerationSchema, QUIZ_SYSTEM, prompt, {
    temperature: 0.4,
    maxTokens: 3500,
  })
  const parsed = parseQuizObject({
    ...raw,
    grade: raw?.grade || String(request.grade),
    subject: raw?.subject || request.subject || 'English (Core)',
    topic: raw?.topic || request.topic,
    title: raw?.title || `${request.subject || 'Quiz'} — ${request.topic}`,
  })
  if (!parsed.success) {
    throw new Error('AI returned quiz JSON that could not be normalized')
  }
  return parsed.data
}
