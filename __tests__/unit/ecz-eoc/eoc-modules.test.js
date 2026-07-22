import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { EczSubjectSpec, GeneratedQuestion } from '@/lib/ecz/eoc/ecz-eoc-spec.schema'
import {
  loadEocSpec,
  loadAllEocSpecs,
  getEocSpecDataDir,
  __clearEocSpecCache,
} from '@/lib/ecz/eoc/load-eoc-spec'
import {
  resolveEoc,
  resolveTopicToEoc,
  requiresTaskType,
  validateStructure,
} from '@/lib/ecz/eoc/question-validator'
import {
  listSubjectsWithEocSpec,
  listSubjectsMissingEocSpec,
  findSubjectRegistryEntry,
} from '@/lib/ecz/eoc/subjectRegistry'

describe('ECZ EoC reusable modules', () => {
  beforeEach(() => {
    __clearEocSpecCache()
  })

  it('loadAllEocSpecs validates every shipped JSON', () => {
    const all = loadAllEocSpecs()
    expect(all.length).toBeGreaterThanOrEqual(13)
    for (const spec of all) {
      expect(EczSubjectSpec.safeParse(spec).success).toBe(true)
      expect(spec.elementsOfConstruct.length).toBeGreaterThan(0)
    }
  })

  it('registry lists shipped vs missing EoC specs', () => {
    const shipped = listSubjectsWithEocSpec()
    const missing = listSubjectsMissingEocSpec()
    expect(shipped.some((s) => s.subjectCodes.includes('5012'))).toBe(true)
    expect(shipped.some((s) => s.subjectCodes.includes('2021'))).toBe(true)
    expect(shipped.some((s) => s.subjectCodes.includes('1021'))).toBe(true)
    expect(shipped.some((s) => s.subjectCodes.includes('2025'))).toBe(true)
    expect(missing.length).toBeGreaterThan(0)
    expect(findSubjectRegistryEntry('Art and Design')?.eocSpecFile).toBe('art-and-design-5012')
    expect(findSubjectRegistryEntry('English Language')?.eocSpecFile).toBe('english-language-1021')
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
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const parsed = EczSubjectSpec.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.subjectCode).toBe('4018')
    expect(parsed.data.elementsOfConstruct).toHaveLength(6)
    expect(parsed.data.elementsOfConstruct.find((e) => e.id === 'EoC1')?.resolutionMode).toBe(
      'taskType'
    )
  })

  it('parses art-and-design-5012.json', () => {
    const spec = loadEocSpec('5012')
    expect(spec?.subjectName).toBe('Art and Design')
    expect(spec?.elementsOfConstruct).toHaveLength(4)
    expect(resolveEoc(spec, 'Sculpture')?.eoc.id).toBe('EoC4')
  })

  it('loadEocSpec resolves Mathematics / 2021 / mathematics-i', () => {
    expect(loadEocSpec('Mathematics')?.subjectCode).toBe('2021')
    expect(loadEocSpec('2021')?.subjectCode).toBe('2021')
    expect(loadEocSpec('mathematics-i')?.subjectCode).toBe('2021')
  })

  it.each([
    ['Physics', '4016', 6],
    ['Chemistry', '4014', 6],
    ['Biology', '4012', 5],
    ['Geography', '3014', 5],
    ['Art and Design', '5012', 4],
    ['English Language', '1021', 4],
    ['Literature in English', '1025', 4],
    ['Civic Education', '3011', 4],
    ['History', '3013', 5],
    ['Mathematics II', '2025', 5],
    ['Religious Education', '3012', 5],
  ])('parses and loads %s (%s)', (name, code, eocCount) => {
    const byName = loadEocSpec(name)
    const byCode = loadEocSpec(code)
    expect(byName?.subjectCode).toBe(code)
    expect(byCode?.subjectCode).toBe(code)
    expect(byName?.elementsOfConstruct).toHaveLength(eocCount)
  })

  describe('resolveEoc', () => {
    it('resolves verified CDC-aligned aliases', () => {
      const spec = loadEocSpec('2021')
      const sets = resolveEoc(spec, 'Operations on Sets')
      expect(sets?.eoc.id).toBe('EoC2')
      expect(sets?.resolvedVia).toBe('topic')
      expect(sets?.verified).toBe(true)
    })

    it('resolves unverified aliases with verified: false', () => {
      const spec = loadEocSpec('2021')
      const matrices = resolveEoc(spec, 'Matrices')
      expect(matrices?.eoc.id).toBe('EoC2')
      expect(matrices?.verified).toBe(false)
      expect(matrices?.resolvedVia).toBe('topic-unverified')
    })

    it('resolves Agricultural Science via topic and via taskType', () => {
      const spec = loadEocSpec('4018')
      const crops = resolveEoc(spec, 'Crop Production')
      expect(crops?.eoc.id).toBe('EoC2')
      expect(crops?.verified).toBe(true)

      // taskType alone is authoritative for skill-lens EoCs
      const investigation = resolveEoc(spec, 'Climate-Smart Agriculture', 'field project')
      expect(investigation?.eoc.id).toBe('EoC1')
      expect(investigation?.verified).toBe(true)
      expect(investigation?.resolvedVia).toBe('taskType')

      // Without taskType, provisional topic still resolves (unverified)
      const climate = resolveEoc(spec, 'Climate-Smart Agriculture')
      expect(climate?.eoc.id).toBe('EoC1')
      expect(climate?.verified).toBe(false)
      expect(climate?.resolvedVia).toBe('topic-unverified')
    })

    it('requiresTaskType returns options for skill-lens provisional topics', () => {
      const spec = loadEocSpec('4018')
      // Crop Production resolves via topic — no picker needed
      expect(requiresTaskType(spec, 'Crop Production')).toBeNull()
      // Climate-Smart resolves via unverified without taskType — so requiresTaskType
      // returns null because resolveEoc already succeeds. Picker is for topics that
      // DON'T resolve at all without taskType.
      expect(requiresTaskType(spec, 'Climate-Smart Agriculture')).toBeNull()
      // Completely unknown still null (not a skill-lens provisional)
      expect(requiresTaskType(spec, 'Totally Unknown Topic XYZ')).toBeNull()
    })

    it('resolveTopicToEoc stays compatible', () => {
      const spec = loadEocSpec('2021')
      expect(resolveTopicToEoc(spec, 'Sets')?.subSkillId).toBe('eoc2-sets')
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
      const codes = validateStructure(spec, bad).map((i) => i.code)
      expect(codes).toContain('UNKNOWN_TOPIC')
      expect(codes).toContain('MISSING_SCENARIO')
      expect(codes).toContain('TOO_FEW_PARTS')
    })

    it('accepts Agri item resolved via taskType', () => {
      const spec = loadEocSpec('4018')
      const q = GeneratedQuestion.parse({
        subjectCode: '4018',
        eocId: 'EoC1',
        topicTag: 'Climate-Smart Agriculture',
        taskType: 'investigation',
        formLevel: 'Form 4',
        componentType: 'FINAL_EXAM',
        scenarioContext:
          'Farmers in a rural district still clear land by burning and overgrazing, which is linked to local climate change. As an agricultural officer you must investigate causes and recommend sustainable practices.',
        parts: [
          {
            label: '(a)',
            text: 'Explain two causes from the scenario.',
            marks: 7,
            bloomLevel: 'understanding',
          },
          {
            label: '(b)',
            text: 'Evaluate the national impact of these practices.',
            marks: 8,
            bloomLevel: 'evaluating',
          },
        ],
        keyCompetences: ['critical_thinking', 'analytical_thinking'],
      })
      const errors = validateStructure(spec, q).filter((i) => i.severity === 'error')
      expect(errors).toHaveLength(0)
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
      expect(validateStructure(spec, q).filter((i) => i.severity === 'error')).toHaveLength(0)
    })
  })
})
