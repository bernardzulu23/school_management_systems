import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'
import { buildLessonPlanPrompt } from '@/lib/ai/subject-adaptive-prompts'

export interface LessonPlanRequest {
  subject: string
  grade: number | string
  topic: string
  duration: number
  learningOutcomes?: string[]
  schoolName?: string
}

export async function generateLessonPlan(request: LessonPlanRequest) {
  const prompt = `${buildLessonPlanPrompt({
    subject: request.subject,
    grade: String(request.grade),
    topic: request.topic,
    duration: request.duration,
    schoolName: request.schoolName,
    additionalInstructions: request.learningOutcomes?.length
      ? `Learning outcomes: ${request.learningOutcomes.join(', ')}`
      : undefined,
  })}

Return the lesson plan as JSON:
{
  "title": "Lesson title",
  "objectives": ["objective 1", "objective 2"],
  "introduction": "introduction activity",
  "mainActivity": "Main teaching activity",
  "practice": "Student practice activities",
  "assessment": "Assessment method",
  "homework": "Homework assignment",
  "resources": ["resource 1", "resource 2"],
  "timing": {
    "introduction": 5,
    "main": 20,
    "practice": 15,
    "assessment": 5,
    "closing": 2
  }
}`

  const { content } = await groqChatCompletion({
    prompt,
    temperature: 0.7,
    maxTokens: 2000,
  })

  const parsed = extractJSONObject(content)
  if (!parsed) throw new Error('Could not parse lesson plan')
  return parsed
}
