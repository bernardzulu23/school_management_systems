import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'

export interface LessonPlanRequest {
  subject: string
  grade: number
  topic: string
  duration: number
  learningOutcomes?: string[]
}

export async function generateLessonPlan(request: LessonPlanRequest) {
  const prompt = `Generate an ECZ-aligned lesson plan for Zambian Grade ${request.grade} students.

Subject: ${request.subject}
Topic: ${request.topic}
Duration: ${request.duration} minutes
Learning Outcomes: ${request.learningOutcomes?.join(', ') || 'Auto-generate'}

Use accessible English for students with varying proficiency. Include local Zambian examples where relevant.

Format as JSON:
{
  "title": "Lesson title",
  "objectives": ["objective 1", "objective 2"],
  "introduction": "5 min introduction",
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
