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

export interface StoryRequest {
  title: string
  grade: number
  theme: string
  length: 'short' | 'medium' | 'long'
  vocabulary?: 'simple' | 'intermediate' | 'advanced'
}

export async function generateStory(request: StoryRequest) {
  const wordCount = { short: 100, medium: 500, long: 1000 }[request.length]

  const prompt = `Create an engaging story for Grade ${request.grade} students.

Title: ${request.title}
Theme: ${request.theme}
Word Count: ~${wordCount} words
Vocabulary Level: ${request.vocabulary || 'intermediate'}

Requirements:
- Use age-appropriate vocabulary
- Include dialogue
- Have clear beginning, middle, end
- Include comprehension questions at the end (5 questions)

Format as JSON:
{
  "title": "Story title",
  "story": "The actual story text",
  "comprehensionQuestions": [
    "Question 1?",
    "Question 2?",
    "Question 3?",
    "Question 4?",
    "Question 5?"
  ],
  "answers": ["Answer 1", "Answer 2", "Answer 3", "Answer 4", "Answer 5"],
  "vocabulary": ["word1", "word2", "word3"]
}`

  try {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from API')

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse story')

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Story Weaver Error:', error)
    throw error
  }
}
