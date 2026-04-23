import OpenAI from 'openai'

function getClient() {
  const apiKey = String(process.env.AIML_API_KEY || '').trim()
  const baseRaw = String(process.env.AIML_API_BASE || '')
    .trim()
    .replace(/\/+$/, '')
  const baseURL = baseRaw ? (baseRaw.endsWith('/v1') ? baseRaw : `${baseRaw}/v1`) : undefined
  if (!apiKey) throw new Error('Missing AIML_API_KEY')
  if (!baseURL) throw new Error('Missing AIML_API_BASE')
  return new OpenAI({ apiKey, baseURL })
}

export interface LessonPlanRequest {
  subject: string
  grade: number
  topic: string
  duration: number
  learningOutcomes?: string[]
}

export async function generateLessonPlan(request: LessonPlanRequest) {
  const prompt = `Generate an ECZ-aligned lesson plan for:

Subject: ${request.subject}
Grade: ${request.grade}
Topic: ${request.topic}
Duration: ${request.duration} minutes
Learning Outcomes: ${request.learningOutcomes?.join(', ') || 'Auto-generate'}

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

  try {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from API')

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse lesson plan')

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Lesson Planner Error:', error)
    throw error
  }
}
