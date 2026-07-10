import { resolveCurriculum, type ResolvedCurriculumUnit } from '@/lib/curriculum/resolveCurriculum'

export type SchemeWeekRow = {
  week: number
  topic: string
  learningOutcomes: string[]
  teachingActivities: string[]
  assessmentMethod: string
  resources: string[]
  notes: string
}

/**
 * Spread curriculum units across a fixed number of term weeks.
 */
export function distributeUnitsAcrossTerm(
  units: ResolvedCurriculumUnit[],
  weekCount = 12
): SchemeWeekRow[] {
  const weeks = Math.max(1, Math.min(16, Number(weekCount) || 12))
  if (!units.length) {
    return Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      topic: `Week ${i + 1} — to be planned`,
      learningOutcomes: [],
      teachingActivities: [],
      assessmentMethod: 'Formative oral / written check',
      resources: [],
      notes: `Week ${i + 1}`,
    }))
  }

  const rows: SchemeWeekRow[] = []
  for (let w = 0; w < weeks; w++) {
    const unit = units[w % units.length]
    const cycle = Math.floor(w / units.length)
    const topicExtra = unit.topics[w % Math.max(1, unit.topics.length)] || ''
    rows.push({
      week: w + 1,
      topic: topicExtra ? `${unit.title}: ${topicExtra}` : unit.title,
      learningOutcomes: (unit.outcomes || []).slice(0, 5),
      teachingActivities: (unit.activities || []).slice(0, 5),
      assessmentMethod: (unit.assessment || [])[0] || 'Formative + end-of-week quiz',
      resources: (unit.resources || []).slice(0, 5),
      notes: cycle > 0 ? `Week ${w + 1} (revision cycle ${cycle + 1})` : `Week ${w + 1}`,
    })
  }
  return rows
}

export async function generateSchemeOfWork(input: {
  schoolId?: string | null
  subject: string
  grade: string | number
  term: string | number
  year: number
  weekCount?: number
}): Promise<{
  subject: string
  gradeOrForm: string
  term: string
  year: number
  source: string
  weeks: SchemeWeekRow[]
}> {
  const subject = String(input.subject || '').trim()
  const gradeOrForm = String(input.grade || '').trim()
  const term =
    typeof input.term === 'number' ? `Term ${input.term}` : String(input.term || 'Term 1').trim()
  const year = Number(input.year) || new Date().getFullYear()

  const curriculum = await resolveCurriculum({
    schoolId: input.schoolId,
    subject,
    gradeOrForm,
  })

  const weeks = distributeUnitsAcrossTerm(curriculum.units, input.weekCount ?? 12)

  return {
    subject: curriculum.subject || subject,
    gradeOrForm: curriculum.gradeOrForm || gradeOrForm,
    term,
    year,
    source: curriculum.source,
    weeks,
  }
}
