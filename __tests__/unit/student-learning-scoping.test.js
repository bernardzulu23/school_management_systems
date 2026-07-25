import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resolveCurriculumContext,
  listCurriculumTopics,
  assertCurriculumTopicAllowed,
  __clearCurriculumContextCache,
} from '@/lib/ai/curriculum-context'
import { resolveStudentGradeLabel } from '@/lib/flashcards/studentSubjects'

describe('listCurriculumTopics / assertCurriculumTopicAllowed', () => {
  beforeEach(() => {
    __clearCurriculumContextCache()
  })

  it('lists CDC subtopics for Chemistry Form 1 from ingested corpus', async () => {
    const corpus = await resolveCurriculumContext('Chemistry', 'Form 1')
    expect(corpus).not.toBeNull()
    expect(corpus.type).toBe('cdc')

    const topics = await listCurriculumTopics('Chemistry', 'Form 1')
    expect(topics.length).toBeGreaterThan(5)
    expect(topics.every((t) => typeof t === 'string' && t.trim().length > 0)).toBe(true)
  })

  it('returns no topics for primary Grade 5 against secondary CDC corpora', async () => {
    const topics = await listCurriculumTopics('English Language', 'Grade 5')
    expect(topics).toEqual([])
  })

  it('lists English Form 1 topics (flattened CDC subtopics)', async () => {
    const topics = await listCurriculumTopics('English Language', 'Form 1')
    expect(topics.length).toBeGreaterThan(5)
    expect(topics.some((t) => /greet/i.test(t))).toBe(true)
  })

  it('exposes Chemistry topic → subtopic tree for Form 1', async () => {
    const { listCurriculumTopicTree, listCurriculumSubtopics } =
      await import('@/lib/ai/curriculum-context')
    const tree = await listCurriculumTopicTree('Chemistry', 'Form 1')
    expect(tree.length).toBeGreaterThan(0)
    const first = tree[0]
    expect(first.topic).toBeTruthy()
    expect(Array.isArray(first.subtopics)).toBe(true)
    expect(first.subtopics.length).toBeGreaterThan(0)

    const subs = await listCurriculumSubtopics('Chemistry', 'Form 1', first.topic)
    expect(subs).toEqual(first.subtopics)
  })

  it('accepts an exact curriculum topic and rejects unrelated free-form when corpus exists', async () => {
    const topics = await listCurriculumTopics('Chemistry', 'Form 1')
    expect(topics.length).toBeGreaterThan(0)

    const allowed = await assertCurriculumTopicAllowed('Chemistry', 'Form 1', topics[0], {
      required: true,
    })
    expect(allowed).toBe(topics[0])

    await expect(
      assertCurriculumTopicAllowed('Chemistry', 'Form 1', 'Underwater Basket Weaving 101', {
        required: true,
      })
    ).rejects.toThrow(/not in the curriculum/i)
  })

  it('allows free-form when no curriculum corpus exists', async () => {
    const topics = await listCurriculumTopics('Underwater Basket Weaving', 'Form 1')
    expect(topics).toEqual([])

    const allowed = await assertCurriculumTopicAllowed(
      'Underwater Basket Weaving',
      'Form 1',
      'Any free topic',
      { required: true }
    )
    expect(allowed).toBe('Any free topic')
  })

  it('requireIfListed rejects empty topic when syllabus topics exist', async () => {
    const topics = await listCurriculumTopics('Chemistry', 'Form 1')
    expect(topics.length).toBeGreaterThan(0)

    await expect(
      assertCurriculumTopicAllowed('Chemistry', 'Form 1', '', { requireIfListed: true })
    ).rejects.toThrow(/curriculum topic/i)

    const allowed = await assertCurriculumTopicAllowed('Chemistry', 'Form 1', topics[0], {
      requireIfListed: true,
    })
    expect(allowed).toBe(topics[0])
  })
})

describe('resolveStudentGradeLabel', () => {
  it('prefers classRef.year_group over class name', () => {
    expect(
      resolveStudentGradeLabel({
        class: 'Form 2B',
        classRef: { year_group: 'Form 1' },
      })
    ).toBe('Form 1')
  })

  it('parses Form/Grade from Student.class when year_group missing', () => {
    expect(resolveStudentGradeLabel({ class: 'Form 3A' })).toBe('Form 3')
    expect(resolveStudentGradeLabel({ class: 'Grade 7B' })).toBe('Grade 7')
  })
})

describe('assertStudentSubjectAllowed', () => {
  it('rejects subjects outside the enrolled set', async () => {
    vi.resetModules()
    vi.doMock('@/lib/prisma', () => ({
      default: {
        student: {
          findFirst: vi.fn().mockResolvedValue({
            selected_subjects: ['Mathematics'],
            classId: null,
          }),
        },
        pupilSubjectEnrollment: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        class: {
          findFirst: vi.fn(),
        },
      },
    }))

    const { assertStudentSubjectAllowed } = await import('@/lib/flashcards/studentSubjects')
    await expect(
      assertStudentSubjectAllowed('stu-1', 'sch-1', 'History', { action: 'practice' })
    ).rejects.toMatchObject({ status: 403 })

    const allowed = await assertStudentSubjectAllowed('stu-1', 'sch-1', 'mathematics', {
      action: 'practice',
    })
    expect(allowed).toBe('Mathematics')
  })
})
