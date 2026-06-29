import { describe, it, expect } from 'vitest'
import { formatCurriculumRecord } from '@/lib/curriculum/format-chunk'
import {
  getChemistryCurriculumMeta,
  getChemistryCurriculumRecords,
  searchChemistryCurriculum,
  subjectIsChemistry,
  normalizeForm,
  buildChemistryCurriculumContext,
} from '@/lib/curriculum/chemistry-cdc-2024'

describe('chemistry-cdc-2024 curriculum dataset', () => {
  it('loads 82 official CDC chemistry subtopic records', () => {
    const meta = getChemistryCurriculumMeta()
    const records = getChemistryCurriculumRecords()
    expect(meta.title).toMatch(/Chemistry/i)
    expect(meta.forms).toEqual([1, 2, 3, 4])
    expect(records).toHaveLength(82)
    expect(records[0].id).toBe('F1-T1-S1')
  })

  it('formats one record as a single embeddable chunk', () => {
    const record = getChemistryCurriculumRecords()[0]
    const text = formatCurriculumRecord(record, getChemistryCurriculumMeta())
    expect(text).toContain('Branches of Chemistry')
    expect(text).toContain('Specific competences:')
    expect(text).toContain('F1-T1-S1')
  })

  it('matches chemistry subject aliases', () => {
    expect(subjectIsChemistry('Chemistry')).toBe(true)
    expect(subjectIsChemistry('chem')).toBe(true)
    expect(subjectIsChemistry('Physics')).toBe(false)
  })

  it('normalizes form from grade labels', () => {
    expect(normalizeForm('Form 3')).toBe(3)
    expect(normalizeForm('form 1')).toBe(1)
  })

  it('searches by topic keywords and form', () => {
    const hits = searchChemistryCurriculum({
      form: 2,
      query: 'ionic bonding',
      limit: 3,
    })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].subtopic.toLowerCase()).toContain('ionic')
    expect(hits.every((r) => r.form === 2)).toBe(true)
  })

  it('builds RAG block for chemistry lesson/quiz prompts', () => {
    const ctx = buildChemistryCurriculumContext({
      subject: 'Chemistry',
      gradeLevel: 'Form 1',
      query: 'laboratory safety waste management',
      limit: 2,
    })
    expect(ctx.enabled).toBe(true)
    expect(ctx.block).toContain('[CDC 1]')
    expect(ctx.block).toMatch(/Safety|Waste/i)
    expect(ctx.refs).toHaveLength(2)
  })

  it('returns empty context for non-chemistry subjects', () => {
    const ctx = buildChemistryCurriculumContext({
      subject: 'Mathematics',
      query: 'algebra',
    })
    expect(ctx.enabled).toBe(false)
    expect(ctx.block).toBe('')
  })
})
