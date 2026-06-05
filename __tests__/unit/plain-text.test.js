import { describe, expect, it } from 'vitest'
import { sanitizePlainText } from '@/lib/ai/plain-text'
import { buildStoryPrompt } from '@/lib/ai/subject-adaptive-prompts'

describe('sanitizePlainText', () => {
  it('strips horizontal rules', () => {
    const input = 'Story text\n---\n**Comprehension Questions**'
    expect(sanitizePlainText(input)).toBe('Story text\n\nComprehension Questions')
  })

  it('strips horizontal rules with surrounding whitespace', () => {
    const input = 'Story text\n  ---  \n**Comprehension Questions**'
    expect(sanitizePlainText(input)).toBe('Story text\n\nComprehension Questions')
  })

  it('strips leading --- on the same line as a heading', () => {
    const input = 'Story text\n--- **Comprehension Questions**\n1. First?'
    expect(sanitizePlainText(input)).toBe('Story text\nComprehension Questions\n1. First?')
  })

  it('strips asterisk-only divider lines', () => {
    const input = 'Section\n***\nNext'
    expect(sanitizePlainText(input)).toBe('Section\n\nNext')
  })

  it('strips bold and heading markdown', () => {
    const input = '## Section\n**Bold text** and *italic*'
    expect(sanitizePlainText(input)).toBe('Section\nBold text and italic')
  })

  it('strips code fences', () => {
    const input = 'Before\n```json\n{"a":1}\n```\nAfter'
    expect(sanitizePlainText(input)).toBe('Before\n\nAfter')
  })

  it('preserves numbered lists and normal punctuation', () => {
    const input = '1. What did Chanda see?\n2. Why did Mwila smile?'
    expect(sanitizePlainText(input)).toBe(input)
  })

  it('returns empty string for falsy input', () => {
    expect(sanitizePlainText('')).toBe('')
    expect(sanitizePlainText(null)).toBe('')
  })
})

describe('buildStoryPrompt', () => {
  it('does not include markdown horizontal rules in the prompt', () => {
    const prompt = buildStoryPrompt({
      subject: 'Science (Core)',
      grade: 'Form 3',
      theme: 'Photosynthesis',
      wordCount: 400,
      includeQuestions: true,
      questionCount: 5,
    })
    expect(prompt).not.toMatch(/^---$/m)
    expect(prompt).toContain('COMPREHENSION QUESTIONS')
    expect(prompt).toContain('plain text only')
    expect(prompt).toContain('NO markdown')
  })

  it('includes plain-text section headers for follow-up blocks', () => {
    const prompt = buildStoryPrompt({
      subject: 'English (Core)',
      grade: 'Form 2',
      theme: 'Water cycle',
      wordCount: 300,
      includeQuestions: true,
      vocabularyExercises: true,
      discussionPrompts: true,
      writingExtension: true,
    })
    expect(prompt).toContain('VOCABULARY EXERCISES:')
    expect(prompt).toContain('DISCUSSION PROMPTS:')
    expect(prompt).toContain('WRITING EXTENSION:')
  })
})
