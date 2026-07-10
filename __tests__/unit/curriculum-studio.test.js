import { describe, expect, it } from 'vitest'
import {
  extractGrade,
  extractSubject,
  extractUnits,
  extractOutcomes,
} from '@/lib/curriculum/syllabusParsing'
import { distributeUnitsAcrossTerm } from '@/lib/curriculum/schemeOfWorkGenerator'

describe('syllabusParsing extractors', () => {
  const sample = `
Syllabus: Chemistry
Form 2

Unit 1: Atomic Structure
Learning outcomes
- Describe the structure of an atom
- Explain protons, neutrons and electrons
Suggested activities
- Build a model of an atom using local materials
Assessment
- Oral questions and short quiz

Unit 2: Periodic Table
Learning outcomes
- Locate elements on the periodic table
Suggested activities
- Group elements by properties
`

  it('extracts subject and grade', () => {
    expect(extractSubject(sample)).toMatch(/Chemistry/i)
    expect(extractGrade(sample)).toBe('Form 2')
  })

  it('extracts units with outcomes', () => {
    const units = extractUnits(sample)
    expect(units.length).toBeGreaterThanOrEqual(2)
    expect(units[0].title).toMatch(/Atomic Structure/i)
    expect(extractOutcomes(sample).length).toBeGreaterThan(0)
  })
})

describe('distributeUnitsAcrossTerm', () => {
  it('fills 12 weeks from fewer units', () => {
    const weeks = distributeUnitsAcrossTerm(
      [
        {
          title: 'A',
          topics: ['t1'],
          outcomes: ['o1'],
          activities: ['a1'],
          assessment: ['quiz'],
          resources: [],
          sortOrder: 0,
        },
        {
          title: 'B',
          topics: [],
          outcomes: [],
          activities: [],
          assessment: [],
          resources: [],
          sortOrder: 1,
        },
      ],
      12
    )
    expect(weeks).toHaveLength(12)
    expect(weeks[0].week).toBe(1)
    expect(weeks[0].topic).toContain('A')
  })

  it('returns placeholders when no units', () => {
    const weeks = distributeUnitsAcrossTerm([], 4)
    expect(weeks).toHaveLength(4)
    expect(weeks[0].topic).toMatch(/to be planned/i)
  })
})
