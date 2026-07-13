import { resolveEducationLevelFromGrade } from '@/lib/subjects/resolveSubjectCatalog'
import { ECZ_BLOOM_TARGETS, ECZ_ZAMBIAN_CONTEXTS } from '@/lib/ecz/ecz-reference-constants'

export const ASSESSMENT_MODES = {
  PRIMARY_MCQ: 'primary_mcq',
  SECONDARY_SCENARIO: 'secondary_scenario',
  SBA_RUBRIC: 'sba_rubric',
}

const FORM_PATTERN = /^form\s*(\d)/i
const GRADE_PATTERN = /^grade\s*(\d)/i

export function parseFormLevel(gradeLevel) {
  const raw = String(gradeLevel || '').trim()
  const formMatch = raw.match(FORM_PATTERN)
  if (formMatch) return Number(formMatch[1])
  const gradeMatch = raw.match(GRADE_PATTERN)
  if (gradeMatch) return Number(gradeMatch[1])
  const digits = raw.match(/(\d+)/)
  return digits ? Number(digits[1]) : null
}

export function isSecondaryFormLevel(gradeLevel) {
  const n = parseFormLevel(gradeLevel)
  if (n == null) return false
  if (FORM_PATTERN.test(String(gradeLevel || ''))) return n >= 1 && n <= 6
  return n >= 8
}

export function isPrimaryGradeLevel(gradeLevel) {
  const band = resolveEducationLevelFromGrade(gradeLevel)
  return band === 'primary'
}

/**
 * @returns {'primary_mcq'|'secondary_scenario'|'sba_rubric'}
 */
export function resolveAssessmentMode({ schoolLevel, gradeLevel, purpose } = {}) {
  const purposeNorm = String(purpose || '').toLowerCase()
  if (purposeNorm === 'sba' || purposeNorm === 'sba_rubric') {
    return ASSESSMENT_MODES.SBA_RUBRIC
  }
  // Formative classroom quizzes (AI Quiz Maker, topic tests) always allow MCQ/short/TF.
  if (
    purposeNorm === 'formative' ||
    purposeNorm === 'quiz' ||
    purposeNorm === 'quiz_maker' ||
    purposeNorm === 'topic_test'
  ) {
    return ASSESSMENT_MODES.PRIMARY_MCQ
  }

  const level = String(schoolLevel || 'combined').toLowerCase()
  if (level === 'primary') return ASSESSMENT_MODES.PRIMARY_MCQ
  if (level === 'secondary') return ASSESSMENT_MODES.SECONDARY_SCENARIO

  const fromGrade = resolveEducationLevelFromGrade(gradeLevel)
  if (fromGrade === 'primary') return ASSESSMENT_MODES.PRIMARY_MCQ
  return ASSESSMENT_MODES.SECONDARY_SCENARIO
}

export function allowsMultipleChoice(mode) {
  return mode === ASSESSMENT_MODES.PRIMARY_MCQ
}

export function hasZambianContext(text) {
  const raw = String(text || '').toLowerCase()
  if (!raw || raw.length < 20) return false
  const zambiaKeywords = [
    'zambia',
    'zambian',
    'lusaka',
    'kitwe',
    'ndola',
    'mkushi',
    'chipata',
    'livingstone',
    'kabwe',
    'luapula',
    'copperbelt',
    'nshima',
    'maize',
    'mk',
    'kwacha',
    'ecz',
    'form ',
    'grade ',
  ]
  if (zambiaKeywords.some((k) => raw.includes(k))) return true
  return ECZ_ZAMBIAN_CONTEXTS.some((ctx) => raw.includes(ctx.toLowerCase().split(',')[0]))
}

/**
 * Validate a single exam/quiz item against ECSEOL mode rules.
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateExamItem(item, mode, options = {}) {
  const errors = []
  const warnings = []
  const type = String(item?.type || '').toLowerCase()
  const question = String(item?.question || item?.zambianScenario || '').trim()

  if (mode === ASSESSMENT_MODES.SECONDARY_SCENARIO) {
    if (type === 'mcq' || type === 'true_false') {
      errors.push('Multiple choice is not allowed for secondary ECSEOL assessments')
    }
    if (!question || question.length < 30) {
      errors.push('Secondary items require a scenario or question of at least 30 characters')
    }
    if (options.requireEoC && !String(item?.elementOfConstruct || '').trim()) {
      warnings.push('Element of Construct should be specified for validity')
    }
    if (options.requireCommandTerm && !String(item?.commandTerm || '').trim()) {
      warnings.push('Command term should be specified (State, Explain, Calculate, etc.)')
    }
  }

  if (mode === ASSESSMENT_MODES.PRIMARY_MCQ) {
    if (!['mcq', 'short', 'true_false'].includes(type) && !item?.options?.length) {
      warnings.push('Primary EPSC practice typically uses MCQ or short answer')
    }
  }

  const contextText = item?.zambianScenario || item?.context || question
  if (options.requireZambianContext && !hasZambianContext(contextText)) {
    errors.push('Item must use a real-life Zambian context')
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * Validate Bloom cognitive level distribution against ECSEOL targets.
 * @param {Array<{ bloomsLevel?: string, marks?: number }>} questions
 */
export function validateBloomDistribution(questions) {
  const warnings = []
  const list = Array.isArray(questions) ? questions : []
  if (list.length === 0) return { ok: true, warnings, distribution: {} }

  const totalMarks = list.reduce((sum, q) => sum + (Number(q.marks) || 1), 0) || list.length
  const counts = {}
  for (const q of list) {
    const level = String(q.bloomsLevel || 'Understanding').trim()
    const weight = Number(q.marks) || 1
    counts[level] = (counts[level] || 0) + weight
  }

  const distribution = {}
  for (const [level, weight] of Object.entries(counts)) {
    distribution[level] = Math.round((weight / totalMarks) * 100)
  }

  for (const [level, target] of Object.entries(ECZ_BLOOM_TARGETS)) {
    const pct = distribution[level]
    if (pct == null) continue
    if (pct < target.min - 5 || pct > target.max + 5) {
      warnings.push(`${level}: ${pct}% of marks (ECSEOL target ${target.min}–${target.max}%)`)
    }
  }

  return { ok: warnings.length === 0, warnings, distribution }
}

/** Filter/normalize AI quiz questions for the resolved mode. */
export function normalizeQuestionsForMode(questions, mode) {
  const list = Array.isArray(questions) ? questions : []
  if (mode !== ASSESSMENT_MODES.SECONDARY_SCENARIO) return list

  return list
    .filter((q) => String(q?.type || '').toLowerCase() !== 'mcq')
    .map((q) => {
      const type = String(q?.type || '').toLowerCase()
      return {
        ...q,
        type: type === 'true_false' ? 'short' : q.type || 'structured',
        options: undefined,
      }
    })
}

/**
 * Like normalizeQuestionsForMode, but converts MCQ → short instead of dropping them.
 * Use when a formative/exam pipeline must not return an empty quiz.
 */
export function salvageQuestionsForMode(questions, mode) {
  const list = Array.isArray(questions) ? questions : []
  if (mode !== ASSESSMENT_MODES.SECONDARY_SCENARIO) return list

  const kept = normalizeQuestionsForMode(list, mode)
  if (kept.length > 0) return kept

  // Model returned only MCQ — convert rather than wipe the quiz.
  return list.map((q) => {
    const options = Array.isArray(q?.options) ? q.options.filter(Boolean) : []
    const optionBlock = options.length
      ? `\nOptions: ${options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('; ')}`
      : ''
    return {
      ...q,
      type: 'short',
      question: `${String(q?.question || '').trim()}${optionBlock}`.trim(),
      options: undefined,
    }
  })
}

export function getAllowedQuestionTypes(mode) {
  if (mode === ASSESSMENT_MODES.PRIMARY_MCQ) {
    return ['mcq', 'short', 'true_false']
  }
  if (mode === ASSESSMENT_MODES.SECONDARY_SCENARIO) {
    return ['structured', 'scenario', 'short', 'extended_response', 'calculation']
  }
  return ['structured', 'short', 'mcq']
}
