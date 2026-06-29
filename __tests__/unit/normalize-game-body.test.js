import { describe, it, expect } from 'vitest'
import {
  normalizeGameContent,
  resolveSubjectLabel,
  buildGameApiPayload,
} from '@/lib/games/normalizeGameBody'
import { resolveSubjectName } from '@/lib/games/resolveSubjectName'

describe('normalizeGameContent', () => {
  it('reads points and time limit from top-level body fields', () => {
    const content = normalizeGameContent({
      pointsReward: 25,
      timeLimit: 45,
      targetClass: 'Form 2',
      content: {
        questions: [{ question: 'Q1', options: ['A'], correctAnswer: 'A' }],
      },
    })

    expect(content.pointsReward).toBe(25)
    expect(content.timeLimit).toBe(45)
    expect(content.targetClass).toBe('Form 2')
    expect(content.questions).toHaveLength(1)
  })
})

describe('resolveSubjectLabel', () => {
  it('prefers subject.name over raw string', () => {
    expect(resolveSubjectLabel({ subject: { name: 'Chemistry' } })).toBe('Chemistry')
    expect(resolveSubjectLabel({ subject: 'Mathematics' })).toBe('Mathematics')
  })
})

describe('resolveSubjectName', () => {
  it('maps legacy id values to subject names', () => {
    const subjects = [
      { id: '1', name: 'Mathematics' },
      { id: '2', name: 'Chemistry' },
    ]
    expect(resolveSubjectName('2', subjects)).toBe('Chemistry')
    expect(resolveSubjectName('Chemistry', subjects)).toBe('Chemistry')
  })
})

describe('buildGameApiPayload', () => {
  it('builds a create payload with nested content', () => {
    const payload = buildGameApiPayload({
      title: 'Quiz 1',
      subject: 'Biology',
      gameType: 'quiz',
      difficulty: 'easy',
      pointsReward: 15,
      timeLimit: 20,
      targetClass: 'Form 1',
      content: {
        questions: [{ question: 'Cell?', options: ['Unit'], correctAnswer: 'Unit' }],
      },
    })

    expect(payload.title).toBe('Quiz 1')
    expect(payload.subject).toBe('Biology')
    expect(payload.content.pointsReward).toBe(15)
    expect(payload.content.timeLimit).toBe(20)
  })
})
