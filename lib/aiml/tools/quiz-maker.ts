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

export interface QuizRequest {
  topic: string
  grade: number
  questionCount: number
  questionTypes: ('multipleChoice' | 'trueFalse' | 'shortAnswer')[]
}

export async function generateQuiz(request: QuizRequest) {
  const prompt = `Generate a quiz about: ${request.topic}

Grade: ${request.grade}
Number of questions: ${request.questionCount}
Question types: ${request.questionTypes.join(', ')}

Create a quiz in JSON format:
{
  "title": "Quiz title",
  "topic": "${request.topic}",
  "questions": [
    {
      "id": 1,
      "type": "multipleChoice",
      "question": "The question?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "B) Option 2",
      "explanation": "Why this is correct"
    },
    {
      "id": 2,
      "type": "trueFalse",
      "question": "Statement?",
      "correctAnswer": "True",
      "explanation": "Explanation"
    }
  ],
  "totalPoints": 100
}`

  try {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 3000,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from API')

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse quiz')

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Quiz Maker Error:', error)
    throw error
  }
}
