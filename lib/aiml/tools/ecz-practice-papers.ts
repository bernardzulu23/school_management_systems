import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'

export interface PracticeRequest {
  subject: string
  grade: number
  examLevel: 'JC' | 'SC' | 'GCE'
  questionCount: number
  timeLimit: number
}

export async function generateECZPractice(request: PracticeRequest) {
  const prompt = `Generate ECZ-aligned practice exam questions for Zambian students:

Subject: ${request.subject}
Grade: ${request.grade}
Exam Level: ${request.examLevel}
Number of questions: ${request.questionCount}
Time Limit: ${request.timeLimit} minutes

Return JSON only:
{
  "examTitle": "Practice Paper Title",
  "subject": "${request.subject}",
  "grade": ${request.grade},
  "timeLimit": ${request.timeLimit},
  "instructions": ["Instruction 1"],
  "sections": [
    {
      "sectionName": "Section A",
      "questions": [
        {
          "number": 1,
          "question": "The question text?",
          "marks": 5,
          "answerGuide": "Model answer"
        }
      ]
    }
  ],
  "totalMarks": 100
}`

  const { content } = await groqChatCompletion({
    prompt,
    temperature: 0.4,
    maxTokens: 4000,
  })

  const parsed = extractJSONObject(content)
  if (!parsed) throw new Error('Could not parse practice paper')
  return parsed
}
