import { describe, it, expect } from 'vitest'
import {
  sanitizeQuizForStudent,
  gradeQuizAttempt,
  stripOptionLabel,
  inferQuestionType,
} from '@/lib/assessments/interactiveQuiz'

describe('sanitizeQuizForStudent', () => {
  it('strips answers and explanations from questions', () => {
    const quiz = {
      title: 'Test',
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          question: 'What is 2+2?',
          options: ['A. 3', 'B. 4'],
          answer: '4',
          explanation: 'Basic math',
        },
        {
          id: 'q2',
          type: 'short',
          question: 'Define photosynthesis',
          answer: 'Process plants use',
          explanation: 'Biology',
        },
      ],
    }
    const safe = sanitizeQuizForStudent(quiz)
    expect(safe.questions[0].answer).toBeUndefined()
    expect(safe.questions[0].explanation).toBeUndefined()
    expect(safe.questions[0].options).toEqual(['3', '4'])
    expect(safe.questions[1].options).toBeUndefined()
  })
})

describe('stripOptionLabel', () => {
  it('removes letter prefixes', () => {
    expect(stripOptionLabel('A. Nairobi')).toBe('Nairobi')
    expect(stripOptionLabel('b) Lusaka')).toBe('Lusaka')
  })
})

describe('inferQuestionType', () => {
  it('detects mcq vs short', () => {
    expect(inferQuestionType({ options: ['a', 'b'] })).toBe('mcq')
    expect(inferQuestionType({ question: 'Explain' })).toBe('short')
  })
})

describe('gradeQuizAttempt mixed types', () => {
  const quiz = {
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        question: 'Capital of Zambia?',
        options: ['Lusaka', 'Ndola'],
        answer: 'Lusaka',
        marks: 2,
      },
      {
        id: 'q2',
        type: 'short',
        question: '2+2=?',
        answer: '4',
        marks: 1,
      },
    ],
  }

  it('grades mcq and short answers', () => {
    const result = gradeQuizAttempt(quiz, { q1: 'Lusaka', q2: '4' })
    expect(result.percentage).toBe(100)
    expect(result.score).toBe(3)
    expect(result.review[0].isCorrect).toBe(true)
    expect(result.review[1].isCorrect).toBe(true)
  })

  it('marks wrong mcq answers', () => {
    const result = gradeQuizAttempt(quiz, { q1: 'Ndola', q2: '5' })
    expect(result.percentage).toBe(0)
  })
})
