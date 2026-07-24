import { describe, expect, it } from 'vitest'
import {
  assertSelectionsEligible,
  buildSchemeContentBlock,
  eligibleTopicsForSlot,
  retainValidatedQuestions,
  slotCutoffWeek,
} from '@/lib/teaching/schemeTestTopics'

const weeks = [
  {
    week: 1,
    topic: 'Introduction to fractions',
    topicKey: 'fractions-intro',
    learningOutcomes: ['Identify fractions'],
    teachingActivities: ['Board demo'],
    assessmentMethods: ['Oral quiz'],
  },
  {
    week: 2,
    topicTitle: 'Equivalent fractions',
    topicKey: 'fractions-equiv',
    learningOutcomes: 'Compare fractions\nSimplify',
  },
  { week: 3, topic: 'Mid-term assessment', weekType: 'mid_term_test' },
  { week: 4, topic: 'Decimals', topicKey: 'decimals' },
  { week: 5, topic: 'Percentages', topicKey: 'percentages' },
  { week: 6, topic: 'End of term', weekType: 'end_of_term_test' },
]

const schedule = {
  midTermWeek: 3,
  endOfTermWeek: 6,
}

describe('schemeTestTopics eligibility', () => {
  it('returns mid-term topics strictly before midTermWeek and excludes mid week', () => {
    const result = eligibleTopicsForSlot({ weeks, schedule, slot: 'mid_term' })
    expect(result.cutoffWeek).toBe(3)
    expect(result.topics.map((t) => t.week)).toEqual([1, 2])
    expect(result.topics.every((t) => t.week < 3)).toBe(true)
    expect(result.topics.find((t) => t.topicKey === 'fractions-intro')).toBeTruthy()
  })

  it('returns end-of-term topics before endOfTermWeek excluding assessment weeks', () => {
    const result = eligibleTopicsForSlot({ weeks, schedule, slot: 'end_of_term' })
    expect(result.cutoffWeek).toBe(6)
    expect(result.topics.map((t) => t.week)).toEqual([1, 2, 4, 5])
    expect(result.topics.some((t) => t.week === 3)).toBe(false)
  })

  it('warns when schedule slot is missing', () => {
    const result = eligibleTopicsForSlot({
      weeks,
      schedule: { endOfTermWeek: 6 },
      slot: 'mid_term',
    })
    expect(result.topics).toEqual([])
    expect(result.warning).toMatch(/Mid-term week is not set/i)
  })

  it('slotCutoffWeek uses range start', () => {
    expect(slotCutoffWeek('mid_term', { midTermWeek: 4, midTermWeekEnd: 5 })).toBe(4)
    expect(slotCutoffWeek('end_of_term', { endOfTermWeek: 10, endOfTermWeekEnd: 12 })).toBe(10)
  })
})

describe('assertSelectionsEligible', () => {
  const eligible = eligibleTopicsForSlot({ weeks, schedule, slot: 'mid_term' }).topics

  it('accepts selected weeks/keys inside the pool', () => {
    const ok = assertSelectionsEligible(eligible, [1], ['fractions-equiv'])
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.selected.map((t) => t.week).sort()).toEqual([1, 2])
    }
  })

  it('rejects out-of-range week selection', () => {
    const bad = assertSelectionsEligible(eligible, [5], [])
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error).toMatch(/Week 5 is not eligible/)
  })

  it('rejects topic keys outside the pool', () => {
    const bad = assertSelectionsEligible(eligible, [], ['decimals'])
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error).toMatch(/not eligible/)
  })

  it('requires at least one selection', () => {
    const bad = assertSelectionsEligible(eligible, [], [])
    expect(bad.ok).toBe(false)
  })
})

describe('buildSchemeContentBlock', () => {
  it('grounds prompt in scheme week content', () => {
    const eligible = eligibleTopicsForSlot({ weeks, schedule, slot: 'mid_term' }).topics
    const block = buildSchemeContentBlock(eligible)
    expect(block).toContain('SCHEME OF WORK')
    expect(block).toContain('Week 1:')
    expect(block).toContain('Identify fractions')
  })
})

describe('topics API shape (eligibleTopicsForSlot contract)', () => {
  it('returns the fields the Teaching Studio topics API exposes', () => {
    const result = eligibleTopicsForSlot({ weeks, schedule, slot: 'mid_term' })
    expect(result).toMatchObject({
      slot: 'mid_term',
      cutoffWeek: expect.any(Number),
      topics: expect.any(Array),
    })
    const topic = result.topics[0]
    expect(topic).toEqual(
      expect.objectContaining({
        week: expect.any(Number),
        topic: expect.any(String),
        topicTitle: expect.any(String),
        topicKey: expect.any(String),
        learningOutcomes: expect.any(Array),
        teachingActivities: expect.any(Array),
        assessmentMethods: expect.any(Array),
      })
    )
  })
})

describe('hard ECZ gate contract', () => {
  it('does not return failing items', () => {
    const { questions, rejectedCount } = retainValidatedQuestions([
      { question: { id: 'a', question: 'Valid Q' }, valid: true },
      { question: { id: 'b', question: 'Bad Q' }, valid: false },
      { question: null, valid: true },
      { question: { id: 'c', question: 'Also valid' }, valid: true },
    ])
    expect(questions.map((q) => q.id)).toEqual(['a', 'c'])
    expect(rejectedCount).toBe(2)
  })
})
