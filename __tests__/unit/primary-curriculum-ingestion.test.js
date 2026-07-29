import { beforeEach, describe, expect, it } from 'vitest'
import {
  __clearCurriculumContextCache,
  assertCurriculumTopicAllowed,
  buildCurriculumContextBlock,
  listCurriculumTopics,
  resolveCurriculumContext,
} from '@/lib/ai/curriculum-context'
import { parseCdcSyllabusText } from '@/lib/curriculum/cdcSyllabusTableParser'

describe('primary CDC syllabus parser', () => {
  it('parses Grade headers and primary topic numbering into grade-aware records', () => {
    const parsed = parseCdcSyllabusText(
      `
      GRADE 4
      4.1 SAFETY
      4.1.1 Personal Safety
      4.1.1.1 Apply safety precautions
      • Discussing safety attire
      Safety precautions applied correctly
      `,
      { subject: 'Technology Studies', educationLevel: 'primary', alreadyDecoded: true }
    )

    expect(parsed.educationLevel).toBe('primary')
    expect(parsed.grades).toEqual([4])
    expect(parsed.records).toHaveLength(1)
    expect(parsed.records[0]).toMatchObject({
      id: 'G4-T1-S1',
      grade: 4,
      topicNumber: '4.1',
      topic: 'SAFETY',
      subtopicNumber: '4.1.1',
      subtopic: 'Personal Safety',
      specificCompetences: ['Apply safety precautions'],
      learningActivities: ['Discussing safety attire'],
      expectedStandard: 'Safety precautions applied correctly',
    })
  })

  it('keeps secondary Form 1-4 parsing and identifiers unchanged', () => {
    const parsed = parseCdcSyllabusText(
      `
      FORM 1
      1.1.0 MATTER
      1.1.1 States of Matter
      1.1.1.1 Describe states of matter
      • Observing samples
      Samples classified correctly
      `,
      { subject: 'Chemistry', educationLevel: 'secondary', alreadyDecoded: true }
    )

    expect(parsed.forms).toEqual([1])
    expect(parsed.records[0]).toMatchObject({
      id: 'F1-T1-S1',
      form: 1,
      topic: 'MATTER',
      subtopic: 'States of Matter',
    })
    expect(parsed.records[0].grade).toBeUndefined()
  })
})

describe('primary curriculum AI grounding', () => {
  beforeEach(() => {
    __clearCurriculumContextCache()
  })

  it('resolves Technology Studies aliases to the Grade 4-6 primary corpus', async () => {
    const corpus = await resolveCurriculumContext('Creative and Technology Studies', 'Grade 4')

    expect(corpus).not.toBeNull()
    expect(corpus).toMatchObject({
      type: 'cdc',
      slug: 'technology-studies',
      grade: 4,
      form: null,
    })

    const context = buildCurriculumContextBlock(corpus, 'personal safety', { limit: 2 })
    expect(context.block).toContain('Grade 4')
    expect(context.block).toContain('Personal Safety')
    expect(context.records.every((record) => record.grade === 4)).toBe(true)
  })

  it('resolves Expressive Arts Grade 5 topics from the primary corpus', async () => {
    const corpus = await resolveCurriculumContext('Expressive Arts', 'Grade 5')
    expect(corpus).not.toBeNull()
    expect(corpus).toMatchObject({
      type: 'cdc',
      slug: 'expressive-arts',
      grade: 5,
    })

    const topics = await listCurriculumTopics('Expressive Arts', 'Grade 5')
    expect(topics.length).toBeGreaterThan(5)
    await expect(
      assertCurriculumTopicAllowed('Expressive Arts', 'Grade 5', 'Invented Ballet Theory', {
        requireListed: true,
      })
    ).rejects.toThrow(/not in the curriculum/i)
  })

  it('lists only the requested grade and rejects invented topics', async () => {
    const grade4Topics = await listCurriculumTopics('Technology Studies', 'Grade 4')

    expect(grade4Topics).toContain('SAFETY')
    expect(grade4Topics).not.toContain('DESIGNING')
    await expect(
      assertCurriculumTopicAllowed('Information Technology Study', 'Grade 4', 'Space Mining', {
        requireListed: true,
      })
    ).rejects.toThrow(/not in the curriculum/i)
  })
})
