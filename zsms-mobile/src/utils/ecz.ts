/** Mirror lib/ecz/ecz-compliance.js */
export const SBA_TASK_MARKS = 20

const RUBRIC_LEVELS = {
  EXCELLENT: 4,
  GOOD: 3,
  FAIR: 2,
  NEEDS_IMPROVEMENT: 1,
} as const

export function computeRubricScoreLocal(counts: {
  excellentCount?: number
  goodCount?: number
  fairCount?: number
  needsImprovementCount?: number
}): { rubricTotal: number; calculatedScore: number; criteriaCount: number } {
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
