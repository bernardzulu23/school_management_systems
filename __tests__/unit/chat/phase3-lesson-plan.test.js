import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatLessonPlanSchema } from '@/lib/ai/chat/lesson-plan-schema'
import { nextSubmissionStatus } from '@/lib/ai/chat/lesson-plan-submission'
import { isR2Configured, makeDraftObjectKey, getSignedDownloadUrl } from '@/lib/storage/r2'

const validPlan = {
  title: 'Introduction to Algebra',
  subject: 'Mathematics',
  gradeOrForm: 'Form 2',
  duration: 40,
  topic: 'Linear equations',
  objectives: [
    {
      objective: 'Solve simple linear equations in one unknown',
      bloomsLevel: 'Applying',
      competency: 'Critical thinking',
    },
  ],
  priorKnowledge: 'Learners can add and subtract integers.',
  materialsRequired: ['Chalkboard', 'Exercise books'],
  activities: [
    {
      phase: 'Introduction',
      durationMinutes: 5,
      activity: 'Recall previous work on integers with a short oral quiz.',
      teacherAction: 'Ask probing questions about signed numbers',
      learnerAction: 'Respond orally in pairs',
      resources: ['Chalkboard'],
    },
    {
      phase: 'Development',
      durationMinutes: 25,
      activity: 'Worked examples of linear equations using Zambian market price scenarios.',
      teacherAction: 'Demonstrate on board step by step',
      learnerAction: 'Copy and practise in exercise books',
      resources: ['Exercise books'],
      assessmentCheck: 'Two board questions answered correctly',
    },
    {
      phase: 'Conclusion',
      durationMinutes: 10,
      activity: 'Summarise the method for isolating the unknown and set exit ticket.',
      teacherAction: 'Recap key steps with learners',
      learnerAction: 'Complete a short exit ticket',
      resources: ['Exit tickets'],
    },
  ],
  workedExamples: ['Solve 2x + 3 = 11', 'Solve x − 5 = 4'],
  differentiation: {
    support: 'Provide number lines and partially completed examples',
    challenge: 'Solve two-step equations with brackets',
  },
  homework: 'Complete exercise 3.2 questions 1–8 on linear equations.',
  assessment: {
    method: 'Oral and written',
    tool: 'Exit ticket',
    criteria: 'Correctly isolate the unknown',
  },
  crossCuttingThemes: ['Entrepreneurship'],
  coreCompetencies: ['Critical thinking'],
  realWorldZambianContext: 'Market vendors in Lusaka balancing change and stock prices.',
}

describe('ChatLessonPlanSchema', () => {
  it('accepts a valid structured lesson plan', () => {
    const result = ChatLessonPlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = ChatLessonPlanSchema.safeParse({ title: 'x' })
    expect(result.success).toBe(false)
  })

  it('allows optional mermaidDiagram', () => {
    const result = ChatLessonPlanSchema.safeParse({
      ...validPlan,
      mermaidDiagram: 'flowchart TD\n  A-->B',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.mermaidDiagram).toContain('flowchart')
    }
  })

  it('rejects too-short activity text', () => {
    const bad = {
      ...validPlan,
      activities: [
        {
          ...validPlan.activities[0],
          activity: 'too short',
        },
        validPlan.activities[1],
        validPlan.activities[2],
      ],
    }
    expect(ChatLessonPlanSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts validated cartesian visualAids', () => {
    const result = ChatLessonPlanSchema.safeParse({
      ...validPlan,
      visualAids: [
        {
          type: 'cartesian',
          title: 'y = 2x + 1',
          caption: 'Plot of a linear function',
          xAxis: { min: -5, max: 5, label: 'x', step: 1 },
          yAxis: { min: -10, max: 12, label: 'y', step: 2 },
          series: [
            {
              name: 'y=2x+1',
              points: [
                { x: -2, y: -3 },
                { x: 0, y: 1 },
                { x: 2, y: 5 },
              ],
            },
          ],
          showGrid: true,
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects malformed visualAids with out-of-range values', () => {
    const result = ChatLessonPlanSchema.safeParse({
      ...validPlan,
      visualAids: [
        {
          type: 'line',
          title: 'Bad graph',
          xAxis: { min: -5, max: 5 },
          yAxis: { min: -5, max: 5 },
          series: [
            {
              name: 's1',
              points: [
                { x: 0, y: 99999 },
                { x: 1, y: 1 },
              ],
            },
          ],
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects fewer than three activities', () => {
    const result = ChatLessonPlanSchema.safeParse({
      ...validPlan,
      activities: validPlan.activities.slice(0, 2),
    })
    expect(result.success).toBe(false)
  })
})

describe('submission status transitions', () => {
  it('DRAFT → PENDING_APPROVAL on submit', () => {
    expect(nextSubmissionStatus('DRAFT', 'submit')).toBe('PENDING_APPROVAL')
  })

  it('PENDING_APPROVAL → APPROVED / REJECTED', () => {
    expect(nextSubmissionStatus('PENDING_APPROVAL', 'approve')).toBe('APPROVED')
    expect(nextSubmissionStatus('PENDING_APPROVAL', 'reject')).toBe('REJECTED')
  })

  it('blocks illegal transitions', () => {
    expect(nextSubmissionStatus('APPROVED', 'submit')).toBeNull()
    expect(nextSubmissionStatus('DRAFT', 'approve')).toBeNull()
    expect(nextSubmissionStatus('PENDING_APPROVAL', 'submit')).toBeNull()
  })

  it('allows REJECTED → PENDING_APPROVAL on resubmit/submit', () => {
    expect(nextSubmissionStatus('REJECTED', 'submit')).toBe('PENDING_APPROVAL')
    expect(nextSubmissionStatus('REJECTED', 'resubmit')).toBe('PENDING_APPROVAL')
  })
})

describe('R2 signed URL helper', () => {
  const prev = { ...process.env }

  beforeEach(() => {
    delete process.env.R2_ACCOUNT_ID
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_BUCKET
  })

  afterEach(() => {
    process.env = { ...prev }
  })

  it('reports not configured when env missing', () => {
    expect(isR2Configured()).toBe(false)
  })

  it('builds draft object keys without crashing', () => {
    const key = makeDraftObjectKey('school-1')
    expect(key).toMatch(/^lesson-plans\/school-1\//)
  })

  it('returns local backend for local: keys without needing R2', async () => {
    const result = await getSignedDownloadUrl('local:school-1/sub-1/plan.docx', 600)
    expect(result.backend).toBe('local')
    expect(result.expiresIn).toBe(600)
    expect(result.url).toBe('')
  })

  it('creates signed URL when R2 is mocked as configured', async () => {
    process.env.R2_ACCOUNT_ID = 'acct'
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    process.env.R2_BUCKET = 'bucket'
    expect(isR2Configured()).toBe(true)

    vi.resetModules()
    vi.doMock('@aws-sdk/client-s3', () => ({
      S3Client: class {
        // no-op
      },
      GetObjectCommand: class {
        constructor(input) {
          this.input = input
        }
      },
      PutObjectCommand: class {
        constructor(input) {
          this.input = input
        }
      },
    }))
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({
      getSignedUrl: vi.fn().mockResolvedValue('https://r2.example/signed?X-Amz-Expires=900'),
    }))

    const { getSignedDownloadUrl: signed } = await import('@/lib/storage/r2')
    const result = await signed('lesson-plans/school-1/sub/plan.docx', 900)
    expect(result.backend).toBe('r2')
    expect(result.url).toContain('signed')
    expect(result.expiresIn).toBe(900)
  })
})
