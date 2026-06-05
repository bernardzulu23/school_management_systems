import { generateWithFallback } from '@/lib/ai/orchestrator'
import type { AIResponse } from '@/lib/ai/types'

const JSON_SYSTEM =
  'You are an expert educational content creator for Zambian schools. ' +
  'Return only valid JSON — no markdown, no backticks.'

const STORY_SYSTEM =
  'You are a creative storyteller for Zambian primary school children. ' +
  'Write culturally relevant, age-appropriate stories with clear moral lessons. ' +
  'Return only valid JSON — no markdown, no backticks.'

const QUESTIONS_SYSTEM =
  'You are an expert educational content creator for Zambian CBC curriculum. ' +
  'Return only valid JSON — no markdown, no backticks.'

export async function generateQuiz(
  topic: string,
  grade: string,
  numQuestions = 5
): Promise<AIResponse> {
  return generateWithFallback([
    { role: 'system', content: JSON_SYSTEM },
    {
      role: 'user',
      content: `Create a ${numQuestions}-question multiple-choice quiz for Grade ${grade} on "${topic}".
Return ONLY this JSON structure:
{
  "title": "string",
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "string"
    }
  ]
}`,
    },
  ])
}

export async function generateFlashcards(
  topic: string,
  grade: string,
  count = 8
): Promise<AIResponse> {
  return generateWithFallback([
    { role: 'system', content: JSON_SYSTEM },
    {
      role: 'user',
      content: `Create ${count} flashcards for Grade ${grade} on "${topic}".
Return ONLY this JSON structure:
{
  "topic": "string",
  "cards": [
    { "id": 1, "front": "string", "back": "string", "hint": "string" }
  ]
}`,
    },
  ])
}

export async function generateQuestions(
  topic: string,
  grade: string,
  type: 'short_answer' | 'essay' | 'true_false' = 'short_answer',
  count = 5
): Promise<AIResponse> {
  return generateWithFallback([
    { role: 'system', content: QUESTIONS_SYSTEM },
    {
      role: 'user',
      content: `Create ${count} ${type} questions for Grade ${grade} on "${topic}".
Return ONLY this JSON structure:
{
  "topic": "string",
  "type": "${type}",
  "questions": [
    {
      "id": 1,
      "question": "string",
      "marks": 2,
      "model_answer": "string"
    }
  ]
}`,
    },
  ])
}

export async function generateStory(
  theme: string,
  grade: string,
  lesson: string,
  characters: string[] = []
): Promise<AIResponse> {
  const characterList = characters.length > 0 ? characters.join(', ') : 'Zambian village children'

  return generateWithFallback([
    { role: 'system', content: STORY_SYSTEM },
    {
      role: 'user',
      content: `Write an educational story for Grade ${grade} students.
Theme: ${theme}
Characters: ${characterList}
Lesson: ${lesson}

Return ONLY this JSON structure:
{
  "title": "string",
  "grade": "${grade}",
  "theme": "string",
  "characters": ["string"],
  "story": "string (full story in paragraphs separated by \\n\\n)",
  "moral": "string",
  "discussion_questions": ["string"]
}`,
    },
  ])
}
