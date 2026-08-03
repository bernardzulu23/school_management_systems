import { describe, expect, it } from 'vitest'
import { parseFlashcardSessionFeedback } from '@/lib/ai/schemas'

describe('parseFlashcardSessionFeedback', () => {
  it('normalizes messy Groq-like payloads', () => {
    const parsed = parseFlashcardSessionFeedback({
      summary: 'Nice effort on photosynthesis.',
      topics: ['Transpiration', 'Stomata'],
      strengths: 'Tried every question',
      resources: [
        {
          kind: 'Textbook',
          name: 'Biology CBC Form 2',
          why: 'Covers plant transport',
        },
        {
          type: 'web article',
          title: 'How leaves lose water',
          description: 'Short readable article',
        },
      ],
    })

    expect(parsed.success).toBe(true)
    expect(parsed.data.topicsToImprove).toEqual(['Transpiration', 'Stomata'])
    expect(parsed.data.strengths[0]).toContain('Tried every question')
    expect(parsed.data.readingList).toHaveLength(2)
    expect(parsed.data.readingList[0].type).toBe('book')
    expect(parsed.data.readingList[1].type).toBe('article')
  })

  it('fills defaults when reading list is missing', () => {
    const parsed = parseFlashcardSessionFeedback({
      summary: 'Keep going.',
      topicsToImprove: ['Osmosis'],
      strengths: ['Completed the deck'],
    })
    expect(parsed.success).toBe(true)
    expect(parsed.data.readingList.length).toBeGreaterThan(0)
  })
})
