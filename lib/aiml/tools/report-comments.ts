import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'
import {
  buildReportCommentPrompt,
  performanceLevelFromPercentage,
} from '@/lib/ai/subject-adaptive-prompts'

export interface StudentPerformance {
  name: string
  subject: string
  grade: number | string
  marks: number
  maxMarks?: number
  attendance: number
  participation: 'excellent' | 'good' | 'average' | 'poor'
  strengths: string[]
  areasOfImprovement: string[]
}

export async function generateReportComment(student: StudentPerformance) {
  const maxMarks = Number(student.maxMarks || 100)
  const pct = maxMarks > 0 ? (Number(student.marks) / maxMarks) * 100 : 0

  const prompt = `${buildReportCommentPrompt({
    subject: student.subject,
    studentName: student.name,
    grade: String(student.grade),
    performanceLevel: performanceLevelFromPercentage(pct),
    attendance: `${student.attendance}%`,
    behavior: student.participation,
    strengths: student.strengths,
    areasForImprovement: student.areasOfImprovement,
  })}

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
