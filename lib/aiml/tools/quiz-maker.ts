import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'
import { buildQuizPrompt } from '@/lib/ai/subject-adaptive-prompts'

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

  const { content } = await groqChatCompletion({
    prompt,
    temperature: 0.5,
    maxTokens: 3000,
  })

  const parsed = extractJSONObject(content)
  if (!parsed) throw new Error('Could not parse quiz')
  return parsed
}
