import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  validateOldSyllabusJson,
  validatePastPaperJson,
} from '@/lib/curriculum/validateOldSyllabus'

describe('validateOldSyllabusJson', () => {
  it('accepts the Mathematics O-Level fixture', () => {
    const fixturePath = path.join(
      process.cwd(),
      'data/old-syllabus/fixtures/mathematics-o-level.json'
    )
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
    const result = validateOldSyllabusJson(data)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects outcomes missing a KSV key', () => {
    const bad = {
      subject: 'Mathematics',
      level: 'O-LEVEL',
      domains: ['Algebra'],
      gradeContent: [
        {
          grade: 10,
          topics: [
            {
              topicId: '10.1',
              topicName: 'SETS',
              domain: 'Algebra',
              subtopics: [
                {
                  subtopicId: '10.1.1',
                  subtopicName: 'Basics',
                  specificOutcomes: [
                    {
                      outcomeId: '10.1.1.1',
                      statement: 'Describe a set',
                      knowledge: ['symbols'],
                      skills: ['list'],
                      // values missing intentionally
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const result = validateOldSyllabusJson(bad)
    expect(result.valid).toBe(false)
  })
})

describe('validatePastPaperJson', () => {
  it('requires chooseCount for answer_n_of_m', () => {
    const paper = {
      paperNumber: 2,
      year: 2019,
      totalMarks: 100,
      durationMinutes: 150,
      calculatorAllowed: true,
      sections: [
        {
          sectionLabel: 'Section B',
          questionCount: 6,
          choiceRule: 'answer_n_of_m',
          totalMarks: 48,
        },
      ],
    }
    expect(validatePastPaperJson(paper).valid).toBe(false)

    paper.sections[0].chooseCount = 4
    expect(validatePastPaperJson(paper).valid).toBe(true)
  })
})
