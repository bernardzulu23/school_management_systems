import { describe, it, expect, beforeEach } from 'vitest'
import {
  resolveCurriculumContext,
  buildCurriculumContextBlock,
  __clearCurriculumContextCache,
} from '@/lib/ai/curriculum-context'
import { buildChemistryCurriculumContext } from '@/lib/curriculum/chemistry-cdc-2024'
import { loadJsonCurriculum } from '@/lib/curriculum/jsonCurriculumLoader'

function unitHasContent(unit) {
  if (!unit) return false
  const buckets = [unit.topics, unit.outcomes, unit.activities, unit.assessment]
  return buckets.some((b) => Array.isArray(b) && b.some((x) => String(x || '').trim()))
}

describe('generic two-tier curriculum context resolver', () => {
  beforeEach(() => {
    __clearCurriculumContextCache()
  })

  // Dedicated tier-1 CDC corpora ingested from Syllabus/*.pdf
  const dedicatedCdcSubjects = [
    'Agricultural Science',
    'Art and Design',
    'Biology',
    'Civic Education',
    'Commerce',
    'Computer Science',
    'Computer Studies',
    'Design and Technology',
    'English',
    'Fashion and Fabrics',
    'Food and Nutrition',
    'French',
    'Geography',
    'History',
    'Hospitality Management',
    'Literature in English',
    'Mathematics',
    'Music',
    'Physical Education',
    'Physics',
    'Religious Education',
    'Travel and Tourism',
    'Zambian Languages',
  ]

  for (const subject of dedicatedCdcSubjects) {
    it(`grounds ${subject} from dedicated CDC corpus (tier 1)`, async () => {
      const corpus = await resolveCurriculumContext(subject, 'Form 1')
      expect(corpus).not.toBeNull()
      expect(corpus.type).toBe('cdc')

      const ctx = buildCurriculumContextBlock(corpus, '', { limit: 5 })
      expect(ctx.enabled).toBe(true)
      expect(ctx.block.trim().length).toBeGreaterThan(0)
      expect(ctx.block).toContain('[CDC 1]')
      expect(ctx.block).toContain(`Zambia CDC 2024 ${subject} Syllabus`)
      expect(ctx.refs.length).toBeGreaterThan(0)
    })
  }

  it('aliases Principles of Accounts to the Commerce corpus', async () => {
    const corpus = await resolveCurriculumContext('Principles of Accounts', 'Form 1')
    expect(corpus).not.toBeNull()
    expect(corpus.type).toBe('cdc')
    expect(corpus.slug).toBe('commerce')
  })

  it('aliases Musical Arts to the Music corpus', async () => {
    const corpus = await resolveCurriculumContext('Musical Arts', 'Form 1')
    expect(corpus).not.toBeNull()
    expect(corpus.slug).toBe('music')
  })

  // Teaching-module-derived form1-4 unit files (cleaned by scripts/clean-curriculum-noise.mjs).
  // These subjects also have Tier-1 CDC corpora; this assertion covers the unit-format
  // fallback path and confirms OCR cleanup left grounding-useful content.
  const cleanedUnitSubjects = [
    'Art and Design',
    'Civic Education',
    'Computer Studies',
    'Design and Technology',
    'Food and Nutrition',
    'French',
    'Geography',
    'History',
    'Mathematics',
    'Religious Education',
    'Travel and Tourism',
    'Zambian Languages',
  ]

  for (const subject of cleanedUnitSubjects) {
    it(`ships a cleaned form1-4 unit corpus for ${subject}`, () => {
      const loaded = loadJsonCurriculum(subject, 'Form 1')
      expect(loaded).not.toBeNull()
      expect(loaded.units.some((u) => unitHasContent(u))).toBe(true)

      const hay = JSON.stringify(loaded.units)
      expect(hay).not.toMatch(/\.{5,}/)
      expect(hay).not.toMatch(/MINISTRY\s*OF\s*EDUCATION/i)
      expect(hay).not.toMatch(/permanent secretary/i)
    })
  }

  // Official CDC Ordinary Level Form 1–4 syllabi transformed into unit JSON
  // (scripts/populate-curriculum-from-syllabus-extracts.mjs).
  for (const subject of ['Computer Science', 'Hospitality Management']) {
    it(`ships an authoritative form1-4 unit corpus for ${subject}`, () => {
      const loaded = loadJsonCurriculum(subject, 'Form 1')
      expect(loaded).not.toBeNull()
      expect(loaded.units.some((u) => unitHasContent(u))).toBe(true)
      expect(loaded.units.length).toBeGreaterThan(5)
    })
  }

  it('returns null for a subject with no curriculum corpus', async () => {
    const corpus = await resolveCurriculumContext('Underwater Basket Weaving', 'Form 1')
    expect(corpus).toBeNull()
    expect(buildCurriculumContextBlock(corpus, 'anything')).toEqual({
      block: '',
      refs: [],
      enabled: false,
      records: [],
    })
  })

  it('resolves Chemistry via its dedicated CDC corpus (tier 1)', async () => {
    const corpus = await resolveCurriculumContext('Chemistry', 'Form 1')
    expect(corpus).not.toBeNull()
    expect(corpus.type).toBe('cdc')
  })

  it('REGRESSION: Chemistry output is byte-identical to the legacy path', async () => {
    const params = {
      subject: 'Chemistry',
      gradeLevel: 'Form 1',
      query: 'laboratory safety waste management',
      limit: 2,
    }

    const legacy = buildChemistryCurriculumContext(params)

    const corpus = await resolveCurriculumContext(params.subject, params.gradeLevel)
    const next = buildCurriculumContextBlock(corpus, params.query, { limit: params.limit })

    expect(next.block).toBe(legacy.block)
    expect(next.refs).toEqual(legacy.refs)
    expect(next.records).toEqual(legacy.records)
    expect(next.source).toBe(legacy.source)
    // Sanity: the regression covers real content, not two empty strings.
    expect(next.block).toContain('[CDC 1]')
    expect(next.refs).toHaveLength(2)
  })
})
