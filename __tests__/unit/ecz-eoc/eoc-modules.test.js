import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { EczSubjectSpec, GeneratedQuestion } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import { loadEocSpec, getEocSpecDataDir, __clearEocSpecCache } from '@/lib/ecz/eoc/load-eoc-spec'
import { resolveTopicToEoc, validateStructure } from '@/lib/ecz/eoc/question-validator'

describe('ECZ EoC sidecar modules', () => {
  beforeEach(() => {
    __clearEocSpecCache()
  })

  it('parses mathematics-i-2021.json against EczSubjectSpec', () => {
    const filePath = path.join(getEocSpecDataDir(), 'mathematics-i-2021.json')
    expect(fs.existsSync(filePath)).toBe(true)
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const parsed = EczSubjectSpec.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.subjectCode).toBe('2021')
    expect(parsed.data.elementsOfConstruct).toHaveLength(5)
    expect(parsed.data.exemplars).toHaveLength(5)
  })

  it('parses agricultural-science-4018.json against EczSubjectSpec', () => {
    const filePath = path.join(getEocSpecDataDir(), 'agricultural-science-4018.json')
    expect(fs.existsSync(filePath)).toBe(true)
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const parsed = EczSubjectSpec.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.subjectCode).toBe('4018')
    expect(parsed.data.elementsOfConstruct).toHaveLength(6)
    expect(parsed.data.elementsOfConstruct.find((e) => e.id === 'EoC1')?.resolutionMode).toBe(
      'taskType'
    )
    expect(parsed.data.elementsOfConstruct.find((e) => e.id === 'EoC2')?.resolutionMode).toBe(
      'topic'
    )
    expect(parsed.data.testDesign.minPartsPerScenarioItem).toBe(2)
  })

  it('loadEocSpec resolves Mathematics / 2021 / mathematics-i', () => {
    const a = loadEocSpec('Mathematics')
    const b = loadEocSpec('2021')
    const c = loadEocSpec('mathematics-i')
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(c).not.toBeNull()
    expect(a?.subjectCode).toBe('2021')
    expect(b?.subjectCode).toBe('2021')
    expect(c?.subjectCode).toBe('2021')
  })

  it('loadEocSpec resolves Agricultural Science / 4018', () => {
    const a = loadEocSpec('Agricultural Science')
    const b = loadEocSpec('4018')
    const c = loadEocSpec('agricultural-science')
    expect(a?.subjectCode).toBe('4018')
    expect(b?.subjectCode).toBe('4018')
    expect(c?.subjectCode).toBe('4018')
  })

  it.each([
    ['Physics', '4016', 6],
    ['Chemistry', '4014', 6],
    ['Biology', '4012', 5],
    ['Geography', '3014', 5],
  ])('parses and loads %s (%s)', (name, code, eocCount) => {
    const byName = loadEocSpec(name)
    const byCode = loadEocSpec(code)
    expect(byName?.subjectCode).toBe(code)
    expect(byCode?.subjectCode).toBe(code)
    expect(byName?.elementsOfConstruct).toHaveLength(eocCount)
    const parsed = EczSubjectSpec.safeParse(byName)
    expect(parsed.success).toBe(true)
  })

  it('resolves Physics mechanics and Biology evidence taskType', () => {
    const physics = loadEocSpec('4016')
    const mech = resolveTopicToEoc(physics, 'Linear Motion')
    expect(mech?.eoc.id).toBe('EoC2')
    expect(mech?.verified).toBe(true)

    const biology = loadEocSpec('4012')
    const evidence = resolveTopicToEoc(biology, 'data analysis')
    expect(evidence?.eoc.id).toBe('EoC3')
    expect(evidence?.verified).toBe(false)

    const geography = loadEocSpec('3014')
    const maps = resolveTopicToEoc(geography, 'Map Reading and Interpretation')
    expect(maps?.eoc.id).toBe('EoC1')
    expect(maps?.verified).toBe(true)
  })

  describe('resolveTopicToEoc', () => {
    it('resolves verified CDC-aligned aliases', () => {
      const spec = loadEocSpec('2021')
      expect(spec).not.toBeNull()
      const sets = resolveTopicToEoc(spec, 'Operations on Sets')
      expect(sets).not.toBeNull()
      expect(sets?.eoc.id).toBe('EoC2')
      expect(sets?.subSkillId).toBe('eoc2-sets')
      expect(sets?.verified).toBe(true)

      const trig = resolveTopicToEoc(spec, 'Bearings and Scale Drawing')
      expect(trig?.eoc.id).toBe('EoC3')
      expect(trig?.verified).toBe(true)
    })

    it('resolves unverified aliases with verified: false', () => {
      const spec = loadEocSpec('2021')
      const matrices = resolveTopicToEoc(spec, 'Matrices')
      expect(matrices).not.toBeNull()
      expect(matrices?.eoc.id).toBe('EoC2')
      expect(matrices?.subSkillId).toBe('eoc2-algebra')
      expect(matrices?.verified).toBe(false)

      const vectors = resolveTopicToEoc(spec, 'Vectors in 2 Dimensions')
      expect(vectors?.verified).toBe(false)
      expect(vectors?.eoc.id).toBe('EoC2')
    })

    it('resolves Agricultural Science topic and taskType aliases', () => {
      const spec = loadEocSpec('4018')
      const crops = resolveTopicToEoc(spec, 'Crop Production')
      expect(crops?.eoc.id).toBe('EoC2')
      expect(crops?.verified).toBe(true)

      const investigation = resolveTopicToEoc(spec, 'field project')
      expect(investigation?.eoc.id).toBe('EoC1')
      expect(investigation?.verified).toBe(false)

      const climate = resolveTopicToEoc(spec, 'Climate-Smart Agriculture')
      expect(climate?.eoc.id).toBe('EoC1')
      expect(climate?.verified).toBe(false)
    })

    it('returns null for unknown topics', () => {
      const spec = loadEocSpec('2021')
      expect(resolveTopicToEoc(spec, 'Underwater Basket Weaving')).toBeNull()
    })

    it('is case-insensitive and trims whitespace', () => {
      const spec = loadEocSpec('2021')
      const hit = resolveTopicToEoc(spec, '  sets  ')
      expect(hit?.subSkillId).toBe('eoc2-sets')
      expect(hit?.verified).toBe(true)
    })
  })

  describe('validateStructure', () => {
    it('flags UNKNOWN_TOPIC and MISSING_SCENARIO / TOO_FEW_PARTS', () => {
      const spec = loadEocSpec('2021')
      const bad = GeneratedQuestion.parse({
        subjectCode: '2021',
        eocId: 'EoC2',
        topicTag: 'Not A Real Topic',
        formLevel: 'Form 4',
        componentType: 'FINAL_EXAM',
        scenarioContext: 'Too short',
        parts: [{ label: '(a)', text: 'Do something', marks: 5, bloomLevel: 'applying' }],
        keyCompetences: ['problem_solving'],
      })
      const issues = validateStructure(spec, bad)
      const codes = issues.map((i) => i.code)
      expect(codes).toContain('UNKNOWN_TOPIC')
      expect(codes).toContain('MISSING_SCENARIO')
      expect(codes).toContain('TOO_FEW_PARTS')
    })

    it('emits UNVERIFIED_EOC_MAPPING warning for Matrices (not an error)', () => {
      const spec = loadEocSpec('2021')
      const q = GeneratedQuestion.parse({
        subjectCode: '2021',
        eocId: 'EoC2',
        topicTag: 'Matrices',
        formLevel: 'Form 4',
        componentType: 'FINAL_EXAM',
        scenarioContext:
          'A Lusaka construction firm stores steel beam lengths in a 2 by 2 matrix for two project sites and needs to combine weekly deliveries before invoicing the Ministry of Works.',
        parts: [
          { label: '(a)', text: 'Write the combined matrix.', marks: 5, bloomLevel: 'applying' },
          { label: '(b)', text: 'Find the determinant.', marks: 5, bloomLevel: 'applying' },
          {
            label: '(c)',
            text: 'Interpret the inverse for scaling.',
            marks: 5,
            bloomLevel: 'applying',
          },
          { label: '(d)', text: 'Advise on a feasible order.', marks: 5, bloomLevel: 'evaluating' },
        ],
        keyCompetences: ['analytical_thinking', 'problem_solving'],
      })
      const issues = validateStructure(spec, q)
      const unverified = issues.find((i) => i.code === 'UNVERIFIED_EOC_MAPPING')
      expect(unverified).toBeTruthy()
      expect(unverified?.severity).toBe('warning')
      expect(issues.some((i) => i.severity === 'error')).toBe(false)
    })

    it('accepts a well-formed Sets FINAL_EXAM item structurally', () => {
      const spec = loadEocSpec('2021')
      const q = GeneratedQuestion.parse({
        subjectCode: '2021',
        eocId: 'EoC2',
        topicTag: 'Sets',
        formLevel: 'Form 4',
        componentType: 'FINAL_EXAM',
        scenarioContext:
          'A Chipata secondary school surveyed Form 4 learners about participation in football, netball, and the school choir. Some learners belong to more than one activity and the deputy head wants a clear Venn analysis before allocating kit.',
        parts: [
          {
            label: '(a)',
            text: 'Draw a Venn diagram for the three sets.',
            marks: 6,
            bloomLevel: 'understanding',
          },
          {
            label: '(b)',
            text: 'Find how many learners play only football.',
            marks: 5,
            bloomLevel: 'applying',
          },
          {
            label: '(c)',
            text: 'Find the intersection of netball and choir.',
            marks: 4,
            bloomLevel: 'applying',
          },
          {
            label: '(d)',
            text: 'Advise on kit numbers using set results.',
            marks: 5,
            bloomLevel: 'evaluating',
          },
        ],
        keyCompetences: ['analytical_thinking', 'critical_thinking', 'problem_solving'],
      })
      const issues = validateStructure(spec, q)
      expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0)
    })
  })
})
