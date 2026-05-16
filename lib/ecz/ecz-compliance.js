/** ECZ School-Based Assessment compliance helpers (Zambia). */

export const SBA_WEIGHT_PERCENT = 30
export const FINAL_EXAM_WEIGHT_PERCENT = 70
export const SBA_TOTAL_MARKS = 100
export const SBA_TASK_MARKS = 20
export const SBA_TERM_TEST_MARKS = 40
export const SBA_SUBMISSION_DEADLINE_DAY = 31
export const SBA_SUBMISSION_DEADLINE_MONTH = 0 // January (0-indexed)

export const ZAMBIA_CONTEXT_KEYWORDS = [
  'Zambia',
  'Lusaka',
  'Kitwe',
  'Livingstone',
  'Ndola',
  'Kabwe',
  'Chipata',
  'Solwezi',
  'Mongu',
  'Choma',
  'Mkushi',
  'Kafue',
  'Luangwa',
  'maize',
  'copper',
  'market',
  'farmer',
  'minibus',
  'school',
  'hospital',
  'village',
  'township',
  'community',
  'Soweto',
  'Kwacha',
  'Victoria Falls',
  'traditional',
  'ceremony',
  'ZESCO',
  'CBU',
  'UNZA',
]

export const ECZ_COMMAND_TERMS = [
  'Calculate',
  'Compare',
  'Analyse',
  'Analyze',
  'Describe',
  'Explain',
  'Evaluate',
  'Identify',
  'Justify',
  'List',
  'Outline',
  'State',
  'Suggest',
  'Discuss',
  'Define',
  'Demonstrate',
  'Interpret',
  'Predict',
  'Prove',
  'Sketch',
]

export const BLOOMS_LEVELS = [
  'Remember',
  'Understand',
  'Apply',
  'Analyse',
  'Analyze',
  'Evaluate',
  'Create',
]

export const RUBRIC_LEVELS = {
  EXCELLENT: 4,
  GOOD: 3,
  FAIR: 2,
  NEEDS_IMPROVEMENT: 1,
}

export function validateFormLevelForSBA(formLevel) {
  const level = Number(formLevel)
  if (level === 4) {
    return {
      valid: false,
      error:
        'Form 4 SBA Prevention: SBA cannot be administered to Form 4 learners. Only Final Examination (70%) applies.',
    }
  }
  if (![1, 2, 3].includes(level)) {
    return { valid: false, error: 'SBA applies to Form 1, 2, or 3 only.' }
  }
  return { valid: true }
}

export function validateZambianContext(context) {
  const text = String(context || '').trim()
  if (!text) {
    return { valid: false, error: 'Assessment context must describe a real-life Zambian scenario.' }
  }
  const match = ZAMBIA_CONTEXT_KEYWORDS.some((keyword) =>
    text.toLowerCase().includes(keyword.toLowerCase())
  )
  if (!match) {
    return {
      valid: false,
      error:
        'Context must include a Zambian location, occupation, or scenario (e.g. Lusaka, farmer, market, maize).',
    }
  }
  return { valid: true }
}

export function validateSubmissionDeadline(academicYear) {
  const year = Number(academicYear)
  const deadline = new Date(
    year + 1,
    SBA_SUBMISSION_DEADLINE_MONTH,
    SBA_SUBMISSION_DEADLINE_DAY,
    23,
    59,
    59
  )
  const today = new Date()
  if (today > deadline) {
    return {
      valid: false,
      error: `Deadline passed. SBA scores must be submitted by 31 January ${year + 1}.`,
      deadline,
      daysRemaining: 0,
      isUrgent: false,
      isPassed: true,
    }
  }
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return {
    valid: true,
    deadline,
    daysRemaining,
    isUrgent: daysRemaining < 14,
    isPassed: false,
  }
}

export function getDeadlineStatus(academicYear) {
  const year = Number(academicYear) || new Date().getFullYear()
  const check = validateSubmissionDeadline(year)
  return {
    academicYear: year,
    deadline: check.deadline?.toISOString().split('T')[0],
    daysRemaining: check.daysRemaining ?? 0,
    isUrgent: check.isUrgent ?? false,
    isPassed: check.isPassed ?? !check.valid,
    statusColor: check.isPassed ? 'red' : check.isUrgent ? 'orange' : 'green',
  }
}

export function computeRubricScore(counts = {}) {
  const excellent = Number(counts.excellentCount) || 0
  const good = Number(counts.goodCount) || 0
  const fair = Number(counts.fairCount) || 0
  const needsImprovement = Number(counts.needsImprovementCount) || 0
  const criteriaCount = excellent + good + fair + needsImprovement
  if (criteriaCount === 0) return { rubricTotal: 0, calculatedScore: 0, criteriaCount: 0 }

  const rubricTotal =
    excellent * RUBRIC_LEVELS.EXCELLENT +
    good * RUBRIC_LEVELS.GOOD +
    fair * RUBRIC_LEVELS.FAIR +
    needsImprovement * RUBRIC_LEVELS.NEEDS_IMPROVEMENT

  const maxPoints = criteriaCount * RUBRIC_LEVELS.EXCELLENT
  const calculatedScore = Math.round((rubricTotal / maxPoints) * SBA_TASK_MARKS)
  return { rubricTotal, calculatedScore, criteriaCount }
}

export function computeTotalSBAScore({
  task1Score = 0,
  task2Score = 0,
  task3Score = 0,
  termTestScore = 0,
}) {
  const t1 = Math.min(SBA_TASK_MARKS, Math.max(0, Number(task1Score) || 0))
  const t2 = Math.min(SBA_TASK_MARKS, Math.max(0, Number(task2Score) || 0))
  const t3 = Math.min(SBA_TASK_MARKS, Math.max(0, Number(task3Score) || 0))
  const tt = Math.min(SBA_TERM_TEST_MARKS, Math.max(0, Number(termTestScore) || 0))
  return Math.min(SBA_TOTAL_MARKS, t1 + t2 + t3 + tt)
}

export function computeFinalGrade(sbaScore, finalExamScore) {
  const sba = Math.min(100, Math.max(0, Number(sbaScore) || 0))
  const exam = Math.min(100, Math.max(0, Number(finalExamScore) || 0))
  const composite = (sba * SBA_WEIGHT_PERCENT + exam * FINAL_EXAM_WEIGHT_PERCENT) / 100
  return Math.round(composite * 100) / 100
}

export const DEFAULT_RUBRIC_CRITERIA = [
  {
    name: 'Quality of Work',
    excellent: 'Excellent — exceeds expectations, outstanding quality',
    good: 'Good — meets expectations fully',
    fair: 'Fair — partially meets expectations',
    needsImpr: 'Needs Improvement — below expectations',
  },
  {
    name: 'Understanding',
    excellent: 'Excellent — deep understanding demonstrated',
    good: 'Good — solid understanding shown',
    fair: 'Fair — basic understanding evident',
    needsImpr: 'Needs Improvement — limited understanding',
  },
  {
    name: 'Application',
    excellent: 'Excellent — creative real-world application',
    good: 'Good — appropriate application',
    fair: 'Fair — some application with support',
    needsImpr: 'Needs Improvement — minimal application',
  },
  {
    name: 'Presentation',
    excellent: 'Excellent — well-organised and clear',
    good: 'Good — organised and mostly clear',
    fair: 'Fair — somewhat organised',
    needsImpr: 'Needs Improvement — poorly organised',
  },
]
