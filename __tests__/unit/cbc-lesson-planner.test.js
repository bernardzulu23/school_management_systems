import { describe, it, expect } from 'vitest'
import { ECZ_SBA_TASK_TYPES } from '@/lib/ecz/ecz-reference-constants'
import { ECZ_SBA_TASK_TYPES as RUBRIC_SBA_TYPES } from '@/lib/ecz/ecz-rubric-builder'
import { buildSbaTaskGuidance, buildLessonPlanPrompt } from '@/lib/lessonPlanTemplate'
import {
  generateLessonPlanWordDoc,
  generateLessonPlanFilename,
} from '@/lib/ai/lesson-plan-word-generator'

describe('ECSEOL SBA task types', () => {
  it('includes Exercises in the reference taxonomy used by the lesson planner', () => {
    expect(ECZ_SBA_TASK_TYPES).toContain('Exercises')
    expect(ECZ_SBA_TASK_TYPES).toContain('Project')
    expect(ECZ_SBA_TASK_TYPES).toContain('Practical task')
    expect(ECZ_SBA_TASK_TYPES).toContain('Assignment')
  })

  it('includes Exercises in the rubric-builder SBA list', () => {
    const values = RUBRIC_SBA_TYPES.map((t) => (typeof t === 'string' ? t : t.value))
    expect(values).toContain('Exercises')
  })
})

describe('buildSbaTaskGuidance', () => {
  it('returns empty string when no type is selected', () => {
    expect(buildSbaTaskGuidance()).toBe('')
    expect(buildSbaTaskGuidance('')).toBe('')
  })

  it('emphasises practice exercises for Exercises SBA type', () => {
    const guidance = buildSbaTaskGuidance('Exercises')
    expect(guidance).toMatch(/SBA TASK TYPE \(ECSEOL\): Exercises/)
    expect(guidance.toLowerCase()).toMatch(/exercise/)
    expect(guidance).toMatch(/HOMEWORK\/CLASS EXERCISE/)
  })

  it('emphasises project brief for Project SBA type', () => {
    const guidance = buildSbaTaskGuidance('Project')
    expect(guidance).toMatch(/Project brief/i)
  })
})

describe('CBC lesson plan prompt + SBA', () => {
  it('embeds SBA guidance when sbaTaskType is set', () => {
    const prompt = buildLessonPlanPrompt({
      templateType: 'standard',
      subject: 'Mathematics',
      grade: 'Form 2',
      topic: 'Linear equations',
      duration: 40,
      sbaTaskType: 'Exercises',
      coreCompetencies: ['Critical Thinking & Problem Solving'],
    })
    expect(prompt).toMatch(/SBA TASK TYPE \(ECSEOL\): Exercises/)
    expect(prompt).toMatch(/Honour the selected SBA task type/)
  })
})

describe('lesson plan docx generator smoke', () => {
  it('builds a .docx buffer from plain CBC lesson content', async () => {
    const buffer = await generateLessonPlanWordDoc({
      schoolName: 'Test Secondary School',
      teacherName: 'Ms Teacher',
      date: '21/07/2026',
      subject: 'Mathematics',
      form: 'Form 2',
      topic: 'Linear equations',
      subTopic: 'Solving equations',
      duration: 40,
      lessonContent: `RATIONALE:
Content on linear equations.

LEARNING OUTCOMES: L.S.B.A.T
1. Solve simple linear equations.

HOMEWORK/CLASS EXERCISE:
1. Solve 2x + 3 = 11.
`,
      approvalStatus: 'DRAFT',
    })

    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.byteLength).toBeGreaterThan(1000)
    // DOCX files are ZIP archives starting with PK
    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK')
  })

  it('builds a safe download filename', () => {
    const name = generateLessonPlanFilename('Mathematics', 'Form 2', 'Linear equations')
    expect(name).toMatch(/^LessonPlan_/)
    expect(name).toMatch(/\.docx$/)
    expect(name).not.toMatch(/\s/)
  })
})
