import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'

export interface StoryRequest {
  title: string
  grade: number
  theme: string
  length: 'short' | 'medium' | 'long'
  vocabulary?: 'simple' | 'intermediate' | 'advanced'
}

export async function generateStory(request: StoryRequest) {
  const wordCount = { short: 100, medium: 500, long: 1000 }[request.length]

  const prompt = `Create an engaging story for Grade ${request.grade} students in a Zambian school context.

Title: ${request.title}
Theme: ${request.theme}
Word Count: ~${wordCount} words
Vocabulary Level: ${request.vocabulary || 'intermediate'}

Requirements:
- Use age-appropriate vocabulary
- Include dialogue
- Have clear beginning, middle, end
- Include comprehension questions at the end (5 questions)
- Use authentic Zambian names and settings where natural

Format as JSON:
{
  "title": "Story title",
  "story": "The actual story text",
  "comprehensionQuestions": ["Question 1?", "Question 2?"],
  "answers": ["Answer 1", "Answer 2"],
  "vocabulary": ["word1", "word2", "word3"]
}`

  const { content } = await groqChatCompletion({
    prompt,
    temperature: 0.8,
    maxTokens: 2500,
  })

  const parsed = extractJSONObject(content)
  if (!parsed) throw new Error('Could not parse story')
  return parsed
}
