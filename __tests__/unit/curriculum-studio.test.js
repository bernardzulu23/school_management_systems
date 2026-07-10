import { describe, expect, it } from 'vitest'
import {
  extractGrade,
  extractSubject,
  extractUnits,
  extractOutcomes,
  isValidCurriculumSubject,
} from '@/lib/curriculum/syllabusParsing'
import { parsedToCurriculumJSON, slugifySubject } from '@/lib/curriculum/syllabusParser'
import { distributeUnitsAcrossTerm } from '@/lib/curriculum/schemeOfWorkGenerator'
import { exportSchemeToCsv } from '@/lib/curriculum/schemeOfWorkExport'
import { loadJsonCurriculum, unitsFromCurriculumJSON } from '@/lib/curriculum/jsonCurriculumLoader'
import {
  extractLessonsFromModuleText,
  parseFormTermFromFilename,
  resolveTeachingModuleSubject,
} from '@/lib/curriculum/teachingModuleParser'
import { matchLessonToTopic } from '@/lib/curriculum/teachingModuleLoader'

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

  it('prefers filename and rejects topic-like subjects', () => {
    expect(extractSubject('Verb Agreement\nGreetings...', 'ENGLISH-LANGUAGE-SYLLABUS.pdf')).toMatch(
      /English/i
    )
    expect(extractSubject('ENGLISH LANGUAGE SYLLABUS SECONDARY EDUCATION')).toMatch(/English/i)
    expect(isValidCurriculumSubject('Verb Agreement')).toBe(false)
    expect(isValidCurriculumSubject('General')).toBe(false)
    expect(isValidCurriculumSubject('Chemistry')).toBe(true)
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

describe('curriculum JSON loader + CSV export', () => {
  it('loads physics form1-4 sample JSON', () => {
    const loaded = loadJsonCurriculum('Physics', 'Form 2')
    expect(loaded).not.toBeNull()
    expect(loaded?.units.length).toBeGreaterThan(0)
    expect(loaded?.subject).toMatch(/Physics/i)
  })

  it('loads chemistry form1-4 with duration weekHints', () => {
    const loaded = loadJsonCurriculum('Chemistry', 'Form 2')
    expect(loaded).not.toBeNull()
    expect(loaded?.units.length).toBe(9)
    expect(loaded?.units[0].title).toMatch(/Atomic Structure/i)
    expect(loaded?.units[0].weekHint).toBe(3)
  })

  it('allocates weeks by unit duration when weekHint set', () => {
    const weeks = distributeUnitsAcrossTerm(
      [
        {
          title: 'A',
          topics: ['t1', 't2', 't3'],
          outcomes: ['o'],
          activities: ['a'],
          assessment: ['quiz'],
          resources: [],
          weekHint: 3,
          sortOrder: 0,
        },
        {
          title: 'B',
          topics: ['x'],
          outcomes: [],
          activities: [],
          assessment: [],
          resources: [],
          weekHint: 2,
          sortOrder: 1,
        },
      ],
      5
    )
    expect(weeks).toHaveLength(5)
    expect(weeks[0].topic).toContain('A')
    expect(weeks[3].topic).toContain('B')
  })

  it('maps CurriculumJSON units', () => {
    const units = unitsFromCurriculumJSON({
      subject: 'Test',
      units: [
        {
          unitNumber: 1,
          title: 'Unit A',
          topics: ['t1'],
          learningOutcomes: ['o1'],
          suggestedActivities: ['a1'],
          assessmentMethods: ['quiz'],
        },
      ],
    })
    expect(units[0].outcomes).toEqual(['o1'])
    expect(units[0].assessment).toEqual(['quiz'])
  })

  it('builds CurriculumJSON from parsed syllabus', () => {
    const json = parsedToCurriculumJSON({
      subject: 'Chemistry',
      grade: 'Form 2',
      units: [
        {
          title: 'Atoms',
          topics: ['nucleus'],
          outcomes: ['Describe atoms'],
          activities: ['Model'],
          assessment: ['Quiz'],
          resources: [],
          sortOrder: 0,
        },
      ],
      learningOutcomes: [],
      suggestedActivities: [],
      rawTextLength: 100,
    })
    expect(slugifySubject(json.subject)).toBe('chemistry')
    expect(json.units[0].learningOutcomes).toContain('Describe atoms')
  })

  it('exports scheme CSV with header row', () => {
    const csv = exportSchemeToCsv({
      subject: 'Physics',
      gradeOrForm: 'Form 1',
      term: 'Term 1',
      year: 2026,
      weeks: [
        {
          week: 1,
          topic: 'Intro',
          learningOutcomes: ['a'],
          teachingActivities: ['b'],
          assessmentMethod: 'quiz',
          assessmentMethods: ['quiz'],
          resources: [],
          notes: 'n',
          teacherNotes: 'n',
          homeworkTask: 'hw',
        },
      ],
    })
    expect(csv).toContain('Week,Topic')
    expect(csv).toContain('Intro')
  })
})

describe('teaching module parser', () => {
  it('parses form and term from filename', () => {
    expect(parseFormTermFromFilename('Chemistry-Teaching-Module-Form-1-final.pdf')).toEqual({
      form: 1,
      term: null,
    })
    expect(
      parseFormTermFromFilename('ENGLISH-LANGUAGE-TEACHING-MODULE-FORM-1-TERM-3-1.pdf')
    ).toEqual({
      form: 1,
      term: 3,
    })
  })

  it('resolves subject from teaching-module filename', () => {
    expect(resolveTeachingModuleSubject('Chemistry-Teaching-Module-Form-1-final.pdf')).toBe(
      'Chemistry'
    )
    expect(
      resolveTeachingModuleSubject('Physics-Teaching-Module-Form-1Highridge-Feb-2025-1.pdf')
    ).toBe('Physics')
    expect(resolveTeachingModuleSubject('MATHEMATICS-1-MODULE-FINAL.pdf')).toBe('Mathematics')
  })

  it('extracts lessons from week headings', () => {
    const lessons = extractLessonsFromModuleText(`
Week 1: Introduction to matter
Teaching activities
- Demonstrate solids liquids gases
Resources
- Charts
Assessment
- Oral questions

Week 2: Atomic models
Activities
- Build atom models
`)
    expect(lessons.length).toBeGreaterThanOrEqual(2)
    expect(lessons[0].title).toMatch(/matter/i)
    expect(lessons[0].activities.length).toBeGreaterThan(0)
  })

  it('matches lessons to topics by similarity', () => {
    const lesson = matchLessonToTopic(
      [
        {
          title: 'Atomic Structure',
          topics: ['protons'],
          activities: ['model building'],
          resources: [],
          assessment: [],
          notes: '',
        },
      ],
      'Atomic Structure: Electron configuration'
    )
    expect(lesson?.title).toMatch(/Atomic/i)
  })
})
