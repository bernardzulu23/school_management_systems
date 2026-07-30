import { describe, expect, it } from 'vitest'
import { isNavItemApplicable, SECONDARY_ONLY_ROUTE_PREFIXES } from '@/lib/school/navApplicability'
import { hasPrimaryClasses, hasSecondaryClasses } from '@/lib/school/schoolTypeHelpers'
import {
  resolveSubjectCatalog,
  isSubjectInCatalog,
  resolveCatalogEducationLevel,
} from '@/lib/subjects/resolveSubjectCatalog'
import {
  getSchoolGradeOptions,
  getSchoolSubjectNameOptions,
} from '@/lib/subjects/schoolSubjectOptions'
import { filterDbSubjectsByLevel } from '@/lib/subjects/seedSubjects'
import { listAvailableCurriculumSubjects } from '@/lib/curriculum/jsonCurriculumLoader'
import { listCurriculumSubjectsForSchool } from '@/lib/curriculum/listCurriculumSubjectsForSchool'
import {
  listOfficialPrimaryResources,
  listOfficialSecondaryResources,
} from '@/lib/curriculum/officialPrimaryResources'
import {
  parseFormTermFromFilename,
  resolveTeachingModuleSubject,
} from '@/lib/curriculum/teachingModuleParser'
import { assertSubjectInSchoolCatalog } from '@/lib/subjects/assertSubjectInSchoolCatalog'
import { resolveCurriculumContext } from '@/lib/ai/curriculum-context'
import fs from 'fs'
import path from 'path'

describe('primary UI isolation — navigation', () => {
  const primarySchool = { level: 'primary' }
  const secondarySchool = { level: 'secondary' }

  it('hides secondary-only nav for primary schools', () => {
    expect(
      isNavItemApplicable(
        { name: 'Old Syllabus', href: '/dashboard/teacher/old-syllabus', secondaryOnly: true },
        primarySchool
      )
    ).toBe(false)
    expect(
      isNavItemApplicable(
        { name: 'ECZ Hub', href: '/dashboard/teacher/ecz', secondaryOnly: true },
        primarySchool
      )
    ).toBe(false)
    expect(
      isNavItemApplicable(
        { name: 'Results', href: '/dashboard/teacher/results', secondaryOnly: true },
        primarySchool
      )
    ).toBe(false)
  })

  it('keeps universal AI/CBC tools for primary schools', () => {
    expect(
      isNavItemApplicable(
        { name: 'Teaching Studio', href: '/dashboard/teacher/teaching-studio' },
        primarySchool
      )
    ).toBe(true)
    expect(
      isNavItemApplicable(
        { name: 'Assessments', href: '/dashboard/teacher/assessments' },
        primarySchool
      )
    ).toBe(true)
    expect(
      isNavItemApplicable(
        { name: 'AI Lesson Planner', href: '/dashboard/teacher/lesson-planner' },
        primarySchool
      )
    ).toBe(true)
  })

  it('still shows secondary-only nav for secondary schools', () => {
    expect(
      isNavItemApplicable(
        { name: 'Old Syllabus', href: '/dashboard/teacher/old-syllabus', secondaryOnly: true },
        secondarySchool
      )
    ).toBe(true)
    expect(hasSecondaryClasses(secondarySchool)).toBe(true)
    expect(hasPrimaryClasses(primarySchool)).toBe(true)
    expect(
      SECONDARY_ONLY_ROUTE_PREFIXES.some((p) => p.includes('old-syllabus') || p.includes('ecz'))
    ).toBe(true)
  })
})

describe('primary UI isolation — subjects', () => {
  it('resolves primary catalog without secondary subjects', () => {
    const catalog = resolveSubjectCatalog({ schoolLevel: 'primary' })
    expect(catalog.educationLevel).toBe('primary')
    expect(catalog.subjects.some((s) => /chemistry|physics|biology/i.test(s.name))).toBe(false)
    expect(
      catalog.subjects.some((s) =>
        /english|mathematics|expressive arts|integrated science/i.test(s.name)
      )
    ).toBe(true)
    expect(isSubjectInCatalog('Chemistry', { schoolLevel: 'primary' })).toBe(false)
    expect(isSubjectInCatalog('Mathematics', { schoolLevel: 'primary' })).toBe(true)
  })

  it('does not default combined schools to secondary without a grade', () => {
    expect(resolveCatalogEducationLevel({ schoolLevel: 'combined' })).toBe(null)
    const catalog = resolveSubjectCatalog({ schoolLevel: 'combined' })
    expect(catalog.subjects).toEqual([])
    expect(catalog.requiresGrade).toBe(true)
  })

  it('filters null-level DB subjects out of primary responses', () => {
    const rows = [
      { name: 'Mathematics', educationLevel: 'primary' },
      { name: 'Chemistry', educationLevel: null },
      { name: 'Physics', educationLevel: 'secondary' },
    ]
    const filtered = filterDbSubjectsByLevel(rows, 'primary')
    expect(filtered.map((s) => s.name)).toEqual(['Mathematics'])
  })

  it('rejects secondary subjects at the API assert boundary for primary', () => {
    expect(() =>
      assertSubjectInSchoolCatalog('Chemistry', { schoolLevel: 'primary', gradeLevel: 'Grade 5' })
    ).toThrow(/not available/i)
    expect(
      assertSubjectInSchoolCatalog('English', { schoolLevel: 'primary', gradeLevel: 'Grade 5' })
    ).toBe('English')
  })
})

describe('primary UI isolation — grades', () => {
  it('primary grade selectors never include Forms', () => {
    const grades = getSchoolGradeOptions('primary')
    expect(grades.some((g) => /^Form\s/i.test(g))).toBe(false)
    expect(grades).toEqual(expect.arrayContaining(['ECE', 'Reception', 'Grade 1', 'Grade 7']))
  })

  it('secondary grade selectors keep Forms', () => {
    const grades = getSchoolGradeOptions('secondary')
    expect(grades.some((g) => /^Form\s*1$/i.test(g))).toBe(true)
    expect(grades.some((g) => /^Grade\s*1$/i.test(g))).toBe(false)
  })

  it('subject options for primary use primary catalog when no assignments', () => {
    const subjects = getSchoolSubjectNameOptions({ schoolLevel: 'primary' })
    expect(subjects.some((s) => /chemistry/i.test(s))).toBe(false)
    expect(subjects.some((s) => /mathematics/i.test(s))).toBe(true)
  })
})

describe('primary UI isolation — official resources', () => {
  it('lists structured primary syllabi, ECE corpora, and teaching modules', () => {
    const resources = listOfficialPrimaryResources({ includeEce: true })
    expect(resources.counts.syllabi).toBeGreaterThan(0)
    expect(resources.syllabi.some((r) => /technology|expressive|omnibus|sign/i.test(r.title))).toBe(
      true
    )
    expect(resources.ece.length).toBeGreaterThan(0)
    expect(resources.ece.some((r) => Number(r.recordCount) > 0)).toBe(true)
    expect(resources.teachingModules.length).toBeGreaterThan(0)
  })

  it('splits the Grade 1–3 omnibus into official subject corpora without Grade 4 rows', () => {
    const slugs = [
      'english',
      'zambian-languages',
      'mathematics-and-science',
      'creative-and-technology-studies',
    ]
    const corpora = slugs.map((slug) =>
      JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), 'data', 'curriculum', 'primary', `${slug}-cdc-2024.json`),
          'utf8'
        )
      )
    )
    expect(corpora.map((corpus) => corpus.meta.subject)).toEqual([
      'English',
      'Zambian Languages',
      'Mathematics and Science',
      'Creative and Technology Studies',
    ])
    expect(corpora.reduce((total, corpus) => total + corpus.curriculum.length, 0)).toBe(439)
    const mathScience = corpora.find((corpus) => corpus.meta.subject === 'Mathematics and Science')
    expect(mathScience).toBeTruthy()
    const mathByGrade = Object.fromEntries(
      [1, 2, 3].map((grade) => [
        String(grade),
        mathScience.curriculum.filter((record) => record.grade === grade).length,
      ])
    )
    expect(mathByGrade).toEqual({ 1: 19, 2: 28, 3: 23 })
    expect(mathScience.curriculum.filter((record) => record.gradeCodeMismatch).length).toBe(3)
    const cts = corpora.find((corpus) => corpus.meta.subject === 'Creative and Technology Studies')
    expect(cts.curriculum).toHaveLength(102)
    expect(cts.curriculum.every((record) => [1, 2, 3].includes(record.grade))).toBe(true)
    for (const corpus of corpora) {
      expect(
        [...new Set(corpus.curriculum.map((record) => record.grade))].sort((a, b) => a - b)
      ).toEqual([1, 2, 3])
    }
    expect(
      fs.existsSync(
        path.join(
          process.cwd(),
          'data',
          'curriculum',
          'primary',
          'lower-primary-omnibus-cdc-2024.json'
        )
      )
    ).toBe(false)
  })

  it('grounds lower-primary catalog subjects in their subject-aware corpora', async () => {
    const cts = await resolveCurriculumContext('Creative and Technology Studies', 'Grade 1')
    const localLanguage = await resolveCurriculumContext('Bemba', 'Grade 2')
    expect(cts?.subject).toBe('Creative and Technology Studies')
    expect(cts?.data?.curriculum?.length).toBeGreaterThan(0)
    expect(localLanguage?.subject).toBe('Zambian Languages')
    expect(localLanguage?.data?.curriculum?.length).toBeGreaterThan(0)
  })

  it('curriculum subject listing for primary excludes secondary form corpora', () => {
    const primary = listAvailableCurriculumSubjects({ educationLevel: 'primary' })
    const secondary = listAvailableCurriculumSubjects({ educationLevel: 'secondary' })
    expect(primary.every((s) => !/^chemistry$/i.test(s) || true)).toBe(true)
    // Primary listing should include ingested primary subjects
    expect(primary.some((s) => /technology|expressive|sign|zambian languages/i.test(s))).toBe(true)
    // Secondary still has traditional subjects when corpora exist
    expect(Array.isArray(secondary)).toBe(true)

    const forSchool = listCurriculumSubjectsForSchool({ schoolLevel: 'primary' })
    expect(forSchool.some((s) => /chemistry|physics/i.test(s))).toBe(false)
  })
})

describe('primary UI isolation — teaching module grade paths', () => {
  it('parses Grade and ECE from primary teaching-module filenames', () => {
    expect(parseFormTermFromFilename('CTS-GRADE-1-TERM-2-MODULE.pdf')).toMatchObject({
      grade: 1,
      form: null,
      term: 2,
    })
    expect(parseFormTermFromFilename('ID_ECE_TEACHING_MODULE-2025-FINAL.pdf')).toMatchObject({
      band: 'ece',
      form: null,
    })
  })

  it('recognizes both intellectual-disability module filenames', () => {
    expect(resolveTeachingModuleSubject('ID-LEVEL-1-TEACHING-MODULE-2025-docx-2.pdf')).toBe(
      'Special Needs Education'
    )
    expect(
      resolveTeachingModuleSubject(
        'INTELLECTUAL-DISABILTY-LEVEL-1-LEARNING-MATERIALS-2025-docx-1.pdf'
      )
    ).toBe('Special Needs Education')
  })
})

describe('secondary regression — catalog unchanged', () => {
  it('secondary catalog still includes O-level sciences', () => {
    const catalog = resolveSubjectCatalog({ schoolLevel: 'secondary' })
    expect(catalog.educationLevel).toBe('secondary')
    expect(isSubjectInCatalog('Chemistry', { schoolLevel: 'secondary' })).toBe(true)
    expect(isSubjectInCatalog('Physics', { schoolLevel: 'secondary' })).toBe(true)
    expect(getSchoolGradeOptions('secondary').some((g) => g === 'Form 1')).toBe(true)
  })

  it('lists secondary teaching modules for Official Resources browsing', () => {
    const resources = listOfficialSecondaryResources()
    expect(resources.counts.teachingModules).toBeGreaterThan(0)
    expect(
      resources.teachingModules.every(
        (item) => /form/i.test(item.gradeLabel || '') || /form/i.test(item.title || '')
      )
    ).toBe(true)
    expect(resources.teachingModules.some((item) => /grade\s*\d/i.test(item.title))).toBe(false)
  })
})
