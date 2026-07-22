import { describe, it, expect } from 'vitest'
import {
  crosswalkSpec,
  matchAliasToCorpus,
  buildCorpusIndex,
  topicsFromUnitTitle,
  isUsableTopic,
  canonicalizeCorpusTopic,
  scoreTopicAgainstSubSkill,
} from '@/lib/ecz/eoc/crosswalkTopicAliases'
import { EczSubjectSpec } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import { loadSyllabusTopics } from '@/lib/ecz/eoc/syllabusTopicIndex'
import { loadEocSpec, __clearEocSpecCache } from '@/lib/ecz/eoc/load-eoc-spec'
import { resolveEoc } from '@/lib/ecz/eoc/question-validator'

const miniSpec = EczSubjectSpec.parse({
  subjectCode: '9999',
  subjectName: 'Crosswalk Test',
  syllabusYear: 2024,
  construct: 'Test construct',
  elementsOfConstruct: [
    {
      id: 'EoC1',
      description: 'Performs operations on numbers to solve real life problems',
      resolutionMode: 'topic',
      subSkills: [
        {
          id: 'eoc1-num',
          label: 'Performs calculations involving numbers and money',
          topicAliases: ['Numbers', 'Integers'],
          unverifiedTopicAliases: ['Financial Arithmetic', 'Totally Fake Topic'],
          taskTypeAliases: [],
        },
      ],
    },
    {
      id: 'EoC2',
      description: 'Models real life situations using algebra',
      resolutionMode: 'topic',
      subSkills: [
        {
          id: 'eoc2-alg',
          label: 'Uses algebra to express and solve real life situations',
          topicAliases: ['Algebra'],
          unverifiedTopicAliases: [],
          taskTypeAliases: [],
        },
      ],
    },
  ],
  testDesign: {
    components: [
      {
        type: 'FINAL_EXAM',
        code: '9999/2',
        formLevel: 'Form 4',
        numItems: 5,
        totalMarks: 100,
        structureNotes: 'test',
        bloomRange: ['understanding', 'evaluating'],
      },
    ],
    scenarioRequired: true,
    minPartsPerScenarioItem: 2,
  },
  scoringCriteria: { rules: ['test'] },
  exemplars: [],
})

describe('crosswalkTopicAliases', () => {
  it('extracts themes from noisy form1-4 unit titles', () => {
    const parts = topicsFromUnitTitle('Form 1: GREETINGS ===1.2.1 Formal and Informal Greetings')
    expect(parts).toContain('GREETINGS')
    expect(parts).toContain('Formal and Informal Greetings')
  })

  it('canonicalizes numbered syllabus tails', () => {
    expect(canonicalizeCorpusTopic('LETTER WRITING 1.3.4.1. Informal Letter')).toBe(
      'Informal Letter'
    )
  })

  it('rejects truncated and generic stubs', () => {
    expect(isUsableTopic('Operations on')).toBe(false)
    expect(isUsableTopic('Human')).toBe(false)
    expect(isUsableTopic('Introduction to')).toBe(false)
    expect(isUsableTopic('Algebraic Expressions')).toBe(true)
  })

  it('matches exact corpus aliases', () => {
    const corpus = buildCorpusIndex(['Financial Arithmetic', 'Algebraic Expressions'])
    expect(matchAliasToCorpus('financial arithmetic', corpus)).toEqual({
      kind: 'exact',
      corpusTopic: 'Financial Arithmetic',
    })
  })

  it('promotes verified exact hits and assigns Algebraic Expressions', () => {
    const { spec, changes } = crosswalkSpec(miniSpec, [
      'Financial Arithmetic',
      'Algebraic Expressions',
      'Combined Operations on Real Numbers',
    ])
    expect(changes.some((c) => c.action === 'promote' && c.alias === 'Financial Arithmetic')).toBe(
      true
    )
    expect(
      spec.elementsOfConstruct[0].subSkills[0].topicAliases.map((a) => a.toLowerCase())
    ).toContain('financial arithmetic')
    expect(
      spec.elementsOfConstruct[0].subSkills[0].unverifiedTopicAliases.map((a) => a.toLowerCase())
    ).not.toContain('financial arithmetic')
    expect(spec.elementsOfConstruct[0].subSkills[0].unverifiedTopicAliases).toContain(
      'Totally Fake Topic'
    )

    const alg = spec.elementsOfConstruct[1].subSkills[0].topicAliases
    expect(alg.some((a) => /algebraic expressions/i.test(a))).toBe(true)
    expect(changes.some((c) => c.action === 'add-verified')).toBe(true)
  })

  it('scores number topics toward number sub-skill', () => {
    const num = scoreTopicAgainstSubSkill(
      'Combined Operations on Real Numbers',
      'Performs operations on numbers to solve real life problems',
      'Performs calculations involving numbers and money',
      ['Numbers', 'Integers']
    )
    const alg = scoreTopicAgainstSubSkill(
      'Combined Operations on Real Numbers',
      'Models real life situations using algebra',
      'Uses algebra to express and solve real life situations',
      ['Algebra']
    )
    expect(num).toBeGreaterThan(alg)
  })
})

describe('live corpus crosswalk smoke', () => {
  it('Mathematics I promotes Matrices from form1-4 when present', () => {
    __clearEocSpecCache()
    const topics = loadSyllabusTopics('2021')
    expect(topics?.sources.form14).toBe(true)
    expect(topics.topics.length).toBeGreaterThan(20)

    const spec = loadEocSpec('2021')
    expect(spec).toBeTruthy()
    const { spec: next } = crosswalkSpec(spec, topics.topics)
    const resolved = resolveEoc(next, 'Operations on 2x2 Matrices')
    // After crosswalk, Matrices aliases that exist in form1-4 should be verified topic path
    if (topics.topics.some((t) => /2x2 matrices/i.test(t))) {
      expect(resolved?.resolvedVia).toBe('topic')
      expect(resolved?.verified).toBe(true)
    }
  })
})
