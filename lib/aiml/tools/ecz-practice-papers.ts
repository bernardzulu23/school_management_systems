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

export interface PracticeRequest {
  subject: string
  grade: number
  examLevel: 'JC' | 'SC' | 'GCE'
  questionCount: number
  timeLimit: number
}

export async function generateECZPractice(request: PracticeRequest) {
  const prompt = `Generate ECZ-aligned practice exam questions:

Subject: ${request.subject}
Grade: ${request.grade}
Exam Level: ${request.examLevel}
Number of questions: ${request.questionCount}
Time Limit: ${request.timeLimit} minutes

Generate questions in the exact format of actual ECZ exams.

Return JSON:
{
  "examTitle": "Practice Paper Title",
  "subject": "${request.subject}",
  "grade": ${request.grade},
  "timeLimit": ${request.timeLimit},
  "instructions": ["Instruction 1", "Instruction 2"],
  "sections": [
    {
      "sectionName": "Section A",
      "questions": [
        {
          "number": 1,
          "question": "The question text?",
          "marks": 5,
          "answerGuide": "Model answer",
          "keywords": ["keyword1", "keyword2"]
        }
      ]
    }
  ],
  "totalMarks": 100,
  "memo": {
    "q1Answer": "Full answer",
    "q1Marks": 5
  }
}`

  try {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 4000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from API')

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse practice paper')

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('ECZ Practice Papers Error:', error)
    throw error
  }
}
