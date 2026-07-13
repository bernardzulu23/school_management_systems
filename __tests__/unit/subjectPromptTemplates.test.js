import { describe, expect, it } from 'vitest'
import {
  buildSubjectContentPrompt,
  getSubjectPromptTemplate,
  resolveTemplateKey,
  SUBJECT_PROMPT_TEMPLATES,
} from '@/lib/ai/subjectPromptTemplates'
import {
  findSectionsInText,
  formatByType,
  formatSubjectContent,
  getContentTypeLabel,
  usesStoryControls,
} from '@/lib/ai/contentFormatters'

describe('subjectPromptTemplates', () => {
  it('maps Chemistry to LAB_PROCEDURE', () => {
    const t = getSubjectPromptTemplate('Chemistry')
    expect(t.type).toBe('LAB_PROCEDURE')
    expect(resolveTemplateKey('Chemistry')).toBe('Chemistry (Science)')
  })

  it('maps Mathematics to WORD_PROBLEMS', () => {
    expect(getSubjectPromptTemplate('Mathematics (Core)').type).toBe('WORD_PROBLEMS')
    expect(getContentTypeLabel('Math')).toMatch(/word problems/i)
  })

  it('maps English to COMPREHENSION and keeps story controls', () => {
    expect(getSubjectPromptTemplate('English (Core)').type).toBe('COMPREHENSION')
    expect(usesStoryControls('English (Core)')).toBe(true)
    expect(usesStoryControls('Chemistry (Science)')).toBe(false)
  })

  it('builds Chemistry prompt that is not an English story', () => {
    const prompt = buildSubjectContentPrompt({
      subject: 'Chemistry (Science)',
      grade: 'Form 3',
      topic: 'Atomic Structure',
      setting: 'a secondary school',
    })
    expect(prompt).toMatch(/LAB_PROCEDURE/)
    expect(prompt).toMatch(/Atomic Structure/)
    expect(prompt).toMatch(/Do NOT write an English comprehension story/)
    expect(prompt).not.toMatch(/Write a narrative story/i)
  })

  it('builds Math prompt with word problems and ZMW context', () => {
    const prompt = buildSubjectContentPrompt({
      subject: 'Mathematics (Core)',
      grade: 'Form 2',
      topic: 'Algebra',
    })
    expect(prompt).toMatch(/WORD_PROBLEMS/)
    expect(prompt).toMatch(/Algebra/)
    expect(prompt.toLowerCase()).toMatch(/kwacha|zmw|currency/)
  })

  it('builds English comprehension prompt without forbidding stories', () => {
    const prompt = buildSubjectContentPrompt({
      subject: 'English (Core)',
      grade: 'Form 3',
      topic: 'Friendship',
      storyType: 'story',
      includeQuestions: true,
    })
    expect(prompt).toMatch(/COMPREHENSION/)
    expect(prompt).toMatch(/Friendship/)
    expect(prompt).toMatch(/narrative story/i)
    expect(prompt).not.toMatch(/Do NOT write an English comprehension story/)
  })

  it('covers all template keys with type and sections', () => {
    const keys = Object.keys(SUBJECT_PROMPT_TEMPLATES)
    expect(keys.length).toBeGreaterThanOrEqual(24)
    for (const key of keys) {
      const t = SUBJECT_PROMPT_TEMPLATES[key]
      expect(t.type).toBeTruthy()
      expect(t.sections.length).toBeGreaterThan(0)
      expect(t.template).toMatch(/\{topic\}/)
    }
  })
})

describe('contentFormatters', () => {
  it('detects lab procedure sections', () => {
    const sample = `
EQUIPMENT NEEDED:
Beakers

SAFETY PRECAUTIONS:
Wear goggles

PROCEDURE:
1. Mix

OBSERVATIONS TO RECORD:
Colour change

ANALYSIS QUESTIONS:
1. Why?
`
    const { found, missing } = findSectionsInText(
      sample,
      getSubjectPromptTemplate('Chemistry').sections
    )
    expect(found.length).toBeGreaterThanOrEqual(4)
    expect(missing.length).toBeLessThanOrEqual(1)
  })

  it('appends missing section stubs for Chemistry', () => {
    const formatted = formatByType('Only a paragraph about atoms.', 'LAB_PROCEDURE', {
      type: 'LAB_PROCEDURE',
      label: 'Lab procedure',
      template: '',
      context: '',
      sections: ['EQUIPMENT NEEDED', 'SAFETY PRECAUTIONS'],
    })
    expect(formatted).toMatch(/EQUIPMENT NEEDED/)
    expect(formatted).toMatch(/SAFETY PRECAUTIONS/)
  })

  it('formatSubjectContent returns type metadata', () => {
    const result = formatSubjectContent({
      subject: 'History',
      aiOutput: 'TIMELINE:\n1964 Independence\n\nKEY FIGURES:\nKaunda',
    })
    expect(result.type).toBe('NARRATIVE_ANALYSIS')
    expect(result.label).toMatch(/historical/i)
    expect(result.sectionsFound).toContain('TIMELINE')
  })
})
