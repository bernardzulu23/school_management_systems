import { describe, it, expect } from 'vitest'
import { assessmentPaperToPdfParams, assessmentPaperFilename } from '@/lib/exports/assessmentPaper'

describe('assessmentPaper export model', () => {
  it('builds PDF blocks for quiz questions with options', () => {
    const params = assessmentPaperToPdfParams({
      kind: 'quiz',
      title: 'Civic Education Quiz',
      subject: 'Civic Education',
      grade: 'Form 2',
      topic: 'Governance',
      includeAnswers: true,
      questions: [
        {
          question: 'What is democracy?',
          options: ['Rule by one', 'Rule by people', 'Rule by army'],
          answer: 'Rule by people',
          explanation: 'Citizens choose leaders.',
        },
      ],
    })
    expect(params.title).toBe('Civic Education Quiz')
    expect(params.blocks.some((b) => b.text?.includes('What is democracy?'))).toBe(true)
    expect(params.blocks.some((b) => b.text?.includes('A. Rule by one'))).toBe(true)
    expect(params.blocks.some((b) => b.text?.includes('Answer: Rule by people'))).toBe(true)
  })

  it('builds project and scenario sections', () => {
    const params = assessmentPaperToPdfParams({
      kind: 'project',
      title: 'SBA Project',
      includeAnswers: true,
      project: {
        context: 'A farmer in Mkushi needs irrigation advice.',
        steps: ['Research', 'Design', 'Present'],
        deliverables: ['Report', 'Poster'],
        criteria: [
          {
            name: 'Planning',
            excellent: 'Excellent plan',
            good: 'Good plan',
            fair: 'Fair plan',
            needsImprovement: 'Weak plan',
          },
        ],
      },
      scenarios: [
        {
          questionNumber: 1,
          zambianScenario: 'Learners visit a clinic in Kitwe.',
          subQuestions: [{ number: '(a)', commandTerm: 'Explain', question: 'Why?', marks: 4 }],
        },
      ],
    })
    expect(params.blocks.some((b) => b.text?.includes('Mkushi'))).toBe(true)
    expect(params.blocks.some((b) => b.text?.includes('Kitwe'))).toBe(true)
    expect(params.blocks.some((b) => b.text === 'Planning')).toBe(true)
  })

  it('names files with pdf/docx extensions', () => {
    expect(
      assessmentPaperFilename(
        { kind: 'quiz', title: 'Test', subject: 'Math', topic: 'Algebra' },
        'pdf'
      )
    ).toMatch(/\.pdf$/)
    expect(
      assessmentPaperFilename(
        { kind: 'quiz', title: 'Test', subject: 'Math', topic: 'Algebra' },
        'docx'
      )
    ).toMatch(/\.docx$/)
  })
})
