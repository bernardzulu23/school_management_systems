import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'
import { buildEczPracticePrompt } from '@/lib/ai/subject-adaptive-prompts'

export interface PracticeRequest {
  subject: string
  grade: number | string
  examLevel: 'JC' | 'SC' | 'GCE' | string
  topic?: string
  questionCount: number
  timeLimit: number
}

export async function generateECZPractice(request: PracticeRequest) {
  const examLevel =
    request.examLevel === 'JC'
      ? 'grade9'
      : request.examLevel === 'SC' || request.examLevel === 'GCE'
        ? 'grade12'
        : String(request.examLevel)

  const prompt = buildEczPracticePrompt({
    subject: request.subject,
    examLevel,
    topic: request.topic || request.subject,
    questionCount: request.questionCount,
  })

  const { content } = await groqChatCompletion({
    prompt,
    temperature: 0.4,
    maxTokens: 4000,
  })

  const parsed = extractJSONObject(content)
  if (!parsed) throw new Error('Could not parse practice paper')
  return parsed
}
