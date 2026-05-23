import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'
import { buildStoryPrompt, estimateWordCountFromLength } from '@/lib/ai/subject-adaptive-prompts'

export interface StoryRequest {
  title: string
  grade: number | string
  theme: string
  subject?: string
  length: 'short' | 'medium' | 'long'
  vocabulary?: 'simple' | 'intermediate' | 'advanced'
}

export async function generateStory(request: StoryRequest) {
  const wordCount = { short: 300, medium: 500, long: 1000 }[request.length]

  const prompt = `${buildStoryPrompt({
    subject: request.subject || 'English (Core)',
    grade: String(request.grade),
    theme: request.theme || request.title,
    wordCount: wordCount || estimateWordCountFromLength(request.length),
    storyType: 'story',
    includeQuestions: true,
  })}

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
