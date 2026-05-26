import { generateAIObject } from '@/lib/ai/client'
import { QuizSchema } from '@/lib/ai/schemas'
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

  const { object } = await generateAIObject(QuizSchema, QUIZ_SYSTEM, prompt, {
    temperature: 0.5,
    maxTokens: 3000,
  })
  return object
}
