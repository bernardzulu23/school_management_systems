import { extractJSONObject, groqChatCompletion } from '@/lib/aiml/tools/_groq'
import { buildSubjectContentPrompt } from '@/lib/ai/subjectPromptTemplates'

export interface StoryRequest {
  title: string
  grade: number | string
  theme: string
  subject?: string
  length: 'short' | 'medium' | 'long'
  vocabulary?: 'simple' | 'intermediate' | 'advanced'
}

export async function generateStory(request: StoryRequest) {
  const lengthKey = request.length || 'medium'
  const subject = request.subject || 'English (Core)'
  const promptBase = buildSubjectContentPrompt({
    subject,
    grade: String(request.grade),
    topic: request.theme || request.title,
    length:
      lengthKey === 'short'
        ? '2-3 paragraphs'
        : lengthKey === 'long'
          ? '6-8 paragraphs'
          : '4-5 paragraphs',
    storyType: 'story',
    includeQuestions: true,
  })

  const prompt = `${promptBase}

Format as JSON:
{
  "title": "Content title",
  "story": "The main educational content text",
  "comprehensionQuestions": ["Question 1?", "Question 2?"],
  "answers": ["Answer 1", "Answer 2"],
  "vocabulary": ["word1", "word2", "word3"],
  "contentType": "LAB_PROCEDURE|WORD_PROBLEMS|COMPREHENSION|etc"
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
