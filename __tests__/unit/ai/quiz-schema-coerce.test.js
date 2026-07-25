import { describe, expect, it } from 'vitest'
import { coerceQuizObject, parseQuizObject, QuizGenerationSchema } from '@/lib/ai/schemas'

describe('coerceQuizObject / QuizGenerationSchema', () => {
  it('accepts secondary ECZ scenarios[] and coerces into questions[]', () => {
    const raw = {
      title: 'Mid-term',
      scenarios: [
        {
          questionNumber: 1,
          zambianScenario:
            'A Grade 10 class in Lusaka investigates soil types around their school garden.',
          subQuestions: [
            { number: '(a)', commandTerm: 'State', question: 'Name two soil types.', marks: 2 },
            { number: '(b)', commandTerm: 'Explain', question: 'Why loam is preferred.', marks: 3 },
          ],
          totalMarks: 5,
        },
      ],
    }

    expect(QuizGenerationSchema.safeParse(raw).success).toBe(true)

    const coerced = coerceQuizObject(raw)
    expect(coerced.questions).toHaveLength(1)
    expect(coerced.questions[0].zambianScenario).toMatch(/Lusaka/)
    expect(coerced.questions[0].question).toMatch(/Lusaka/)
    expect(coerced.questions[0].subQuestions).toHaveLength(2)

    const parsed = parseQuizObject(raw)
    expect(parsed.success).toBe(true)
    expect(parsed.data.questions[0].zambianScenario).toMatch(/Lusaka/)
  })

  it('normalizes option objects and boolean answers', () => {
    const raw = {
      questions: [
        {
          id: 1,
          type: 'true_false',
          question: 'Water boils at 100°C at sea level.',
          answer: true,
          options: [
            { label: 'A', text: 'True' },
            { label: 'B', text: 'False' },
          ],
        },
      ],
    }

    expect(QuizGenerationSchema.safeParse(raw).success).toBe(true)
    const parsed = parseQuizObject(raw)
    expect(parsed.success).toBe(true)
    expect(parsed.data.questions[0].answer).toBe('true')
    expect(parsed.data.questions[0].type).toBe('true_false')
  })

  it('rejects empty payloads that cannot yield questions', () => {
    expect(QuizGenerationSchema.safeParse({ title: 'Empty' }).success).toBe(false)
    expect(QuizGenerationSchema.safeParse({ questions: [] }).success).toBe(false)
  })
})
