import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'

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
  const prompt = `Generate a personalized report comment for a Zambian student:

Name: ${student.name}
Subject: ${student.subject}
Grade: ${student.grade}
Marks: ${student.marks}/100
Attendance: ${student.attendance}%
Participation: ${student.participation}
Strengths: ${student.strengths.join(', ')}
Areas to improve: ${student.areasOfImprovement.join(', ')}

Write a professional, encouraging comment (150-200 words) for parents/guardians.
Use simple English. Reference CBC competencies where relevant.

Format as JSON:
{
  "comment": "The actual comment",
  "recommendation": "Recommendation for next term"
}`

  const { content } = await groqChatCompletion({
    prompt,
    temperature: 0.6,
    maxTokens: 500,
  })

  const parsed = extractJSONObject(content)
  if (!parsed) throw new Error('Could not parse comment')
  return parsed
}
