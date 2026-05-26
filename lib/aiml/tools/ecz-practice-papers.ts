import { generateAIObject } from '@/lib/ai/client'
import { ECZPracticePaperSchema } from '@/lib/ai/schemas'
import { buildEczPracticePrompt } from '@/lib/ai/subject-adaptive-prompts'

const ECZ_SYSTEM =
  'You are an ECZ examination specialist for Zambian schools. Create valid practice papers with Zambian context.'
import { normalizeEczExamLevel } from '@/lib/ecz/ecz-practice-levels'

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
        : normalizeEczExamLevel(String(request.examLevel || request.grade || 'grade9'))

  const prompt = buildEczPracticePrompt({
    subject: request.subject,
    examLevel,
    topic: request.topic || request.subject,
    questionCount: request.questionCount,
  })

  const { object } = await generateAIObject(ECZPracticePaperSchema, ECZ_SYSTEM, prompt, {
    temperature: 0.4,
    maxTokens: 4000,
  })
  return object
}
