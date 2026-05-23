import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'

export interface QuizRequest {
  topic: string
  grade: number
  questionCount: number
  questionTypes: ('multipleChoice' | 'trueFalse' | 'shortAnswer')[]
}

export async function generateQuiz(request: QuizRequest) {
  const prompt = `Generate a quiz for Zambian Grade ${request.grade} students about: ${request.topic}

Number of questions: ${request.questionCount}
Question types: ${request.questionTypes.join(', ')}

Return JSON only:
{
  "title": "Quiz title",
  "topic": "${request.topic}",
  "questions": [
    {
      "id": 1,
      "type": "multipleChoice",
      "question": "The question?",
      "options": ["A) Option 1", "B) Option 2"],
      "correctAnswer": "B) Option 2",
      "explanation": "Why this is correct"
    }
  ],
  "totalPoints": 100
}`

  const { content } = await groqChatCompletion({
    prompt,
    temperature: 0.5,
    maxTokens: 3000,
  })

  const parsed = extractJSONObject(content)
  if (!parsed) throw new Error('Could not parse quiz')
  return parsed
}
