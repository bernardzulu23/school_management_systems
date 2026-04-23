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

export interface StudentPerformance {
  name: string
  subject: string
  grade: number
  marks: number
  attendance: number
  participation: 'excellent' | 'good' | 'average' | 'poor'
  strengths: string[]
  areasOfImprovement: string[]
}

export async function generateReportComment(student: StudentPerformance) {
  const prompt = `Generate a personalized report comment for a student:

Name: ${student.name}
Subject: ${student.subject}
Grade: ${student.grade}
Marks: ${student.marks}/100
Attendance: ${student.attendance}%
Participation: ${student.participation}
Strengths: ${student.strengths.join(', ')}
Areas to improve: ${student.areasOfImprovement.join(', ')}

Write a professional, encouraging report comment (150-200 words) that:
- Acknowledges their strengths
- Addresses areas for improvement constructively
- Provides specific recommendations
- Remains encouraging and positive
- Is appropriate for parents/guardians

Format:
{
  "comment": "The actual comment",
  "recommendation": "Recommendation for next term"
}`

  try {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from API')

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse comment')

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Report Comments Error:', error)
    throw error
  }
}
